import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Öffentlich (keine PIN nötig) - gibt Name, Toleranz-Zeit und ID zurück
// (ID wird für die Namensauswahl in IdentityGate gebraucht), niemals die
// PIN. Zeigt der Familie transparent die Eskalations-Reihenfolge.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours")
    .order("tolerance_hours", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}
