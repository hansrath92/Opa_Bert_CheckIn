import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { getSunsetTimeUTC } from "@/lib/sunset";

const AUTO_BUZZ_HOURS_AFTER_SUNSET = 1;

// Der Pi fragt das per Polling ab und steuert den Piezo lokal an.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PI_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayKey = getBerlinDateKey(now);

  const { data: status, error } = await supabaseAdmin
    .from("daily_status")
    .select("evening_press_time, buzzer_manually_triggered")
    .eq("date_key", todayKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eveningPressTime = status?.evening_press_time ?? null;
  const buzzerManuallyTriggered = status?.buzzer_manually_triggered ?? false;

  if (eveningPressTime !== null) {
    // Abend-Druck ist schon da -> Buzzer ist in jedem Fall aus, egal was sonst gilt.
    return NextResponse.json({ shouldBuzz: false });
  }

  const sunset = await getSunsetTimeUTC(now);
  const autoDeadline = new Date(sunset.getTime() + AUTO_BUZZ_HOURS_AFTER_SUNSET * 60 * 60 * 1000);
  const timeConditionMet = now >= autoDeadline;

  return NextResponse.json({ shouldBuzz: timeConditionMet || buzzerManuallyTriggered });
}
