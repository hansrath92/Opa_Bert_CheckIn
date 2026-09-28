import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPin } from "@/lib/pin";

export async function POST(request: NextRequest) {
  const { name, pin, tolerance_hours } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN muss aus genau 4 Ziffern bestehen" }, { status: 400 });
  }

  const pin_hash = await hashPin(pin);

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      name,
      pin_hash,
      tolerance_hours: typeof tolerance_hours === "number" ? tolerance_hours : 2,
    })
    .select("id, name, tolerance_hours")
    .single();

  // PINs sind bewusst NICHT eindeutig (siehe Migration 0014) - sie dienen nur
  // als Verwechslungs-Absicherung nach der Namensauswahl (confirm-pin prüft
  // gegen die PIN genau des schon ausgewählten Kontakts), nie zum
  // Nachschlagen einer Person. Zwei Personen dürfen also dieselbe PIN haben.
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}
