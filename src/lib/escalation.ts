import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinTimeLabel } from "@/lib/press";

// Erst bei tatsächlichem Bedarf aufrufen, nicht beim Laden des Moduls:
// web-push wirft sofort einen Fehler, wenn die Keys fehlen/leer sind - das
// würde sonst schon den Next.js-Build crashen, falls die Env-Variablen
// (noch) nicht gesetzt sind, bevor überhaupt eine Push-Nachricht verschickt wird.
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    "mailto:opa-checkin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

export type IncidentType = "morning" | "evening";

export type Contact = {
  id: string;
  name: string;
  tolerance_hours: number;
};

// Liefert die Kontakte für die MORGEN-Eskalationskette, sortiert nach ihrer
// eigenen Toleranz-Zeit (aufsteigend). Diese Reihenfolge bestimmt, wer zuerst
// kontaktiert wird und wie es danach weitergeht. Wer den Master-Schalter oder
// "bei verpasstem Check-in" ausgeschaltet hat, ist nicht in der Kette.
// (Abends gibt es keine Kette mehr - siehe processEvening im check-alarm-Cron.)
export async function getContactsByPriority(): Promise<Contact[]> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours")
    .eq("notifications_enabled", true)
    .eq("notify_on_missed_checkin", true)
    .order("tolerance_hours", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function messageFor(type: IncidentType): string {
  return type === "morning"
    ? "Opa hat sich heute Morgen noch nicht gemeldet. Bitte melde dich in der App zurück."
    : "Opa hat sich heute Abend noch nicht gemeldet. Bitte melde dich in der App zurück.";
}

// Alarm-Nachricht "Opa hat sich nicht gemeldet" an einen Kontakt.
export async function notifyContact(contactId: string, type: IncidentType): Promise<void> {
  await sendPushToContact(contactId, messageFor(type));
}

// Opt-in-Nachricht bei JEDEM Knopfdruck an alle, die notify_on_every_press
// UND den Master-Schalter an haben. Fehler bei einzelnen Personen blockieren
// die anderen nicht (allSettled).
export async function notifyEveryPressSubscribers(type: IncidentType, pressedAt: Date): Promise<void> {
  const { data: contacts, error } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("notifications_enabled", true)
    .eq("notify_on_every_press", true);

  if (error) throw new Error(error.message);

  const what = type === "morning" ? "Guten Morgen" : "Gute Nacht";
  const body = `Opa hat sich gemeldet: ${what} um ${getBerlinTimeLabel(pressedAt)} Uhr`;

  await Promise.allSettled((contacts ?? []).map((contact) => sendPushToContact(contact.id, body)));
}

// Info-Push bei einer "Entwarnung" ("Alles in Ordnung - nur nicht gedrückt")
// an alle ANDEREN Personen, die für den heutigen Abend-Alarm schon
// benachrichtigt wurden - wer die Entwarnung selbst ausgelöst hat, braucht
// keine Nachricht darüber.
export async function notifyStandDown(otherContactIds: string[], byName: string): Promise<void> {
  const body = `Entwarnung von ${byName}: Opa geht es gut, er hat nur nicht gedrückt.`;
  await Promise.allSettled(otherContactIds.map((contactId) => sendPushToContact(contactId, body)));
}

// Schickt eine Push-Nachricht an ALLE Geräte, mit denen sich dieser eine Kontakt
// registriert hat (jemand kann z.B. Handy + Tablet abonniert haben).
async function sendPushToContact(contactId: string, body: string): Promise<void> {
  ensureVapidConfigured();

  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("contact_id", contactId);

  if (error) throw new Error(error.message);

  const payload = JSON.stringify({ title: "Opa-Checkin", body });

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Push-Dienste antworten mit 404/410, wenn ein Abo nicht mehr existiert
  // (z.B. Browser-Daten gelöscht) - solche verwaisten Einträge räumen wir gleich mit auf.
  const expiredIds = (subscriptions ?? [])
    .filter((_, index) => {
      const result = results[index];
      return (
        result.status === "rejected" &&
        (result.reason?.statusCode === 404 || result.reason?.statusCode === 410)
      );
    })
    .map((sub) => sub.id);

  if (expiredIds.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}

// Kontaktiert den nächsten Kontakt in der Prioritäts-Reihenfolge (nach Toleranz-Zeit aufsteigend,
// zyklisch: nach dem letzten geht es wieder zum ersten, falls niemand reagiert hat).
export async function escalateToNextContact(
  incidentId: string,
  type: IncidentType,
  contacts: Contact[],
  currentContactId: string
): Promise<Contact> {
  const currentIndex = contacts.findIndex((c) => c.id === currentContactId);
  const nextIndex = (currentIndex + 1) % contacts.length;
  const nextContact = contacts[nextIndex];

  await supabaseAdmin.from("incident_contacts").insert({
    incident_id: incidentId,
    contact_id: nextContact.id,
  });

  await notifyContact(nextContact.id, type);

  return nextContact;
}

export async function resolveIncident(incidentId: string): Promise<void> {
  await supabaseAdmin.from("incidents").update({ status: "resolved" }).eq("id", incidentId);
}
