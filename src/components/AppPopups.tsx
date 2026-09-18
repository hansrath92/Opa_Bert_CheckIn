"use client";

import { useEffect, useState } from "react";
import { CURRENT_VERSION, ChangelogEntry, getChangesSince } from "@/lib/changelog";
import OnboardingModal from "./OnboardingModal";
import WhatsNewModal from "./WhatsNewModal";

const VERSION_KEY = "opa-checkin-last-seen-version";
const ONBOARDING_KEY = "opa-checkin-onboarding-seen";

// Steuert zentral, welches der beiden Popups (falls überhaupt eins) erscheint.
// Wichtig laut CLAUDE.md: beide dürfen nie gleichzeitig auftreten, und eine
// komplett neue Person sieht NUR die Einführung, nie rückwirkend "Was ist neu".
// Deshalb hier an einer Stelle entscheiden, statt zwei Komponenten unabhängig
// voneinander in localStorage lesen/schreiben zu lassen.
export default function AppPopups() {
  const [view, setView] = useState<"none" | "onboarding" | "whatsnew">("none");
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(VERSION_KEY);
    const onboardingSeen = localStorage.getItem(ONBOARDING_KEY);

    if (lastSeenVersion === null) {
      // Ganz neue Person: Version still merken (kein rückwirkendes "Was ist
      // neu" für Versionen, die sie nie ohne diese Funktion erlebt hat).
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      if (!onboardingSeen) {
        setView("onboarding");
      }
      return;
    }

    if (lastSeenVersion === CURRENT_VERSION) return;
    const relevant = getChangesSince(lastSeenVersion);
    if (relevant.length > 0) {
      setChangelogEntries(relevant);
      setView("whatsnew");
    }
  }, []);

  if (view === "onboarding") {
    return (
      <OnboardingModal
        onClose={() => {
          localStorage.setItem(ONBOARDING_KEY, "true");
          setView("none");
        }}
      />
    );
  }

  if (view === "whatsnew") {
    return (
      <WhatsNewModal
        entries={changelogEntries}
        onClose={() => {
          localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
          setView("none");
        }}
      />
    );
  }

  return null;
}
