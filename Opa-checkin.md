# Opa-Checkin – Projektanforderungen

> Zentrale Quelle der Wahrheit für dieses Projekt. Wird laufend von Claude Code gepflegt.
> Abgeschlossene Phasen werden kompakt zusammengefasst bzw. bei Bedarf in `opa-checkin-archiv.md` ausgelagert, damit diese Datei schlank bleibt.

## 1. Ziel
Ein roter Button bei Opa zuhause, den er 2x täglich drückt (morgens beim Aufstehen, abends beim Zuschließen der Haustür). Die Familie sieht in einer App, ob er sich gemeldet hat. Fehlt abends die Meldung + Toleranzzeit, bekommt die Familie eine Benachrichtigung – ohne dass ständig angerufen werden muss.

## 2. Kernfunktion (MVP)
- **Ein Button**, Unterscheidung über Uhrzeit: Druck vor 12 Uhr = "aufgestanden", Druck nach 12 Uhr = "Tür zu"
- **Alarm-Regel:** Erwartungs-Uhrzeit für den Abend-Druck ist an den Sonnenuntergang gekoppelt (automatisch, jahreszeitabhängig), plus 2h Toleranz, dann Benachrichtigung. Genaue Formel (z.B. "Sonnenuntergang + X Stunden") wird in Phase 1 beim Bauen der Alarm-Funktion festgelegt.
- **Benachrichtigung Phase 1:** Push-Nachricht (eigene App/PWA)
- **Benachrichtigung Phase 2 (später):** zusätzlich WhatsApp
- **Dashboard:** Familie kann jederzeit den aktuellen Status des Tages sehen (nicht nur im Alarmfall)
- **Empfängerliste Phase 1:** feste Kontaktliste, alle bekommen die Nachricht
- **Empfängerliste Phase 2 (später):** Prioritäts-/Eskalationsliste mit "Abwesend"-Schalter

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
- **Auth:** Supabase Auth, mehrere Familien-Accounts

## 5. Roadmap / Checkliste

### Phase 0 – Setup (abgeschlossen)
- [x] Projektname: Opa-Checkin
- [x] Alarm-Regel: Sonnenuntergang-basiert (Details Phase 1)
- [x] GitHub-Repo angelegt
- [x] Raspberry Pi eingerichtet (SD-Karte, SSH funktioniert, aktuell mit Test-WLAN zuhause)
- [x] Hardware-Test erfolgreich: Button an GPIO17/GND verkabelt, Testskript erkennt Knopfdruck (Pin 11 = GPIO17, Pin 9 = GND)

**Noch offen vor dem Umzug zu Opa:** WLAN-Zugangsdaten im Pi auf Opas Netzwerk umstellen (machen wir kurz bevor der Pi umzieht).

### Phase 1 – MVP
- [ ] Supabase-Projekt aufsetzen (Tabellen: presses, contacts)
- [ ] API-Route/Function zum Empfangen der Presses vom Pi
- [ ] Python-Skript auf dem Pi fertigstellen (sendet Presses ans Backend)
- [ ] Next.js Dashboard: heutiger Status sichtbar
- [ ] Tägliche Prüf-Funktion: löst Alarm aus, wenn Meldung fehlt
- [ ] Push-Benachrichtigung an Kontaktliste
- [ ] Deployment auf Vercel

### Phase 2 – Ausbaustufen (später)
- [ ] Prioritäts-/Eskalationsliste mit Abwesenheits-Schalter
- [ ] WhatsApp-Benachrichtigung
- [ ] Evtl. Verlaufs-/Statistik-Ansicht

## 6. Offene Fragen
- Genaue Formel für Erwartungs-Uhrzeit (z.B. "Sonnenuntergang + X Stunden") – wird in Phase 1 festgelegt
- Wie viele Familienmitglieder/Accounts zu Beginn?
- Opas ungefährer Wohnort (für Sonnenuntergangs-Berechnung)

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
