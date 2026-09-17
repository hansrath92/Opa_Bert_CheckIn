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

// Baut aus einer Berlin-Uhrzeit (z.B. 11:00) den passenden UTC-Zeitpunkt für "heute",
// unabhängig von Sommer-/Winterzeit (liest den aktuellen Berlin-Offset direkt aus Intl aus).
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
    timeZoneName: "shortOffset",
  }).formatToParts(referenceDate);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const offsetMatch = (get("timeZoneName") ?? "GMT+1").match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : 1;

  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
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
