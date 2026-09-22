import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";

// Wird vom "Opa erinnern"-Button im Dashboard aufgerufen - sowohl zum
// Auslösen (active: true, Standard) als auch zum manuellen Stoppen
// (active: false) der Erinnerung.
export async function POST(request: NextRequest) {
  const { contact_id, active } = await request.json().catch(() => ({}));
  if (!contact_id) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const shouldActivate = active !== false;
  const todayKey = getBerlinDateKey(new Date());

  const { error } = await supabaseAdmin
    .from("daily_status")
    .upsert(
      { date_key: todayKey, buzzer_manually_triggered: shouldActivate },
      { onConflict: "date_key" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Nur beim Auslösen einen Log-Eintrag schreiben (fürs Verlauf-Tab), nicht
  // beim Stoppen - das Stoppen selbst ist kein "Erinnern".
  if (shouldActivate) {
    const { error: logError } = await supabaseAdmin
      .from("buzzer_triggers")
      .insert({ contact_id });

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, active: shouldActivate });
}
