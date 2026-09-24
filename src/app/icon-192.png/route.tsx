import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/lib/appIcon";

// Feste URL (/icon-192.png) für manifest.json - die dynamische Favicon-Route
// (icon.tsx) liefert nur eine Standardgröße, PWA-Installation braucht aber
// bekannte, feste Icon-URLs mit definierten Maßen.
export async function GET() {
  return new ImageResponse(<AppIconGraphic />, { width: 192, height: 192 });
}
