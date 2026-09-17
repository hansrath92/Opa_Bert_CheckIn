import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Legitimiert diesen Server als Absender bei den Push-Diensten der Browser
// (Google/Mozilla/etc.) - ohne das lehnen die Browser die Push-Zustellung ab.
webpush.setVapidDetails(
  "mailto:opa-checkin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type IncidentType = "morning" | "evening";

export type Contact = {
  id: string;
  name: string;
  tolerance_hours: number;
};

// Liefert alle Kontakte, sortiert nach ihrer eigenen Toleranz-Zeit (aufsteigend).
// Diese Reihenfolge bestimmt sowohl, wer beim ersten Alarm zuerst kontaktiert wird,
// als auch die Eskalations-Reihenfolge danach.
export async function getContactsByPriority(): Promise<Contact[]> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours")
    .order("tolerance_hours", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function messageFor(type: IncidentType): string {
  return type === "morning"
    ? "Opa hat sich heute Morgen noch nicht gemeldet. Bitte melde dich in der App zurück."
    : "Opa hat sich heute Abend noch nicht gemeldet. Bitte melde dich in der App zurück.";
}

// Schickt eine Push-Nachricht an ALLE Geräte, mit denen sich dieser eine Kontakt
// registriert hat (jemand kann z.B. Handy + Tablet abonniert haben).
export async function notifyContact(contactId: string, type: IncidentType): Promise<void> {
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("contact_id", contactId);

  if (error) throw new Error(error.message);

  const payload = JSON.stringify({ title: "Opa-Checkin", body: messageFor(type) });

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
