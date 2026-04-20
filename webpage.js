if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    updateThemeButton()
}

let socket;

function connect_socket() {
    disconnect_socket();

    socket = new WebSocket("ws://" + window.location.host + "/connect-websocket");
    const o = document.getElementById("status");

    socket.addEventListener("open", (event) => {
       o.textContent = "Status: Connected";
       o.className = "connected"; 
    });

    socket.addEventListener("close", (event) => {
        o.textContent = "Status: Disconnected";
        o.className = "disconnected";
        socket = undefined;
        setTimeout(() => { connect_socket(); }, 2500);
    });
    
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data); 
        
        const overlay = document.getElementById("waiting-room");
        const queueMessage = document.getElementById("queue-status-text");

        if (data.queue_pos === 0) {
            overlay.style.display = "none";
        } else {
            overlay.style.display = "flex";
            let x = data.queue_pos;
            if (x === 1) {
                queueMessage.innerHTML = "Een andere persoon heeft de controle op dit moment, u staat <strong>1ste</strong> in de wachtrij.";
            } else {
                queueMessage.innerHTML = "Een andere persoon heeft de controle op dit moment, u staat <strong>" + x + "de</strong> in de wachtrij."
            }
            
        }
        
        const updateDot = (id, isOnline) => {
            const statusSens = document.getElementById(id);
            if (!statusSens) return;
            if (isOnline) {
                statusSens.classList.add("online");
                statusSens.classList.remove("offline");
            } else {
                statusSens.classList.add("offline");
                statusSens.classList.remove("online");
            }
        };

        // UI Updates
        let inputL = document.getElementById('inputTempLinks');
        if (data.peltierEnabledLinks) {
            inputL.classList.add('input-enabled'); inputL.classList.remove('input-disabled');
        } else {
            inputL.classList.add('input-disabled'); inputL.classList.remove('input-enabled');
        }

        let inputR = document.getElementById('inputTempRechts');
        if (data.peltierEnabledRechts) {
            inputR.classList.add('input-enabled'); inputR.classList.remove('input-disabled');
        } else {
            inputR.classList.add('input-disabled'); inputR.classList.remove('input-enabled');
        }

        updateDot("statusLinksBoven", data.statusLinksBoven);
        updateDot("statusRechtsBoven", data.statusRechtsBoven);
        updateDot("statusBuiten", data.statusBuiten);
        updateDot("statusLinksOnder", data.statusLinksOnder);
        updateDot("statusRechtsOnder", data.statusRechtsOnder);

        if (data.fanStatusLinks !== undefined) updateFanButton("fanBtnLinks", data.fanStatusLinks);
        if (data.fanStatusRechts !== undefined) updateFanButton("fanBtnRechts", data.fanStatusRechts);

        document.getElementById("tempLinks").textContent = data.temperatureLinks;
        document.getElementById("tempRechts").textContent = data.temperatureRechts;
        document.getElementById("tempBuiten").textContent = data.temperatureBuiten;
        document.getElementById("tempGem").textContent = data.temperatureGem;
    });

    socket.addEventListener("error", (event) => {
        o.textContent = "Status: Disconnected";
        o.className = "disconnected";
    });
}


function disconnect_socket() { if (socket != undefined) { socket.close(); socket = undefined; } }

function sendCommand(command) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) { socket.send(command); } 
    else { alert("Disconnected"); }
}

function handleMasterStop() {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        sendCommand('STOP_ALL'); resetAll(); alert("Systeem is gestopt!");
    } else { alert("Disconnected"); } 
}

function resetAll() {
    const rw = "20";
    document.getElementById("doelGem").textContent = rw;
    document.getElementById("doelLinks").textContent = rw;
    document.getElementById("doelRechts").textContent = rw;
    document.getElementById("inputTempLinks").value = rw;
    document.getElementById("inputTempRechts").value = rw;
    document.getElementById("inputTempGem").value = rw;
    document.getElementById("fanSliderLinks").value = 50; 
    document.getElementById("fanSliderRechts").value = 50;
    document.getElementById("fanValLinks").textContent = "50";
    document.getElementById("fanValRechts").textContent = "50";
}

function setTargetTemp(kant) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        let val = document.getElementById("inputTemp" + kant).value;
        socket.send("TEMP_" + kant.toUpperCase() + "=" + val);
        document.getElementById("doel" + kant).textContent = val;
    } else { alert("Disconnected"); }
}

function setGlobalTargetTemp() {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        let val = document.getElementById("inputTempGem").value;
        socket.send("TEMP_GEM=" + val);
        document.getElementById("doelGem").textContent = val;
        document.getElementById("doelLinks").textContent = val;
        document.getElementById("doelRechts").textContent = val;
    } else { alert("Disconnected"); }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeButton()
}

function updateThemeButton() {
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    const isDark = document.body.classList.contains("dark-mode");
    btn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

const updateFanButton = (btnId, isRunning) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.toggle("active-fan", isRunning);
    btn.textContent = isRunning ? "Toggle Fan (ON)" : "Toggle Fan (OFF)";
};

function updateFanLabel(kant, waarde) { document.getElementById("fanVal" + kant).textContent = waarde; }

function sendFanSpeed(kant, waarde) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        socket.send("FAN_" + kant.toUpperCase() + "=" + waarde);
    } else { alert("Disconnected"); }
}