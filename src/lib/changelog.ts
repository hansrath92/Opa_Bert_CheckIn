export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

// Neueste Version zuerst. Kurze Stichpunkte - Details gehören in die Commit-Messages.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.6.3",
    date: "2026-09-23",
    changes: ["Fix: Morgens/Abends auf Heute passen jetzt immer in eine Zeile, gleich große Karten"],
  },
  {
    version: "0.6.2",
    date: "2026-09-23",
    changes: ["Neu: Abmelden-Button in Einstellungen"],
  },
  {
    version: "0.6.1",
    date: "2026-09-23",
    changes: [
      "Einstellungs-Gruppen sind jetzt zugeklappt, mit Status auf einen Blick, volle Details erst nach Antippen",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-23",
    changes: [
      "Einstellungen neu geordnet: klar beschriftete Gruppen statt Kartenkette",
      "Benachrichtigungen zeigen jetzt den echten Status an, auch nach einem Neuladen",
      "Erste-Schritte-Einführung ist jetzt ein echter Rundgang durch die App mit Hervorhebung",
      "Versionshistorie dauerhaft in Einstellungen einsehbar",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-18",
    changes: [
      "Login vereinfacht: Namensauswahl statt PIN-Anmeldung, PIN nur noch optionale Verwechslungs-Absicherung auf neuen Geräten",
      "Erste-Schritte-Einführung jetzt als geführter Mehrschritt-Flow",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-18",
    changes: [
      "Neu: Erste-Schritte-Einführung beim ersten Login, über Einstellungen jederzeit erneut aufrufbar",
      "Neu: Heute zeigt live an, wenn Opa gerade per Piepton erinnert wird - inkl. seit wann; Verlauf zeigt das pro Tag",
      "Neu: eigenes App-Icon",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-18",
    changes: [
      "Sicherheitsfix: Login schützt jetzt das ganze Dashboard, per echter Session statt nachbaubarer Kontakt-ID",
      "Neu: Verlauf zeigt, wer wann 'Opa erinnern' gedrückt hat",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-17",
    changes: [
      "Eskalationskette: Kontakte werden nach eigener Toleranz-Zeit priorisiert und automatisch nacheinander benachrichtigt",
      "Morgen-Alarm (11 Uhr) zusätzlich zum Abend-Alarm",
      "Neue Tab-Navigation: Heute, Verlauf, Einstellungen",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-16",
    changes: ["Erste Version: Dashboard, Pi-Anbindung, Push-Benachrichtigungen"],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;

// Liefert alle Changelog-Einträge, die seit "lastSeenVersion" neu sind.
// Unbekannte Version (z.B. ganz neue Person) -> keine Einträge, kein Popup.
export function getChangesSince(lastSeenVersion: string | null): ChangelogEntry[] {
  if (lastSeenVersion === CURRENT_VERSION) return [];
  const index = CHANGELOG.findIndex((entry) => entry.version === lastSeenVersion);
  if (index === -1) return [];
  return CHANGELOG.slice(0, index);
}
