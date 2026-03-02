import time
import board
import pwmio
from digitalio import DigitalInOut, Direction

# =========================================================
#  TEMPERATUURSENSOREN (ABSTRACT)
#  Vervang read_temp() door jouw echte sensoren
# =========================================================
def read_temp(sensor_id):
    # TODO: implementeer echte uitlezing (DS18B20, NTC, I2C, ...)
    return 20.0 + sensor_id   # dummy waarden


# =========================================================
#  PELTIER MET H-BRUG + PID (CIRCUITPYTHON)
# =========================================================
class PeltierHBridge:
    def __init__(self, pin_in1, pin_in2, pin_pwm, Kp=1.0, Ki=0.05, Kd=0.2):

        # H-brug pinnen
        self.in1 = DigitalInOut(pin_in1)
        self.in1.direction = Direction.OUTPUT

        self.in2 = DigitalInOut(pin_in2)
        self.in2.direction = Direction.OUTPUT

        # PWM pin (0–65535 duty cycle)
        self.pwm = pwmio.PWMOut(pin_pwm, frequency=20000, duty_cycle=0)

        # PID parameters
        self.Kp = Kp
        self.Ki = Ki
        self.Kd = Kd

        # PID variabelen
        self.integral = 0
        self.last_error = 0

        # Doeltemperatuur
        self.target = 20.0

    def set_target(self, t):
        self.target = t

    def set_output(self, direction, power):
        """
        direction:
            1  = koelen
           -1  = verwarmen
            0  = uit
        power: 0.0 – 1.0
        """
        power = max(0, min(1, power))
        duty = int(power * 65535)

        if direction == 0:
            self.in1.value = False
            self.in2.value = False
            self.pwm.duty_cycle = 0

        elif direction == 1:  # koelen
            self.in1.value = True
            self.in2.value = False
            self.pwm.duty_cycle = duty

        elif direction == -1:  # verwarmen
            self.in1.value = False
            self.in2.value = True
            self.pwm.duty_cycle = duty

    def update(self, current_temp):
        # PID berekening
        error = self.target - current_temp
        self.integral += error
        derivative = error - self.last_error

        output = self.Kp * error + self.Ki * self.integral + self.Kd * derivative
        self.last_error = error

        # Dode zone
        if abs(output) < 0.05:
            self.set_output(0, 0)
            return 0

        # Richting bepalen
        if output > 0:
            self.set_output(1, min(1, output))   # koelen
        else:
            self.set_output(-1, min(1, -output)) # verwarmen

        return output


# =========================================================
#  INITIALISATIE VAN 2 PELTIERS + 5 SENSOREN
# =========================================================

NUM_SENSORS = 5

# Peltier 0 → H-brug op pins (IN1=GP10, IN2=GP11, PWM=GP12)
# Peltier 1 → H-brug op pins (IN1=GP13, IN2=GP14, PWM=GP15)
peltier = [
    PeltierHBridge(board.GP10, board.GP11, board.GP12),
    PeltierHBridge(board.GP13, board.GP14, board.GP15)
]

# Doeltemperaturen instellen
peltier[0].set_target(18.0)   # koelen
peltier[1].set_target(30.0)   # verwarmen


# =========================================================
#  MAIN LOOP
# =========================================================
while True:
    temps = [read_temp(i) for i in range(NUM_SENSORS)]

    out0 = peltier[0].update(temps[0])
    out1 = peltier[1].update(temps[1])

    print("T0:", temps[0], "OUT0:", out0," T1:", temps[1], "OUT1:", out1)

    time.sleep(1)
