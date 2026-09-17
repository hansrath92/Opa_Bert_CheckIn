import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBerlinDateKey } from "@/lib/press";

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
      const { data: step } = await supabaseAdmin
        .from("incident_contacts")
        .select("contact_id, notified_at, responded_at, contacts(name)")
        .eq("incident_id", incident.id)
        .order("notified_at", { ascending: false })
        .limit(1)
        .single();

      return {
        type: incident.type,
        contactId: step?.contact_id ?? null,
        contactName: (step?.contacts as unknown as { name: string } | null)?.name ?? null,
        notifiedAt: step?.notified_at ?? null,
        responded: step?.responded_at !== null && step?.responded_at !== undefined,
      };
    })
  );

  return NextResponse.json({ incidents: results });
}
