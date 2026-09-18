# Opa-Checkin – Projektanforderungen

> Zentrale Quelle der Wahrheit für dieses Projekt. Wird laufend von Claude Code gepflegt.
> Abgeschlossene Phasen werden kompakt zusammengefasst bzw. bei Bedarf in `opa-checkin-archiv.md` ausgelagert, damit diese Datei schlank bleibt.

## 1. Ziel
Ein roter Button bei Opa zuhause, den er 2x täglich drückt (morgens beim Aufstehen, abends beim Zuschließen der Haustür). Die Familie sieht in einer App, ob er sich gemeldet hat. Fehlt abends die Meldung + Toleranzzeit, bekommt die Familie eine Benachrichtigung – ohne dass ständig angerufen werden muss.

## 2. Kernfunktion (MVP)
- **Ein Button**, Unterscheidung über Uhrzeit: Druck vor 12 Uhr = "aufgestanden", Druck nach 12 Uhr = "Tür zu"
- **Alarm-Regel:** Erwartungs-Uhrzeit für den Abend-Druck ist an den Sonnenuntergang gekoppelt (automatisch, jahreszeitabhängig), plus 2h Toleranz, dann Benachrichtigung. Genaue Formel wird in Phase 1 festgelegt.
- **Benachrichtigung Phase 1:** Push-Nachricht (eigene App/PWA)
- **Benachrichtigung Phase 2 (später):** zusätzlich WhatsApp
- **Dashboard:** Familie kann jederzeit den aktuellen Status des Tages sehen (nicht nur im Alarmfall)
- **Empfängerliste Phase 1:** feste Kontaktliste, alle bekommen die Nachricht
- **Empfängerliste Phase 2 (später):** Prioritäts-/Eskalationsliste mit "Abwesend"-Schalter

## 3. Hardware
- **Raspberry Pi 3** – eingerichtet, aktuell noch mit Test-WLAN zuhause, Umzug zu Opa steht noch aus.
- **Roter Taster** – Arcade-Knopf, GPIO17 (physischer Pin 11) / GND (Pin 9). Braucht `bounce_time=0.5` Sekunden wegen Kontaktprellen.
- **Piezo-Summer** (passiv, 2 Anschlüsse) – GPIO27 (physischer Pin 13) / GND (Pin 14). Sound-Parameter siehe Abschnitt 6.
- **Standort:** Der Pi steht bei Opa zuhause (Strom + WLAN vorhanden).
- **Sonnenuntergangs-Berechnung:** benötigt ungefähre Koordinaten/Ort von Opas Wohnort (z.B. sunrise-sunset.org API).

## 4. Architektur (Entwurf – kann sich noch ändern)
- **Web-App:** Next.js + Supabase + Vercel (wie beim letzten Projekt)
- **Raspberry Pi:** Python-Skript liest den Button-GPIO-Pin, sendet bei Tastendruck einen Request an eine Supabase Edge Function / API-Route. Ein zweiter Teil des Skripts fragt regelmäßig (Polling) beim Backend ab, ob der Buzzer aktiv sein soll (siehe Abschnitt 6).
- **Alarm-Logik:** zeitgesteuerte Funktion (z.B. Supabase Cron / Vercel Cron), die täglich prüft, ob die erwartete Meldung da ist
- **Notification Phase 1:** Web Push über PWA (iOS braucht 16.4+, Detail-Check in Phase 1)
- **Auth:** kein Supabase Auth, sondern eigenes leichtgewichtiges Login: 4-stellige PIN pro Kontakt (`contacts.pin`), nach erfolgreichem Login/Register signiertes httpOnly-Session-Cookie (`opa_session`, HMAC-SHA256 mit `SESSION_SECRET`, ca. 1 Jahr gültig). Seit 2026-09-18 schützt `middleware.ts` das **gesamte Dashboard** (nicht mehr nur Einstellungen) – ohne gültige Session geht's nur zu `/login`.

## 5. Design – Familien-Dashboard
- **Stil:** Klar & klinisch-schlicht (viel Weißraum, wie eine Gesundheits-App)
- **Struktur:** Mehrere Tabs – "Heute", "Verlauf", "Einstellungen"
- **Inhalt "Heute":** Status beider täglicher Drücke, Uhrzeit des letzten Drucks, Alarm-Zustand (rot/grün), Technik-Status (Pi online?), Schnellzugriff "Opa anrufen", Button "Opa erinnern" (siehe Abschnitt 6)
- **Inhalt "Verlauf":** Listenansicht der letzten Tage, pro Tag zusätzlich alle Erinnerungs-Auslösungen ("Erinnert von: Name um Uhrzeit", mehrere Einträge möglich)
- **Inhalt "Einstellungen":** Kontaktliste verwalten, manuelle Anpassung der Alarm-Zeiten
- Mockup fertig (MVP-Stand final) — https://claude.ai/artifact/LsoRmoCHzmdW8Y3TLX7bq9

**Design-Tokens (exakt, für 1:1-Umsetzung in Claude Code):**
- Schrift: Google Font "IBM Plex Sans" (400/500/600/700)
- Farben: Hintergrund `#F6F7F8` · Karten `#FFFFFF` · Rahmen `#E2E5E8` · Text primär `#1A1D1F` · Text sekundär `#6B7280` · Akzent (Teal) `#0F766E` · Erfolg `#15803D` / hell `#DCFCE7` · Warnung `#B45309` · Fehler `#B91C1C`
- Ecken-Radius: 16px (Karten), 14px (großer Button), 12px (kleine Elemente)
- Abstände: 24px äußerer Rand, 18-20px Karten-Innenabstand, 12-16px zwischen Elementen
- Icons: schlichte Strich-Icons (Feather-Stil), keine Emojis
- Navigation: untere Tab-Leiste, aktiver Tab `#0F766E`, inaktiv `#9CA3AF`
- Alle Screens Mobile-Format (390px Breite): Kopfbereich → Inhalts-Karten → feste Tab-Leiste unten

## 6. Akustische Erinnerung (Buzzer)
- **Sound-Parameter (final getestet):** Frequenz 2000 Hz, Tastverhältnis/Lautstärke 0,3, Muster: Doppel-Piep, Wiederholung alle 20 Sekunden
- **Auslöser:**
  1. Automatisch: 1 Stunde nach Sonnenuntergang, falls Abend-Druck fehlt
  2. Manuell: Familie klickt im Dashboard-Tab "Heute" auf "Opa erinnern", unabhängig von Uhrzeit
- **Stopp-Bedingung:** Sobald der Abend-Druck registriert wird, hört der Pi spätestens beim nächsten Abfrage-Zyklus auf zu piepen
- **Architektur:** Backend berechnet live einen "soll piepen"-Zustand (Abend-Druck fehlt UND (Zeitbedingung erfüllt ODER manuell ausgelöst)). Pi fragt das per Polling (alle paar Sekunden) ab und steuert den Piezo lokal an.
- **Offene Frage:** Piepen läuft aktuell unbegrenzt weiter bis Opa drückt – kein automatischer Timeout. Bei Bedarf später ergänzbar.

## 7. Roadmap / Checkliste

### Phase 0 – Setup (abgeschlossen)
- [x] Projektname, Alarm-Regel-Prinzip, GitHub-Repo, Pi eingerichtet, Button verkabelt & getestet, Buzzer verkabelt & getestet

### Phase 1 – MVP (aktuell)
- [x] Supabase-Projekt aufsetzen (Tabellen: presses/daily_status, contacts) – 7 Migrationen (0001–0007)
- [x] API-Route zum Empfangen der Button-Presses vom Pi (`/api/press`)
- [x] API-Route + Logik für Buzzer-Status (`/api/buzzer-status` zum Lesen, `/api/buzzer-trigger` zum manuellen Auslösen)
- [x] Python-Skript auf dem Pi fertigstellen (`press_sender.py`: Presses senden inkl. Retry, Heartbeat, Buzzer-Polling + Piezo-Ansteuerung GPIO27) – noch nicht auf dem echten Pi getestet
- [x] Next.js Dashboard nach Mockup/Design-Tokens bauen (Heute/Verlauf/Einstellungen)
- [x] Tägliche Prüf-Funktion: löst Alarm aus, wenn Meldung fehlt (`/api/cron/check-alarm`, per GitHub Actions alle 15 Min getriggert)
- [x] Push-Benachrichtigung an Kontaktliste (Service Worker, Manifest, `push.ts`, `/api/push/subscribe`)
- [x] Deployment auf Vercel (live unter opa-bert-check-in.vercel.app)
- [x] Sicherheitsfix (2026-09-18): dashboard-weites Login per Session-Cookie statt der bisherigen ungeprüften Contact-ID; Erinnerungs-Historie (wer hat wann "Opa erinnern" gedrückt) im Verlauf-Tab

### Phase 2 – Ausbaustufen (später)
- [ ] Prioritäts-/Eskalationsliste mit Abwesenheits-Schalter
- [ ] WhatsApp-Benachrichtigung
- [ ] LED/Piepton-Feedback direkt am Button (Druck-Bestätigung für Opa)
- [ ] Pause-/Urlaubs-Modus
- [ ] "Ich kümmere mich"-Markierung bei Alarm
- [ ] Wochenrückblick, Benachrichtigungs-Protokoll
- [ ] Batteriestatus/Stromausfall-Erkennung beim Pi

## 8. Offene Fragen
- Genaue Formel für Erwartungs-Uhrzeit (z.B. "Sonnenuntergang + X Stunden")
- Wie viele Familienmitglieder/Accounts zu Beginn?
- Opas ungefährer Wohnort (für Sonnenuntergangs-Berechnung)
- Eigenes App-Icon/Logo fehlt noch (aktuell Next.js-Standard-Favicon, `manifest.json` hat noch kein `icons`-Array) – wird für Homescreen-Icon (PWA) und Favicon gebraucht

## 8a. Was sonst noch ansteht

- **Blockiert auf Rückmeldung vom Pi:** Heartbeat und Buzzer-Polling funktionieren auf dem echten Pi noch nicht (Diagnose per `journalctl -u opa-checkin` ausstehend)
- **Vor Public-Schalten des Repos:**
  - Rate-Limiting für `/api/contacts/login` + `/api/contacts/register` (4-stellige PIN, aktuell ohne Bremse)
  - Opas hardcodierter Näherungs-Standort (`src/lib/sunset.ts`, aktuell "München" im Klartext) in Env-Variable auslagern
  - **Neu gefunden:** `OPA_PHONE_NUMBER` in `src/lib/opa.ts` ist Opas echte Telefonnummer im Klartext im Code – vor Public-Schalten ebenfalls in eine Env-Variable auslagern, sonst landet sie öffentlich einsehbar auf GitHub
- **Hardware/Deployment:** Pi-Umzug von Test-WLAN zu Opas Wohnung
- **Design/Assets:** App-Logo/Icon, PWA-Icons für `manifest.json`
- **Technisch:** `SESSION_SECRET` in Vercel-Projekt-Envs setzen (Voraussetzung für das Login in Produktion)
- **Später möglich:** Logout-Funktion (aktuell nicht vorgesehen, Session hält ~1 Jahr)

## 9. Technische Entscheidungen (Log)
| Datum | Entscheidung |
|---|---|
| 2026-09-09 | Projektname: **Opa-Checkin** |
| 2026-09-09 | Ein Button mit Zeit-Grenze (12 Uhr) statt zwei separate Buttons |
| 2026-09-09 | Push-Notification zuerst (Phase 1), WhatsApp erst Phase 2 |
| 2026-09-09 | Eskalations-/Prioritätsliste erst Phase 2, Start mit fester Kontaktliste |
| 2026-09-09 | Pi steht am Ende bei Opa, Taster einfacher Verkabelungs-Typ |
| 2026-09-09 | Alarm-Erwartungszeit an Sonnenuntergang gekoppelt statt fixer Uhrzeit |
| 2026-09-17 | Design: klinisch-schlicht, IBM Plex Sans, Teal-Akzent, 3 Tabs |
| 2026-09-17 | Buzzer: passiver Piezo GPIO27, 2000Hz/0.3 Lautstärke, Doppel-Piep alle 20s |
| 2026-09-18 | Sicherheitslücke gefunden (ungeprüfte Contact-ID) → Entscheidung: statt Einzel-Patch dashboard-weites Login einführen, damit auch die Erinnerungs-Historie zuverlässig einer Person zugeordnet werden kann |
| 2026-09-18 | Erinnerungs-Historie: jede Auslösung wird einzeln geloggt (nicht nur ein Boolean), Anzeige im bestehenden Verlauf-Tab je Tag |
