import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/lib/appIcon";

// Next.js erkennt diese Datei automatisch als Favicon (injiziert
// <link rel="icon">). Motiv: "Puls-Signal" - siehe src/lib/appIcon.tsx.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIconGraphic borderRadius={7} />, { ...size });
}
