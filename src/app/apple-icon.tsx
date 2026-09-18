import { ImageResponse } from "next/og";

// Für iOS-Homescreen (Next injiziert automatisch <link rel="apple-touch-icon">).
// iOS rundet die Ecken selbst ab, deshalb hier keine eigene borderRadius.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
    { ...size }
  );
}
