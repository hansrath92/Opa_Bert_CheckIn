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
