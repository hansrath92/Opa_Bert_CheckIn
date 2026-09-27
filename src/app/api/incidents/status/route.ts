import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";

type Step = {
  contact_id: string;
  notified_at: string;
  responded_at: string | null;
  contacts: { name: string } | null;
};

export async function GET() {
  const todayKey = getBerlinDateKey(new Date());

  const { data: incidents, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .select("id, type, status")
    .eq("date_key", todayKey)
    .eq("status", "open");

  if (incidentError) {
    return NextResponse.json({ error: incidentError.message }, { status: 500 });
  }

  const results = await Promise.all(
    (incidents ?? []).map(async (incident) => {
      const { data } = await supabaseAdmin
        .from("incident_contacts")
        .select("contact_id, notified_at, responded_at, contacts(name)")
        .eq("incident_id", incident.id)
        .order("notified_at", { ascending: false });
      const steps = (data ?? []) as unknown as Step[];

      // Morgens (Kette) ist nur der zuletzt benachrichtigte Kontakt "dran".
      // Abends werden alle parallel zu ihrer eigenen Zeit benachrichtigt ->
      // jeder, der benachrichtigt wurde und noch nicht geantwortet hat, ist dran.
      const relevantSteps = incident.type === "morning" ? steps.slice(0, 1) : steps;

      return {
        type: incident.type,
        // Namen aller benachrichtigten Kontakte (für "X wurde kontaktiert")
        contactNames: relevantSteps.map((s) => s.contacts?.name).filter(Boolean),
        // Wer eine Rückmeldung geben soll (für "Rückmeldung ausstehend")
        pendingContactIds: relevantSteps.filter((s) => s.responded_at === null).map((s) => s.contact_id),
      };
    })
  );

  return NextResponse.json({ incidents: results });
}
