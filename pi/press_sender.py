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
    pwm.start(BUZZER_DUTY_CYCLE_PERCENT)
    time.sleep(BEEP_DURATION_SECONDS)
    pwm.stop()
    time.sleep(BEEP_GAP_SECONDS)
    pwm.start(BUZZER_DUTY_CYCLE_PERCENT)
    time.sleep(BEEP_DURATION_SECONDS)
    pwm.stop()


def buzzer_loop():
    # Log-Zeile als Allererstes, noch vor jeder GPIO-Berührung: falls der Thread
    # künftig wieder verschwindet, zeigt uns das, ob er überhaupt gestartet ist.
    logging.info("Buzzer-Thread gestartet, initialisiere GPIO%s ...", BUZZER_PIN)

    # GPIO.setup/GPIO.PWM liefen bisher AUSSERHALB des try/except weiter unten.
    # Wenn hier etwas schiefgeht (z.B. eine zu alte rpi-lgpio-Version ohne
    # PWM-Unterstuetzung), stirbt der Thread lautlos, noch bevor die erste
    # logging-Zeile im try/except erreicht wird - das erklaert, warum bisher
    # weder Erfolgs- noch Fehler-Logs auftauchten.
    try:
        GPIO.setup(BUZZER_PIN, GPIO.OUT, initial=GPIO.LOW)
        pwm = GPIO.PWM(BUZZER_PIN, BUZZER_FREQUENCY_HZ)
    except Exception:
        logging.exception(
            "Buzzer-Thread konnte GPIO%s nicht initialisieren - Thread wird beendet. "
            "Möglicherweise unterstützt die installierte rpi-lgpio-Version kein PWM "
            "(pip install --upgrade rpi-lgpio auf dem Pi probieren).",
            BUZZER_PIN,
        )
        return

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
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    # Taster verbindet GPIO17 mit GND -> Signal fällt beim Drücken von HIGH auf LOW
    GPIO.add_event_detect(
        BUTTON_PIN, GPIO.FALLING, callback=on_button_pressed, bouncetime=800
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
