import { getBerlinDateKey } from "@/lib/press";

// Gemeinsame Helfer für Tages-Listen (7-Tage-Übersicht auf "Heute",
// Verlauf-Tab) - ein Ort für Wochentag-Kürzel und "letzte N Tage"-Listen,
// statt das in jeder Seite einzeln nachzubauen.
export const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const WEEKDAY_LABELS_LONG = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

// Liefert die letzten `count` Datums-Schlüssel, NEUESTER zuerst (heute = Index 0).
export function buildLastDayKeys(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(getBerlinDateKey(date));
  }
  return days;
}

export function weekdayLabelForDateKey(dateKey: string, long = false): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const index = new Date(year, month - 1, day).getDay();
  return (long ? WEEKDAY_LABELS_LONG : WEEKDAY_LABELS)[index];
}

// "Heute"/"Gestern"/Wochentag - je nachdem, wie weit der Tag zurückliegt.
export function formatRelativeDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Heute";
  const [yesterdayKey] = buildLastDayKeys(2).slice(1);
  if (dateKey === yesterdayKey) return "Gestern";
  return weekdayLabelForDateKey(dateKey);
}
