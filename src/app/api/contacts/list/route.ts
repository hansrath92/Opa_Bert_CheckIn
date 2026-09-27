import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Öffentlich (keine PIN nötig) - gibt Name, Toleranz-Zeit und ID zurück
// (ID wird für die Namensauswahl in IdentityGate gebraucht), niemals die
// PIN. Zeigt der Familie transparent die Eskalations-Reihenfolge.
// force-dynamic: ohne Cookies/Header/URL-Parameter würde Next.js dieses GET
// sonst statisch cachen - eine neu beigetretene Person würde in der
// Namensauswahl dann nicht auftauchen, bis neu deployed wird.
export const dynamic = "force-dynamic";

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
