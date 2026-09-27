import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  EARLIEST_FIXED_HOUR,
  NOTIFICATION_SETTINGS_COLUMNS,
  NotificationSettings,
  parseTime,
} from "@/lib/notification-settings";

// Persönliche Einstellungen des eingeloggten Kontakts. Wie überall in der App
// identifiziert sich die Person über ihre contact_id (aus IdentityGate) - jede
// Person liest und ändert damit nur ihre EIGENEN Einstellungen.

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contact_id");
  if (!contactId) {
    return NextResponse.json({ error: "contact_id fehlt" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select(NOTIFICATION_SETTINGS_COLUMNS)
    .eq("id", contactId)
    .maybeSingle<NotificationSettings>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Kontakt nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    settings: {
      ...data,
      // DB liefert "HH:MM:SS" - die Oberfläche arbeitet mit "HH:MM"
      missed_checkin_fixed_time: data.missed_checkin_fixed_time?.slice(0, 5) ?? null,
    },
  });
}

// Nimmt beliebig viele der Felder entgegen (nur mitgeschickte werden geändert)
// und prüft jedes einzeln, bevor irgendetwas gespeichert wird.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contact_id } = body;
  if (!contact_id) {
    return NextResponse.json({ error: "contact_id fehlt" }, { status: 400 });
  }

  const update: Partial<NotificationSettings> = {};
  const invalid = (message: string) => NextResponse.json({ error: message }, { status: 400 });

  for (const key of ["notifications_enabled", "notify_on_missed_checkin", "notify_on_every_press"] as const) {
    if (key in body) {
      if (typeof body[key] !== "boolean") return invalid(`${key} muss true/false sein`);
      update[key] = body[key];
    }
  }

  if ("tolerance_hours" in body) {
    if (typeof body.tolerance_hours !== "number" || body.tolerance_hours <= 0) {
      return invalid("Bitte eine gültige Stundenzahl eingeben.");
    }
    update.tolerance_hours = body.tolerance_hours;
  }

  if ("missed_checkin_timing_mode" in body) {
    if (body.missed_checkin_timing_mode !== "automatic" && body.missed_checkin_timing_mode !== "fixed") {
      return invalid("Ungültiger Zeit-Modus");
    }
    update.missed_checkin_timing_mode = body.missed_checkin_timing_mode;
  }

  if ("missed_checkin_fixed_time" in body) {
    if (body.missed_checkin_fixed_time === null) {
      update.missed_checkin_fixed_time = null;
    } else {
      const time = parseTime(body.missed_checkin_fixed_time);
      if (!time) return invalid("Ungültige Uhrzeit");
      if (time.hour < EARLIEST_FIXED_HOUR) {
        return invalid(`Die Uhrzeit muss ab ${EARLIEST_FIXED_HOUR}:00 Uhr sein (Abend-Meldung).`);
      }
      update.missed_checkin_fixed_time = body.missed_checkin_fixed_time;
    }
  }

  // "fest" ohne Uhrzeit ergibt keinen Sinn -> ablehnen.
  if (update.missed_checkin_timing_mode === "fixed" && !update.missed_checkin_fixed_time) {
    return invalid("Bitte eine Uhrzeit wählen.");
  }

  if (Object.keys(update).length === 0) {
    return invalid("Keine Änderungen übergeben");
  }

  const { error } = await supabaseAdmin.from("contacts").update(update).eq("id", contact_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
