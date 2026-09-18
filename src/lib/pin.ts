// SHA-256 über die Web-Crypto-API (wie schon in src/lib/session.ts genutzt).
// Ausschließlich serverseitig aufrufen, damit der Klartext-PIN nie in die
// Datenbank gelangt.
export async function hashPin(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
