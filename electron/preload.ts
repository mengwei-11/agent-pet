import { contextBridge, ipcRenderer } from "electron";
import type { AgentPetBridge, AgentSnapshot, PetAlert, WindowResizeEdge } from "../shared/types";
import type { AppUserConfig } from "../shared/config";

const agentPetBridge: AgentPetBridge = {
  getConfig: () => ipcRenderer.invoke("agent:getConfig") as Promise<AppUserConfig>,
  getSnapshot: () => ipcRenderer.invoke("agent:getSnapshot") as Promise<AgentSnapshot>,
  getExpanded: () => ipcRenderer.invoke("window:getExpanded") as Promise<boolean>,
  getScale: () => ipcRenderer.invoke("window:getScale") as Promise<number>,
  getWindowSize: () =>
    ipcRenderer.invoke("window:getWindowSize") as Promise<{ width: number; height: number }>,
  refreshSnapshot: () => ipcRenderer.invoke("agent:refreshSnapshot") as Promise<AgentSnapshot>,
  minimizeWindow: () => ipcRenderer.invoke("window:minimize") as Promise<void>,
  closeWindow: () => ipcRenderer.invoke("window:close") as Promise<void>,
  openAgentDashboard: (url: string) => ipcRenderer.invoke("agent:openDashboard", url) as Promise<void>,
  openAgentLogPath: (path: string) => ipcRenderer.invoke("agent:openLogPath", path) as Promise<void>,
  saveConfig: (config: AppUserConfig) => ipcRenderer.invoke("agent:saveConfig", config) as Promise<AppUserConfig>,
  setExpanded: (expanded: boolean) => ipcRenderer.invoke("window:setExpanded", expanded) as Promise<void>,
  setScale: (scale: number) => ipcRenderer.invoke("window:setScale", scale) as Promise<number>,
  setWindowSize: (size: { width: number; height: number }) =>
    ipcRenderer.invoke("window:setWindowSize", size) as Promise<{ width: number; height: number }>,
  resizeWindowByEdge: (edge: WindowResizeEdge, deltaX: number, deltaY: number) =>
    ipcRenderer.invoke("window:resizeByEdge", edge, deltaX, deltaY) as Promise<{ width: number; height: number }>,
  onPetAlert: (listener: (alert: PetAlert) => void) => {
    const wrapped = (_event: unknown, payload: PetAlert) => listener(payload);
    ipcRenderer.on("agent:petAlert", wrapped);

    return () => {
      ipcRenderer.removeListener("agent:petAlert", wrapped);
    };
  },
  onSnapshot: (listener: (snapshot: AgentSnapshot) => void) => {
    const wrapped = (_event: unknown, payload: AgentSnapshot) => listener(payload);
    ipcRenderer.on("agent:snapshot", wrapped);

    return () => {
      ipcRenderer.removeListener("agent:snapshot", wrapped);
    };
  }
};

contextBridge.exposeInMainWorld("agentPet", agentPetBridge);
