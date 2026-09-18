import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { getVerifiedContactId } from "@/lib/session";

// Wird vom "Opa erinnern"-Button im Dashboard aufgerufen. Das Dashboard ist
// seit der Einführung des dashboard-weiten Logins nur noch eingeloggt
// erreichbar, daher können wir hier eine Session verlangen und protokollieren,
// wer die Erinnerung ausgelöst hat.
export async function POST(request: NextRequest) {
  const contactId = await getVerifiedContactId(request);
  if (!contactId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const todayKey = getBerlinDateKey(new Date());

  const { error } = await supabaseAdmin
    .from("daily_status")
    .upsert({ date_key: todayKey, buzzer_manually_triggered: true }, { onConflict: "date_key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Eigener Log-Eintrag pro Auslösung (statt nur eines Booleans), damit im
  // Verlauf jede einzelne Erinnerung eines Tages angezeigt werden kann.
  const { error: logError } = await supabaseAdmin
    .from("buzzer_triggers")
    .insert({ contact_id: contactId });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
