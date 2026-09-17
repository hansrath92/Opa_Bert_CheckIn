@AGENTS.md
In den Codes mahce ausreichend Kommentare, damit ich nachvollziehen kann, was da geanu passiert
FÜge in der App einen Button mit drei Punkten ein, wie so eine art menu und mach da eine Hilfe rein und eine Versioniereung, in der Versionierung erkläre immer einfach, was neu ist

## Gelernte Lektionen (aus früheren Projekten, immer beachten)

- Projektordner NIE in Cloud-Sync-Ordnern (Google Drive/OneDrive/Dropbox)
- Neue DB-Spalten: erst ohne NOT NULL anlegen, Werte befüllen, dann erst
  NOT NULL setzen
- Bei Fremdschlüsseln: immer verifizieren, dass die ID aus der korrekten
  Zieltabelle stammt, nicht aus einer Zwischentabelle
- Versionsnummer + CHANGELOG.md von Anfang an führen, Einträge kurz halten
  (Details gehören in Commit-Messages)
- PWA/Service Worker: skipWaiting(), clients.claim(), passende
  Cache-Control-Header von Anfang an einplanen
- Vor jedem größeren Prompt: prüfen ob CLAUDE.md/Anforderungsdatei
  aktuell ist (git pull), Datei schlank halten (abgeschlossenes
  archivieren)
- Branch-Namen ohne Leerzeichen
- Vor npm run build/Deployment: npm run build lokal testen, um Fehler
  früh zu erkennen


  1. Bei jedem App-Start: lies die aktuelle Versionsnummer aus package.json
   (oder eine dafür exportierte Konstante) und vergleiche sie mit dem in
   localStorage gespeicherten Wert "last_seen_version" für diese Person
2. Ist "last_seen_version" leer (z.B. bei einer schon bestehenden Person,
   die die Funktion zum ersten Mal erlebt): setze es einmalig still auf
   die aktuelle Version, OHNE ein Popup zu zeigen (kein rückwirkendes
   Feiern alter Versionen)
3. Ist die aktuelle Version NEUER als "last_seen_version": zeige ein
   kurzes Popup "Was ist neu" mit einer kompakten Liste (Stichpunkte, kein
   Fließtext) der wichtigsten Änderungen zwischen der alten und der neuen
   Version. Nutze dafür die entsprechenden Einträge aus CHANGELOG.md
   (nicht die komplette Datei, nur die relevanten Versionen seit
   last_seen_version)
4. Nach dem Schließen: localStorage-Wert auf die aktuelle Version
   aktualisieren

WICHTIG - ABGRENZUNG zur bestehenden Erste-Schritte-Einführung:
- Komplett neue Person → sieht NUR die Erste-Schritte-Einführung, NICHT
  das "Was ist neu"-Popup (die kennt ja noch gar keine "alte" Version)
- Bestehende Person nach Update → sieht NUR "Was ist neu", NICHT die
  komplette Einführung erneut
- Beide Popups dürfen sich niemals gleichzeitig überlappen - falls beide
  Bedingungen zufällig gleichzeitig zutreffen würden, hat die
  Erste-Schritte-Einführung Vorrang

DESIGN: kurz, unaufdringlich, passend zum aktuell aktiven Design-Modus,
mit einem simplen "Verstanden"/"Schließen"-Button.

Zeig mir zwischendurch kurz dein Vorgehen, und frag nach, falls dir etwas
unklar ist.