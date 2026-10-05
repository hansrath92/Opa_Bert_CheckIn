# Changelog

## 2.3.0 – 2026-10-05
- Neu: Unter Einstellungen → Meine Benachrichtigungen kann jede Person jetzt per Knopfdruck ("Testen") eine Testbenachrichtigung an ihr eigenes Gerät schicken, um zu prüfen, ob Push-Nachrichten wirklich ankommen - ohne dafür einen echten Knopfdruck/Alarm auslösen zu müssen

## 2.2.0 – 2026-09-29
- App heißt jetzt "Servus Bert" statt "Lebenszeichen" (Titel, Homescreen-Icon, Push-Nachrichten, Willkommens-Text)
- Fix: "Gute Nacht kommt noch" erschien bisher direkt nach dem Guten-Morgen-Druck den ganzen Tag über und wirkte dadurch unnötig unsicher. Zeigt jetzt "Alles in Ordnung" an, bis ungefähr die Uhrzeit von gestern Abend erreicht ist (Opa drückt meist zur ähnlichen Zeit) - erst dann erscheint die Wartezeit

## 2.1.0 – 2026-09-28
- Neu: Kontakte können unter Einstellungen → Familie jetzt entfernt werden (mit Sicherheitsabfrage)

## 2.0.2 – 2026-09-28
- Fix: Hatte Opa morgens nicht gedrückt (Alarm lief), löste ein späterer Gute-Nacht-Druck den Alarm nicht mehr auf - die Kachel blieb rot auf "Achtung", obwohl Opa sich abends klar gemeldet hat. Jeder echte Druck löst jetzt alle heute noch offenen Alarme auf, egal welcher Art

## 2.0.1 – 2026-09-27
- Fix: "Heute" zeigte beim erneuten Öffnen (z.B. von Verlauf zurück) kurz fälschlich "Alles in Ordnung", bevor sich eine aktive Erinnerung/ein Alarm nachträglich zeigte - lädt jetzt alles gleichzeitig statt nacheinander, dadurch auch insgesamt schneller

## 2.0.0 – 2026-09-27
- Neuer, sauberer Stand: alle Redesign-Branches gemerged und aufgeräumt, keine offenen Baustellen
- Fasst das große Redesign der letzten Tage zusammen (neues Design, persönliche Benachrichtigungen, Entwarnung, Onboarding, zahlreiche Pi- und Bugfixes) - Details siehe die Einträge darunter

## 1.13.0 – 2026-09-27
- Zwei Personen dürfen jetzt dieselbe PIN haben
- Beitreten-Formular fragt nicht mehr nach der Erinnerungszeit (Standard: 2h) - das stellt jede Person danach selbst unter "Meine Benachrichtigungen" ein
- Neue Frage dort: "Wie schnell willst du benachrichtigt werden, wenn Opa den Buzzer nicht gedrückt hat?"

## 1.12.6 – 2026-09-27
- Fix: "Opa erinnern" wirkte nach einem bereits erfolgten Abend-Druck oder einer Entwarnung nicht mehr (kein Piepton, Anzeige sprang von selbst zurück) - der manuelle Auslöser funktioniert jetzt wie versprochen jederzeit

## 1.12.5 – 2026-09-27
- Fix: "Guten Morgen kommt noch" verschwindet jetzt korrekt, sobald "Gute Nacht" schon gedrückt wurde, statt weiter fälschlich einen fehlenden Morgen anzumahnen

## 1.12.4 – 2026-09-27
- Pi: Entprellzeit testweise weiter auf 30 ms gesenkt (zusammen mit der 50ms-Nachprüfung 80 ms gesamt) für sehr schnelles Antippen

## 1.12.3 – 2026-09-27
- Pi: Entprellzeit 250 -> 150 ms, damit auch ein sehr schnelles Antippen zuverlässig ankommt

## 1.12.2 – 2026-09-27
- Vercel Speed Insights aktiviert, um die Ladegeschwindigkeit der App im Blick zu behalten

## 1.12.1 – 2026-09-27
- "Heutiger Verlauf" auf "Heute" wieder entfernt (doppelt mit der 7-Tage-Übersicht)
- Fix: "Erinnerung aktiv" konnte manchmal nicht gestoppt werden, weil die automatische Zeitbedingung ein manuelles Stoppen sofort wieder überstimmte - der Button hält jetzt sein Versprechen ein
- Neu: Wurde die Erinnerung heute schon mal gestoppt, zeigt die Kachel jetzt "Erinnerung wurde um HH:MM Uhr zurückgesetzt"

## 1.12.0 – 2026-09-27
- Status-Kachel auf "Heute" komplett neu aufgebaut: Icon, Titel und Untertext oben, darunter Guten-Morgen/Gute-Nacht als eigene farbige Zeilen direkt in der Kachel
- Neue "Wartend"-Farbe für "kommt noch"-Zustände, getrennt von Grün (erledigt) und Orange (Alarm)
- "Heutiger Verlauf" zeigt jetzt auch Erinnerungen und Entwarnungen mit farbigem Punkt, nicht mehr nur Knopfdrücke, und ist bei erledigtem Tag automatisch aufgeklappt
- 7-Tage-Übersicht: Sonne/Mond jetzt als gefüllte Kreise, ausführlicherer Detailtext inkl. Entwarnungs-Namen, Auswahl-Hervorhebung
- Aufgelöster Zustand zeigt jetzt, wodurch: "Entwarnung von [Name]" oder "Opa hat sich um HH:MM Uhr gemeldet"

## 1.11.1 – 2026-09-27
- Fix: Status-Kachel zeigte direkt nach Mitternacht fälschlich schon "Gute Nacht kommt noch" statt "Guten Morgen kommt noch"
- Fix: Ein echter Knopfdruck löste einen noch offenen Abend-Alarm zwar in der Datenbank korrekt auf, das Dashboard blieb aber auch nach Neuladen auf "Alarm" hängen (mehrere Lese-Endpunkte wurden von Next.js fälschlich zwischengespeichert)
- Neu: Löst ein echter Druck einen offenen Alarm auf, bekommen alle bereits benachrichtigten Personen zusätzlich eine Info-Push ("Opa hat sich gerade gemeldet - alles gut")

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
