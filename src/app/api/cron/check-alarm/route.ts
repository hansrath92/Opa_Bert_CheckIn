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
import {
  NOTIFICATION_SETTINGS_COLUMNS,
  NotificationSettings,
  getPersonalEveningDeadline,
  wantsMissedCheckinAlerts,
} from "@/lib/notification-settings";

// Nach wie vielen Minuten ohne Rückmeldung (oder bei "nicht erreicht") zum
// nächsten Kontakt in der Prioritäts-Liste weitergegangen wird (nur morgens).
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

type EveningContact = NotificationSettings & { id: string; name: string };

// ABENDS: keine Kette mehr, sondern pro Person. Jede Person mit Master-Schalter
// + "bei verpasstem Check-in" an wird zu IHRER persönlichen Zeit benachrichtigt
// (automatisch = Sonnenuntergang + eigene Stunden, oder feste Uhrzeit) - und
// zwar nur EINMAL pro Tag. Wer schon benachrichtigt wurde, steht als Zeile in
// incident_contacts; dadurch bekommt er beim nächsten Cron-Lauf nichts mehr.
// Hat jemand "Ich habe ihn getroffen" gemeldet (Vorfall "resolved") oder ist
// der Abend-Druck da, bekommt niemand mehr etwas.
async function processEvening(now: Date, todayKey: string, hasEveningPress: boolean) {
  const { data: existingIncident, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .select("id, status")
    .eq("date_key", todayKey)
    .eq("type", "evening")
    .maybeSingle();
  if (incidentError) throw new Error(incidentError.message);

  if (existingIncident?.status === "resolved") {
    return { type: "evening", status: "bereits gelöst" };
  }

  if (hasEveningPress) {
    // Druck kam, nachdem der Vorfall schon eröffnet war -> jetzt schließen.
    if (existingIncident) {
      await supabaseAdmin.from("incidents").update({ status: "resolved" }).eq("id", existingIncident.id);
      return { type: "evening", status: "gelöst durch Abend-Druck" };
    }
    return { type: "evening", status: "ok" };
  }

  const { data: contacts, error: contactsError } = await supabaseAdmin
    .from("contacts")
    .select(`id, name, ${NOTIFICATION_SETTINGS_COLUMNS}`)
    .returns<EveningContact[]>();
  if (contactsError) throw new Error(contactsError.message);

  const sunset = await getSunsetTimeUTC(now);
  const due = (contacts ?? []).filter(
    (c) => wantsMissedCheckinAlerts(c) && now >= getPersonalEveningDeadline(c, sunset, now)
  );

  if (due.length === 0) {
    return { type: "evening", status: "noch niemand an der Reihe" };
  }

  // Vorfall beim ersten fälligen Kontakt anlegen (danach wiederverwenden).
  let incidentId = existingIncident?.id;
  if (!incidentId) {
    const { data: newIncident, error: createError } = await supabaseAdmin
      .from("incidents")
      .insert({ date_key: todayKey, type: "evening", status: "open" })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);
    incidentId = newIncident.id;
  }

  const { data: alreadyNotified, error: stepsError } = await supabaseAdmin
    .from("incident_contacts")
    .select("contact_id")
    .eq("incident_id", incidentId);
  if (stepsError) throw new Error(stepsError.message);

  const notifiedIds = new Set((alreadyNotified ?? []).map((row) => row.contact_id));
  const toNotify = due.filter((c) => !notifiedIds.has(c.id));

  for (const contact of toNotify) {
    // Erst eintragen, dann senden: Falls das Senden scheitert, wird trotzdem
    // nicht bei jedem Cron-Lauf erneut versucht (einmal pro Tag).
    await supabaseAdmin.from("incident_contacts").insert({ incident_id: incidentId, contact_id: contact.id });
    try {
      await notifyContact(contact.id, "evening");
    } catch (error) {
      console.error(`Push an ${contact.name} fehlgeschlagen:`, error);
    }
  }

  return {
    type: "evening",
    status: toNotify.length > 0 ? "benachrichtigt" : "alle Fälligen schon benachrichtigt",
    benachrichtigt: toNotify.map((c) => c.name),
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayKey = getBerlinDateKey(now);

  // Nur für den MORGEN (Kette); abends lädt processEvening selbst alle Kontakte.
  const contacts = await getContactsByPriority();

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
    // MORGENS unverändert: Eskalationskette ab 11 Uhr.
    const morningDeadline = getBerlinTimeAsUTC(now, MORNING_DEADLINE_HOUR, 0);
    const morningResult =
      contacts.length === 0
        ? { type: "morning", status: "keine Kontakte mit aktiven Benachrichtigungen" }
        : await processIncidentType(
            "morning",
            morningDeadline,
            now,
            todayKey,
            hasPressTodayOfType("morning"),
            contacts
          );

    const eveningResult = await processEvening(now, todayKey, hasPressTodayOfType("evening"));

    return NextResponse.json({ morning: morningResult, evening: eveningResult });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
