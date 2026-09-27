import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { notifyStandDown } from "@/lib/escalation";

// "Entwarnung": Nur für den ABEND-Alarm. Jede Person, die für den heutigen
// Abend-Alarm schon benachrichtigt wurde, darf hier "Alles in Ordnung - nur
// nicht gedrückt" bestätigen. Anders als "Ich habe ihn getroffen" (jeder darf
// das melden, siehe /api/incidents/respond) ist dies bewusst auf bereits
// benachrichtigte Personen beschränkt - wer noch gar keine Nachricht bekommen
// hat, weiß auch nichts von einem Alarm, den er entwarnen könnte.
export async function POST(request: NextRequest) {
  const { contact_id } = await request.json().catch(() => ({}));
  if (!contact_id) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const todayKey = getBerlinDateKey(new Date());

  const { data: incident, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .select("id, status")
    .eq("date_key", todayKey)
    .eq("type", "evening")
    .eq("status", "open")
    .maybeSingle();

  if (incidentError) {
    return NextResponse.json({ error: incidentError.message }, { status: 500 });
  }
  if (!incident) {
    return NextResponse.json({ error: "Kein offener Abend-Alarm heute" }, { status: 404 });
  }

  const { data: steps, error: stepsError } = await supabaseAdmin
    .from("incident_contacts")
    .select("id, contact_id, contacts(name)")
    .eq("incident_id", incident.id);

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  const myStep = (steps ?? []).find((step) => step.contact_id === contact_id);
  if (!myStep) {
    return NextResponse.json({ error: "Du wurdest heute noch nicht benachrichtigt" }, { status: 403 });
  }

  const myName = (myStep.contacts as unknown as { name: string } | null)?.name ?? "Jemand";

  // 1. Vorfall auflösen - stoppt künftige "Opa hat sich nicht gemeldet"-
  //    Nachrichten an alle, deren eigene Zeit erst noch käme.
  await supabaseAdmin.from("incidents").update({ status: "resolved" }).eq("id", incident.id);

  // 2. Eigenen Schritt als beantwortet vermerken.
  await supabaseAdmin
    .from("incident_contacts")
    .update({ responded_at: new Date().toISOString(), response: "stood_down" })
    .eq("id", myStep.id);

  // 3. Piepser bei Opa stoppen - genau wie bei einem echten Knopfdruck, aber
  //    über ein eigenes Feld (kein vorgetäuschter Druck, siehe daily_status).
  const { error: statusError } = await supabaseAdmin
    .from("daily_status")
    .upsert({ date_key: todayKey, evening_stood_down_at: new Date().toISOString() }, { onConflict: "date_key" });
  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  // 4. Fürs Verlauf-Tab protokollieren.
  await supabaseAdmin.from("evening_stand_downs").insert({ contact_id });

  // 5. Alle anderen bereits benachrichtigten Personen informieren. Ein
  //    Fehler beim Push darf die Entwarnung selbst nicht scheitern lassen.
  const otherContactIds = (steps ?? []).map((step) => step.contact_id).filter((id) => id !== contact_id);
  try {
    await notifyStandDown(otherContactIds, myName);
  } catch (error) {
    console.error("Entwarnungs-Push fehlgeschlagen:", error);
  }

  return NextResponse.json({ status: "entwarnt" });
}
