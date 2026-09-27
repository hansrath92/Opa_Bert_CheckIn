"use client";

import { useEffect, useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { PRESS_LABEL } from "@/lib/naming";
import { buildLastDayKeys, weekdayLabelForDateKey } from "@/lib/days";

type Press = { type: "morning" | "evening"; created_at: string };
type Reminder = { contact_name: string; created_at: string };
type StandDown = { contact_name: string; created_at: string };
type DailyStatus = {
  date_key: string;
  auto_triggered_at: string | null;
  evening_press_time: string | null;
  evening_stood_down_at: string | null;
};
type DayEntry = {
  dateKey: string;
  morning: Press[];
  evening: Press[];
  reminders: Reminder[];
  standDowns: StandDown[];
  buzzerActiveSince: Date | null;
  buzzerActiveUntil: Date | null;
  stoodDown: boolean;
};

// Presses werden nach 7 Tagen automatisch gelöscht (siehe Migration 0006),
// daher zeigen wir hier maximal die letzten 7 Tage an.
const DAYS_TO_SHOW = 7;

function formatDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${weekdayLabelForDateKey(dateKey)}, ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.`;
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

      const { presses, reminders, standDowns, dailyStatuses } = (await response.json()) as {
        presses: Press[];
        reminders: Reminder[];
        standDowns: StandDown[];
        dailyStatuses: DailyStatus[];
      };

      const dateKeys = buildLastDayKeys(DAYS_TO_SHOW);

      setDays(
        dateKeys.map((dateKey) => {
          const dayReminders = reminders
            .filter((r) => getBerlinDateKey(new Date(r.created_at)) === dateKey)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          const dayStandDowns = standDowns
            .filter((s) => getBerlinDateKey(new Date(s.created_at)) === dateKey)
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

          // Alle Drücke des Tages, nicht nur der letzte - falls Opa mehrmals
          // drückt, sollen alle Zeitpunkte sichtbar sein.
          const sortByTime = (a: Press, b: Press) => a.created_at.localeCompare(b.created_at);

          return {
            dateKey,
            morning: presses
              .filter((r) => r.type === "morning" && getBerlinDateKey(new Date(r.created_at)) === dateKey)
              .sort(sortByTime),
            evening: presses
              .filter((r) => r.type === "evening" && getBerlinDateKey(new Date(r.created_at)) === dateKey)
              .sort(sortByTime),
            reminders: dayReminders,
            standDowns: dayStandDowns,
            buzzerActiveSince:
              activeSinceCandidates.length > 0 ? new Date(Math.min(...activeSinceCandidates)) : null,
            // "Bis wann" gilt sowohl bei einem echten Abend-Druck als auch bei
            // einer Entwarnung als beendet - beide stoppen den Piepser gleichermaßen.
            buzzerActiveUntil: dailyStatus?.evening_press_time
              ? new Date(dailyStatus.evening_press_time)
              : dailyStatus?.evening_stood_down_at
              ? new Date(dailyStatus.evening_stood_down_at)
              : null,
            stoodDown: Boolean(dailyStatus?.evening_stood_down_at && !dailyStatus?.evening_press_time),
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
        <div data-onboarding="verlauf-list" className="flex flex-col gap-3">
          {days.map((day) => (
            <div key={day.dateKey} className="rounded-[var(--radius-card)] border border-border bg-card p-4">
              <div className="mb-2 font-medium">{formatDateLabel(day.dateKey)}</div>
              <div className="flex gap-4 text-sm">
                <div className="flex-1">
                  <div className="text-foreground-secondary">{PRESS_LABEL.morning}</div>
                  {day.morning.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {day.morning.map((press, i) => (
                        <div key={i} className="font-semibold text-success-text">
                          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-foreground-secondary">–</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-foreground-secondary">{PRESS_LABEL.evening}</div>
                  {day.evening.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {day.evening.map((press, i) => (
                        <div key={i} className="font-semibold text-success-text">
                          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
                        </div>
                      ))}
                    </div>
                  ) : day.stoodDown ? (
                    <div className="text-sm text-warning">Entwarnt</div>
                  ) : (
                    <div className="text-foreground-secondary">–</div>
                  )}
                </div>
              </div>
              {day.buzzerActiveSince && (
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <div className="text-info">
                    Erinnerung aktiv: {getBerlinTimeLabel(day.buzzerActiveSince)} Uhr
                    {day.buzzerActiveUntil
                      ? ` – ${getBerlinTimeLabel(day.buzzerActiveUntil)} Uhr`
                      : day.dateKey === todayKey
                      ? " – läuft noch"
                      : ` (kein ${PRESS_LABEL.evening}-Druck registriert)`}
                  </div>
                  {day.reminders.map((reminder, index) => (
                    <div key={`r${index}`} className="text-foreground-secondary">
                      Erinnert von: {reminder.contact_name} um {getBerlinTimeLabel(new Date(reminder.created_at))} Uhr
                    </div>
                  ))}
                  {day.standDowns.map((standDown, index) => (
                    <div key={`s${index}`} className="text-warning">
                      Entwarnung von: {standDown.contact_name} um {getBerlinTimeLabel(new Date(standDown.created_at))}{" "}
                      Uhr
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
