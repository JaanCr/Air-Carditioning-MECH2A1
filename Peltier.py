from machine import Pin, PWM
import time

# =========================================================
#  TEMPERATUURSENSOREN (ABSTRACT)
#  Vervang read_temp() door jouw echte sensoren
# =========================================================
def read_temp(sensor_id):
    # TODO: implementeer echte uitlezing (DS18B20, NTC, I2C, ...)
    return 20.0 + sensor_id   # dummy waarden


# =========================================================
#  PELTIER MET H-BRUG + PID
# =========================================================
class PeltierHBridge:
    def __init__(self, pin_in1, pin_in2, pin_pwm, Kp=1.0, Ki=0.05, Kd=0.2):
        # H-brug pinnen
        self.in1 = Pin(pin_in1, Pin.OUT)
        self.in2 = Pin(pin_in2, Pin.OUT)

        # PWM pin
        self.pwm = PWM(Pin(pin_pwm))
        self.pwm.freq(20000)  # stil PWM-signaal frequentie van de pico word hier ingesteld

        # PID parameters
        self.Kp = Kp #(1.0) waardes die de PID vergelijking bepalen
        self.Ki = Ki #(0.05)
        self.Kd = Kd #(0.2)

        # PID variabelen
        self.integral = 0 #begin waarden
        self.last_error = 0

        # Doeltemperatuur
        self.target = 20.0 #automatische starttemperatuur

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

        if direction == 0: # uit
            self.in1.value(0)
            self.in2.value(0)
            self.pwm.duty_u16(0)

        elif direction == 1:  # koelen
            self.in1.value(1)
            self.in2.value(0)
            self.pwm.duty_u16(duty)

        elif direction == -1:  # verwarmen
            self.in1.value(0)
            self.in2.value(1)
            self.pwm.duty_u16(duty)

    def update(self, current_temp):
        # PID berekening
        error = self.target - current_temp #sterke vereenvoudiging in de int en dif
        self.integral += error
        derivative = error - self.last_error

        output = self.Kp * error + self.Ki * self.integral + self.Kd * derivative
        self.last_error = error

        # Dode zone
        if abs(output) < 0.05: # sturen we niet bij moeten we nog bepalen hoe groot die is
            self.set_output(0, 0)
            return 0

        # Richting bepalen
        if output > 0:
            self.set_output(1, min(1, output))   # koelen
        else:
            self.set_output(-1, min(1, -output)) # verwarmen # output moet positief zijn

        return output


# =========================================================
#  INITIALISATIE VAN 2 PELTIERS + 5 SENSOREN
# =========================================================

NUM_SENSORS = 5

# Peltier 0 → H-brug op pins (IN1=10, IN2=11, PWM=12)
# Peltier 1 → H-brug op pins (IN1=13, IN2=14, PWM=15)
peltier = [
    PeltierHBridge(10, 11, 12),
    PeltierHBridge(13, 14, 15)
]

# Doeltemperaturen instellen
peltier[0].set_target(18.0)   # koelen
peltier[1].set_target(30.0)   # verwarmen


# =========================================================
#  MAIN LOOP
# =========================================================
while True:
    # 5 sensoren uitlezen
    temps = [read_temp(i) for i in range(NUM_SENSORS)]

    # Voorbeeld: sensor 0 stuurt Peltier 0, sensor 1 stuurt Peltier 1
    out0 = peltier[0].update(temps[0])
    out1 = peltier[1].update(temps[1])

    print("T0:", temps[0], "OUT0:", out0,
          "| T1:", temps[1], "OUT1:", out1)

    time.sleep(1)