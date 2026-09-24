import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/lib/appIcon";

// Siehe icon-192.png/route.tsx - selbes Motiv, für manifest.json 512x512.
export async function GET() {
  return new ImageResponse(<AppIconGraphic />, { width: 512, height: 512 });
}
