export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

// Neueste Version zuerst. Kurze Stichpunkte - Details gehören in die Commit-Messages.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.12.4",
    date: "2026-09-27",
    changes: ["Pi: Entprellzeit testweise weiter auf 30 ms gesenkt (zusammen mit der 50ms-Nachprüfung 80 ms gesamt) für sehr schnelles Antippen"],
  },
  {
    version: "1.12.3",
    date: "2026-09-27",
    changes: ["Pi: Entprellzeit 250 -> 150 ms, damit auch ein sehr schnelles Antippen zuverlässig ankommt"],
  },
  {
    version: "1.12.2",
    date: "2026-09-27",
    changes: ["Vercel Speed Insights aktiviert, um die Ladegeschwindigkeit der App im Blick zu behalten"],
  },
  {
    version: "1.12.1",
    date: "2026-09-27",
    changes: [
      "Heutiger Verlauf auf Heute wieder entfernt (doppelt mit der 7-Tage-Übersicht)",
      "Fix: Erinnerung aktiv konnte manchmal nicht gestoppt werden, weil die automatische Zeitbedingung ein manuelles Stoppen sofort wieder überstimmte",
      "Neu: Wurde die Erinnerung heute schon mal gestoppt, zeigt die Kachel Erinnerung wurde um HH:MM Uhr zurückgesetzt",
    ],
  },
  {
    version: "1.12.0",
    date: "2026-09-27",
    changes: [
      "Status-Kachel auf Heute komplett neu aufgebaut: Icon, Titel und Untertext oben, darunter Guten-Morgen/Gute-Nacht als eigene farbige Zeilen direkt in der Kachel",
      "Neue Wartend-Farbe für kommt noch-Zustände, getrennt von Grün (erledigt) und Orange (Alarm)",
      "Heutiger Verlauf zeigt jetzt auch Erinnerungen und Entwarnungen mit farbigem Punkt, nicht mehr nur Knopfdrücke, und ist bei erledigtem Tag automatisch aufgeklappt",
      "7-Tage-Übersicht: Sonne/Mond jetzt als gefüllte Kreise, ausführlicherer Detailtext inkl. Entwarnungs-Namen, Auswahl-Hervorhebung",
      "Aufgelöster Zustand zeigt jetzt, wodurch: Entwarnung von Name oder Opa hat sich um HH:MM Uhr gemeldet",
    ],
  },
  {
    version: "1.11.1",
    date: "2026-09-27",
    changes: [
      "Fix: Status-Kachel zeigte direkt nach Mitternacht fälschlich schon Gute Nacht kommt noch statt Guten Morgen kommt noch",
      "Fix: Ein echter Knopfdruck löste einen offenen Abend-Alarm zwar in der Datenbank auf, das Dashboard blieb aber auch nach Neuladen hängen",
      "Neu: Löst ein echter Druck einen offenen Alarm auf, bekommen alle bereits benachrichtigten Personen eine Info-Push (Opa hat sich gerade gemeldet - alles gut)",
    ],
  },
  {
    version: "1.11.0",
    date: "2026-09-27",
    changes: ["Neu: In Erinnerungszeiten heute springt Bearbeiten bei deiner eigenen Zeile direkt zu Meine Benachrichtigungen"],
  },
  {
    version: "1.10.4",
    date: "2026-09-27",
    changes: [
      "Fix: Onboarding-Erklärung deckte teilweise den gerade erklärten Button zu - zeigt jetzt oben statt unten an, wenn nötig",
    ],
  },
  {
    version: "1.10.3",
    date: "2026-09-27",
    changes: ["Erste Schritte erneut ansehen steht jetzt gleich oben in So funktioniert's, vor der ausführlichen Beschreibung"],
  },
  {
    version: "1.10.2",
    date: "2026-09-27",
    changes: ["Onboarding-Rundgang: neuer Schritt erklärt jetzt auch Alles in Ordnung (Entwarnung)"],
  },
  {
    version: "1.10.1",
    date: "2026-09-27",
    changes: [
      "So funktioniert's komplett neu geschrieben, spiegelt jetzt die aktuellen Funktionen wider",
      "Erste Schritte erneut ansehen ist von Version zu So funktioniert's umgezogen (thematisch passender)",
    ],
  },
  {
    version: "1.10.0",
    date: "2026-09-27",
    changes: [
      "Erste-Schritte-Rundgang deutlich ausführlicher: erklärt jetzt Schritt für Schritt die ganze App (12 statt 4 Stationen), mit Zurück-Möglichkeit",
      "Was ist neu zeigt jetzt immer nur die allerletzte Version, nicht mehr alle übersprungenen auf einmal",
    ],
  },
  {
    version: "1.9.1",
    date: "2026-09-27",
    changes: ["Pi: automatischer nächtlicher Neustart (3 Uhr) gegen einen gelegentlich lautlos hängenbleibenden Piepton"],
  },
  {
    version: "1.9.0",
    date: "2026-09-27",
    changes: [
      "Heute zeigt jetzt zusätzlich einen aufklappbaren Verlauf des heutigen Tages",
      "Neu: 7-Tage-Übersicht mit Sonne/Mond, antippbar für Details zum jeweiligen Tag",
      "Zeigt den letzten bekannten Druck an, wenn an einem neuen Tag noch keiner da ist",
      "Gute-Nacht-Countdown zeigt jetzt deine eigene, persönliche Erwartungszeit",
      "Bei einem Alarm sind Opa anrufen und Opa erinnern jetzt ausgefüllt und stehen oben, sonst dezent unten",
      "Neu: Hell/Dunkel-Umschalter in den Einstellungen (Standard: Hell)",
    ],
  },
  {
    version: "1.8.2",
    date: "2026-09-27",
    changes: ["Pi-Online-Status ist von Heute in die Einstellungen umgezogen"],
  },
  {
    version: "1.8.1",
    date: "2026-09-27",
    changes: ["App heißt jetzt Lebenszeichen statt Opa-Checkin (Titel, Homescreen-Icon, Push-Nachrichten)"],
  },
  {
    version: "1.8.0",
    date: "2026-09-27",
    changes: [
      "Neues Design: warmes Beige/Grün statt Teal, besser lesbare Schrift (Atkinson Hyperlegible)",
      "Neue Namen: Guten Morgen / Gute Nacht statt aufgestanden / Tür zu",
      "Heute zeigt jetzt an, in welchem Zeitfenster die Gute-Nacht-Meldung zählt",
      "Neu: Bei einem Abend-Alarm kann jede benachrichtigte Person Alles in Ordnung – nur nicht gedrückt antippen. Das stoppt den Piepser bei Opa, informiert die anderen und wird im Verlauf vermerkt",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-09-27",
    changes: [
      "Neu: Meine Benachrichtigungen – jede Person stellt ihre eigenen Benachrichtigungen ein (an/aus, automatische oder feste Uhrzeit)",
      "Neu: Auf Wunsch eine Nachricht bei jedem Knopfdruck von Opa",
      "Abends wird jetzt jede Person zu ihrer eigenen Zeit benachrichtigt statt nacheinander",
    ],
  },
  {
    version: "1.6.1",
    date: "2026-09-26",
    changes: ["Fix: Knopf löst nicht mehr fälschlich beim Einstecken des Netzteils aus"],
  },
  {
    version: "1.6.0",
    date: "2026-09-26",
    changes: ["Neu: Tägliche Erinnerung beim Öffnen der App, solange Benachrichtigungen nicht aktiviert sind"],
  },
  {
    version: "1.5.3",
    date: "2026-09-26",
    changes: ["Fix: Knopf löste gelegentlich ohne Druck aus (Entprellzeit auf 250 ms erhöht)"],
  },
  {
    version: "1.5.2",
    date: "2026-09-25",
    changes: ["Knopf reagiert jetzt ohne Verzögerung, auch kurzes Antippen wird erkannt"],
  },
  {
    version: "1.5.1",
    date: "2026-09-25",
    changes: ["Ding-Dong kommt jetzt sofort beim Knopfdruck statt erst nach der Server-Antwort"],
  },
  {
    version: "1.5.0",
    date: "2026-09-25",
    changes: ["Neu: Knopf spielt nach erfolgreichem Druck ein kurzes Ding-Dong als Bestätigung für Opa"],
  },
  {
    version: "1.4.0",
    date: "2026-09-25",
    changes: [
      "Neu: Vercel Analytics aktiviert, um Nutzung (wer/wann/wo) nachvollziehen zu können",
      "Erinnerungszeiten der Familie sind jetzt in Einstellungen zu finden statt auf Heute",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-25",
    changes: [
      "Neu: Heute zeigt jetzt die Erinnerungszeiten aller Familienmitglieder für den Abend (Sonnenuntergang + eigene Toleranz-Stunden)",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-25",
    changes: ["Neues App-Icon: Puls-Signal (konzentrische Ringe) statt roter Knopf – minimalistischer, stilvoller"],
  },
  {
    version: "1.1.1",
    date: "2026-09-25",
    changes: [
      "Fix: Piepton löste zwischen 0 und 2 Uhr nachts fälschlich sofort aus (falsches Kalenderdatum kurz nach Mitternacht bei der Sonnenuntergangs-Berechnung)",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-24",
    changes: ["Verlauf zeigt jetzt alle Knopfdrücke eines Tages an, nicht nur den letzten"],
  },
  {
    version: "1.0.0",
    date: "2026-09-23",
    changes: ["Erste stabile Version: Opa-Checkin ist live"],
  },
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

// Liefert für das "Was ist neu"-Popup IMMER nur die allerletzte Version,
// nie die komplette Liste seit "lastSeenVersion" - wer die App z.B. drei
// Wochen nicht geöffnet hat, soll nicht mit fünf Versionen auf einmal
// überschüttet werden, sondern nur sehen, was sich zuletzt getan hat.
// (localStorage wird trotzdem auf CURRENT_VERSION gesetzt, übersprungene
// Versionen werden also nicht nachträglich einzeln nachgezeigt.)
// Unbekannte Version (z.B. ganz neue Person) -> keine Einträge, kein Popup.
export function getChangesSince(lastSeenVersion: string | null): ChangelogEntry[] {
  if (lastSeenVersion === CURRENT_VERSION) return [];
  const index = CHANGELOG.findIndex((entry) => entry.version === lastSeenVersion);
  if (index === -1) return [];
  return CHANGELOG.slice(0, 1);
}
