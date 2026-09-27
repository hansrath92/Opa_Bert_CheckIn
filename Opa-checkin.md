# Opa-Checkin – Projektanforderungen

> Zentrale Quelle der Wahrheit für dieses Projekt. Wird von Claude Code (im Repo) UND in Planungs-Chats gepflegt – dieser Abgleich (26./27.9.) bringt beide Stände zusammen.

## 1. Ziel
Ein roter Button bei Opa zuhause, den er 2x täglich drückt (morgens beim Aufstehen, abends beim Zuschließen der Haustür). Die Familie sieht in einer App, ob er sich gemeldet hat. Fehlt abends die Meldung + Toleranzzeit, bekommt die Familie eine Benachrichtigung.

## 2. Status: LIVE auf main, aktuell Version 1.7.0 (Redesign auf Branch, siehe unten)
**Achtung (27.9., Nachtrag):** Dieser Abschnitt war beim letzten Abgleich auf dem Stand "1.0.0" stehen geblieben - dazwischen liefen mehrere weitere Releases direkt im Repo, die der Planungs-Chat-Strang nicht kannte (Details in CHANGELOG.md, hier nur die wichtigsten):
- Pi-Fixes: Bestätigungston (Ding-Dong) bei jedem Druck, Entprellzeit/Fehlauslösungs-Fixes (800→250ms), Start-Ignorierzeit + Bestätigungsprüfung gegen Spannungsspitzen beim Einstecken
- Tägliche Erinnerung in der App, solange Push nicht aktiviert ist
- **Größte Änderung (1.7.0):** Persönliche Benachrichtigungs-Einstellungen. Abends gibt es keine feste Eskalations-**Kette** mehr - jede Person stellt selbst ein (Einstellungen → "Meine Benachrichtigungen"): Hauptschalter an/aus, ob sie bei verpasstem Check-in benachrichtigt wird, automatisch (Sonnenuntergang+eigene Stunden) oder zu fester Uhrzeit, und optional eine Nachricht bei JEDEM Knopfdruck. Die `incidents`/`incident_contacts`-Tabellen aus der offenen Frage unten wurden dafür reaktiviert - sie werden also aktiv gebraucht, nicht mehr entfernen.
- Morgens (Kette ab 11 Uhr) blieb dabei unverändert, enthält aber nur noch Personen mit aktiven Benachrichtigungen.

Ursprüngliches Kernfunktions-Kompakt (MVP, weiterhin gültig):
- Ein Button, Zeit-Grenze 12 Uhr (vorher = "aufgestanden", nachher = "Tür zu")
- Alarm-Regel: Sonnenuntergang + Toleranz, automatisch, jahreszeitabhängig
- Dashboard: Tabs "Heute" / "Verlauf" / "Einstellungen"
- Erinnerungs-Historie: jede "Opa erinnern"-Auslösung einzeln geloggt, im Verlauf sichtbar
- Live-Sichtbarkeit "Opa wird kontaktiert" inkl. Startzeit, solange der Piepser aktiv ist

## 3. Auth-Architektur (Stand 18.9., bewusster Rückbau)
Kein klassisches Server-Login mehr. Beim Öffnen (`IdentityGate`): "Ich bin schon dabei" (Namensauswahl + PIN-Bestätigung gegen `contacts.pin_hash`, SHA-256) oder "Ich bin neu" (Beitreten-Formular). Identität wird nur in `localStorage` gemerkt, kein Server-Cookie.
**Bewusster Sicherheits-Tradeoff:** Aktionen vertrauen der vom Client mitgeschickten `contact_id` ohne Server-Verifikation – akzeptiert für eine kleine, vertrauensvolle Familien-Gruppe. Ein aufwendigeres Session-Cookie-Modell wurde testweise gebaut und wieder verworfen.
**Vor Public-Schalten des Repos noch offen:** Rate-Limiting für `/api/contacts/confirm-pin` + `/api/contacts/register` fehlt noch (4-stellige PIN, aktuell ohne Bremse).

## 4. Hardware
- **Raspberry Pi 4 Model B** (nach Kurzschluss-Defekt des ursprünglichen Pi 3) – **bestätigt funktionierend**, `press_sender.py` läuft stabil (Heartbeat + Buzzer-Polling + Presses, inkl. Fix gegen Fehl-Erkennung durch Spannungsspitze beim Einstecken)
- **Roter Taster** – GPIO17 (Pin 11) / GND (Pin 9), Bounce-Handling ~0.5s
- **Piezo-Summer** (passiv) – GPIO27 (Pin 13) / GND (Pin 14), 2000 Hz, Lautstärke 0,3, Doppel-Piep alle 20s
- **Noch offen:** Pi steht noch am Test-Standort, Umzug zu Opas echter Wohnung + echtem WLAN steht noch aus
- **Bekannter, gefixter Bug (25.9.):** Sonnenuntergangs-Berechnung nutzte UTC- statt Berlin-Kalenderdatum, löste den Piepton fälschlich zwischen 0–2 Uhr nachts aus

## 5. Design – AKTUELL LIVE auf main (Redesign fertig auf Branch, siehe Abschnitt 6)
- Stil: klinisch-schlicht, Schrift IBM Plex Sans, Akzentfarbe Teal `#0F766E`, Tabs "Heute"/"Verlauf"/"Einstellungen"
- App-Icon: aktuell "Puls-Signal" (konzentrische Ringe + Punkt, Teal+Weiß) – ursprünglich "Roter Knopf auf Teal", auf Wunsch abstrakter gemacht (25.9.)
- Ausführliches Onboarding: echter Spotlight-Rundgang (Seiten-Navigation + Element-Hervorhebung), über Einstellungen erneut aufrufbar
- Einstellungen: nach Strava-Vorbild gruppiert/zuklappbar, echter Push-Status via Browser-Abo-Check

## 6. Redesign v2 – GEBAUT auf Branch `redesign-v2` (27.9.), wartet auf Test + Merge
Umgesetzt, Version 1.8.0 auf dem Branch, **main/Produktion unverändert** bis zum Merge:
- Neuer Stil: warmes Beige/Grün (`#2F6B4F` statt Teal), Schrift "Atkinson Hyperlegible", Ecken-Radius 24px (Status-Kachel) / 18px (Karten/Buttons), Primär-Buttons ≥56px hoch
- Neue Namensgebung überall im UI: "Guten Morgen" / "Gute Nacht" statt "aufgestanden"/"Tür zu" bzw. "Morgens"/"Abends" (zentral in `src/lib/naming.ts`)
- Zeitlogik-Hybrid: Backend-Berechnung unverändert (Sonnenuntergang + Toleranz), "Heute" zeigt zusätzlich ein Zeitfenster ("Gute Nacht zählt zwischen 17:00 und HH:MM Uhr") - Start 17:00 fest gewählt, Ende = echte früheste Deadline des Tages
- Neue Funktion "Entwarnung": bei aktivem Abend-Alarm sieht jede bereits benachrichtigte Person (nicht: jeder Kontakt) den Button "Alles in Ordnung – nur nicht gedrückt". Stoppt den Piepser bei Opa (eigenes Feld `evening_stood_down_at`, zählt bewusst NICHT als echter Druck), löst den Vorfall auf, informiert die übrigen benachrichtigten Personen per Push, wird im Verlauf als "Entwarnung von [Name]" protokolliert. Nur für den Abend - morgens unverändert.
- Übernommen unverändert: Onboarding, Push-Status-Check, Erinnerungs-Historie, Live-Status "Opa wird kontaktiert" (jetzt in Blau/"Info" statt Teal), App-Icon (Farbe an Grün angepasst)
- Bewusst NICHT übernommen (bleibt Phase-2-Idee): volles Eskalationssystem mit "Wer kümmert sich"-Zuweisung, Mehrfach-Zusagen, SOS von unterwegs, Nachbar-Kontakt
- Migration 0012 (`evening_stand_down`) muss vor dem Merge im Supabase-Dashboard ausgeführt werden

## 7. Offene Fragen
- ~~Wofür wurden `incidents`/`incident_contacts` angelegt?~~ **Geklärt (27.9.):** Sie werden aktiv gebraucht - siehe Abschnitt 2, Version 1.7.0 (persönliche Benachrichtigungs-Einstellungen). Zum Zeitpunkt dieser Frage enthielten sie bereits echte Produktivdaten (4 incidents, 9 incident_contacts, aus dem laufenden Familieneinsatz) - nicht aus Testcode.
- Rate-Limiting für PIN-Endpunkte (siehe Abschnitt 3) vor Public-Schalten des Repos
- Pi-Umzug zu Opas echter Wohnung/WLAN noch nicht erfolgt
- **Neu:** Redesign v2 (Abschnitt 6) ist gebaut und lokal getestet (Build/Typecheck grün), aber noch nicht im Browser durchgeklickt und nicht auf main gemerged - siehe Test-Anleitung im Chat

## 8. Roadmap

### Phase 0 + Phase 1 (MVP) – ABGESCHLOSSEN, live seit 23.9. (Version 1.0.0)
Kompakt: Supabase-Setup, Presses/Buzzer/Cron/Push-APIs, Dashboard, Pi-Skript, Deployment, Auth-Umbau samt Rückbau, Onboarding, Live-Status-Anzeige, App-Icon (2x überarbeitet), Settings-Redesign, Sonnenuntergangs-Bug gefixt, Verlauf zeigt alle Presses eines Tages – alles erledigt.

### Phase "1.5" – Redesign v2 (auf Branch `redesign-v2`, wartet auf Test + Merge)
- [x] Entscheidung (27.9.): Redesign + Entwarnung + neue Namensgebung werden umgesetzt
- [x] Klärung incidents/incident_contacts-Tabellen → werden aktiv gebraucht (siehe Abschnitt 2/7)
- [x] "Entwarnung"-Funktion gebaut (27.9.)
- [x] Design-Migration auf Beige/Grün + Atkinson Hyperlegible + "Guten Morgen"/"Gute Nacht" gebaut (27.9.)
- [ ] Im Browser durchgetestet (siehe Test-Anleitung im Chat)
- [ ] Migration 0012 in Supabase ausgeführt
- [ ] Auf main gemerged

### Phase 2 – Ausbaustufen (später)
- [ ] Prioritäts-/Eskalationsliste mit Abwesenheits-Schalter
- [ ] Volles Eskalationssystem (Wer kümmert sich, SOS, Nachbar-Kontakt) – siehe Abschnitt 6
- [ ] WhatsApp-Benachrichtigung
- [ ] LED/Piepton-Feedback direkt am Button
- [ ] Pause-/Urlaubs-Modus
- [ ] Wochenrückblick
- [ ] Batteriestatus/Stromausfall-Erkennung beim Pi

## 9. Technische Entscheidungen (Log, zusammengeführt)
| Datum | Entscheidung |
|---|---|
| 2026-09-09 | Projektname: **Opa-Checkin**; ein Button mit 12-Uhr-Grenze; Push vor WhatsApp; Sonnenuntergangs-Kopplung statt fixer Uhrzeit |
| 2026-09-17 | Design (live): klinisch-schlicht, IBM Plex Sans, Teal; Buzzer-Parameter final (2000Hz/0.3/Doppel-Piep/20s); Supabase Cron statt Vercel Cron |
| 2026-09-18 | Sicherheitslücke (ungeprüfte Contact-ID) gefunden → dashboard-weites Login gebaut, dann bewusst wieder zurückgebaut zu Namensauswahl+PIN+localStorage (Tradeoff für kleine vertrauensvolle Gruppe); Erinnerungs-Historie einzeln geloggt; App-Icon "Roter Knopf auf Teal"; Telefonnummer in Env-Variable ausgelagert (bleibt aber im Client-Bundle sichtbar, da UI sie braucht) |
| 2026-09-23 | Settings-Redesign (Strava-Vorbild); echter Spotlight-Rundgang statt Text-Popup; echter Push-Status-Check; **Version 1.0.0 live** |
| 2026-09-24 | Verlauf zeigt jetzt alle Presses eines Tages (wichtig geworden beim Pi4-Test) |
| 2026-09-25 | Bug gefixt: Sonnenuntergangs-Berechnung nutzte UTC- statt Berlin-Datum; App-Icon zu "Puls-Signal" (abstrakter, kein Rot mehr) überarbeitet |
| 2026-09-18/26 (Kurzschluss-Vorfall, separater Strang) | Alter Pi 3 vermutlich durch Schrauben-Kurzschluss zerstört → Umstieg auf Pi 4 Model B, mittlerweile bestätigt funktionierend |
| 2026-09-26 | Vergleich mit externem Mockup ("Opa-Buzzer App") → Vorschläge für Redesign/Entwarnung/neue Namensgebung erarbeitet, Entscheidung noch offen (siehe Abschnitt 6/7) |
| 2026-09-27 | Zwischen 1.0.0 und diesem Abgleich liefen 6 weitere Releases direkt im Repo (bis 1.7.0), u.a. Pi-Fixes und persönliche Benachrichtigungs-Einstellungen pro Person (Abend-Eskalationskette entfällt dadurch) - Details siehe CHANGELOG.md |
| 2026-09-27 | Redesign v2 + "Entwarnung" auf Branch `redesign-v2` gebaut (Version 1.8.0 auf dem Branch): Design-Migration, neue Namensgebung, Zeitfenster-Anzeige, Entwarnung-Funktion. `incidents`/`incident_contacts`-Frage geklärt (werden gebraucht). Noch offen: Browser-Test, Migration 0012, Merge auf main |