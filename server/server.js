/**
 * Signaling Server for Free Remote Screen Share
 * -----------------------------------------------
 * This server does NOT touch any video/screen data.
 * It only relays small WebRTC handshake messages (offer/answer/ICE)
 * between a Host and a Viewer so they can form a direct P2P connection.
 *
 * Deploy free on: Render.com, Railway.app, Fly.io, or run locally.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
  pingInterval: 10000,
  pingTimeout: 5000,
});

const PORT = process.env.PORT || 4000;

// code -> { hostSocketId, viewerSocketId }
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

const path = require("path");
const fs = require("fs");

// Support both ../client (local repo) and ./client / ./public (custom deploy builds)
const clientDir = [
  path.join(__dirname, "../client"),
  path.join(__dirname, "client"),
  path.join(__dirname, "public"),
].find(dir => fs.existsSync(dir)) || path.join(__dirname, "../client");

app.use(express.static(clientDir));

app.get("/", (req, res) => {
  const viewerPath = path.join(clientDir, "viewer.html");
  if (fs.existsSync(viewerPath)) {
    res.sendFile(viewerPath);
  } else {
    res.send("Signaling server is running ✅");
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", activeRooms: rooms.size });
});

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ---- HOST CREATES A SESSION ----
  socket.on("host:create", (_payload, callback) => {
    const code = generateCode();
    rooms.set(code, { hostSocketId: socket.id, viewerSocketId: null });
    socket.data.role = "host";
    socket.data.code = code;
    socket.join(code);
    console.log(`[host:create] code=${code} host=${socket.id}`);
    callback({ success: true, code });
  });

  // ---- VIEWER JOINS A SESSION ----
  socket.on("viewer:join", ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) {
      console.log(`[viewer:join-failed] code=${code} not found. Active rooms:`, Array.from(rooms.keys()));
      return callback({ success: false, error: "Invalid or expired code." });
    }
    if (room.viewerSocketId) {
      console.log(`[viewer:join-failed] code=${code} room full`);
      return callback({ success: false, error: "Session already has a viewer connected." });
    }

    room.viewerSocketId = socket.id;
    socket.data.role = "viewer";
    socket.data.code = code;
    socket.join(code);

    console.log(`[viewer:join] code=${code} viewer=${socket.id}`);

    // Tell the host a viewer has arrived so it can start the WebRTC offer
    io.to(room.hostSocketId).emit("viewer:connected", { viewerId: socket.id });
    callback({ success: true });
  });

  // ---- RELAY WEBRTC SIGNALING DATA (offer/answer/ice) ----
  socket.on("signal", ({ code, data }) => {
    const room = rooms.get(code);
    if (!room) return;
    const targetId =
      socket.id === room.hostSocketId ? room.viewerSocketId : room.hostSocketId;
    if (targetId) {
      io.to(targetId).emit("signal", { data, from: socket.id });
    }
  });

  // ---- SESSION CONTROL: end/leave ----
  socket.on("session:end", ({ code }) => {
    endRoom(code, "Session ended by host.");
  });

  socket.on("disconnect", () => {
    const code = socket.data.code;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    if (socket.id === room.hostSocketId) {
      endRoom(code, "Host disconnected.");
    } else if (socket.id === room.viewerSocketId) {
      room.viewerSocketId = null;
      io.to(room.hostSocketId).emit("viewer:left");
    }
    console.log(`[disconnect] ${socket.id}`);
  });

  function endRoom(code, reason) {
    const room = rooms.get(code);
    if (!room) return;
    io.to(code).emit("session:ended", { reason });
    rooms.delete(code);
    console.log(`[session:ended] code=${code} reason=${reason}`);
  }
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
