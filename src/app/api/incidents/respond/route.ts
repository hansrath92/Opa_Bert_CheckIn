import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";
import { escalateToNextContact, getContactsByPriority, resolveIncident } from "@/lib/escalation";
import { getVerifiedContactId } from "@/lib/session";

export async function POST(request: NextRequest) {
  // contact_id kommt bewusst NICHT mehr aus dem Body - sonst könnte jemand
  // im Namen eines fremden Kontakts eine Eskalation beantworten.
  const contactId = await getVerifiedContactId(request);
  if (!contactId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { type, response } = await request.json();

  if (
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

  const { data: step, error: stepError } = await supabaseAdmin
    .from("incident_contacts")
    .select("id")
    .eq("incident_id", incident.id)
    .eq("contact_id", contactId)
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

  if (response === "met_opa") {
    await resolveIncident(incident.id);
    return NextResponse.json({ status: "gelöst" });
  }

  const contacts = await getContactsByPriority();
  const nextContact = await escalateToNextContact(incident.id, type, contacts, contactId);

  return NextResponse.json({ status: "eskaliert", kontaktiert: nextContact.name });
}
