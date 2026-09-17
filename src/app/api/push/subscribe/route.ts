import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { endpoint, keys, contact_id } = body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth || !contact_id) {
    return NextResponse.json({ error: "Ungültiges Abonnement" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, contact_id },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
