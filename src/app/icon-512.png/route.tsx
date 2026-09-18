import { ImageResponse } from "next/og";

// Siehe icon-192.png/route.tsx - selbes Motiv, für manifest.json 512x512.
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
    { width: 512, height: 512 }
  );
}
