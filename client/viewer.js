(() => {
  const serverUrl = window.SIGNALING_SERVER_URL || (window.location.origin.startsWith("http") ? window.location.origin : "https://remoteshare-ykpm.onrender.com");
  const socket = io(serverUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("[Viewer] Connected to signaling server:", serverUrl, "ID:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Viewer] Signaling server connection error:", err.message);
  });

  const joinCard = document.getElementById("joinCard");
  const stageCard = document.getElementById("stageCard");
  const codeInput = document.getElementById("codeInput");
  const joinBtn = document.getElementById("joinBtn");
  const errorBox = document.getElementById("errorBox");
  const remoteVideo = document.getElementById("remoteVideo");
  const waitingMsg = document.getElementById("waitingMsg");
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const controlToggle = document.getElementById("controlToggle");
  const disconnectBtn = document.getElementById("disconnectBtn");

  let pc = null;
  let dataChannel = null;
  let currentCode = null;
  let controlEnabled = false;

  function setStatus(state, text) {
    statusPill.className = `status-pill status-${state}`;
    statusText.textContent = text;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
  }
  function clearError() {
    errorBox.classList.remove("show");
    errorBox.textContent = "";
  }

  function createPeerConnection() {
    const peer = new RTCPeerConnection({ iceServers: window.ICE_SERVERS });

    peer.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
      waitingMsg.style.display = "none";
      setStatus("connected", "Connected");
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          code: currentCode,
          data: { type: "ice-candidate", candidate: event.candidate },
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
        setStatus("error", "Disconnected");
      }
    };

    // Host creates the data channel; we just listen for it.
    peer.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onopen = () => console.log("Control channel open");
    };

    return peer;
  }

  function sendControlEvent(payload) {
    if (dataChannel && dataChannel.readyState === "open" && controlEnabled) {
      dataChannel.send(JSON.stringify(payload));
    }
  }

  // ----- Remote control input capture (mouse + keyboard over the video element) -----
  function attachControlListeners() {
    remoteVideo.addEventListener("mousemove", (e) => {
      const rect = remoteVideo.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;
      sendControlEvent({ type: "mousemove", xPct, yPct });
    });

    remoteVideo.addEventListener("mousedown", (e) => {
      sendControlEvent({ type: "mousedown", button: e.button });
    });
    remoteVideo.addEventListener("mouseup", (e) => {
      sendControlEvent({ type: "mouseup", button: e.button });
    });
    remoteVideo.addEventListener("wheel", (e) => {
      sendControlEvent({ type: "scroll", deltaX: e.deltaX, deltaY: e.deltaY });
      e.preventDefault();
    }, { passive: false });
    remoteVideo.addEventListener("contextmenu", (e) => e.preventDefault());

    document.addEventListener("keydown", (e) => {
      if (!controlEnabled) return;
      sendControlEvent({ type: "keydown", key: e.key, code: e.code });
      e.preventDefault();
    });
    document.addEventListener("keyup", (e) => {
      if (!controlEnabled) return;
      sendControlEvent({ type: "keyup", key: e.key, code: e.code });
      e.preventDefault();
    });
  }
  attachControlListeners();

  controlToggle.addEventListener("change", () => {
    controlEnabled = controlToggle.checked;
    remoteVideo.style.cursor = controlEnabled ? "none" : "crosshair";
  });

  // ----- Join flow -----
  joinBtn.addEventListener("click", joinSession);
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinSession();
  });

  function joinSession() {
    clearError();
    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showError("Enter the 6-digit code exactly as shown on the host.");
      return;
    }
    currentCode = code;
    joinBtn.disabled = true;
    setStatus("waiting", "Connecting…");

    socket.emit("viewer:join", { code }, (res) => {
      joinBtn.disabled = false;
      if (!res.success) {
        showError(res.error);
        setStatus("error", "Failed");
        return;
      }
      joinCard.style.display = "none";
      stageCard.style.display = "block";
      setStatus("waiting", "Waiting for host…");
      pc = createPeerConnection();
    });
  }

  // ----- Signaling -----
  socket.on("signal", async ({ data }) => {
    if (!pc) pc = createPeerConnection();

    if (data.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("signal", { code: currentCode, data: { type: "answer", sdp: answer } });
    } else if (data.type === "ice-candidate") {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn("ICE candidate error", err);
      }
    }
  });

  socket.on("session:ended", ({ reason }) => {
    setStatus("error", reason || "Session ended");
    cleanupAndReset();
  });

  disconnectBtn.addEventListener("click", () => {
    cleanupAndReset();
  });

  function cleanupAndReset() {
    if (pc) { pc.close(); pc = null; }
    remoteVideo.srcObject = null;
    waitingMsg.style.display = "flex";
    stageCard.style.display = "none";
    joinCard.style.display = "block";
    codeInput.value = "";
    setStatus("idle", "Not connected");
  }
})();
