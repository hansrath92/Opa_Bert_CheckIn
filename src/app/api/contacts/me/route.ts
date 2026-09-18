import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVerifiedContactId } from "@/lib/session";

// Liefert die Daten des aktuell eingeloggten Kontakts. Ersetzt den früheren
// localStorage-Cache als Datenquelle - die Session ist jetzt die einzige
// Wahrheit darüber, wer eingeloggt ist.
export async function GET(request: NextRequest) {
  const contactId = await getVerifiedContactId(request);
  if (!contactId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours")
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Kontakt nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}
