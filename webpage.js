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
        setTimeout(() => {
            connect_socket(); 
        }, 2500);
    });
    
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data); 
        
        const updateDot = (id, isOnline) => {
            const statusSens = document.getElementById(id);
            if (isOnline) {
                statusSens.classList.add("online");
                statusSens.classList.remove("offline");
            } 
            else {
                statusSens.classList.add("offline");
                statusSens.classList.remove("online");
            }
        };

        // Kader Links Input
        let inputL = document.getElementById('inputTempLinks');
        if (data.peltierEnabledLinks) {
            inputL.classList.add('input-enabled');
            inputL.classList.remove('input-disabled');
        } else {
            inputL.classList.add('input-disabled');
            inputL.classList.remove('input-enabled');
        }

        // Kader Rechts Input
        let inputR = document.getElementById('inputTempRechts');
        if (data.peltierEnabledRechts) {
            inputR.classList.add('input-enabled');
            inputR.classList.remove('input-disabled');
        } else {
            inputR.classList.add('input-disabled');
            inputR.classList.remove('input-enabled');
        }

        if (data.statusLinksBoven !== undefined) 
            updateDot("statusLinksBoven", data.statusLinksBoven);
        if (data.statusRechtsBoven !== undefined) 
            updateDot("statusRechtsBoven", data.statusRechtsBoven);
        if (data.statusBuiten !== undefined) 
            updateDot("statusBuiten", data.statusBuiten);
        if (data.statusLinksOnder !== undefined) 
            updateDot("statusLinksOnder", data.statusLinksOnder);
        if (data.statusRechtsOnder !== undefined) 
            updateDot("statusRechtsOnder", data.statusRechtsOnder);

        if (data.fanStatusLinks !== undefined)
            updateFanButton("fanBtnLinks", data.fanStatusLinks);
        if (data.fanStatusRechts !== undefined)
            updateFanButton("fanBtnRechts", data.fanStatusRechts);

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

function disconnect_socket() {
    if (socket != undefined) {
        socket.close();
        socket = undefined;
    }
}

function sendCommand(command) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        socket.send(command);
    } 
    else {
        alert("Disconnected");
    }
}

// Systeemstop button functies
function handleMasterStop() {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        sendCommand('STOP_ALL');   
        resetAll();         
        alert("Systeem is gestopt!");
    } 
    else {
        alert("Disconnected");
    } 
}

function resetAll() {
    // Update tekst doeltemp en waarde in inputvelden naar 20°C
    const resetwaarde = "20";
    document.getElementById("doelGem").textContent = resetwaarde;
    document.getElementById("doelLinks").textContent = resetwaarde;
    document.getElementById("doelRechts").textContent = resetwaarde;

    document.getElementById("inputTempLinks").value = resetwaarde;
    document.getElementById("inputTempRechts").value = resetwaarde;
    document.getElementById("inputTempGem").value = resetwaarde;

    // Update sliders naar 50%
    document.getElementById("fanSliderLinks").value = 50; 
    document.getElementById("fanSliderRechts").value = 50;
    document.getElementById("fanValLinks").textContent = "50";
    document.getElementById("fanValRechts").textContent = "50";
}

// Nieuwe functie voor het instellen van de doeltemperatuur via de input velden
function setTargetTemp(kant) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        let inputElement = document.getElementById("inputTemp" + kant);
        let waarde = inputElement.value;
        
        // Stuur commando, bijvoorbeeld "TEMP_LINKS=21.5"
        let commando = "TEMP_" + kant.toUpperCase() + "=" + waarde;
        socket.send(commando);

        // Update de tekst in de UI
        document.getElementById("doel" + kant).textContent = waarde;
    } 
    else {
        alert("Disconnected");
    }
}

function setGlobalTargetTemp() {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        let inputElement = document.getElementById("inputTempGem");
        let waarde = inputElement.value;
        
        let commando = "TEMP_GEM" + "=" + waarde;
        socket.send(commando);

        // Update de tekst in de UI voor allemaal
        document.getElementById("doelGem").textContent = waarde;
        document.getElementById("doelLinks").textContent = waarde;
        document.getElementById("doelRechts").textContent = waarde;
    } 
    else {
        alert("Disconnected");
    }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeButton()
}

function updateThemeButton() {
    const btn = document.getElementById("theme-btn");
    if (!btn) return; // safety check
    const isDark = document.body.classList.contains("dark-mode");
    btn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

const updateFanButton = (btnId, isRunning) => {
    const btn = document.getElementById(btnId);
    if (!btn) return; // Safety check

    if (isRunning) {
        btn.classList.add("active-fan");
        btn.textContent = "Toggle Fan (ON)"; 
    } 
    else {
        btn.classList.remove("active-fan");
        btn.textContent = "Toggle Fan (OFF)";
    }
};

function updateFanLabel(kant, waarde) {
    document.getElementById("fanVal" + kant).textContent = waarde;
}

// Sends the final value to the Pico
function sendFanSpeed(kant, waarde) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        // Sends: "FAN_LINKS=75"
        let commando = "FAN_" + kant.toUpperCase() + "=" + waarde;
        socket.send(commando);
        console.log("Sent fan speed:", commando);
    } 
    else {
        alert("Disconnected");
    }
}