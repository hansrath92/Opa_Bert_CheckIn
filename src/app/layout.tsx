import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";
import AppPopups from "@/components/AppPopups";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Opa-Checkin",
  description: "Check-in App für Opa",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        <TabBar />
        <AppPopups />
      </body>
    </html>
  );
}
