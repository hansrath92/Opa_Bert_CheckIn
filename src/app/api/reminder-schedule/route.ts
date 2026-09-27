import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSunsetTimeUTC } from "@/lib/sunset";
import {
  NOTIFICATION_SETTINGS_COLUMNS,
  NotificationSettings,
  getPersonalEveningDeadline,
  wantsMissedCheckinAlerts,
} from "@/lib/notification-settings";

// Öffentlich (wie /api/contacts/list) - zeigt transparent, zu welcher Uhrzeit
// heute jede Person benachrichtigt würde, falls der Abend-Druck fehlt. Jede
// Person hat ihre eigene Zeit (automatisch = Sonnenuntergang + eigene Stunden,
// oder feste Uhrzeit). Wer Benachrichtigungen bei verpasstem Check-in aus hat,
// taucht hier nicht auf.
export async function GET() {
  const now = new Date();

  let sunset: Date;
  try {
    sunset = await getSunsetTimeUTC(now);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select(`name, ${NOTIFICATION_SETTINGS_COLUMNS}`)
    .returns<(NotificationSettings & { name: string })[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedule = (data ?? [])
    .filter(wantsMissedCheckinAlerts)
    .map((contact) => ({
      name: contact.name,
      mode: contact.missed_checkin_timing_mode,
      deadline: getPersonalEveningDeadline(contact, sunset, now).toISOString(),
    }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  return NextResponse.json({ sunset: sunset.toISOString(), schedule });
}
