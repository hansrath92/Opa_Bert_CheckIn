import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey, getPressType } from "@/lib/press";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PI_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const type = getPressType(now);

  const { error } = await supabaseAdmin.from("presses").insert({ type });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // daily_status mitpflegen: ein abendlicher Druck beendet automatisch den
  // Buzzer-Zustand, weil /api/buzzer-status dann "evening_press_time gesetzt" sieht.
  const dailyStatusUpdate =
    type === "morning"
      ? { morning_press_time: now.toISOString() }
      : { evening_press_time: now.toISOString() };

  const { error: dailyStatusError } = await supabaseAdmin
    .from("daily_status")
    .upsert(
      { date_key: getBerlinDateKey(now), ...dailyStatusUpdate },
      { onConflict: "date_key" }
    );

  if (dailyStatusError) {
    return NextResponse.json({ error: dailyStatusError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, type });
}
