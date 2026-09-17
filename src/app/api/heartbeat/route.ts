import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Der Pi ruft das periodisch auf (unabhängig von echten Knopfdrücken), damit wir
// unterscheiden können: "Opa hat einfach nicht gedrückt" vs. "der Pi läuft gar nicht mehr".
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PI_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("pi_heartbeat")
    .upsert({ id: 1, last_seen_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
