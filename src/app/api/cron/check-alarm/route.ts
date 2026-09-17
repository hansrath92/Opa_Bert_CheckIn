import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey, getBerlinTimeAsUTC } from "@/lib/press";
import { getSunsetTimeUTC } from "@/lib/sunset";
import {
  Contact,
  IncidentType,
  escalateToNextContact,
  getContactsByPriority,
  notifyContact,
} from "@/lib/escalation";

// Nach wie vielen Minuten ohne Rückmeldung (oder bei "nicht erreicht") zum
// nächsten Kontakt in der Prioritäts-Liste weitergegangen wird.
const ESCALATION_TIMEOUT_MINUTES = 60;
// Feste Morgen-Grenze (im Gegensatz zum Abend, der vom Sonnenuntergang abhängt).
const MORNING_DEADLINE_HOUR = 11;

async function processIncidentType(
  type: IncidentType,
  deadline: Date,
  now: Date,
  todayKey: string,
  hasPressToday: boolean,
  contacts: Contact[]
) {
  const { data: existingIncident, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .select("id, status")
    .eq("date_key", todayKey)
    .eq("type", type)
    .maybeSingle();

  if (incidentError) throw new Error(incidentError.message);

  if (existingIncident?.status === "resolved") {
    return { type, status: "bereits gelöst" };
  }

  if (!existingIncident) {
    if (hasPressToday) return { type, status: "ok" };
    if (now < deadline) return { type, status: "zu früh", deadline: deadline.toISOString() };

    const { data: newIncident, error: createError } = await supabaseAdmin
      .from("incidents")
      .insert({ date_key: todayKey, type, status: "open" })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);

    const firstContact = contacts[0];
    await supabaseAdmin.from("incident_contacts").insert({
      incident_id: newIncident.id,
      contact_id: firstContact.id,
    });

    await notifyContact(firstContact.id, type);

    return { type, status: "alarm gestartet", kontaktiert: firstContact.name };
  }

  const { data: currentStep, error: stepError } = await supabaseAdmin
    .from("incident_contacts")
    .select("id, contact_id, notified_at, responded_at, response")
    .eq("incident_id", existingIncident.id)
    .order("notified_at", { ascending: false })
    .limit(1)
    .single();
  if (stepError) throw new Error(stepError.message);

  if (currentStep.response === "met_opa") {
    await supabaseAdmin
      .from("incidents")
      .update({ status: "resolved" })
      .eq("id", existingIncident.id);
    return { type, status: "gelöst" };
  }

  const minutesSinceNotified =
    (now.getTime() - new Date(currentStep.notified_at).getTime()) / (60 * 1000);
  const shouldEscalate =
    currentStep.response === "could_not_reach" ||
    minutesSinceNotified >= ESCALATION_TIMEOUT_MINUTES;

  if (!shouldEscalate) {
    return { type, status: "warte auf Rückmeldung" };
  }

  const nextContact = await escalateToNextContact(
    existingIncident.id,
    type,
    contacts,
    currentStep.contact_id
  );

  return { type, status: "eskaliert", kontaktiert: nextContact.name };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayKey = getBerlinDateKey(now);

  const contacts = await getContactsByPriority();
  if (contacts.length === 0) {
    return NextResponse.json({ status: "keine Kontakte hinterlegt" });
  }

  const { data: presses, error: pressesError } = await supabaseAdmin
    .from("presses")
    .select("type, created_at")
    .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  if (pressesError) {
    return NextResponse.json({ error: pressesError.message }, { status: 500 });
  }

  const hasPressTodayOfType = (type: "morning" | "evening") =>
    (presses ?? []).some(
      (row) => row.type === type && getBerlinDateKey(new Date(row.created_at)) === todayKey
    );

  try {
    const morningDeadline = getBerlinTimeAsUTC(now, MORNING_DEADLINE_HOUR, 0);
    const morningResult = await processIncidentType(
      "morning",
      morningDeadline,
      now,
      todayKey,
      hasPressTodayOfType("morning"),
      contacts
    );

    const sunset = await getSunsetTimeUTC(now);
    const minToleranceHours = contacts[0].tolerance_hours;
    const eveningDeadline = new Date(sunset.getTime() + minToleranceHours * 60 * 60 * 1000);
    const eveningResult = await processIncidentType(
      "evening",
      eveningDeadline,
      now,
      todayKey,
      hasPressTodayOfType("evening"),
      contacts
    );

    return NextResponse.json({ morning: morningResult, evening: eveningResult });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
