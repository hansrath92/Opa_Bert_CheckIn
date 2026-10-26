const BERLIN_TIME_ZONE = "Europe/Berlin";

export function getPressType(date: Date): "morning" | "evening" {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return hour < 12 ? "morning" : "evening";
}

export function getBerlinDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Liefert den Berlin-Offset (+1 Winterzeit / +2 Sommerzeit) zu einem Zeitpunkt in Stunden.
function getBerlinOffsetHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+1";
  const match = name.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) : 1;
}

// Baut aus einer Berlin-Uhrzeit (z.B. 11:00) den passenden UTC-Zeitpunkt für "heute",
// unabhängig von Sommer-/Winterzeit.
// WICHTIG: Der Offset muss zum ZIELZEITPUNKT passen, nicht zum Referenzzeitpunkt.
// Am Tag der Zeitumstellung (Umstellung um 03:00 Berlin) lag der Offset des
// Referenzzeitpunkts sonst eine Stunde daneben, z.B. um 01:00 Uhr für eine
// Deadline um 11:00 Uhr.
export function getBerlinTimeAsUTC(
  referenceDate: Date,
  hour: number,
  minute: number
): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  // Schritt 1: Erst mit dem Offset des Referenzzeitpunkts schätzen ...
  const estimate = new Date(
    Date.UTC(year, month - 1, day, hour - getBerlinOffsetHours(referenceDate), minute)
  );
  // Schritt 2: ... dann den Offset genau an dieser Schätzung prüfen und korrigieren.
  const offsetAtTarget = getBerlinOffsetHours(estimate);
  return new Date(Date.UTC(year, month - 1, day, hour - offsetAtTarget, minute));
}

// Stunde+Minute eines Zeitpunkts in Berliner Zeit, z.B. um daraus für einen
// ANDEREN Tag (etwa "heute") denselben Zeitpunkt via getBerlinTimeAsUTC zu bauen.
export function getBerlinHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { hour: get("hour"), minute: get("minute") };
}

export function getBerlinTimeLabel(
  date: Date,
  options?: { seconds?: boolean }
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: options?.seconds ? "2-digit" : undefined,
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return options?.seconds
    ? `${get("hour")}:${get("minute")}:${get("second")}`
    : `${get("hour")}:${get("minute")}`;
}
