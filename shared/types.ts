import type { AppUserConfig } from "./config";

export type AgentHealth = "idle" | "running" | "warning" | "error";
export type PetAlertKind = "completion" | "attention";

export interface PetAlert {
  kind: PetAlertKind;
  agentId: string;
  agentName: string;
  message: string;
  createdAt: string;
}

export interface AgentProcess {
  id: string;
  name: string;
  matcher: string;
  source: "process" | "log";
  agentId: string;
  processCount?: number;
  pid: number;
  cpu: number;
  memoryMb: number;
  uptimeSeconds: number;
  status: AgentHealth;
  summary: string;
  detail?: string;
  phase?: string;
  progressPercent?: number;
  isComplete?: boolean;
  lastCompletionReminderAt?: string;
  dashboardUrl?: string;
  statusUrl?: string;
}

export interface AgentSnapshot {
  updatedAt: string;
  agents: AgentProcess[];
}

export interface AgentEnvironmentProbeItem {
  id: string;
  name: string;
  appDetected: boolean;
  appName?: string;
  appCandidates: string[];
  logDetected: boolean;
  logPath: string;
  logPathCandidates: string[];
  dashboardUrl: string;
  notes: string[];
}

export interface EnvironmentProbe {
  platform: string;
  readyCount: number;
  appDetectedCount: number;
  logDetectedCount: number;
  agents: AgentEnvironmentProbeItem[];
}

export type WindowResizeEdge =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-right"
  | "bottom-left";

export interface AgentPetBridge {
  getSnapshot: () => Promise<AgentSnapshot>;
  getConfig: () => Promise<AppUserConfig>;
  probeEnvironment: () => Promise<EnvironmentProbe>;
  getExpanded: () => Promise<boolean>;
  getScale: () => Promise<number>;
  getWindowSize: () => Promise<{ width: number; height: number }>;
  refreshSnapshot: () => Promise<AgentSnapshot>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openAgentDashboard: (url: string) => Promise<void>;
  openAgentLogPath: (path: string) => Promise<void>;
  saveConfig: (config: AppUserConfig) => Promise<AppUserConfig>;
  setExpanded: (expanded: boolean) => Promise<void>;
  setScale: (scale: number) => Promise<number>;
  setWindowSize: (size: { width: number; height: number }) => Promise<{ width: number; height: number }>;
  resizeWindowByEdge: (
    edge: WindowResizeEdge,
    deltaX: number,
    deltaY: number
  ) => Promise<{ width: number; height: number }>;
  onPetAlert: (listener: (alert: PetAlert) => void) => () => void;
  onSnapshot: (listener: (snapshot: AgentSnapshot) => void) => () => void;
}
