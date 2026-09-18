import { NextRequest, NextResponse } from "next/server";
import { getVerifiedContactId } from "@/lib/session";

// Schützt das gesamte Dashboard hinter dem PIN-Login: ohne gültige Session
// geht's nur noch zur Login-Seite. API-Routen, statische Next-Assets und die
// PWA-Dateien (Service Worker, Manifest) bleiben absichtlich ausgenommen,
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
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
