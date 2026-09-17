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

RETRY_DELAYS_SECONDS = [2, 5, 10, 20]  # bei kurzen WLAN-Aussetzern erneut versuchen

# Leitet sich aus API_URL ab (z.B. ".../api/press" -> ".../api/heartbeat"),
# damit nur eine URL in der .env gepflegt werden muss.
HEARTBEAT_URL = API_URL.replace("/api/press", "/api/heartbeat")
HEARTBEAT_INTERVAL_SECONDS = 300  # alle 5 Minuten, unabhängig von echten Knopfdrücken

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
