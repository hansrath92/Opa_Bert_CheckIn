import { NextRequest, NextResponse } from "next/server";
import { getVerifiedContactId } from "@/lib/session";

// Schützt das gesamte Dashboard hinter dem PIN-Login: ohne gültige Session
// geht's nur noch zur Login-Seite. API-Routen, statische Next-Assets, die
// PWA-Dateien (Service Worker, Manifest) und die Icon-Routen bleiben
// absichtlich ausgenommen (Icons/Manifest müssen z.B. schon auf der
// Login-Seite selbst und bei der PWA-Installation ohne Session ladbar sein),
// siehe matcher unten.
export async function middleware(request: NextRequest) {
  const contactId = await getVerifiedContactId(request);
  if (contactId) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon).*)",
  ],
};
