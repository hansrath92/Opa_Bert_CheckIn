import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildSessionCookie } from "@/lib/session";

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

  // Signiertes Session-Cookie setzen, damit spätere Requests dieses Kontakts
  // server-seitig verifiziert werden können, statt der Client-Angabe zu vertrauen.
  const response = NextResponse.json({ contact: data });
  const cookie = await buildSessionCookie(data.id);
  response.cookies.set(cookie);
  return response;
}
