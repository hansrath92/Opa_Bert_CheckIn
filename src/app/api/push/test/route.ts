import { NextRequest, NextResponse } from "next/server";
import { sendPushToContact } from "@/lib/escalation";

// Schickt eine harmlose Testnachricht an genau eine Person, um auf diesem
// Gerät zu prüfen, ob Push-Benachrichtigungen wirklich ankommen - ohne
// Seiteneffekte auf Verlauf/Alarme (anders als z.B. ein echter Knopfdruck,
// der extra dafür simuliert würde).
export async function POST(request: NextRequest) {
  const { contact_id } = await request.json();
  if (!contact_id) {
    return NextResponse.json({ error: "contact_id fehlt" }, { status: 400 });
  }

  const sentCount = await sendPushToContact(
    contact_id,
    "Das ist eine Testbenachrichtigung. Wenn du das liest, funktionieren Push-Nachrichten auf diesem Gerät."
  );

  if (sentCount === 0) {
    return NextResponse.json(
      { error: "Kein Gerät für diese Person registriert. Zuerst \"Push auf diesem Gerät\" aktivieren." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
