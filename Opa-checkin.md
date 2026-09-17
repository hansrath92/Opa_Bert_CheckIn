# Opa-Checkin – Projektanforderungen

> Zentrale Quelle der Wahrheit für dieses Projekt. Wird laufend von Claude Code gepflegt.
> Abgeschlossene Phasen werden kompakt zusammengefasst bzw. bei Bedarf in `opa-checkin-archiv.md` ausgelagert, damit diese Datei schlank bleibt.

## 1. Ziel
Ein roter Button bei Opa zuhause, den er 2x täglich drückt (morgens beim Aufstehen, abends beim Zuschließen der Haustür). Die Familie sieht in einer App, ob er sich gemeldet hat. Fehlt abends die Meldung + Toleranzzeit, bekommt die Familie eine Benachrichtigung – ohne dass ständig angerufen werden muss.

## 2. Kernfunktion (MVP)
- **Ein Button**, Unterscheidung über Uhrzeit: Druck vor 12 Uhr = "aufgestanden", Druck nach 12 Uhr = "Tür zu"
- **Alarm-Regel Morgens:** Feste Uhrzeit – keine Meldung bis 11:00 Uhr → Alarm
- **Alarm-Regel Abends:** Erwartungs-Uhrzeit ist an den Sonnenuntergang gekoppelt (automatisch, jahreszeitabhängig), plus individuelle Toleranz-Zeit pro Kontakt (Standard 2h, jeder Kontakt kann seine eigene Zeit einstellen)
- **Benachrichtigung Phase 1:** Push-Nachricht (eigene App/PWA)
- **Benachrichtigung Phase 2 (später):** zusätzlich WhatsApp
- **Dashboard:** Familie kann jederzeit den aktuellen Status des Tages sehen (nicht nur im Alarmfall)
- **Eskalationskette (direkt umsetzen, nicht erst Phase 2):** Kontakte werden nach ihrer eigenen Toleranz-Zeit priorisiert (kürzeste Zeit = zuerst kontaktiert). Reagiert der aktuelle Kontakt nicht innerhalb von 60 Minuten, oder meldet "konnte ihn nicht erreichen", wird automatisch zum nächsten Kontakt in der Reihenfolge eskaliert. Nach dem letzten Kontakt geht es zyklisch wieder von vorne los, bis jemand "Opa getroffen" zurückmeldet.
- **Kontakt-Identifikation:** kein volles Login-System – jeder Kontakt hat eine eigene 4-stellige PIN, mit der er sich in der App identifiziert (eigene Toleranz-Zeit einstellen, Push abonnieren, Rückmeldung geben)

## 3. Hardware
- **Raspberry Pi 3** – aktuell bei euch, original verpackt/unbenutzt. Muss noch eingerichtet und zu Opa gebracht werden.
- **Roter Taster** – einfacher Arcade-Knopf ohne eigene Elektronik, wird per Kabel an die GPIO-Pins des Pi angeschlossen.
- **Standort:** Der Pi steht bei Opa zuhause (Strom + WLAN vorhanden, WLAN-Zugangsdaten müssen wir haben).
- **Sonnenuntergangs-Berechnung:** benötigt ungefähre Koordinaten/Ort von Opas Wohnort (für kostenlose Sunset-API, z.B. sunrise-sunset.org).

## 4. Architektur (Entwurf – kann sich noch ändern)
- **Web-App:** Next.js + Supabase + Vercel (wie beim letzten Projekt)
- **Raspberry Pi:** kleines Python-Skript liest den GPIO-Pin, sendet bei Tastendruck einen Request an eine Supabase Edge Function / API-Route
- **Alarm-Logik:** zeitgesteuerte Funktion (z.B. Supabase Cron / Vercel Cron), die täglich prüft, ob die erwartete Meldung da ist
- **Notification Phase 1:** Web Push über PWA (Hinweis: auf iPhones braucht das iOS 16.4+, das prüfen wir im Detail wenn's soweit ist)
- **Auth:** Kein Supabase Auth – stattdessen einfache 4-stellige PIN pro Kontakt (bewusst simpel für MVP, reicht für eine kleine, vertraute Familien-Gruppe ohne öffentliche Nutzer)

## 5. Roadmap / Checkliste

### Phase 0 – Setup (abgeschlossen)
- [x] Projektname: Opa-Checkin
- [x] Alarm-Regel: Sonnenuntergang-basiert (Details Phase 1)
- [x] GitHub-Repo angelegt
- [x] Raspberry Pi eingerichtet (SD-Karte, SSH funktioniert, aktuell mit Test-WLAN zuhause)
- [x] Hardware-Test erfolgreich: Button an GPIO17/GND verkabelt, Testskript erkennt Knopfdruck (Pin 11 = GPIO17, Pin 9 = GND)

**Noch offen vor dem Umzug zu Opa:** WLAN-Zugangsdaten im Pi auf Opas Netzwerk umstellen (machen wir kurz bevor der Pi umzieht).

**Technischer Hinweis:** Button an GPIO17 braucht `bouncetime=800` (Millisekunden) wegen Kontaktprellen des Mikroschalters, sonst werden Drücke mehrfach oder gar nicht erkannt. Bereits im Pi-Skript umgesetzt.

### Phase 1 – MVP
- [x] Supabase-Projekt aufsetzen (Tabellen: presses, contacts)
- [x] API-Route/Function zum Empfangen der Presses vom Pi
- [x] Python-Skript auf dem Pi fertigstellen (sendet Presses ans Backend)
- [x] Next.js Dashboard: heutiger Status sichtbar
- [ ] Tägliche Prüf-Funktion: löst Alarm aus, wenn Meldung fehlt (Morgens fix 11 Uhr, Abends Sonnenuntergang + individuelle Toleranz) – Code fertig, Migration/Deployment läuft
- [ ] Push-Benachrichtigung an Kontaktliste
- [ ] Eskalationskette mit Prioritäts-Reihenfolge (kürzeste Toleranz-Zeit zuerst), PIN-Identifikation, Rückmeldung "getroffen"/"nicht erreicht" – Code fertig, Migration/Deployment läuft
- [x] Deployment auf Vercel

### Phase 2 – Ausbaustufen (später)
- [ ] Evtl. Verlaufs-/Statistik-Ansicht
- [ ] WhatsApp-Benachrichtigung
- [ ] Redesign des Dashboards nach dem Mockup in Abschnitt 8 (Tabs Heute/Verlauf/Einstellungen, IBM Plex Sans, Farb-Tokens) – aktuelles Dashboard ist bewusst einfacher gehalten (MVP)

## 6. Offene Fragen
- Wie viele Kontakte werden sich am Ende tatsächlich registrieren? (Registrierung läuft jetzt selbstständig über `/kontakt`, keine feste Anzahl nötig)
- Eskalation läuft aktuell zyklisch endlos weiter, falls niemand reagiert – reicht das, oder soll es nach X Runden einen "Notfall"-Modus geben (z.B. alle gleichzeitig)?

## 7. Technische Entscheidungen (Log)
| Datum | Entscheidung |
|---|---|
| 2026-09-09 | Projektname: **Opa-Checkin** |
| 2026-09-09 | Ein Button mit Zeit-Grenze (12 Uhr) statt zwei separate Buttons |
| 2026-09-09 | Push-Notification zuerst (Phase 1), WhatsApp erst Phase 2 |
| 2026-09-09 | Eskalations-/Prioritätsliste erst Phase 2, Start mit fester Kontaktliste |
| 2026-09-09 | Dashboard mit Live-Status gewünscht |
| 2026-09-09 | Pi steht am Ende bei Opa (WLAN vorhanden), Taster einfacher Verkabelungs-Typ |
| 2026-09-09 | Alarm-Erwartungszeit an Sonnenuntergang gekoppelt statt fixer Uhrzeit |
| 2026-09-17 | Presses werden nach 3 Tagen automatisch gelöscht (pg_cron in Supabase) |
| 2026-09-17 | RPi.GPIO durch rpi-lgpio ersetzt (Kompatibilität mit Raspberry Pi OS Bookworm) |
| 2026-09-17 | Pi-Skript wiederholt Sendeversuche bei Netzwerkfehlern (2/5/10/20s) statt Presses stillschweigend zu verwerfen |
| 2026-09-17 | Opas Standort: München (für Sonnenuntergangs-Berechnung) |
| 2026-09-17 | Morgen-Alarm ergänzt: feste 11-Uhr-Grenze zusätzlich zum Abend-Alarm |
| 2026-09-17 | Eskalationskette direkt in Phase 1 umgesetzt (nicht erst Phase 2): individuelle Toleranz-Zeit pro Kontakt, Priorität = kürzeste Zeit zuerst, 60-Minuten-Timeout bis zur nächsten Person |
| 2026-09-17 | Kontakt-Identifikation per 4-stelliger PIN statt Supabase Auth (bewusst einfach für MVP) |

## 8. Design – Familien-Dashboard (Zielbild, noch nicht umgesetzt)
> Das aktuelle Dashboard ist bewusst einfacher gehalten (eine Seite, zwei Status-Karten, siehe Phase 1). Diese Design-Vorgaben sind das geplante Ziel für ein späteres Redesign (Phase 2).

- **Stil:** Klar & klinisch-schlicht (viel Weißraum, wie eine Gesundheits-App)
- **Struktur:** Mehrere Tabs – "Heute", "Verlauf", "Einstellungen"
- **Inhalt "Heute":** Status beider täglicher Drücke (aufgestanden/Tür zu), Uhrzeit des letzten Drucks, Alarm-Zustand deutlich sichtbar (rot/grün), Technik-Status (Pi online?), Schnellzugriff "Opa anrufen"
- **Inhalt "Verlauf":** Kalender-/Listenansicht der letzten Tage
- **Inhalt "Einstellungen":** Kontaktliste verwalten, manuelle Anpassung der Alarm-Zeiten
- Mockup zuerst hier im Chat entworfen — Link zur Ansicht: https://claude.ai/artifact/LsoRmoCHzmdW8Y3TLX7bq9

**Design-Tokens (exakt, für 1:1-Umsetzung):**
- Schrift: Google Font "IBM Plex Sans" (Gewichte 400/500/600/700)
- Farben:
  - Hintergrund: `#F6F7F8`
  - Karten-Hintergrund: `#FFFFFF`
  - Rahmen: `#E2E5E8`
  - Text primär: `#1A1D1F`
  - Text sekundär: `#6B7280`
  - Akzent (Teal, für Buttons/aktive Tabs): `#0F766E`
  - Erfolg-Grün (Text): `#15803D` / Erfolg-Hintergrund hell: `#DCFCE7`
  - Warnung-Orange: `#B45309`
  - Fehler-Rot: `#B91C1C`
- Ecken-Radius: 16px (Karten), 14px (großer Button "Opa anrufen"), 12px (kleine Elemente)
- Abstände: 24px äußerer Seitenrand, 18-20px Innenabstand in Karten, 12-16px zwischen Elementen
- Icons: schlichte Strich-Icons (Feather-Stil, stroke, kein Fill), keine Emojis
- Navigation: untere Tab-Leiste, 3 Reiter (Heute/Verlauf/Einstellungen), aktiver Tab in Akzentfarbe `#0F766E`, inaktive in `#9CA3AF`
- Format: Mobile (390px Breite), Struktur: Kopfbereich → Inhalts-Karten → feste Tab-Leiste unten

## 9. Ideen für später (Backlog, nicht MVP)
- LED/Piepton-Feedback direkt am Button, damit Opa merkt, dass sein Druck registriert wurde
- Pause-/Urlaubs-Modus (Überwachung für X Tage aussetzen, z.B. wenn Opa im Krankenhaus/zu Besuch ist)
- "Ich kümmere mich"-Markierung bei Alarm, damit nicht mehrere Familienmitglieder gleichzeitig reagieren (teilweise schon durch die Eskalationskette in Phase 1 abgedeckt – nur eine Person ist jeweils "an der Reihe")
- Wochenrückblick ("6 von 7 Tagen pünktlich")
- Protokoll verschickter Benachrichtigungen
- Batteriestatus/Stromausfall-Erkennung beim Pi (Unterscheidung Technik-Ausfall vs. echter Alarm)
- Eskalation nach mehreren erfolglosen Runden: alle Kontakte gleichzeitig statt weiter einzeln durchgehen (siehe offene Frage in Abschnitt 6)
