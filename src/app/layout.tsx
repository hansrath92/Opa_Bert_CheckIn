import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import IdentityGate from "@/components/IdentityGate";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Sichtbarer Name für Nutzer (Browser-Tab, iOS-Homescreen) - der
  // Projektname im Repo/package.json und die Vercel-URL bleiben bewusst
  // "Opa-Checkin"/"opa-bert-check-in", das hier ist nur die Außenbenennung.
  title: "Lebenszeichen",
  description: "Check-in App für Opa",
  manifest: "/manifest.json",
  // Eigener iOS-Homescreen-Name, unabhängig vom manifest.json short_name -
  // ohne dieses Feld würde Safari sonst ggf. auf den <title> zurückfallen.
  appleWebApp: {
    title: "Lebenszeichen",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <IdentityGate>{children}</IdentityGate>
        <Analytics />
      </body>
    </html>
  );
}
