// Gemeinsame Grafik für alle Icon-Varianten (Favicon, Apple-Touch-Icon, PWA-
// Manifest-Icons) - an einer Stelle gepflegt statt vierfach dupliziert.
// Motiv "Puls-Signal": abstrakte, konzentrische Ringe um einen Punkt - steht
// für "Lebenszeichen"/Verbindung, bewusst reduzierter als ein wörtliches
// Knopf-Motiv. Farbe an das Redesign-v2-Grün angeglichen (war Teal #0F766E).
export function AppIconGraphic({ borderRadius = 0 }: { borderRadius?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2F6B4F",
        borderRadius,
      }}
    >
      <svg width="70%" height="70%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" stroke="white" strokeOpacity="0.35" strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r="24" stroke="white" strokeOpacity="0.65" strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r="9" fill="white" />
      </svg>
    </div>
  );
}
