import time
import board
from adafruit_onewire.bus import OneWireBus
import adafruit_ds18x20
import wifi
import socketpool
import asyncio
from adafruit_httpserver import Server, Request, Response, Websocket, GET

# --- CONFIGURATIE ---
SENSOR_MAP = {
    "286C8CBC000000C9": "LinksBoven",
    # Voeg hier je andere 4 sensoren toe zodra je de ID's hebt
}

AP_SSID = "Air Carditioning"
AP_PASSWORD = "2026MECH2A1"

# --- GLOBALE VARIABELEN ---
ow_bus = OneWireBus(board.GP22)
mijn_sensoren = []
laatste_meting = "Wachten op sensoren..."
websocket = None

# --- INITIALISATIE FUNCTIES ---
def initialiseer_sensoren():
    gevonden_devices = ow_bus.scan()
    sensor_lijst = []
    print(f"Systeem heeft {len(gevonden_devices)} sensoren gevonden.")
    
    for device in gevonden_devices:
        sensor_obj = adafruit_ds18x20.DS18X20(ow_bus, device)
        id_hex = "".join([f"{b:02X}" for b in device.rom])
        naam = SENSOR_MAP.get(id_hex, f"Onbekend ({id_hex})")
        sensor_lijst.append({"object": sensor_obj, "naam": naam})
    return sensor_lijst

# --- ASYNC TAKEN ---
async def lees_sensoren_taak():
    """Leest elke 2 seconden de sensoren en update de globale string."""
    global laatste_meting
    while True:
        berichten = []
        for s in mijn_sensoren:
            try:
                temp = s["object"].temperature
                berichten.append(f"{s['naam']}:{temp:.1f}")
            except Exception:
                berichten.append(f"{s['naam']}:FOUT")
        
        # Maak een string zoals "LinksBoven:21.5|Buiten:15.0"
        laatste_meting = "|".join(berichten)
        print("Meting:", laatste_meting)
        await asyncio.sleep(2)

async def poll_server():
    while True:
        server.poll()
        await asyncio.sleep(0.1)

async def handle_websocket():
    global websocket
    while True:
        if websocket is not None:
            try:
                # 1. Ontvang eventuele data (optioneel)
                websocket.receive(fail_silently=True)
                
                # 2. STUUR DE TEMPERATUREN naar de website
                websocket.send_message(laatste_meting, fail_silently=True)
            except Exception as e:
                print("WebSocket fout:", e)
                websocket = None 
        await asyncio.sleep(1) # Update de website elke seconde

# --- NETWERK SETUP ---
print(f"Opstart WiFi AP: {AP_SSID}...")
wifi.radio.start_ap(AP_SSID, AP_PASSWORD)
ap_ip = str(wifi.radio.ipv4_address_ap)

pool = socketpool.SocketPool(wifi.radio)
server = Server(pool, debug=True)

# --- HTML TEMPLATE (Met tabel voor 5 sensoren) ---
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; text-align: center; background-color: #f4f4f9; }
        .box { max-width: 400px; margin: 50px auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        table { width: 100%; margin-top: 20px; border-collapse: collapse; }
        td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
        .temp { font-weight: bold; color: #007bff; text-align: right; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Carditioning Monitor</h2>
        <table id="sensorTable"><tr><td>Laden...</td></tr></table>
        <p id="status" style="color:gray; font-size:0.8em;">Verbinden...</p>
    </div>
    <script>
        let ws = new WebSocket('ws://' + location.host + '/ws');
        ws.onmessage = (event) => {
            let data = event.data.split('|');
            let table = document.getElementById('sensorTable');
            let html = "";
            data.forEach(item => {
                let p = item.split(':');
                if(p.length == 2) {
                    html += `<tr><td>${p[0]}</td><td class="temp">${p[1]}°C</td></tr>`;
                }
            });
            table.innerHTML = html;
            document.getElementById('status').innerText = "Live updates actief";
        };
        ws.onclose = () => document.getElementById('status').innerText = "Verbinding verbroken";
    </script>
</body>
</html>
"""

@server.route("/", GET)
def serve_client(request: Request):
    return Response(request, HTML_TEMPLATE, content_type="text/html")

@server.route("/ws", GET)
def connect_websocket(request: Request):
    global websocket
    if websocket is not None: websocket.close()
    websocket = Websocket(request)
    return websocket

# --- MAIN RUNNER ---
async def main():
    global mijn_sensoren
    mijn_sensoren = initialiseer_sensoren()
    
    server.start(ap_ip)
    print(f"Server draait op http://{ap_ip}")
    
    # Draai alle drie de processen tegelijk
    await asyncio.gather(
        poll_server(),
        handle_websocket(),
        lees_sensoren_taak()
    )

asyncio.run(main())