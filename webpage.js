
if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }

let socket;

function connect_socket() {
    disconnect_socket()


    socket = new WebSocket("ws://" + window.location.host + "/connect-websocket");
    const o = document.getElementById("status");


    socket.addEventListener("open", (event) => {
       o.textContent = "Status: Connected";
       o.className = "connected"; // classname voor css
    })

    socket.addEventListener("close", (event) => {
        o.textContent = "Status: Disconnected";
        o.className = "disconnected";
        socket = undefined
        setTimeout(() => {
        connect_socket(); // reconnect in 2,5sec
        }, 2500);
    })
    
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data); // json doorsturen van python
        document.getElementById("tempLinks").textContent = data.temperatureLinks;
        document.getElementById("tempRechts").textContent = data.temperatureRechts;
        document.getElementById("tempBuiten").textContent = data.temperatureBuiten;
        document.getElementById("tempGem").textContent = data.temperatureGem;
    })

    socket.addEventListener("error", (event) => {
        o.textContent = "Status: Disconnected";
        o.className = "disconnected";
    })
    
}

function disconnect_socket() {
    if (socket != undefined) {
        socket.close()
        socket = undefined;
    }
}

function sendCommand(command) {
    if(socket != undefined && socket.readyState === WebSocket.OPEN) {
        socket.send(command);
    } else {
        alert("Disconnected");
    }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

