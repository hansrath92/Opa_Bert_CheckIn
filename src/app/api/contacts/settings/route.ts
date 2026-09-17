import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const { contact_id, tolerance_hours } = await request.json();

  if (!contact_id || typeof tolerance_hours !== "number" || tolerance_hours <= 0) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contacts")
    .update({ tolerance_hours })
    .eq("id", contact_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
