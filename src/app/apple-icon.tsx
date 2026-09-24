import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/lib/appIcon";

// Für iOS-Homescreen (Next injiziert automatisch <link rel="apple-touch-icon">).
// iOS rundet die Ecken selbst ab, deshalb hier keine eigene borderRadius.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconGraphic />, { ...size });
}
