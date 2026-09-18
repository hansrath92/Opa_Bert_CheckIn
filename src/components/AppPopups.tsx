"use client";

import { useEffect, useState } from "react";
import { CURRENT_VERSION, ChangelogEntry, getChangesSince } from "@/lib/changelog";
import WhatsNewModal from "./WhatsNewModal";

const VERSION_KEY = "opa-checkin-last-seen-version";

// Nur noch "Was ist neu" - die Erste-Schritte-Einführung wird jetzt direkt
// von IdentityGate nach dem Beitreten ausgelöst, nicht mehr von hier aus.
// Rendert innerhalb von IdentityGates "ready"-Zustand, damit es nicht vor
// abgeschlossener Namensauswahl aufpoppen kann.
export default function AppPopups() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);

  useEffect(() => {
    const lastSeen = localStorage.getItem(VERSION_KEY);

    // Ganz neues Gerät: still merken, kein rückwirkendes "Was ist neu".
    if (lastSeen === null) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      return;
    }

    if (lastSeen === CURRENT_VERSION) return;
    const relevant = getChangesSince(lastSeen);
    if (relevant.length > 0) setEntries(relevant);
  }, []);

  if (!entries) return null;

  return (
    <WhatsNewModal
      entries={entries}
      onClose={() => {
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        setEntries(null);
      }}
    />
  );
}
