import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const { name, pin, tolerance_hours } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN muss aus genau 4 Ziffern bestehen" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      name,
      pin,
      tolerance_hours: typeof tolerance_hours === "number" ? tolerance_hours : 2,
    })
    .select("id, name, tolerance_hours")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Diese PIN ist schon vergeben, bitte eine andere wählen" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: data });
}
