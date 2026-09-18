import { ImageResponse } from "next/og";

// Feste URL (/icon-192.png) für manifest.json - die dynamische Favicon-Route
// (icon.tsx) liefert nur eine Standardgröße, PWA-Installation braucht aber
// bekannte, feste Icon-URLs mit definierten Maßen.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F766E",
        }}
      >
        <div
          style={{
            width: "58%",
            height: "58%",
            borderRadius: "50%",
            background: "#B91C1C",
          }}
        />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
