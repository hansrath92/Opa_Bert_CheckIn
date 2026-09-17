import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";

// Wird vom "Opa erinnern"-Button im Dashboard aufgerufen - kein Secret nötig,
// da es sich (wie die anderen Dashboard-Aktionen) an die vertraute Familie richtet.
export async function POST() {
  const todayKey = getBerlinDateKey(new Date());

  const { error } = await supabaseAdmin
    .from("daily_status")
    .upsert({ date_key: todayKey, buzzer_manually_triggered: true }, { onConflict: "date_key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
