import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import IdentityGate from "@/components/IdentityGate";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Redesign v2: gut lesbare Schrift statt IBM Plex Sans (Zielgruppe schließt
// Familienmitglieder mit Sehschwäche ein). Nur 400/700 verfügbar - dazwischen
// liegende Gewichte (500/600) im bisherigen Code fallen auf 400/700 zurück.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Sichtbarer Name für Nutzer (Browser-Tab, iOS-Homescreen) - der
  // Projektname im Repo/package.json und die Vercel-URL bleiben bewusst
  // "Opa-Checkin"/"opa-bert-check-in", das hier ist nur die Außenbenennung.
  title: "Servus Bert",
  description: "Check-in App für Opa",
  manifest: "/manifest.json",
  // Eigener iOS-Homescreen-Name, unabhängig vom manifest.json short_name -
  // ohne dieses Feld würde Safari sonst ggf. auf den <title> zurückfallen.
  appleWebApp: {
    title: "Servus Bert",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinsonHyperlegible.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Setzt data-theme="dark" (falls gewählt) VOR dem ersten Rendern -
            sonst würde die Seite bei Dunkel-Modus kurz hell aufblitzen. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <IdentityGate>{children}</IdentityGate>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
