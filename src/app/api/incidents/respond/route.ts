import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { escalateToNextContact, getContactsByPriority, resolveIncident } from "@/lib/escalation";

export async function POST(request: NextRequest) {
  const { contact_id, type, response } = await request.json();

  if (
    !contact_id ||
    (type !== "morning" && type !== "evening") ||
    (response !== "met_opa" && response !== "could_not_reach")
  ) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const todayKey = getBerlinDateKey(new Date());

  const { data: incident, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .select("id, status")
    .eq("date_key", todayKey)
    .eq("type", type)
    .eq("status", "open")
    .maybeSingle();

  if (incidentError) {
    return NextResponse.json({ error: incidentError.message }, { status: 500 });
  }
  if (!incident) {
    return NextResponse.json({ error: "Kein offener Vorfall heute" }, { status: 404 });
  }

  // "met_opa" darf JEDER Kontakt melden, nicht nur der gerade aktuell
  // benachrichtigte - wer zufällig bei Opa vorbeischaut, soll den Vorfall
  // auch auflösen können, ohne erst an der Reihe zu sein.
  if (response === "met_opa") {
    const { data: step } = await supabaseAdmin
      .from("incident_contacts")
      .select("id")
      .eq("incident_id", incident.id)
      .eq("contact_id", contact_id)
      .is("responded_at", null)
      .maybeSingle();

    if (step) {
      await supabaseAdmin
        .from("incident_contacts")
        .update({ responded_at: new Date().toISOString(), response })
        .eq("id", step.id);
    }

    await resolveIncident(incident.id);
    return NextResponse.json({ status: "gelöst" });
  }

  // "could_not_reach" eskaliert zum nächsten Kontakt in der Kette - das
  // ergibt nur Sinn für den gerade aktuell benachrichtigten Kontakt.
  const { data: step, error: stepError } = await supabaseAdmin
    .from("incident_contacts")
    .select("id")
    .eq("incident_id", incident.id)
    .eq("contact_id", contact_id)
    .is("responded_at", null)
    .maybeSingle();

  if (stepError) {
    return NextResponse.json({ error: stepError.message }, { status: 500 });
  }
  if (!step) {
    return NextResponse.json(
      { error: "Du bist aktuell nicht an der Reihe" },
      { status: 403 }
    );
  }

  await supabaseAdmin
    .from("incident_contacts")
    .update({ responded_at: new Date().toISOString(), response })
    .eq("id", step.id);

  const contacts = await getContactsByPriority();
  const nextContact = await escalateToNextContact(incident.id, type, contacts, contact_id);

  return NextResponse.json({ status: "eskaliert", kontaktiert: nextContact.name });
}
