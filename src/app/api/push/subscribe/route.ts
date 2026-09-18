import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVerifiedContactId } from "@/lib/session";

export async function POST(request: NextRequest) {
  // contact_id kommt bewusst NICHT mehr aus dem Body - sonst könnte jemand
  // die Push-Benachrichtigungen eines fremden Kontakts auf das eigene Gerät umleiten.
  const contactId = await getVerifiedContactId(request);
  if (!contactId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, keys } = body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Ungültiges Abonnement" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, contact_id: contactId },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
