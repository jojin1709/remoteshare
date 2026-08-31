(() => {
  const serverUrl = window.SIGNALING_SERVER_URL || "https://remoteshare-ykpm.onrender.com";
  const socket = io(serverUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  const sourceGrid = document.getElementById("sourceGrid");
  const startBtn = document.getElementById("startBtn");
  const errorBox = document.getElementById("errorBox");
  const setupCard = document.getElementById("setupCard");
  const sessionCard = document.getElementById("sessionCard");
  const codeDisplay = document.getElementById("codeDisplay");
  const copyBtn = document.getElementById("copyBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const viewerStatusPill = document.getElementById("viewerStatusPill");
  const viewerStatusText = document.getElementById("viewerStatusText");
  const stopBtn = document.getElementById("stopBtn");
  const cloudDot = document.getElementById("cloudDot");

  let selectedSourceId = null;
  let localStream = null;
  let pc = null;
  let dataChannel = null;
  let currentCode = null;
  let pendingCandidates = [];

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

  function setStatus(state, text) {
    if (!statusPill) return;
    statusPill.className = `status-pill status-${state}`;
    statusText.textContent = text;
  }
  function setViewerStatus(state, text) {
    if (!viewerStatusPill) return;
    viewerStatusPill.className = `status-pill status-${state}`;
    viewerStatusText.textContent = text;
  }

  socket.on("connect", () => {
    console.log("[Host] Connected to cloud signaling server:", serverUrl, "ID:", socket.id);
    if (cloudDot) cloudDot.className = "cloud-status-dot online";
  });

  socket.on("disconnect", () => {
    console.warn("[Host] Disconnected from signaling server");
    if (cloudDot) cloudDot.className = "cloud-status-dot offline";
  });

  socket.on("connect_error", (err) => {
    console.warn("[Host] Connection error:", err.message);
    if (cloudDot) cloudDot.className = "cloud-status-dot offline";
  });

  // Load available screens
  async function loadSources() {
    try {
      const sources = await window.electronAPI.getScreenSources();
      sourceGrid.innerHTML = "";
      sources.forEach((src, idx) => {
        const el = document.createElement("div");
        el.className = "source-card" + (idx === 0 ? " selected" : "");
        el.innerHTML = `<img src="${src.thumbnail}" alt="${src.name}" /><span>${src.name}</span>`;
        if (idx === 0) {
          selectedSourceId = src.id;
          startBtn.disabled = false;
        }
        el.addEventListener("click", () => {
          document.querySelectorAll(".source-card").forEach((c) => c.classList.remove("selected"));
          el.classList.add("selected");
          selectedSourceId = src.id;
          startBtn.disabled = false;
        });
        sourceGrid.appendChild(el);
      });
    } catch (err) {
      showError("Failed to fetch screen sources: " + err.message);
    }
  }
  loadSources();

  // Start sharing
  startBtn.addEventListener("click", async () => {
    clearError();
    startBtn.disabled = true;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedSourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 60,
          },
        },
      });
    } catch (err) {
      showError("Could not capture screen: " + err.message);
      startBtn.disabled = false;
      return;
    }

    socket.emit("host:create", {}, (res) => {
      if (!res.success) {
        showError("Could not connect to signaling server. Please check your internet connection.");
        startBtn.disabled = false;
        return;
      }
      currentCode = res.code;
      codeDisplay.textContent = res.code;
      setupCard.style.display = "none";
      sessionCard.style.display = "block";
      setStatus("waiting", "Sharing (Live)");
      setViewerStatus("waiting", "Waiting for viewer to connect…");
    });
  });

  // A viewer connected: create offer
  socket.on("viewer:connected", async () => {
    console.log("[Host] Viewer connected. Starting WebRTC peer connection...");
    setViewerStatus("waiting", "Viewer handshaking…");
    pc = createPeerConnection();
    pendingCandidates = [];

    // Add media tracks
    localStream.getTracks().forEach((track) => {
      console.log("[Host] Adding track to PC:", track.kind, track.label);
      pc.addTrack(track, localStream);
    });

    // Create remote control data channel
    try {
      dataChannel = pc.createDataChannel("control", { ordered: true });
      dataChannel.onopen = () => {
        console.log("[Host] Data channel open");
        setStatus("connected", "Streaming (Direct P2P)");
        setViewerStatus("connected", "Viewer connected (Active)");
      };
      dataChannel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          window.electronAPI.sendRemoteInput(payload);
        } catch (e) {}
      };
    } catch (err) {
      console.warn("Data channel setup warning:", err);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("signal", { code: currentCode, data: { type: "offer", sdp: offer.sdp } });
      console.log("[Host] Sent WebRTC offer to viewer");
    } catch (err) {
      console.error("[Host] Failed to create offer:", err);
      showError("WebRTC handshake failed: " + err.message);
    }
  });

  // Signal routing
  socket.on("signal", async ({ data }) => {
    if (!pc) return;

    if (data.type === "answer") {
      try {
        console.log("[Host] Received WebRTC answer from viewer");
        const sdp = typeof data.sdp === "string" ? data.sdp : (data.sdp.sdp || data.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sdp }));
        
        // Flush buffered ICE candidates
        while (pendingCandidates.length > 0) {
          const candidate = pendingCandidates.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {}
        }
        console.log("[Host] Remote description set successfully");
      } catch (err) {
        console.error("[Host] Failed to set remote answer:", err);
      }
    } else if (data.type === "ice-candidate" && data.candidate) {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn("[Host] ICE candidate error:", err);
        }
      } else {
        pendingCandidates.push(data.candidate);
      }
    }
  });

  socket.on("viewer:left", () => {
    setViewerStatus("waiting", "Viewer disconnected. Waiting for connection…");
    setStatus("waiting", "Sharing (Live)");
    if (pc) {
      try { pc.close(); } catch (e) {}
      pc = null;
    }
  });

  function createPeerConnection() {
    if (pc) {
      try { pc.close(); } catch (e) {}
    }

    const peer = new RTCPeerConnection({
      iceServers: window.ICE_SERVERS,
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          code: currentCode,
          data: { type: "ice-candidate", candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate },
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("[Host] ICE connection state:", peer.iceConnectionState);
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        setStatus("connected", "Streaming (Direct P2P)");
        setViewerStatus("connected", "Viewer connected (Active)");
      } else if (peer.iceConnectionState === "failed") {
        setStatus("waiting", "Re-negotiating ICE…");
        if (peer.restartIce) peer.restartIce();
      }
    };

    return peer;
  }

  // Copy helpers
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      if (currentCode) {
        navigator.clipboard.writeText(currentCode);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy Code"), 1500);
      }
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      if (currentCode) {
        const link = `${serverUrl}/?code=${currentCode}`;
        navigator.clipboard.writeText(link);
        copyLinkBtn.textContent = "Copied Link!";
        setTimeout(() => (copyLinkBtn.textContent = "Copy Share Link"), 1500);
      }
    });
  }

  // Stop sharing
  stopBtn.addEventListener("click", () => {
    socket.emit("session:end", { code: currentCode });
    cleanup();
  });

  socket.on("session:ended", () => cleanup());

  function cleanup() {
    if (pc) {
      try { pc.close(); } catch (e) {}
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    pendingCandidates = [];
    sessionCard.style.display = "none";
    setupCard.style.display = "block";
    startBtn.disabled = selectedSourceId === null;
    setStatus("idle", "Ready");
    loadSources();
  }
})();
