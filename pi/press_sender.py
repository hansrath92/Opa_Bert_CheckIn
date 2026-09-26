import logging
import os
import threading
import time

import requests
import RPi.GPIO as GPIO
from dotenv import load_dotenv

load_dotenv()

API_URL = os.environ["API_URL"]
API_SECRET = os.environ["API_SECRET"]
BUTTON_PIN = 17  # Physischer Pin 11, GND auf Pin 9
BUZZER_PIN = 27  # Physischer Pin 13, GND auf Pin 14 (passiver Piezo)

RETRY_DELAYS_SECONDS = [2, 5, 10, 20]  # bei kurzen WLAN-Aussetzern erneut versuchen

# Entprellung in zwei Stufen:
# - BUTTON_DEBOUNCE_MS geht an die GPIO-Bibliothek. Achtung: rpi-lgpio meldet
#   einen Druck erst, wenn das Signal so lange STABIL war - der Wert verzögert
#   also jeden Druck um genau diese Zeit. 800 ms waren als Verzögerung hörbar,
#   100 ms haben Störsignale durchgelassen (Fehlauslösungen ohne Druck).
#   250 ms ist der Kompromiss: filtert kurze Störungen, reagiert noch zügig.
# - PRESS_LOCKOUT_SECONDS ist unsere eigene Sperre im Skript: Weitere Drücke
#   innerhalb dieser Zeit werden ignoriert (kein Ton, nichts gesendet), damit
#   kein Doppel-Eintrag in der App entsteht.
BUTTON_DEBOUNCE_MS = 250
PRESS_LOCKOUT_SECONDS = 2.0
last_press_at = 0.0  # Zeitpunkt (time.monotonic) des letzten gezählten Drucks

# Schutz gegen Fehlauslösungen durch Spannungsspitzen (z.B. beim Einstecken
# des Netzteils):
# - STARTUP_IGNORE_SECONDS: In den ersten Sekunden nach Programmstart wird
#   jeder erkannte Druck ignoriert - genau dann treten die Spitzen auf.
# - CONFIRM_CHECK_SECONDS: Nach einem erkannten Druck kurz warten und den Pin
#   erneut lesen. Nur wenn er dann immer noch LOW ist (Knopf wirklich noch
#   gedrückt), zählt der Druck. Eine Störspitze ist bis dahin längst vorbei.
STARTUP_IGNORE_SECONDS = 5.0
CONFIRM_CHECK_SECONDS = 0.05
program_started_at = time.monotonic()  # wird in main() nochmal exakt gesetzt

# Leitet sich aus API_URL ab (z.B. ".../api/press" -> ".../api/heartbeat"),
# damit nur eine URL in der .env gepflegt werden muss.
HEARTBEAT_URL = API_URL.replace("/api/press", "/api/heartbeat")
HEARTBEAT_INTERVAL_SECONDS = 300  # alle 5 Minuten, unabhängig von echten Knopfdrücken

BUZZER_STATUS_URL = API_URL.replace("/api/press", "/api/buzzer-status")
BUZZER_POLL_INTERVAL_SECONDS = 5  # wie schnell der Buzzer auf ein "aus" reagiert
BUZZER_REPEAT_SECONDS = 20  # Wiederholung des Doppel-Pieps, siehe Anforderungsdokument Abschnitt 6
BUZZER_FREQUENCY_HZ = 2000
BUZZER_DUTY_CYCLE_PERCENT = 30  # entspricht "Tastverhältnis/Lautstärke 0,3"
BEEP_DURATION_SECONDS = 0.15
BEEP_GAP_SECONDS = 0.15

# Bestätigungston direkt beim Knopfdruck: aufsteigendes "Ding-Dong"
# (tief -> hoch). Klingt bewusst anders als der Erinnerungs-Doppelpiep
# (zweimal gleich hoch), damit Opa beides auseinanderhalten kann.
CONFIRM_TONES = [(1500, 0.12), (2500, 0.30)]  # (Frequenz in Hz, Dauer in Sekunden)
CONFIRM_GAP_SECONDS = 0.05

# Der Piezo wird von zwei Threads benutzt (Erinnerung + Bestätigung). Das
# PWM-Objekt wird deshalb nur EINMAL angelegt und hier geteilt; das Lock sorgt
# dafür, dass nie zwei Töne gleichzeitig durcheinander gespielt werden.
buzzer_pwm = None
buzzer_lock = threading.Lock()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")


def send_press():
    attempts = len(RETRY_DELAYS_SECONDS) + 1
    for attempt in range(1, attempts + 1):
        try:
            response = requests.post(
                API_URL,
                headers={"x-api-key": API_SECRET},
                timeout=10,
            )
            response.raise_for_status()
            logging.info("Knopfdruck gesendet: %s", response.json())
            return
        except requests.RequestException as error:
            logging.error(
                "Fehler beim Senden (Versuch %s/%s): %s", attempt, attempts, error
            )
            if attempt < attempts:
                time.sleep(RETRY_DELAYS_SECONDS[attempt - 1])

    logging.error("Knopfdruck konnte nach %s Versuchen nicht gesendet werden.", attempts)


def on_button_pressed(channel):
    global last_press_at

    # Schutz 1: Start-Ignorierzeit - Drücke direkt nach dem Programmstart sind
    # sehr wahrscheinlich Spannungsspitzen vom Einschalten, keine echten.
    if time.monotonic() - program_started_at < STARTUP_IGNORE_SECONDS:
        logging.info(
            "Knopfdruck ignoriert (innerhalb der ersten %s s nach Start).",
            STARTUP_IGNORE_SECONDS,
        )
        return

    # Schutz 2: Bestätigungsprüfung - kurz warten, dann nachsehen, ob der Knopf
    # immer noch gedrückt ist (LOW). Ist der Pin schon wieder HIGH, war es nur
    # eine kurze Störspitze. Steht bewusst VOR der Doppeldruck-Sperre, damit
    # eine Störung die Sperre nicht auslöst und einen echten Druck blockiert.
    time.sleep(CONFIRM_CHECK_SECONDS)
    if GPIO.input(BUTTON_PIN) != GPIO.LOW:
        logging.info("Knopfdruck ignoriert (Pin nach %s s wieder HIGH - Störspitze).", CONFIRM_CHECK_SECONDS)
        return

    now = time.monotonic()
    if now - last_press_at < PRESS_LOCKOUT_SECONDS:
        logging.info("Knopfdruck ignoriert (weniger als %s s nach dem letzten).", PRESS_LOCKOUT_SECONDS)
        return
    last_press_at = now

    # Ding-Dong SOFORT beim Drücken, damit Opa ohne Verzögerung hört, dass der
    # Knopf reagiert hat. Bewusst nicht erst nach der Server-Antwort (die kann
    # 1-2 Sekunden dauern). Läuft in einem eigenen Thread, damit das Senden
    # nicht auf das Ende des Tons warten muss.
    threading.Thread(target=confirm_beep, daemon=True).start()
    send_press()


def heartbeat_loop():
    while True:
        try:
            response = requests.post(
                HEARTBEAT_URL, headers={"x-api-key": API_SECRET}, timeout=10
            )
            response.raise_for_status()
            logging.info("Heartbeat gesendet")
        except requests.RequestException as error:
            logging.error("Heartbeat fehlgeschlagen: %s", error)
        time.sleep(HEARTBEAT_INTERVAL_SECONDS)


def double_beep(pwm):
    with buzzer_lock:
        # Frequenz explizit setzen, weil confirm_beep() sie zwischendurch ändert.
        pwm.ChangeFrequency(BUZZER_FREQUENCY_HZ)
        pwm.start(BUZZER_DUTY_CYCLE_PERCENT)
        time.sleep(BEEP_DURATION_SECONDS)
        pwm.stop()
        time.sleep(BEEP_GAP_SECONDS)
        pwm.start(BUZZER_DUTY_CYCLE_PERCENT)
        time.sleep(BEEP_DURATION_SECONDS)
        pwm.stop()


def confirm_beep():
    # Kurzes "Ding-Dong" als Rückmeldung für Opa: Knopf hat reagiert.
    if buzzer_pwm is None:
        # Buzzer konnte beim Start nicht initialisiert werden -> still weiter,
        # der Knopfdruck selbst ist ja trotzdem erfolgreich gesendet.
        return
    try:
        with buzzer_lock:
            for index, (frequency, duration) in enumerate(CONFIRM_TONES):
                if index > 0:
                    time.sleep(CONFIRM_GAP_SECONDS)
                buzzer_pwm.ChangeFrequency(frequency)
                buzzer_pwm.start(BUZZER_DUTY_CYCLE_PERCENT)
                time.sleep(duration)
                buzzer_pwm.stop()
            # Zurück auf die Standardfrequenz für den Erinnerungs-Piep.
            buzzer_pwm.ChangeFrequency(BUZZER_FREQUENCY_HZ)
    except Exception:
        # Ein Fehler beim Piepen darf das Senden nie beeinträchtigen.
        logging.exception("Bestätigungston konnte nicht abgespielt werden.")


def init_buzzer():
    # Legt das gemeinsame PWM-Objekt für den Piezo an (einmalig beim Start).
    # Schlägt das fehl (z.B. zu alte rpi-lgpio-Version ohne PWM), bleibt
    # buzzer_pwm = None: Knopf + Heartbeat laufen trotzdem normal weiter.
    global buzzer_pwm
    logging.info("Initialisiere Piezo auf GPIO%s ...", BUZZER_PIN)
    try:
        GPIO.setup(BUZZER_PIN, GPIO.OUT, initial=GPIO.LOW)
        buzzer_pwm = GPIO.PWM(BUZZER_PIN, BUZZER_FREQUENCY_HZ)
    except Exception:
        logging.exception(
            "Piezo auf GPIO%s konnte nicht initialisiert werden - es gibt keine Töne. "
            "Möglicherweise unterstützt die installierte rpi-lgpio-Version kein PWM "
            "(pip install --upgrade rpi-lgpio auf dem Pi probieren).",
            BUZZER_PIN,
        )


def buzzer_loop():
    logging.info("Buzzer-Thread gestartet.")

    # Ohne funktionierenden Piezo braucht der Erinnerungs-Thread nicht zu laufen
    # (Fehler wurde bereits in init_buzzer() geloggt).
    if buzzer_pwm is None:
        logging.error("Kein Piezo verfügbar - Buzzer-Thread wird beendet.")
        return
    pwm = buzzer_pwm

    logging.info(
        "Buzzer-Thread bereit, frage %s alle %s Sekunden ab.",
        BUZZER_STATUS_URL,
        BUZZER_POLL_INTERVAL_SECONDS,
    )
    last_beep_at = 0.0

    while True:
        should_buzz = False
        try:
            response = requests.get(
                BUZZER_STATUS_URL, headers={"x-api-key": API_SECRET}, timeout=10
            )
            response.raise_for_status()
            should_buzz = bool(response.json().get("shouldBuzz", False))
            logging.info("Buzzer-Status abgefragt: shouldBuzz=%s", should_buzz)
        except requests.RequestException as error:
            logging.error("Buzzer-Status-Abfrage fehlgeschlagen: %s", error)
        except Exception:
            # Unerwartete Fehler (z.B. kaputte JSON-Antwort) sollen den Thread
            # nicht mehr lautlos beenden, sondern sichtbar sein und die
            # Schleife läuft trotzdem weiter.
            logging.exception("Unerwarteter Fehler bei der Buzzer-Status-Abfrage.")

        # Wiederholung alle BUZZER_REPEAT_SECONDS, solange shouldBuzz aktiv bleibt.
        # Sobald der Server "false" liefert (Abend-Druck registriert), piept es beim
        # naechsten Poll-Zyklus nicht mehr weiter.
        try:
            now = time.monotonic()
            if should_buzz and (now - last_beep_at) >= BUZZER_REPEAT_SECONDS:
                logging.info("Erinnerung aktiv: Doppel-Piep")
                double_beep(pwm)
                last_beep_at = time.monotonic()
        except Exception:
            logging.exception("Fehler beim Piepen, Buzzer-Thread läuft trotzdem weiter.")

        time.sleep(BUZZER_POLL_INTERVAL_SECONDS)


def main():
    # Startzeitpunkt für die Start-Ignorierzeit (siehe on_button_pressed).
    global program_started_at
    program_started_at = time.monotonic()

    GPIO.setmode(GPIO.BCM)
    # Piezo zuerst einrichten, damit der Bestätigungston schon beim allerersten
    # Knopfdruck bereitsteht.
    init_buzzer()
    GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    # Taster verbindet GPIO17 mit GND -> Signal fällt beim Drücken von HIGH auf LOW
    GPIO.add_event_detect(
        BUTTON_PIN, GPIO.FALLING, callback=on_button_pressed, bouncetime=BUTTON_DEBOUNCE_MS
    )

    # Läuft nebenbei im Hintergrund, damit der Heartbeat nicht von echten
    # Knopfdrücken abhängt und diese auch nicht blockiert.
    threading.Thread(target=heartbeat_loop, daemon=True).start()

    # Läuft ebenfalls nebenbei: pollt den Buzzer-Status und steuert den Piezo,
    # unabhängig vom Knopfdruck-Listener.
    threading.Thread(target=buzzer_loop, daemon=True).start()

    logging.info("Warte auf Knopfdruck an GPIO%s ...", BUTTON_PIN)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        GPIO.cleanup()


if __name__ == "__main__":
    main()
