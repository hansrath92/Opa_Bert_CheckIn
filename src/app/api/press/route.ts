import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey, getPressType } from "@/lib/press";
import { notifyEveryPressSubscribers, notifyLatePress } from "@/lib/escalation";

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
  // buzzer_manually_triggered wird bei JEDEM Druck (auch morgens) zurückgesetzt -
  // sonst bleibt ein einzelnes "Opa erinnern" für den Rest des Tages aktiv, selbst
  // wenn Opa längst geantwortet hat, weil das Flag sonst nirgendwo zurückgesetzt wird.
  const dailyStatusUpdate =
    type === "morning"
      ? { morning_press_time: now.toISOString(), buzzer_manually_triggered: false }
      : { evening_press_time: now.toISOString(), buzzer_manually_triggered: false };

  const { error: dailyStatusError } = await supabaseAdmin
    .from("daily_status")
    .upsert(
      { date_key: getBerlinDateKey(now), ...dailyStatusUpdate },
      { onConflict: "date_key" }
    );

  if (dailyStatusError) {
    return NextResponse.json({ error: dailyStatusError.message }, { status: 500 });
  }

  // Jeder echte Druck - egal ob Guten Morgen oder Gute Nacht - beweist, dass
  // Opa gerade wohlauf und aktiv ist. Das macht JEDEN heute noch offenen
  // Alarm gegenstandslos, nicht nur den zum selben Zeitpunkt: ein abendlicher
  // Druck löst also auch einen zuvor verpassten Guten-Morgen-Alarm auf, und
  // ein spät nachgeholter Guten-Morgen-Druck löst eine bereits laufende
  // Eskalation ebenfalls auf. (Der Cron prüft das auch, aber erst beim
  // nächsten Lauf.) Für jeden aufgelösten Vorfall informieren wir zusätzlich
  // alle, die dafür schon benachrichtigt wurden - Opa hat sich ja gerade
  // selbst gemeldet.
  const { data: openIncidentsToday } = await supabaseAdmin
    .from("incidents")
    .select("id")
    .eq("date_key", getBerlinDateKey(now))
    .eq("status", "open");

  if (openIncidentsToday && openIncidentsToday.length > 0) {
    const incidentIds = openIncidentsToday.map((row) => row.id);
    await supabaseAdmin.from("incidents").update({ status: "resolved" }).in("id", incidentIds);

    try {
      const { data: notifiedContacts } = await supabaseAdmin
        .from("incident_contacts")
        .select("contact_id")
        .in("incident_id", incidentIds);
      const contactIds = [...new Set((notifiedContacts ?? []).map((row) => row.contact_id))];
      if (contactIds.length > 0) {
        await notifyLatePress(contactIds, now);
      }
    } catch (pushError) {
      console.error("Info-Push nach spätem Druck fehlgeschlagen:", pushError);
    }
  }

  // Opt-in "bei jedem Knopfdruck benachrichtigen". Ein Fehler hier darf den
  // Knopfdruck selbst NIE scheitern lassen - der ist oben schon gespeichert,
  // und der Pi würde bei einer Fehlerantwort sonst unnötig neu senden.
  try {
    await notifyEveryPressSubscribers(type, now);
  } catch (pushError) {
    console.error("Push bei Knopfdruck fehlgeschlagen:", pushError);
  }

  return NextResponse.json({ success: true, type });
}
