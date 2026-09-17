import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const { pin } = await request.json();

  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN muss aus genau 4 Ziffern bestehen" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, tolerance_hours")
    .eq("pin", pin)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "PIN nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}
