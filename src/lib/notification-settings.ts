import { getBerlinTimeAsUTC } from "@/lib/press";

// Persönliche Benachrichtigungs-Einstellungen eines Kontakts (siehe Migration
// 0011). Jede Person verwaltet nur ihre eigenen - es gibt keine zentrale
// Verwaltung durch eine Person für alle.
export type NotificationSettings = {
  notifications_enabled: boolean; // Master-Schalter
  notify_on_missed_checkin: boolean;
  missed_checkin_timing_mode: "automatic" | "fixed";
  missed_checkin_fixed_time: string | null; // "HH:MM" bzw. "HH:MM:SS" aus der DB
  notify_on_every_press: boolean;
  tolerance_hours: number; // Stunden nach Sonnenuntergang bei "automatic"
};

// Spaltenliste für Supabase-Selects, damit alle Stellen dieselben Felder laden.
export const NOTIFICATION_SETTINGS_COLUMNS =
  "notifications_enabled, notify_on_missed_checkin, missed_checkin_timing_mode, missed_checkin_fixed_time, notify_on_every_press, tolerance_hours";

// Ein Abend-Druck zählt erst ab 12 Uhr (siehe getPressType) - eine feste
// Uhrzeit davor ergäbe keinen Sinn, weil dann nie ein Abend-Druck da sein kann.
export const EARLIEST_FIXED_HOUR = 12;

// Parst "HH:MM" oder "HH:MM:SS" -> { hour, minute }, oder null bei Unsinn.
export function parseTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// Ab wann DIESE Person heute Abend benachrichtigt wird, falls der Abend-Druck
// fehlt:
// - automatisch: Sonnenuntergang + eigene Toleranz-Stunden (wie bisher)
// - fest: die gewählte Uhrzeit (Berliner Zeit) am heutigen Tag
// Hinweis: Der Piepser bei Opa ist davon unabhängig (eigene globale Regel in buzzer.ts).
export function getPersonalEveningDeadline(settings: NotificationSettings, sunset: Date, now: Date): Date {
  if (settings.missed_checkin_timing_mode === "fixed") {
    const time = parseTime(settings.missed_checkin_fixed_time);
    if (time) return getBerlinTimeAsUTC(now, time.hour, time.minute);
    // Fehlende/kaputte Uhrzeit -> sicherheitshalber auf automatisch zurückfallen,
    // statt die Person gar nicht zu benachrichtigen.
  }
  return new Date(sunset.getTime() + settings.tolerance_hours * 60 * 60 * 1000);
}

// Bekommt diese Person überhaupt Alarm-Benachrichtigungen bei verpasstem Check-in?
export function wantsMissedCheckinAlerts(settings: NotificationSettings): boolean {
  return settings.notifications_enabled && settings.notify_on_missed_checkin;
}
