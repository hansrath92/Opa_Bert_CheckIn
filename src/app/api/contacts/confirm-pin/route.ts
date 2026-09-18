import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPin } from "@/lib/pin";

// Ersetzt die frühere /api/contacts/login-Route: der Name wird jetzt VORHER
// aus einer Liste gewählt (siehe IdentityGate), hier wird nur noch die PIN
// für genau diesen einen Kontakt bestätigt - als Verwechslungs-Absicherung
// auf einem neuen Gerät, kein echtes Login/Session mehr.
export async function POST(request: NextRequest) {
  const { contact_id, pin } = await request.json();

  if (!contact_id || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours, pin_hash")
    .eq("id", contact_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Kontakt nicht gefunden" }, { status: 404 });
  }

  const hash = await hashPin(pin);
  if (hash !== data.pin_hash) {
    return NextResponse.json({ error: "PIN stimmt nicht" }, { status: 401 });
  }

  return NextResponse.json({
    contact: { id: data.id, name: data.name, tolerance_hours: data.tolerance_hours },
  });
}
