import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Liefert Presses + Erinnerungs-Trigger der letzten Tage für den Verlauf-Tab.
// Läuft über supabaseAdmin (statt direktem Client-Read wie zuvor), weil wir
// hier zusätzlich den Namen des erinnernden Kontakts brauchen - und
// contacts.name ist per RLS nicht öffentlich lesbar.
export async function GET() {
  const { data: presses, error: pressesError } = await supabaseAdmin
    .from("presses")
    .select("type, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (pressesError) {
    return NextResponse.json({ error: pressesError.message }, { status: 500 });
  }

  const { data: reminders, error: remindersError } = await supabaseAdmin
    .from("buzzer_triggers")
    .select("created_at, contacts(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (remindersError) {
    return NextResponse.json({ error: remindersError.message }, { status: 500 });
  }

  // Für die Anzeige "Erinnerung aktiv von...bis" im Verlauf (Start: manueller
  // Trigger oder automatischer Alarm, Ende: Abend-Druck bzw. "läuft noch").
  const { data: dailyStatuses, error: dailyStatusError } = await supabaseAdmin
    .from("daily_status")
    .select("date_key, auto_triggered_at, evening_press_time")
    .order("date_key", { ascending: false })
    .limit(14);

  if (dailyStatusError) {
    return NextResponse.json({ error: dailyStatusError.message }, { status: 500 });
  }

  return NextResponse.json({
    presses,
    reminders: (reminders ?? []).map((row) => ({
      created_at: row.created_at,
      contact_name: (row.contacts as unknown as { name: string } | null)?.name ?? "Unbekannt",
    })),
    dailyStatuses: dailyStatuses ?? [],
  });
}
