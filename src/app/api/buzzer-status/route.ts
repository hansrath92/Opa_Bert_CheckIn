import { NextRequest, NextResponse } from "next/server";
import { computeBuzzerState } from "@/lib/buzzer";

// Der Pi fragt das per Polling ab und steuert den Piezo lokal an.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.PI_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await computeBuzzerState(new Date());
    return NextResponse.json({ shouldBuzz: state.shouldBuzz });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
