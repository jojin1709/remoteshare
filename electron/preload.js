const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getScreenSources: () => ipcRenderer.invoke("get-screen-sources"),
  sendRemoteInput: (payload) => ipcRenderer.send("remote-input", payload),
});
