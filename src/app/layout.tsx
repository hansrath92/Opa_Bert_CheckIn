import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import IdentityGate from "@/components/IdentityGate";

// Redesign v2: gut lesbare Schrift statt IBM Plex Sans (Zielgruppe schließt
// Familienmitglieder mit Sehschwäche ein). Nur 400/700 verfügbar - dazwischen
// liegende Gewichte (500/600) im bisherigen Code fallen auf 400/700 zurück.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Opa-Checkin",
  description: "Check-in App für Opa",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinsonHyperlegible.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <IdentityGate>{children}</IdentityGate>
        <Analytics />
      </body>
    </html>
  );
}
