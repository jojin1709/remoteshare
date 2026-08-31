(() => {
  const serverUrl = window.SIGNALING_SERVER_URL || (window.location.origin.startsWith("http") ? window.location.origin : "https://remoteshare-ykpm.onrender.com");
  const socket = io(serverUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
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
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  let pc = null;
  let dataChannel = null;
  let currentCode = null;
  let controlEnabled = false;
  let pendingCandidates = [];

  function setStatus(state, text) {
    if (!statusPill) return;
    statusPill.className = `status-pill status-${state}`;
    statusText.textContent = text;
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.add("show");
  }
  function clearError() {
    if (!errorBox) return;
    errorBox.classList.remove("show");
    errorBox.textContent = "";
  }

  socket.on("connect", () => {
    console.log("[Viewer] Connected to signaling server:", serverUrl, "ID:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Viewer] Connection error:", err.message);
  });

  function createPeerConnection() {
    if (pc) {
      try { pc.close(); } catch (e) {}
    }

    const peer = new RTCPeerConnection({
      iceServers: window.ICE_SERVERS,
    });

    peer.ontrack = (event) => {
      console.log("[Viewer] Received remote stream track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      } else {
        remoteVideo.srcObject = new MediaStream([event.track]);
      }
      remoteVideo.muted = true;
      remoteVideo.play().then(() => {
        if (waitingMsg) waitingMsg.style.display = "none";
        setStatus("connected", "Live Streaming");
      }).catch((err) => {
        console.warn("[Viewer] Video play notice:", err.message);
        if (waitingMsg) waitingMsg.style.display = "none";
      });
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          code: currentCode,
          data: { type: "ice-candidate", candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate },
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("[Viewer] ICE connection state:", peer.iceConnectionState);
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        setStatus("connected", "Live Streaming");
        if (waitingMsg) waitingMsg.style.display = "none";
      } else if (peer.iceConnectionState === "failed") {
        setStatus("error", "Reconnecting P2P…");
        if (peer.restartIce) peer.restartIce();
      } else if (peer.iceConnectionState === "disconnected") {
        setStatus("waiting", "Reconnecting…");
      }
    };

    peer.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onopen = () => console.log("[Viewer] Remote control channel active");
    };

    return peer;
  }

  function sendControlEvent(payload) {
    if (dataChannel && dataChannel.readyState === "open" && controlEnabled) {
      dataChannel.send(JSON.stringify(payload));
    }
  }

  // Remote control capture
  function attachControlListeners() {
    remoteVideo.addEventListener("mousemove", (e) => {
      const rect = remoteVideo.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;
      if (xPct >= 0 && xPct <= 1 && yPct >= 0 && yPct <= 1) {
        sendControlEvent({ type: "mousemove", xPct, yPct });
      }
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
      if (["Tab", "Alt", "F5"].includes(e.key)) e.preventDefault();
    });
    document.addEventListener("keyup", (e) => {
      if (!controlEnabled) return;
      sendControlEvent({ type: "keyup", key: e.key, code: e.code });
    });
  }
  attachControlListeners();

  if (controlToggle) {
    controlToggle.addEventListener("change", () => {
      controlEnabled = controlToggle.checked;
      remoteVideo.style.cursor = controlEnabled ? "none" : "default";
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.textContent = "Exit Fullscreen";
      } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.textContent = "Fullscreen";
      }
    });
  }

  // Join flow
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
    setStatus("waiting", "Connecting to Host…");

    socket.emit("viewer:join", { code }, (res) => {
      joinBtn.disabled = false;
      if (!res.success) {
        showError(res.error);
        setStatus("error", "Connection Failed");
        return;
      }
      joinCard.style.display = "none";
      stageCard.style.display = "block";
      setStatus("waiting", "Establishing direct WebRTC stream…");
      pc = createPeerConnection();
      pendingCandidates = [];
    });
  }

  // WebRTC Signal Processing
  socket.on("signal", async ({ data }) => {
    if (!pc) pc = createPeerConnection();

    if (data.type === "offer") {
      try {
        console.log("[Viewer] Received WebRTC offer from host");
        const sdp = typeof data.sdp === "string" ? data.sdp : (data.sdp.sdp || data.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: sdp }));
        
        // Flush all buffered ICE candidates
        while (pendingCandidates.length > 0) {
          const c = pendingCandidates.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { code: currentCode, data: { type: "answer", sdp: answer.sdp } });
        console.log("[Viewer] Sent WebRTC answer to host");
      } catch (err) {
        console.error("[Viewer] Offer processing error:", err);
      }
    } else if (data.type === "ice-candidate" && data.candidate) {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn("[Viewer] ICE candidate error:", err);
        }
      } else {
        pendingCandidates.push(data.candidate);
      }
    }
  });

  socket.on("session:ended", ({ reason }) => {
    setStatus("error", reason || "Session ended by host");
    cleanupAndReset();
  });

  disconnectBtn.addEventListener("click", () => {
    cleanupAndReset();
  });

  function cleanupAndReset() {
    if (pc) {
      try { pc.close(); } catch (e) {}
      pc = null;
    }
    pendingCandidates = [];
    remoteVideo.srcObject = null;
    if (waitingMsg) waitingMsg.style.display = "flex";
    stageCard.style.display = "none";
    joinCard.style.display = "block";
    codeInput.value = "";
    setStatus("idle", "Not connected");
  }

  // Auto-fill and connect from URL query param (?code=XXXXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get("code");
  if (codeParam && /^\d{6}$/.test(codeParam)) {
    codeInput.value = codeParam;
    setTimeout(() => joinSession(), 350);
  }
})();
