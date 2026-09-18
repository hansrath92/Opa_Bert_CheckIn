import type { NextRequest } from "next/server";

// Nutzt die Web-Crypto-API (crypto.subtle) statt Node's "crypto"-Modul, weil
// diese Datei sowohl in normalen API-Routes (Node-Runtime) als auch in
// middleware.ts (Edge-Runtime) laufen muss - nur crypto.subtle ist in beiden
// Umgebungen verfügbar.

const COOKIE_NAME = "opa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // ~1 Jahr, damit sich die Familie nicht ständig neu einloggen muss

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signContactId(contactId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET ist nicht gesetzt");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(contactId));
  return toHex(signature);
}

// Vergleicht zwei gleich lange Hex-Strings zeitkonstant, um Timing-Angriffe
// auf die Signaturprüfung zu erschweren.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Nach erfolgreichem Login/Register aufrufen, liefert die Cookie-Optionen für
// NextResponse#cookies.set(...).
export async function buildSessionCookie(contactId: string) {
  const signature = await signContactId(contactId);
  return {
    name: COOKIE_NAME,
    value: `${contactId}.${signature}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

// In geschützten Routen/Middleware aufrufen. Gibt die verifizierte Contact-ID
// zurück, oder null wenn kein/ein ungültiges Cookie vorliegt.
export async function getVerifiedContactId(request: NextRequest): Promise<string | null> {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;

  const contactId = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = await signContactId(contactId);

  return timingSafeEqualHex(signature, expected) ? contactId : null;
}
