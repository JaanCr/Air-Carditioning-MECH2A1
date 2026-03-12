# =========================================================
# VENTILATORS REGELING (CircuitPython)
# =========================================================

import time
import board
import pwmio

# =========================================================
# VENTILATOR KLASS
# =========================================================

#set_speed nog aanpassen naargelang de ingegeven temperatuur op de webbrowser

class Fan:
    def __init__(self, pwm_pin, frequency=25000):
        self.pwm = pwmio.PWMOut(pwm_pin, frequency=frequency, duty_cycle=0)
        self.speed = 0.0  # 0.0 – 1.0

    def set_speed(self, speed):
        """Stel ventilatorsnelheid in (0.0 – 1.0)"""
        self.speed = max(0, min(1, speed))
        self.pwm.duty_cycle = int(self.speed * 65535)


# =========================================================
# INITIALISATIE VAN 2 VENTILATORS
# =========================================================
fan1 = Fan(board.GP16)   #pinnen nummers evenetueel nog aanpassen naargelang van gemak qua ordening
fan2 = Fan(board.GP17)

# =========================================================
# MAIN LOOP
# =========================================================
while True:
    #main loop
    #nog linken met de website om zelf de temp te kunnen regelen
    fan1.set_speed(0.5)
    fan2.set_speed(0.8)

    print(f"Fan1 snelheid: {fan1.speed:.2f} | Fan2 snelheid: {fan2.speed:.2f}")

    time.sleep(1)