import time

import RPi.GPIO as GPIO

# Isolierter Hardware-Test für den Piezo, unabhängig von der App/API - testet
# nur, ob GPIO27 richtig verkabelt ist und der Piezo überhaupt piept.
# Gleiche Werte wie im echten Betrieb (siehe press_sender.py).
BUZZER_PIN = 27  # Physischer Pin 13, GND auf Pin 14
FREQUENCY_HZ = 2000
DUTY_CYCLE_PERCENT = 30

GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER_PIN, GPIO.OUT, initial=GPIO.LOW)
pwm = GPIO.PWM(BUZZER_PIN, FREQUENCY_HZ)

print("Teste Piezo auf GPIO27 - Doppel-Piep...")
for _ in range(2):
    pwm.start(DUTY_CYCLE_PERCENT)
    time.sleep(0.15)
    pwm.stop()
    time.sleep(0.15)

GPIO.cleanup()
print("Fertig. Nichts gehört? Verkabelung pruefen (Pin 13 = GPIO27, Pin 14 = GND).")
