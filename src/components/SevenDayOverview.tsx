"use client";

import { useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { PRESS_LABEL } from "@/lib/naming";
import { buildLastDayKeys, weekdayLabelForDateKey } from "@/lib/days";

type Press = { type: "morning" | "evening"; created_at: string };
type StandDown = { created_at: string; contact_name: string };

// Drei Zustände pro Symbol:
// - "done": an dem Tag gedrückt (oder abends per Entwarnung geklärt)
// - "pending": heute, Zeitpunkt aber noch nicht fällig/vorbei - weder
//   erledigt noch verpasst
// - "missed": vergangener Tag ohne Druck
type IconState = "done" | "pending" | "missed";

// Symbol als gefüllter Kreis (32px): grün gefüllt mit weißem Icon = erledigt,
// gestrichelter oranger Rand mit orangem Icon = verpasst, neutrales Grau =
// noch nicht fällig.
function DayCircle({ state, children }: { state: IconState; children: React.ReactNode }) {
  const classes =
    state === "done"
      ? "bg-success-text text-white"
      : state === "missed"
      ? "border-2 border-dashed border-warning text-warning"
      : "bg-neutral-bg text-foreground-secondary";
  return <div className={`flex h-8 w-8 items-center justify-center rounded-full ${classes}`}>{children}</div>;
}

function SunGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function formatDayHeader(dayKey: string): string {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${weekdayLabelForDateKey(dayKey)}, ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.`;
}

// Kompakte Übersicht der letzten 7 Tage: pro Tag Sonne (Guten Morgen) + Mond
// (Gute Nacht) als gefüllte Kreise. Antippbar für einen Detail-Text zum Tag.
export default function SevenDayOverview({ presses, standDowns }: { presses: Press[]; standDowns: StandDown[] }) {
  const todayKey = getBerlinDateKey(new Date());
  const dayKeys = buildLastDayKeys(7).slice().reverse(); // älteste zuerst, damit die Reihe chronologisch von links nach rechts liest
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  function pressOn(dayKey: string, type: "morning" | "evening") {
    return presses.find((p) => p.type === type && getBerlinDateKey(new Date(p.created_at)) === dayKey) ?? null;
  }
  function standDownOn(dayKey: string) {
    return standDowns.find((s) => getBerlinDateKey(new Date(s.created_at)) === dayKey) ?? null;
  }

  function stateFor(dayKey: string, type: "morning" | "evening"): IconState {
    const press = pressOn(dayKey, type);
    if (press) return "done";
    if (type === "evening" && standDownOn(dayKey)) return "done";
    if (dayKey === todayKey) return "pending";
    return "missed";
  }

  // Für den Morgen ist die Deadline (11 Uhr) an jedem Tag gleich, deshalb
  // lässt sich "pünktlich"/"spät" hier zuverlässig bestimmen - beim Abend
  // schwankt die persönliche Deadline pro Tag (Sonnenuntergang), das lässt
  // sich ohne die historischen Werte nicht sauber nachträglich sagen.
  function morningWasOnTime(press: Press): boolean {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(
        new Date(press.created_at)
      )
    );
    return hour < 11;
  }

  function detailFor(dayKey: string): string {
    const morningPress = pressOn(dayKey, "morning");
    const eveningPress = pressOn(dayKey, "evening");
    const standDown = standDownOn(dayKey);
    const isToday = dayKey === todayKey;

    const morningPart = morningPress
      ? `${PRESS_LABEL.morning}: ${getBerlinTimeLabel(new Date(morningPress.created_at))} Uhr${
          morningWasOnTime(morningPress) ? " pünktlich" : " (spät)"
        }`
      : isToday
      ? `${PRESS_LABEL.morning}: steht noch aus`
      : `${PRESS_LABEL.morning}: verpasst`;

    const eveningPart = eveningPress
      ? `${PRESS_LABEL.evening}: ${getBerlinTimeLabel(new Date(eveningPress.created_at))} Uhr`
      : standDown
      ? `${PRESS_LABEL.evening}: Entwarnung von ${standDown.contact_name} um ${getBerlinTimeLabel(new Date(standDown.created_at))} Uhr`
      : isToday
      ? `${PRESS_LABEL.evening}: steht noch aus`
      : `${PRESS_LABEL.evening}: verpasst`;

    return `${formatDayHeader(dayKey)} · ${morningPart} · ${eveningPart}`;
  }

  return (
    <div data-onboarding="week-overview" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">Letzte 7 Tage</p>
      <div className="flex justify-between gap-1">
        {dayKeys.map((dayKey) => (
          <button
            key={dayKey}
            onClick={() => setSelectedDayKey(dayKey)}
            aria-label={weekdayLabelForDateKey(dayKey, true)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl p-1.5 ${
              dayKey === selectedDayKey ? "bg-accent/10" : ""
            }`}
          >
            <span className="text-xs text-foreground-secondary">
              {dayKey === todayKey ? "Heute" : weekdayLabelForDateKey(dayKey)}
            </span>
            <DayCircle state={stateFor(dayKey, "morning")}>
              <SunGlyph />
            </DayCircle>
            <DayCircle state={stateFor(dayKey, "evening")}>
              <MoonGlyph />
            </DayCircle>
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-foreground-secondary">{detailFor(selectedDayKey)}</p>
    </div>
  );
}
