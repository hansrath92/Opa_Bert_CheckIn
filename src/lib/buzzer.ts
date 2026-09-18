import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { getSunsetTimeUTC } from "@/lib/sunset";

const AUTO_BUZZ_HOURS_AFTER_SUNSET = 1;

export type BuzzerState = {
  shouldBuzz: boolean;
  timeConditionMet: boolean;
  buzzerManuallyTriggered: boolean;
  eveningPressTime: string | null;
  autoTriggeredAt: string | null;
};

// Gemeinsame Logik für /api/buzzer-status (vom Pi gepollt) und
// /api/buzzer-live-status (vom Dashboard gepollt) - damit beide Seiten
// garantiert denselben "soll piepen"-Zustand sehen.
export async function computeBuzzerState(now: Date): Promise<BuzzerState> {
  const todayKey = getBerlinDateKey(now);

  const { data: status, error } = await supabaseAdmin
    .from("daily_status")
    .select("evening_press_time, buzzer_manually_triggered, auto_triggered_at")
    .eq("date_key", todayKey)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const eveningPressTime = status?.evening_press_time ?? null;
  const buzzerManuallyTriggered = status?.buzzer_manually_triggered ?? false;
  let autoTriggeredAt: string | null = status?.auto_triggered_at ?? null;

  if (eveningPressTime !== null) {
    // Abend-Druck ist schon da -> Buzzer ist in jedem Fall aus, egal was sonst gilt.
    return {
      shouldBuzz: false,
      timeConditionMet: false,
      buzzerManuallyTriggered,
      eveningPressTime,
      autoTriggeredAt,
    };
  }

  const sunset = await getSunsetTimeUTC(now);
  const autoDeadline = new Date(sunset.getTime() + AUTO_BUZZ_HOURS_AFTER_SUNSET * 60 * 60 * 1000);
  const timeConditionMet = now >= autoDeadline;

  // Startzeitpunkt der automatischen Erinnerung einmalig festhalten (für die
  // "seit wann piept es"-Anzeige auf Dashboard/Verlauf) - nicht bei jedem
  // Poll-Zyklus neu überschreiben.
  if (timeConditionMet && autoTriggeredAt === null) {
    autoTriggeredAt = now.toISOString();
    const { error: upsertError } = await supabaseAdmin
      .from("daily_status")
      .upsert({ date_key: todayKey, auto_triggered_at: autoTriggeredAt }, { onConflict: "date_key" });
    if (upsertError) throw new Error(upsertError.message);
  }

  return {
    shouldBuzz: timeConditionMet || buzzerManuallyTriggered,
    timeConditionMet,
    buzzerManuallyTriggered,
    eveningPressTime,
    autoTriggeredAt,
  };
}
