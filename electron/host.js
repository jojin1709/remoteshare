(() => {
  const socket = io(window.SIGNALING_SERVER_URL);

  const sourceGrid = document.getElementById("sourceGrid");
  const startBtn = document.getElementById("startBtn");
  const errorBox = document.getElementById("errorBox");
  const setupCard = document.getElementById("setupCard");
  const sessionCard = document.getElementById("sessionCard");
  const codeDisplay = document.getElementById("codeDisplay");
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const viewerStatusPill = document.getElementById("viewerStatusPill");
  const viewerStatusText = document.getElementById("viewerStatusText");
  const stopBtn = document.getElementById("stopBtn");

  let selectedSourceId = null;
  let localStream = null;
  let pc = null;
  let dataChannel = null;
  let currentCode = null;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
  }
  function clearError() {
    errorBox.classList.remove("show");
  }

  function setStatus(state, text) {
    statusPill.className = `status-pill status-${state}`;
    statusText.textContent = text;
  }
  function setViewerStatus(state, text) {
    viewerStatusPill.className = `status-pill status-${state}`;
    viewerStatusText.textContent = text;
  }

  // ---- Load available screens to share ----
  async function loadSources() {
    const sources = await window.electronAPI.getScreenSources();
    sourceGrid.innerHTML = "";
    sources.forEach((src) => {
      const el = document.createElement("div");
      el.className = "source-card";
      el.innerHTML = `<img src="${src.thumbnail}" /><span>${src.name}</span>`;
      el.addEventListener("click", () => {
        document.querySelectorAll(".source-card").forEach((c) => c.classList.remove("selected"));
        el.classList.add("selected");
        selectedSourceId = src.id;
        startBtn.disabled = false;
      });
      sourceGrid.appendChild(el);
    });
  }
  loadSources();

  // ---- Start sharing ----
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
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30,
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
        showError("Could not start session. Is the signaling server running?");
        return;
      }
      currentCode = res.code;
      codeDisplay.textContent = res.code;
      setupCard.style.display = "none";
      sessionCard.style.display = "block";
      setStatus("waiting", "Sharing (waiting)");
    });
  });

  // ---- A viewer connected: create offer ----
  socket.on("viewer:connected", async () => {
    setViewerStatus("waiting", "Viewer joining…");
    pc = createPeerConnection();

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    dataChannel = pc.createDataChannel("control");
    dataChannel.onopen = () => {
      setStatus("connected", "Sharing");
      setViewerStatus("connected", "Viewer connected");
    };
    dataChannel.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      window.electronAPI.sendRemoteInput(payload);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { code: currentCode, data: { type: "offer", sdp: offer } });
  });

  socket.on("signal", async ({ data }) => {
    if (!pc) return;
    if (data.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === "ice-candidate") {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn("ICE candidate error", err);
      }
    }
  });

  socket.on("viewer:left", () => {
    setViewerStatus("waiting", "Waiting for someone to connect…");
    setStatus("waiting", "Sharing (waiting)");
    if (pc) { pc.close(); pc = null; }
  });

  function createPeerConnection() {
    const peer = new RTCPeerConnection({ iceServers: window.ICE_SERVERS });
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", { code: currentCode, data: { type: "ice-candidate", candidate: event.candidate } });
      }
    };
    return peer;
  }

  // ---- Stop sharing ----
  stopBtn.addEventListener("click", () => {
    socket.emit("session:end", { code: currentCode });
    cleanup();
  });

  socket.on("session:ended", () => cleanup());

  function cleanup() {
    if (pc) { pc.close(); pc = null; }
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    sessionCard.style.display = "none";
    setupCard.style.display = "block";
    startBtn.disabled = selectedSourceId === null;
    setStatus("idle", "Not sharing");
    document.querySelectorAll(".source-card").forEach((c) => c.classList.remove("selected"));
  }
})();
