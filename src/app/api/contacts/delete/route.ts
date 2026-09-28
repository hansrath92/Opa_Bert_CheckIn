import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Löscht einen Kontakt komplett aus der Familie. Wie überall in dieser App
// gibt es keine getrennte Rolle "Admin" - jede eingeloggte Person darf jeden
// Kontakt entfernen (auch sich selbst), die Bestätigung übernimmt die
// Oberfläche (Rückfrage vor dem Aufruf). Zugehörige Zeilen in anderen
// Tabellen sind per "on delete cascade" verknüpft (siehe Migration 0015),
// verschwinden also automatisch mit.
export async function POST(request: NextRequest) {
  const { contact_id } = await request.json();
  if (!contact_id || typeof contact_id !== "string") {
    return NextResponse.json({ error: "contact_id fehlt" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("contacts").delete().eq("id", contact_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
