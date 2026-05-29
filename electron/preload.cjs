const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentPet", {
  getConfig: () => ipcRenderer.invoke("agent:getConfig"),
  probeEnvironment: () => ipcRenderer.invoke("agent:probeEnvironment"),
  getSnapshot: () => ipcRenderer.invoke("agent:getSnapshot"),
  getExpanded: () => ipcRenderer.invoke("window:getExpanded"),
  getScale: () => ipcRenderer.invoke("window:getScale"),
  getWindowSize: () => ipcRenderer.invoke("window:getWindowSize"),
  refreshSnapshot: () => ipcRenderer.invoke("agent:refreshSnapshot"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  openAgentDashboard: (url) => ipcRenderer.invoke("agent:openDashboard", url),
  openAgentLogPath: (path) => ipcRenderer.invoke("agent:openLogPath", path),
  saveConfig: (config) => ipcRenderer.invoke("agent:saveConfig", config),
  setExpanded: (expanded) => ipcRenderer.invoke("window:setExpanded", expanded),
  setScale: (scale) => ipcRenderer.invoke("window:setScale", scale),
  setWindowSize: (size) => ipcRenderer.invoke("window:setWindowSize", size),
  resizeWindowByEdge: (edge, deltaX, deltaY) =>
    ipcRenderer.invoke("window:resizeByEdge", edge, deltaX, deltaY),
  onPetAlert: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("agent:petAlert", wrapped);

    return () => {
      ipcRenderer.removeListener("agent:petAlert", wrapped);
    };
  },
  onSnapshot: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("agent:snapshot", wrapped);

    return () => {
      ipcRenderer.removeListener("agent:snapshot", wrapped);
    };
  }
});
