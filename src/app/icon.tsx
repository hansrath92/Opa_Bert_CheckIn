import { ImageResponse } from "next/og";

// Next.js erkennt diese Datei automatisch als Favicon (injiziert
// <link rel="icon">). Motiv: Opas roter Knopf auf dem Teal-Marken-Akzent,
// bewusst extrem simpel (zwei Formen, zwei Farben) für Lesbarkeit auch winzig.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
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
