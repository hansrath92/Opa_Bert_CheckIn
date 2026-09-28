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
  eveningStoodDownAt: string | null;
  buzzerSnoozedAt: string | null;
};

// Gemeinsame Logik für /api/buzzer-status (vom Pi gepollt) und
// /api/buzzer-live-status (vom Dashboard gepollt) - damit beide Seiten
// garantiert denselben "soll piepen"-Zustand sehen.
export async function computeBuzzerState(now: Date): Promise<BuzzerState> {
  const todayKey = getBerlinDateKey(now);

  const { data: status, error } = await supabaseAdmin
    .from("daily_status")
    .select("evening_press_time, buzzer_manually_triggered, auto_triggered_at, evening_stood_down_at, buzzer_snoozed_at")
    .eq("date_key", todayKey)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const eveningPressTime = status?.evening_press_time ?? null;
  const buzzerManuallyTriggered = status?.buzzer_manually_triggered ?? false;
  const eveningStoodDownAt = status?.evening_stood_down_at ?? null;
  const buzzerSnoozedAt = status?.buzzer_snoozed_at ?? null;
  let autoTriggeredAt: string | null = status?.auto_triggered_at ?? null;

  // Abend-Druck ODER Entwarnung ("Alles in Ordnung - nur nicht gedrückt") ->
  // Buzzer ist in jedem Fall aus, egal was sonst gilt. Eine Entwarnung zählt
  // dabei bewusst NICHT als echter Druck (siehe evening_press_time-Feld) -
  // sie stoppt nur den Piepser, ohne einen Knopfdruck vorzutäuschen.
  if (eveningPressTime !== null || eveningStoodDownAt !== null) {
    return {
      shouldBuzz: false,
      timeConditionMet: false,
      buzzerManuallyTriggered,
      eveningPressTime,
      autoTriggeredAt,
      eveningStoodDownAt,
      buzzerSnoozedAt,
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

  // Bug-Fix: früher überstimmte die automatische Zeitbedingung jedes manuelle
  // Stoppen, sobald sie einmal eingetreten war ("shouldBuzz: timeConditionMet
  // || buzzerManuallyTriggered" - true bleibt true). Jetzt gilt: einmal
  // bewusst gestoppt (buzzerSnoozedAt gesetzt), bleibt die automatische
  // Bedingung für den Rest des Tages stumm, bis jemand den Buzzer über
  // /api/buzzer-trigger wieder aktiv einschaltet (das löscht buzzerSnoozedAt).
  const automaticStillActive = timeConditionMet && buzzerSnoozedAt === null;

  return {
    shouldBuzz: automaticStillActive || buzzerManuallyTriggered,
    timeConditionMet,
    buzzerManuallyTriggered,
    eveningPressTime,
    autoTriggeredAt,
    eveningStoodDownAt,
    buzzerSnoozedAt,
  };
}
