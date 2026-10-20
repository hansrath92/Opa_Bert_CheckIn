#!/bin/bash
# Internet-Watchdog: prueft, ob der Pi das Backend erreicht, und repariert
# sich stufenweise selbst. Wird alle 5 Minuten vom systemd-Timer
# opa-internet-watchdog.timer gestartet (siehe pi/README.md, Abschnitt 3c).
#
# Stufen (bei jeweils aufeinanderfolgenden Fehlversuchen, 1 Versuch = 5 Min):
#   2 Fehlversuche (~10 Min)  -> NetworkManager neu starten (WLAN neu verbinden)
#   6 Fehlversuche (~30 Min)  -> kompletter Neustart des Pi
# Ein einziger erfolgreicher Check setzt den Zaehler wieder auf 0.

# Geprueft wird die Adresse, von der die App wirklich abhaengt (nicht z.B.
# google.com) - so zaehlt auch ein Vercel-Ausfall oder DNS-Problem als "offline".
CHECK_URL="https://opa-bert-check-in.vercel.app"

# Zaehler liegt in /run (RAM): nach einem Neustart automatisch wieder bei 0.
STATE_FILE="/run/opa-internet-fails"

NETWORK_RESTART_AFTER=2
REBOOT_AFTER=6

# Bisherige Fehlversuche lesen (0, falls die Datei noch nicht existiert).
fails=0
if [ -f "$STATE_FILE" ]; then
    fails=$(cat "$STATE_FILE")
fi

# -s = still, -o /dev/null = Antwort verwerfen, -m 15 = max. 15 Sekunden.
# Ohne -f gilt JEDE HTTP-Antwort (auch 404/401) als "Internet da" - uns geht
# es nur darum, ob die Verbindung steht, nicht um den Inhalt.
if curl -s -o /dev/null -m 15 "$CHECK_URL"; then
    if [ "$fails" -gt 0 ]; then
        logger -t opa-internet-watchdog "Internet wieder da (nach $fails Fehlversuchen)."
    fi
    echo 0 > "$STATE_FILE"
    exit 0
fi

# Check fehlgeschlagen: Zaehler erhoehen und speichern.
fails=$((fails + 1))
echo "$fails" > "$STATE_FILE"
logger -t opa-internet-watchdog "Kein Internet (Fehlversuch $fails)."

if [ "$fails" -ge "$REBOOT_AFTER" ]; then
    # Letzte Stufe: Neustart. Zaehler wird beim Neustart automatisch geloescht.
    logger -t opa-internet-watchdog "Seit $fails Versuchen offline - starte den Pi neu."
    systemctl reboot
elif [ "$fails" -eq "$NETWORK_RESTART_AFTER" ]; then
    # Erste Stufe: nur das Netzwerk neu starten (schneller, Dienst laeuft weiter).
    logger -t opa-internet-watchdog "Starte NetworkManager neu."
    systemctl restart NetworkManager
fi
