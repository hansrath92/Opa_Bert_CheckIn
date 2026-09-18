"use client";

import { useEffect, useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";

type Press = { type: "morning" | "evening"; created_at: string };
type Reminder = { contact_name: string; created_at: string };
type DailyStatus = { date_key: string; auto_triggered_at: string | null; evening_press_time: string | null };
type DayEntry = {
  dateKey: string;
  morning: Press | null;
  evening: Press | null;
  reminders: Reminder[];
  buzzerActiveSince: Date | null;
  buzzerActiveUntil: Date | null;
};

// Presses werden nach 7 Tagen automatisch gelöscht (siehe Migration 0006),
// daher zeigen wir hier maximal die letzten 7 Tage an.
const DAYS_TO_SHOW = 7;
const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function buildLastDays(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(getBerlinDateKey(date));
  }
  return days;
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  return `${weekday}, ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.`;
}

export default function VerlaufPage() {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const todayKey = getBerlinDateKey(new Date());

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/verlauf");
      if (!response.ok) {
        setError("Laden fehlgeschlagen");
        setIsLoading(false);
        return;
      }

      const { presses, reminders, dailyStatuses } = (await response.json()) as {
        presses: Press[];
        reminders: Reminder[];
        dailyStatuses: DailyStatus[];
      };

      const dateKeys = buildLastDays(DAYS_TO_SHOW);

      setDays(
        dateKeys.map((dateKey) => {
          const dayReminders = reminders
            .filter((r) => getBerlinDateKey(new Date(r.created_at)) === dateKey)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          const dailyStatus = dailyStatuses.find((d) => d.date_key === dateKey);

          // Frühester Zeitpunkt, seit dem an diesem Tag erinnert wurde - egal ob
          // automatisch (Sonnenuntergang+1h) oder manuell ("Opa erinnern").
          const activeSinceCandidates: number[] = [];
          if (dailyStatus?.auto_triggered_at) {
            activeSinceCandidates.push(new Date(dailyStatus.auto_triggered_at).getTime());
          }
          if (dayReminders.length > 0) {
            activeSinceCandidates.push(new Date(dayReminders[0].created_at).getTime());
          }

          return {
            dateKey,
            morning:
              presses.find((r) => r.type === "morning" && getBerlinDateKey(new Date(r.created_at)) === dateKey) ?? null,
            evening:
              presses.find((r) => r.type === "evening" && getBerlinDateKey(new Date(r.created_at)) === dateKey) ?? null,
            reminders: dayReminders,
            buzzerActiveSince:
              activeSinceCandidates.length > 0 ? new Date(Math.min(...activeSinceCandidates)) : null,
            buzzerActiveUntil: dailyStatus?.evening_press_time ? new Date(dailyStatus.evening_press_time) : null,
          };
        })
      );
      setIsLoading(false);
    }

    load();
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-2xl font-semibold">Verlauf</h1>
      <p className="text-sm text-foreground-secondary">Die letzten 7 Tage</p>

      {isLoading ? (
        <p className="text-lg text-foreground-secondary">Lade…</p>
      ) : error ? (
        <p className="text-lg text-foreground-secondary">Laden fehlgeschlagen</p>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => (
            <div key={day.dateKey} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 font-medium">{formatDateLabel(day.dateKey)}</div>
              <div className="flex gap-4 text-sm">
                <div className="flex-1">
                  <div className="text-foreground-secondary">Morgens</div>
                  {day.morning ? (
                    <div className="font-semibold text-success-text">
                      ✓ {getBerlinTimeLabel(new Date(day.morning.created_at))} Uhr
                    </div>
                  ) : (
                    <div className="text-foreground-secondary">–</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-foreground-secondary">Abends</div>
                  {day.evening ? (
                    <div className="font-semibold text-success-text">
                      ✓ {getBerlinTimeLabel(new Date(day.evening.created_at))} Uhr
                    </div>
                  ) : (
                    <div className="text-foreground-secondary">–</div>
                  )}
                </div>
              </div>
              {day.buzzerActiveSince && (
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <div className="text-accent">
                    Erinnerung aktiv: {getBerlinTimeLabel(day.buzzerActiveSince)} Uhr
                    {day.buzzerActiveUntil
                      ? ` – ${getBerlinTimeLabel(day.buzzerActiveUntil)} Uhr`
                      : day.dateKey === todayKey
                      ? " – läuft noch"
                      : " (kein Abend-Druck registriert)"}
                  </div>
                  {day.reminders.map((reminder, index) => (
                    <div key={index} className="text-foreground-secondary">
                      Erinnert von: {reminder.contact_name} um {getBerlinTimeLabel(new Date(reminder.created_at))} Uhr
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
