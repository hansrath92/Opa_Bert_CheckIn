import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVerifiedContactId } from "@/lib/session";

export async function POST(request: NextRequest) {
  // contact_id kommt bewusst NICHT mehr aus dem Body - sonst könnte jeder,
  // der eine fremde Contact-ID kennt, deren Einstellungen ändern.
  const contactId = await getVerifiedContactId(request);
  if (!contactId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { tolerance_hours } = await request.json();

  if (typeof tolerance_hours !== "number" || tolerance_hours <= 0) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contacts")
    .update({ tolerance_hours })
    .eq("id", contactId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
