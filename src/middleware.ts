import { NextRequest, NextResponse } from "next/server";
import { getVerifiedContactId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Schützt das gesamte Dashboard hinter dem PIN-Login: ohne gültige Session
// geht's nur noch zur Login-Seite. API-Routen, statische Next-Assets, die
// PWA-Dateien (Service Worker, Manifest) und die Icon-Routen bleiben
// absichtlich ausgenommen (Icons/Manifest müssen z.B. schon auf der
// Login-Seite selbst und bei der PWA-Installation ohne Session ladbar sein),
// siehe matcher unten.
export async function middleware(request: NextRequest) {
  const contactId = await getVerifiedContactId(request);

  // Ein Cookie kann korrekt signiert, aber "verwaist" sein - z.B. wenn der
  // Kontakt danach aus der Datenbank gelöscht wurde (etwa beim Testen).
  // Ohne diese Prüfung würde man auf der App-Oberfläche landen, aber jede
  // Aktion würde ins Leere laufen, ohne je wieder zu /login zu kommen.
  const contactExists =
    contactId !== null &&
    (await supabaseAdmin.from("contacts").select("id").eq("id", contactId).maybeSingle()).data !== null;

  if (contactExists) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete("opa_session");
  return response;
}

export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon).*)",
  ],
};
