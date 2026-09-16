import logging
import os
import time

import requests
import RPi.GPIO as GPIO
from dotenv import load_dotenv

load_dotenv()

API_URL = os.environ["API_URL"]
API_SECRET = os.environ["API_SECRET"]
BUTTON_PIN = 17  # Physischer Pin 11, GND auf Pin 9

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")


def send_press():
    try:
        response = requests.post(
            API_URL,
            headers={"x-api-key": API_SECRET},
            timeout=10,
        )
        response.raise_for_status()
        logging.info("Knopfdruck gesendet: %s", response.json())
    except requests.RequestException as error:
        logging.error("Fehler beim Senden: %s", error)


def on_button_pressed(channel):
    send_press()


def main():
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    # Taster verbindet GPIO17 mit GND -> Signal fällt beim Drücken von HIGH auf LOW
    GPIO.add_event_detect(
        BUTTON_PIN, GPIO.FALLING, callback=on_button_pressed, bouncetime=1000
    )

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
