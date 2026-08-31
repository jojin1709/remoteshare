const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require("electron");
const path = require("path");

// robotjs is a native module — simulates real OS-level mouse/keyboard input.
// If it fails to load (e.g. not rebuilt for this Electron version), the app
// still runs fine for screen SHARING; only remote CONTROL will be disabled.
let robot = null;
try {
  robot = require("robotjs");
} catch (err) {
  console.warn("robotjs not available — remote control will be disabled.", err.message);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    resizable: false,
    autoHideMenuBar: true,
    title: "RemoteShare — Host",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "host.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---- Provide the list of shareable screens/windows to the renderer ----
ipcMain.handle("get-screen-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 300, height: 200 },
  });
  return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
});

// ---- Execute remote-control events sent from the viewer (relayed via renderer) ----
ipcMain.on("remote-input", (_event, payload) => {
  if (!robot) return;

  try {
    const { width, height } = screen.getPrimaryDisplay().size;

    switch (payload.type) {
      case "mousemove": {
        const x = Math.round(payload.xPct * width);
        const y = Math.round(payload.yPct * height);
        robot.moveMouse(x, y);
        break;
      }
      case "mousedown": {
        robot.mouseToggle("down", payload.button === 2 ? "right" : "left");
        break;
      }
      case "mouseup": {
        robot.mouseToggle("up", payload.button === 2 ? "right" : "left");
        break;
      }
      case "scroll": {
        robot.scrollMouse(payload.deltaX, payload.deltaY);
        break;
      }
      case "keydown": {
        const key = mapKey(payload.key);
        if (key) robot.keyToggle(key, "down");
        break;
      }
      case "keyup": {
        const key = mapKey(payload.key);
        if (key) robot.keyToggle(key, "up");
        break;
      }
    }
  } catch (err) {
    console.warn("Failed to execute remote input:", err.message);
  }
});

// Map browser KeyboardEvent.key values to robotjs key names
function mapKey(key) {
  const map = {
    " ": "space",
    Enter: "enter",
    Backspace: "backspace",
    Tab: "tab",
    Escape: "escape",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Shift: "shift",
    Control: "control",
    Alt: "alt",
    Delete: "delete",
  };
  if (map[key]) return map[key];
  if (key.length === 1) return key.toLowerCase();
  return null;
}
