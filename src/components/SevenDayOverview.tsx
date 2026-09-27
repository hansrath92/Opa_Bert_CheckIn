"use client";

import { useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { PRESS_LABEL } from "@/lib/naming";
import { buildLastDayKeys, weekdayLabelForDateKey } from "@/lib/days";

type Press = { type: "morning" | "evening"; created_at: string };
type StandDown = { created_at: string };

// Drei Zustände pro Symbol:
// - "done": an dem Tag gedrückt (oder abends per Entwarnung geklärt)
// - "pending": heute, Zeitpunkt aber noch nicht fällig/vorbei - weder
//   erledigt noch verpasst
// - "missed": vergangener Tag ohne Druck
type IconState = "done" | "pending" | "missed";

function SunIcon({ state }: { state: IconState }) {
  const color = state === "done" ? "var(--success-text)" : state === "missed" ? "var(--warning)" : "var(--accent-inactive)";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={state === "done" ? color : "none"}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={state === "missed" ? "2.5 2" : undefined}
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

function MoonIcon({ state }: { state: IconState }) {
  const color = state === "done" ? "var(--success-text)" : state === "missed" ? "var(--warning)" : "var(--accent-inactive)";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={state === "done" ? color : "none"}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={state === "missed" ? "2.5 2" : undefined}
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

// Kompakte Übersicht der letzten 7 Tage: pro Tag Sonne (Guten Morgen) + Mond
// (Gute Nacht), grün gefüllt = gedrückt, gestrichelt orange = verpasst,
// grau = heute noch nicht fällig. Antippbar für einen Detail-Text zum Tag.
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

  function detailFor(dayKey: string): string {
    const label = weekdayLabelForDateKey(dayKey, true);
    const morningPress = pressOn(dayKey, "morning");
    const eveningPress = pressOn(dayKey, "evening");
    const standDown = standDownOn(dayKey);
    const isToday = dayKey === todayKey;

    const parts: string[] = [];
    parts.push(
      morningPress
        ? `${PRESS_LABEL.morning} ${getBerlinTimeLabel(new Date(morningPress.created_at))} Uhr`
        : isToday
        ? `${PRESS_LABEL.morning} steht noch aus`
        : `${PRESS_LABEL.morning} nicht gedrückt`
    );
    if (eveningPress) {
      parts.push(`${PRESS_LABEL.evening} ${getBerlinTimeLabel(new Date(eveningPress.created_at))} Uhr`);
    } else if (standDown) {
      parts.push(`Entwarnt um ${getBerlinTimeLabel(new Date(standDown.created_at))} Uhr`);
    } else if (isToday) {
      parts.push(`${PRESS_LABEL.evening} steht noch aus`);
    } else {
      parts.push(`${PRESS_LABEL.evening} nicht gedrückt`);
    }
    return `${label}: ${parts.join(" · ")}.`;
  }

  return (
    <div data-onboarding="week-overview" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
      <div className="flex justify-between gap-1">
        {dayKeys.map((dayKey) => (
          <button
            key={dayKey}
            onClick={() => setSelectedDayKey(dayKey)}
            aria-label={weekdayLabelForDateKey(dayKey, true)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl p-1.5 ${
              dayKey === selectedDayKey ? "bg-background" : ""
            }`}
          >
            <span className="text-xs text-foreground-secondary">
              {dayKey === todayKey ? "Heute" : weekdayLabelForDateKey(dayKey)}
            </span>
            <SunIcon state={stateFor(dayKey, "morning")} />
            <MoonIcon state={stateFor(dayKey, "evening")} />
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-foreground-secondary">{detailFor(selectedDayKey)}</p>
    </div>
  );
}
