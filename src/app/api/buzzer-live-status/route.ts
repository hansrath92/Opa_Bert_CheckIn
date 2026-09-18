import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { computeBuzzerState } from "@/lib/buzzer";

// Für das Dashboard (Heute-Seite) - kein PI_API_SECRET nötig, die Seite ist
// durch middleware.ts ohnehin nur eingeloggt erreichbar. Liefert zusätzlich
// zu "shouldBuzz" den frühesten Zeitpunkt, seit dem heute erinnert wird.
export async function GET() {
  try {
    const now = new Date();
    const state = await computeBuzzerState(now);

    if (!state.shouldBuzz) {
      return NextResponse.json({ shouldBuzz: false, activeSince: null });
    }

    const candidates: number[] = [];
    if (state.timeConditionMet && state.autoTriggeredAt) {
      candidates.push(new Date(state.autoTriggeredAt).getTime());
    }

    if (state.buzzerManuallyTriggered) {
      const { data: triggers, error } = await supabaseAdmin
        .from("buzzer_triggers")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const todayKey = getBerlinDateKey(now);
      const todaysTimes = (triggers ?? [])
        .filter((t) => getBerlinDateKey(new Date(t.created_at)) === todayKey)
        .map((t) => new Date(t.created_at).getTime());

      if (todaysTimes.length > 0) {
        candidates.push(Math.min(...todaysTimes));
      }
    }

    const activeSince = candidates.length > 0 ? new Date(Math.min(...candidates)).toISOString() : null;

    return NextResponse.json({ shouldBuzz: true, activeSince });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
