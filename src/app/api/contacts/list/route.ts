import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Öffentlich (keine PIN nötig) - gibt bewusst NUR Name und Toleranz-Zeit zurück,
// niemals die PIN. Zeigt der Familie transparent die Eskalations-Reihenfolge.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("name, tolerance_hours")
    .order("tolerance_hours", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}
