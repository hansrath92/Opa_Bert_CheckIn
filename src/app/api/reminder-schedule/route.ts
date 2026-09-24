import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSunsetTimeUTC } from "@/lib/sunset";

// Öffentlich (wie /api/contacts/list) - zeigt transparent, zu welcher Uhrzeit
// heute jeder Kontakt (Sonnenuntergang + eigene Toleranz-Stunden) an der
// Reihe wäre, falls die Meldung fehlt. Nur der erste in der Kette hat eine
// wirklich garantierte Uhrzeit - alle weiteren hängen zusätzlich davon ab,
// wie lange die Eskalation bis zu ihnen braucht (60 Min. pro Schritt) - das
// wird hier bewusst nicht mitgerechnet, um es einfach und nachvollziehbar
// zu halten.
export async function GET() {
  const now = new Date();

  let sunset: Date;
  try {
    sunset = await getSunsetTimeUTC(now);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("name, tolerance_hours")
    .order("tolerance_hours", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedule = (data ?? []).map((contact) => ({
    name: contact.name,
    tolerance_hours: contact.tolerance_hours,
    deadline: new Date(sunset.getTime() + contact.tolerance_hours * 60 * 60 * 1000).toISOString(),
  }));

  return NextResponse.json({ sunset: sunset.toISOString(), schedule });
}
