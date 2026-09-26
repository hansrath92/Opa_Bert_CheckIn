"use client";

import { useEffect, useState } from "react";
import { CURRENT_VERSION, ChangelogEntry, getChangesSince } from "@/lib/changelog";
import { getPushSubscriptionStatus } from "@/lib/push";
import WhatsNewModal from "./WhatsNewModal";
import PushReminderModal from "./PushReminderModal";
import { useContact } from "./IdentityGate";

const VERSION_KEY = "opa-checkin-last-seen-version";
// Datum (YYYY-MM-DD, Berliner Zeit), an dem die Benachrichtigungs-Erinnerung
// zuletzt gezeigt wurde - so erscheint sie höchstens einmal pro Tag.
const PUSH_REMINDER_KEY = "opa-checkin-push-reminder-shown";

function todayInBerlin(): string {
  // "sv-SE" liefert praktischerweise das Format YYYY-MM-DD.
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

// Steuert alle automatischen Popups. Es ist immer höchstens EINES sichtbar,
// in dieser Rangfolge:
//   1. Erste-Schritte-Rundgang (wird von IdentityGate gezeigt, hier nur beachtet)
//   2. "Was ist neu"
//   3. Erinnerung "Benachrichtigungen sind aus" (max. einmal pro Tag)
// Rendert innerhalb von IdentityGates "ready"-Zustand, damit nichts vor
// abgeschlossener Namensauswahl aufpoppen kann (und nie auf dem Server -
// deshalb ist localStorage hier direkt lesbar).
export default function AppPopups({
  onboardingActive,
  onboardingSeen,
}: {
  onboardingActive: boolean;
  // true, wenn in dieser Sitzung schon der Rundgang lief: Dann nicht direkt
  // danach noch die Erinnerung obendrauf - der Rundgang zeigt die
  // Benachrichtigungen ja schon. Am nächsten Tag kommt sie dann regulär.
  onboardingSeen: boolean;
}) {
  const contact = useContact();
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [pushOff, setPushOff] = useState(false);
  const [reminderDoneToday, setReminderDoneToday] = useState(
    () => localStorage.getItem(PUSH_REMINDER_KEY) === todayInBerlin()
  );

  useEffect(() => {
    const lastSeen = localStorage.getItem(VERSION_KEY);

    // Ganz neues Gerät: still merken, kein rückwirkendes "Was ist neu".
    if (lastSeen === null) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } else if (lastSeen !== CURRENT_VERSION) {
      const relevant = getChangesSince(lastSeen);
      if (relevant.length > 0) setEntries(relevant);
    }

    // Echten Browser-Abo-Status prüfen (nicht nur einen lokalen Merker).
    getPushSubscriptionStatus().then((isActive) => setPushOff(!isActive));
  }, []);

  // Erinnerung nur, wenn gerade kein anderes Popup offen ist - sie erscheint
  // also z.B. direkt nachdem "Was ist neu" mit "Verstanden" geschlossen wurde.
  const showPushReminder = pushOff && !reminderDoneToday && !onboardingActive && !onboardingSeen && !entries;

  // Sobald sie sichtbar ist, für heute als "gezeigt" merken - auch wenn die
  // App einfach geschlossen wird, statt "Später" zu tippen.
  useEffect(() => {
    if (showPushReminder) localStorage.setItem(PUSH_REMINDER_KEY, todayInBerlin());
  }, [showPushReminder]);

  if (onboardingActive) return null;

  if (entries) {
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

  if (showPushReminder) {
    return <PushReminderModal contactId={contact.id} onClose={() => setReminderDoneToday(true)} />;
  }

  return null;
}
