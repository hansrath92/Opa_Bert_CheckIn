# Opa-Checkin – Raspberry Pi Befehlsübersicht

Alle Befehle werden **per SSH auf dem Pi** ausgeführt, nicht auf eurem eigenen Rechner (außer wo explizit anders vermerkt).

---

## 1. Verbindung zum Pi herstellen

**Pi im Netzwerk finden:**
```bash
ping raspberrypi.local
```
Falls das nicht klappt (z.B. bei Handy-Hotspots): IP-Adresse über den Router/Hotspot-Einstellungen nachschauen ("Verbundene Geräte"), dann:
```bash
ping 192.168.X.X
```

**Per SSH verbinden:**
```bash
ssh haensi@raspberrypi.local
```
oder mit IP-Adresse statt Name:
```bash
ssh haensi@192.168.X.X
```

---

## 2. WLAN verwalten

**Verfügbare Netzwerke anzeigen:**
```bash
sudo nmcli dev wifi list
```

**Aktuell verbundenes Netzwerk anzeigen:**
```bash
nmcli connection show --active
```

**Mit einem Netzwerk verbinden:**
```bash
sudo nmcli dev wifi connect "NETZWERKNAME" password "PASSWORT"
```

**Alle gespeicherten Netzwerk-Profile anzeigen:**
```bash
nmcli connection show
```

**Ein gespeichertes (evtl. kaputtes) Profil löschen:**
```bash
sudo nmcli connection delete "NETZWERKNAME"
```

⚠️ **Wichtig:** Nach dem Wechsel bricht die aktuelle SSH-Verbindung sofort ab (normal!). Danach im neuen Netzwerk neu verbinden (Schritt 1). Der Pi 3 kann nur **2,4 GHz**-WLAN, kein 5 GHz.

**Mehrere WLANs priorisieren** (z.B. erst eigenes Zuhause-WLAN, dann Handy-Hotspot, dann Opas WLAN):
```bash
nmcli connection modify "NETZWERKNAME" connection.autoconnect-priority ZAHL
```
Höhere Zahl = wird bevorzugt, wenn mehrere Netzwerke gleichzeitig in Reichweite sind. Kontrolle:
```bash
nmcli -f NAME,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show
```
Wichtig: Wirkt nur, wenn wirklich mehrere der Netzwerke gleichzeitig sichtbar sind – ist nur eins in Reichweite, verbindet sich der Pi damit, unabhängig von der Priorität.

---

## 3. Der App-Dienst (opa-checkin.service)

Das ist das Programm, das dauerhaft im Hintergrund läuft (Button, Heartbeat, Buzzer).

**Status prüfen:**
```bash
sudo systemctl status opa-checkin.service
```

**Neu starten** (z.B. nach Code-Änderungen):
```bash
sudo systemctl restart opa-checkin.service
```

**Stoppen / Starten:**
```bash
sudo systemctl stop opa-checkin.service
sudo systemctl start opa-checkin.service
```

**Konfiguration des Dienstes ansehen** (zeigt, welche Datei gestartet wird):
```bash
sudo systemctl cat opa-checkin.service
```

**Konfiguration des Dienstes bearbeiten:**
```bash
sudo systemctl edit --full opa-checkin.service
```
Danach immer nötig:
```bash
sudo systemctl daemon-reload
sudo systemctl restart opa-checkin.service
```

---

## 4. Logs (Protokolle) ansehen

**Letzte 30 Zeilen anzeigen:**
```bash
journalctl -u opa-checkin.service -n 30 --no-pager
```

**Live mitlesen** (läuft weiter, bis Strg+C):
```bash
journalctl -u opa-checkin.service -f
```

**Nach einem Begriff filtern** (z.B. nur Buzzer-Zeilen):
```bash
journalctl -u opa-checkin.service -n 100 --no-pager | grep -i buzzer
```

---

## 5. Dateien ansehen / bearbeiten

**Datei-Inhalt anzeigen:**
```bash
cat /home/haensi/opa-checkin/pi/press_sender.py
```

**Nur bestimmte Zeilen anzeigen** (hier: 175 bis 235):
```bash
sed -n '175,235p' /home/haensi/opa-checkin/pi/press_sender.py
```

**Nach einem Begriff in einer Datei suchen (mit Zeilennummer):**
```bash
grep -n "buzzer_loop" /home/haensi/opa-checkin/pi/press_sender.py
```

**Datei bearbeiten** (öffnet den Editor "nano"):
```bash
nano /home/haensi/opa-checkin/pi/press_sender.py
```
Speichern & schließen: **Strg+O**, dann **Enter**, dann **Strg+X**.

**.env-Datei ansehen** (enthält Zugangsdaten, nicht einfach so weitergeben):
```bash
cat /home/haensi/opa-checkin/pi/.env
```

---

## 6. Code-Updates vom GitHub-Repo holen

Im Projektordner auf dem Pi:
```bash
cd ~/opa-checkin
git pull
```
Danach den Dienst neu starten, damit die Änderung aktiv wird:
```bash
sudo systemctl restart opa-checkin.service
```

---

## 7. Manuelle Testskripte

Sind zum Ausprobieren gedacht (laufen NICHT automatisch, nur wenn ihr sie startet):

```bash
python3 ~/opa-checkin/pi/test_buzzer.py       # Einfacher Piepton-Test (im Repo, Abschnitt "Backend direkt testen" unten)
python3 ~/opa-checkin/test_button.py          # Button-Erkennung testen
python3 ~/opa-checkin/test_buzzer_scan.py     # 10 Frequenzen durchtesten
python3 ~/opa-checkin/test_buzzer_volume.py   # 10 Lautstärken durchtesten
```
Beenden mit **Strg+C**.

> Hinweis: `test_buzzer.py` ist seit 24.9. Teil des Git-Repos (`pi/test_buzzer.py`),
> damit es beim nächsten Pi-Wechsel nicht wieder verloren geht - die anderen drei
> (`test_button.py`, `test_buzzer_scan.py`, `test_buzzer_volume.py`) waren nur
> lokal auf dem alten Pi3 und müssten bei Bedarf neu geschrieben werden.

---

## 8. Backend direkt testen (ohne den Pi)

Vom Pi ODER eurem eigenen Rechner aus (Secret aus der `.env`-Datei, Schritt 5):
```bash
curl https://opa-bert-check-in.vercel.app/api/buzzer-status -H "x-api-key: EUER-SECRET"
curl -X POST https://opa-bert-check-in.vercel.app/api/buzzer-trigger -H "x-api-key: EUER-SECRET"
```

---

## 9. Verkabelung (Hardware-Referenz)

Pin-Zählung: Pin 1 = Ecke direkt bei der SD-Karte. Reihe entlangzählen: 1, 3, 5, 7, 9, 11, 13 (obere Reihe), 2, 4, 6, 8, 10, 12, 14 (untere Reihe, direkt darunter).

| Bauteil | Anschluss 1 | Anschluss 2 | Hinweis |
|---|---|---|---|
| **Roter Button** | Physischer Pin 11 (GPIO17) | Physischer Pin 9 (GND) | Egal welches Bein wohin, keine Polung |
| **Piezo-Summer** | Physischer Pin 13 (GPIO27) | Physischer Pin 14 (GND) | Egal welches Bein wohin, keine Polung |

Beide Bauteile hängen also in benachbarten Pin-Paaren (11+9, dann 13+14) – so bleibt es übersichtlich und nichts wird verwechselt.

## Wichtige Eckdaten dieses Projekts (zum Nachschlagen)

| Was | Wert |
|---|---|
| Pi-Benutzername | haensi |
| Projektordner auf dem Pi | `/home/haensi/opa-checkin/pi/` |
| Haupt-Skript | `press_sender.py` |
| systemd-Dienst-Name | `opa-checkin.service` |
| Button | GPIO17 (physischer Pin 11) / GND (Pin 9), `bounce_time=0.5` |
| Piezo-Summer | GPIO27 (physischer Pin 13) / GND (Pin 14), 2000 Hz, Lautstärke 0,3 |
| Vercel-Domain | opa-bert-check-in.vercel.app |
