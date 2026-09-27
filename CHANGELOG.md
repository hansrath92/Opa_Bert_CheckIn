# Changelog

## 1.11.0 – 2026-09-27
- Neu: In "Erinnerungszeiten heute" springt "Bearbeiten" bei deiner eigenen Zeile direkt zu "Meine Benachrichtigungen"

## 1.10.4 – 2026-09-27
- Fix: Onboarding-Erklärung deckte teilweise den gerade erklärten Button zu (z.B. bei "Opa erinnern"/"Opa anrufen") - zeigt jetzt oben statt unten an, wenn nötig

## 1.10.3 – 2026-09-27
- "Erste Schritte erneut ansehen" steht jetzt gleich oben in "So funktioniert's", vor der ausführlichen Beschreibung

## 1.10.2 – 2026-09-27
- Onboarding-Rundgang: neuer Schritt erklärt jetzt auch "Alles in Ordnung" (Entwarnung)

## 1.10.1 – 2026-09-27
- "So funktioniert's" komplett neu geschrieben, spiegelt jetzt die aktuellen Funktionen wider
- "Erste Schritte erneut ansehen" ist von "Version" zu "So funktioniert's" umgezogen (thematisch passender)

## 1.10.0 – 2026-09-27
- Erste-Schritte-Rundgang deutlich ausführlicher: erklärt jetzt Schritt für Schritt die ganze App (12 statt 4 Stationen), mit "Zurück"-Möglichkeit
- "Was ist neu" zeigt jetzt immer nur die allerletzte Version, nicht mehr alle übersprungenen auf einmal

## 1.9.1 – 2026-09-27
- Pi: automatischer nächtlicher Neustart (3 Uhr) gegen einen gelegentlich lautlos hängenbleibenden Piepton

## 1.9.0 – 2026-09-27
- "Heute" zeigt jetzt zusätzlich einen aufklappbaren Verlauf des heutigen Tages
- Neu: 7-Tage-Übersicht mit Sonne/Mond, antippbar für Details zum jeweiligen Tag
- Zeigt den letzten bekannten Druck an, wenn an einem neuen Tag noch keiner da ist
- "Gute Nacht"-Countdown zeigt jetzt deine eigene, persönliche Erwartungszeit
- Bei einem Alarm sind "Opa anrufen" und "Opa erinnern" jetzt ausgefüllt und stehen oben, sonst dezent unten
- Neu: Hell/Dunkel-Umschalter in den Einstellungen (Standard: Hell)

## 1.8.2 – 2026-09-27
- Pi-Online-Status ist von "Heute" in die Einstellungen umgezogen

## 1.8.1 – 2026-09-27
- App heißt jetzt "Lebenszeichen" statt "Opa-Checkin" (Titel, Homescreen-Icon, Push-Nachrichten)

## 1.8.0 – 2026-09-27
- Neues Design: warmes Beige/Grün statt Teal, besser lesbare Schrift (Atkinson Hyperlegible)
- Neue Namen: "Guten Morgen" / "Gute Nacht" statt "aufgestanden" / "Tür zu"
- "Heute" zeigt jetzt an, in welchem Zeitfenster die Gute-Nacht-Meldung zählt
- Neu: Bei einem Abend-Alarm kann jede benachrichtigte Person "Alles in Ordnung – nur nicht gedrückt" antippen. Das stoppt den Piepser bei Opa, informiert die anderen und wird im Verlauf vermerkt

## 1.7.0 – 2026-09-27
- Neu: "Meine Benachrichtigungen" – jede Person stellt ihre eigenen Benachrichtigungen ein (an/aus, automatische oder feste Uhrzeit)
- Neu: Auf Wunsch eine Nachricht bei jedem Knopfdruck von Opa
- Abends wird jetzt jede Person zu ihrer eigenen Zeit benachrichtigt statt nacheinander

## 1.6.1 – 2026-09-26
- Fix: Knopf löst nicht mehr fälschlich beim Einstecken des Netzteils aus

## 1.6.0 – 2026-09-26
- Neu: Tägliche Erinnerung beim Öffnen der App, solange Benachrichtigungen nicht aktiviert sind

## 1.5.3 – 2026-09-26
- Fix: Knopf löste gelegentlich ohne Druck aus (Entprellzeit auf 250 ms erhöht)

## 1.5.2 – 2026-09-25
- Knopf reagiert jetzt ohne Verzögerung, auch kurzes Antippen wird erkannt

## 1.5.1 – 2026-09-25
- Ding-Dong kommt jetzt sofort beim Knopfdruck statt erst nach der Server-Antwort

## 1.5.0 – 2026-09-25
- Neu: Knopf spielt nach erfolgreichem Druck ein kurzes "Ding-Dong" als Bestätigung für Opa

## 1.4.0 – 2026-09-25
- Neu: Vercel Analytics aktiviert, um Nutzung (wer/wann/wo) nachvollziehen zu können
- Erinnerungszeiten der Familie sind jetzt in Einstellungen zu finden statt auf "Heute"

## 1.3.0 – 2026-09-25
- Neu: "Heute" zeigt jetzt die Erinnerungszeiten aller Familienmitglieder für den Abend (Sonnenuntergang + eigene Toleranz-Stunden)

## 1.2.0 – 2026-09-25
- Neues App-Icon: "Puls-Signal" (konzentrische Ringe) statt "Roter Knopf" – minimalistischer, stilvoller

## 1.1.1 – 2026-09-25
- Fix: Piepton löste zwischen 0 und 2 Uhr nachts fälschlich sofort aus (Sonnenuntergangs-Berechnung nutzte das falsche Kalenderdatum kurz nach Mitternacht)

## 1.1.0 – 2026-09-24
- Verlauf zeigt jetzt alle Knopfdrücke eines Tages an, nicht nur den letzten

## 1.0.0 – 2026-09-23
- Erste stabile Version: Opa-Checkin ist live

## 0.6.3 – 2026-09-23
- Fix: Morgens/Abends auf "Heute" passen jetzt immer in eine Zeile, gleich große Karten

## 0.6.2 – 2026-09-23
- Neu: Abmelden-Button in Einstellungen

## 0.6.1 – 2026-09-23
- Einstellungs-Gruppen sind jetzt zugeklappt, mit Status auf einen Blick (z.B. "Aktiv"), volle Details erst nach Antippen

## 0.6.0 – 2026-09-23
- Einstellungen neu geordnet: klar beschriftete Gruppen statt Kartenkette
- Benachrichtigungen zeigen jetzt den echten Status an, auch nach einem Neuladen
- Erste-Schritte-Einführung ist jetzt ein echter Rundgang: navigiert durch die App und hebt das jeweilige Element hervor
- Versionshistorie dauerhaft in Einstellungen einsehbar

## 0.5.0 – 2026-09-18
- Login vereinfacht: Namensauswahl statt PIN-Anmeldung ("Ich bin schon dabei" / "Ich bin neu"), PIN nur noch optionale Verwechslungs-Absicherung auf neuen Geräten
- Erste-Schritte-Einführung jetzt als geführter Mehrschritt-Flow (Weiter/Überspringen, Fortschrittsanzeige)

## 0.4.0 – 2026-09-18
- Neu: Erste-Schritte-Einführung beim ersten Login, über Einstellungen jederzeit erneut aufrufbar
- Neu: Heute zeigt live an, wenn Opa gerade per Piepton erinnert wird - inkl. seit wann; Verlauf zeigt das pro Tag
- Neu: eigenes App-Icon
- Sicherheit: Opas Telefonnummer und Standort nicht mehr im Quellcode

## 0.3.0 – 2026-09-18
- Sicherheitsfix: Login schützt jetzt das ganze Dashboard (nicht mehr nur Einstellungen), per echter Session statt nachbaubarer Kontakt-ID
- Neu: Verlauf zeigt jetzt, wer wann "Opa erinnern" gedrückt hat

## 0.2.0 – 2026-09-17
- Eskalationskette: Kontakte werden nach eigener Toleranz-Zeit priorisiert und automatisch nacheinander benachrichtigt
- Morgen-Alarm (11 Uhr) zusätzlich zum Abend-Alarm
- Neue Tab-Navigation: Heute, Verlauf, Einstellungen

## 0.1.0 – 2026-09-16
- Erste Version: Dashboard, Pi-Anbindung, Push-Benachrichtigungen
