import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, screen, shell, type IpcMainInvokeEvent } from "electron";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  loadAppState,
  normalizeBounds,
  saveAppState,
  type PersistedAppState
} from "./appState.js";
import { probeEnvironment } from "./environmentProbe.js";
import { readAgentSnapshot } from "./processMonitor.js";
import { loadUserConfig, getUserConfig, saveUserConfig } from "./userConfig.js";
import type { AgentProcess, AgentSnapshot, PetAlert, WindowResizeEdge } from "../shared/types.js";
import type { AppUserConfig } from "../shared/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);
const DEFAULT_EXPANDED_SIZE = { width: 460, height: 760 };
const COLLAPSED_SIZE = { width: 420, height: 200 };
const SNAP_DISTANCE = 24;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;
const SCALE_STEP = 0.1;
const MIN_WINDOW_WIDTH = 460;
const MAX_WINDOW_WIDTH = 900;
const MIN_WINDOW_HEIGHT = 420;
const MAX_WINDOW_HEIGHT = 1200;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let timer: NodeJS.Timeout | null = null;
let isQuitting = false;
let snapTimer: NodeJS.Timeout | null = null;
let expanded = true;
let scale = 1;
let expandedSize = { ...DEFAULT_EXPANDED_SIZE };
let stateSaveTimer: NodeJS.Timeout | null = null;
let alwaysOnTop = true;
const notifiedCompletions = new Map<string, string>();
const notifiedAttention = new Map<string, string>();
const lastCompletionReminderAt = new Map<string, string>();

async function persistWindowState() {
  if (!mainWindow) {
    return;
  }

  const nextState: PersistedAppState = {
    expanded,
    scale,
    expandedSize,
    bounds: normalizeBounds(mainWindow.getBounds())
  };

  await saveAppState(nextState);
}

function queueStateSave() {
  if (stateSaveTimer) {
    clearTimeout(stateSaveTimer);
  }

  stateSaveTimer = setTimeout(() => {
    void persistWindowState();
  }, 120);
}

async function createWindow(initialState: PersistedAppState) {
  mainWindow = new BrowserWindow({
    ...normalizeBounds(initialState.bounds),
    frame: false,
    transparent: true,
    resizable: initialState.expanded,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.resolve(__dirname, "../../electron/preload.cjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  applyWindowConstraints(mainWindow, initialState.expanded);

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("moved", () => {
    if (snapTimer) {
      clearTimeout(snapTimer);
    }

    snapTimer = setTimeout(() => {
      snapWindowToEdge();
    }, 120);

    queueStateSave();
  });

  mainWindow.on("resized", () => {
    if (mainWindow && expanded) {
      const bounds = mainWindow.getBounds();
      expandedSize = clampExpandedSize({
        width: bounds.width / scale,
        height: bounds.height / scale
      });
    }

    queueStateSave();
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.resolve(__dirname, "../../dist/index.html"));
  } else {
    await mainWindow.loadURL("http://127.0.0.1:5173");
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function clampScale(nextScale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(nextScale.toFixed(2))));
}

function clampExpandedSize(size: { width: number; height: number }) {
  return {
    width: Math.min(MAX_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, Math.round(size.width))),
    height: Math.min(MAX_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, Math.round(size.height)))
  };
}

function withReminderTimes(snapshot: AgentSnapshot) {
  return {
    ...snapshot,
    agents: snapshot.agents.map((agent) => ({
      ...agent,
      lastCompletionReminderAt: lastCompletionReminderAt.get(agent.id)
    }))
  };
}

function sendPetAlert(alert: PetAlert) {
  mainWindow?.webContents.send("agent:petAlert", alert);
}

function updateTrayTooltip(snapshot: AgentSnapshot) {
  if (!tray) {
    return;
  }

  const running = snapshot.agents.filter((agent) => agent.status === "running").length;
  const warning = snapshot.agents.filter((agent) => agent.status === "warning").length;
  const error = snapshot.agents.filter((agent) => agent.status === "error").length;
  const completed = snapshot.agents.filter((agent) => agent.isComplete).length;

  tray.setToolTip(
    [
      "Agent Pet",
      `${snapshot.agents.length} 个 Agent 在线`,
      `运行中 ${running} · 注意 ${warning} · 异常 ${error} · 已完成 ${completed}`
    ].join("\n")
  );
}

async function pushSnapshot() {
  if (!mainWindow) {
    return null;
  }

  const snapshot = await readAgentSnapshot();
  notifyCompletedAgents(snapshot.agents);
  const nextSnapshot = withReminderTimes(snapshot);
  updateTrayTooltip(nextSnapshot);
  mainWindow.webContents.send("agent:snapshot", nextSnapshot);
  return nextSnapshot;
}

function notifyCompletedAgents(agents: AgentProcess[]) {
  for (const agent of agents) {
    const completionKey = `${agent.summary}|${agent.progressPercent ?? ""}|${agent.phase ?? ""}`;
    const lastNotified = notifiedCompletions.get(agent.id);
    const attentionKey = `${agent.status}|${agent.summary}|${agent.phase ?? ""}`;

    if (!agent.isComplete) {
      if (lastNotified) {
        notifiedCompletions.delete(agent.id);
      }
    } else if (lastNotified !== completionKey) {
      notifiedCompletions.set(agent.id, completionKey);
      lastCompletionReminderAt.set(agent.id, new Date().toISOString());
      sendPetAlert({
        kind: "completion",
        agentId: agent.id,
        agentName: agent.name,
        message: `${agent.name} 已完成任务，点开看看结果。`,
        createdAt: new Date().toISOString()
      });

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: `${agent.name} 已完成任务`,
          body: agent.summary,
          silent: false
        });

        notification.on("click", () => {
          showWindow();
        });

        notification.show();
      }
    }

    if (agent.status === "warning" || agent.status === "error") {
      if (notifiedAttention.get(agent.id) !== attentionKey) {
        notifiedAttention.set(agent.id, attentionKey);
        sendPetAlert({
          kind: "attention",
          agentId: agent.id,
          agentName: agent.name,
          message: `${agent.name} 需要查看，当前${agent.status === "error" ? "异常" : "卡住/需注意"}。`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (notifiedAttention.has(agent.id)) {
      notifiedAttention.delete(agent.id);
    }
  }
}

function showWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function senderWindow(event: IpcMainInvokeEvent) {
  return BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
}

async function openDashboardInChrome(url: string) {
  if (url === "codex://activate") {
    try {
      await execFileAsync("open", ["-b", "com.openai.codex"]);
      return;
    } catch {
      try {
        await execFileAsync("open", ["-a", "Codex"]);
        return;
      } catch {
        return;
      }
    }
  }

  if (url === "kimi://activate") {
    try {
      await execFileAsync("open", ["-b", "com.moonshot.kimichat"]);
      return;
    } catch {
      try {
        await execFileAsync("open", ["-a", "Kimi"]);
        return;
      } catch {
        return;
      }
    }
  }

  try {
    await execFileAsync("open", ["-a", "Google Chrome", url]);
  } catch {
    await shell.openExternal(url);
  }
}

function applyWindowConstraints(window: BrowserWindow, nextExpanded: boolean) {
  const minWidth = Math.round((nextExpanded ? MIN_WINDOW_WIDTH : COLLAPSED_SIZE.width) * scale);
  const minHeight = Math.round((nextExpanded ? MIN_WINDOW_HEIGHT : COLLAPSED_SIZE.height) * scale);
  const maxWidth = Math.round((nextExpanded ? MAX_WINDOW_WIDTH : COLLAPSED_SIZE.width) * scale);
  const maxHeight = Math.round((nextExpanded ? MAX_WINDOW_HEIGHT : COLLAPSED_SIZE.height) * scale);

  window.setMinimumSize(minWidth, minHeight);
  window.setMaximumSize(maxWidth, maxHeight);
}

function resizeWindow(expanded: boolean) {
  if (!mainWindow) {
    return;
  }

  mainWindow.setResizable(expanded);
  applyWindowConstraints(mainWindow, expanded);
  const [x, y] = mainWindow.getPosition();
  const size = expanded ? expandedSize : COLLAPSED_SIZE;
  const width = Math.round(size.width * scale);
  const height = Math.round(size.height * scale);
  mainWindow.setBounds(
    normalizeBounds({
      x,
      y,
      width,
      height
    })
  );
  mainWindow.webContents.setZoomFactor(scale);
  queueStateSave();
}

function resizeWindowByEdge(edge: WindowResizeEdge, deltaX: number, deltaY: number) {
  if (!mainWindow || !expanded) {
    return expandedSize;
  }

  const bounds = mainWindow.getBounds();
  const nextBounds = { ...bounds };

  if (edge.includes("right")) {
    nextBounds.width += deltaX;
  }

  if (edge.includes("left")) {
    nextBounds.x += deltaX;
    nextBounds.width -= deltaX;
  }

  if (edge.includes("bottom")) {
    nextBounds.height += deltaY;
  }

  if (edge.includes("top")) {
    nextBounds.y += deltaY;
    nextBounds.height -= deltaY;
  }

  const clampedWidth = Math.round(
    Math.min(MAX_WINDOW_WIDTH * scale, Math.max(MIN_WINDOW_WIDTH * scale, nextBounds.width))
  );
  const clampedHeight = Math.round(
    Math.min(MAX_WINDOW_HEIGHT * scale, Math.max(MIN_WINDOW_HEIGHT * scale, nextBounds.height))
  );

  if (edge.includes("left")) {
    nextBounds.x += nextBounds.width - clampedWidth;
  }

  if (edge.includes("top")) {
    nextBounds.y += nextBounds.height - clampedHeight;
  }

  nextBounds.width = clampedWidth;
  nextBounds.height = clampedHeight;

  mainWindow.setBounds(normalizeBounds(nextBounds));
  expandedSize = clampExpandedSize({
    width: clampedWidth / scale,
    height: clampedHeight / scale
  });
  queueStateSave();
  return expandedSize;
}

function updateScale(nextScale: number) {
  scale = clampScale(nextScale);
  resizeWindow(expanded);
  rebuildTrayMenu();
  return scale;
}

function updateExpandedSize(nextSize: { width: number; height: number }) {
  expandedSize = clampExpandedSize(nextSize);
  if (expanded) {
    resizeWindow(true);
  }
  rebuildTrayMenu();
  return expandedSize;
}

function rebuildTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: mainWindow?.isVisible() ? "隐藏窗口" : "显示窗口",
        click: () => {
          if (!mainWindow) {
            return;
          }

          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            showWindow();
          }

          rebuildTrayMenu();
        }
      },
      {
        label: expanded ? "收起面板" : "展开面板",
        click: () => {
          expanded = !expanded;
          resizeWindow(expanded);
          void pushSnapshot();
          rebuildTrayMenu();
        }
      },
      {
        label: "字小",
        enabled: scale > MIN_SCALE,
        click: () => {
          updateScale(scale - SCALE_STEP);
        }
      },
      {
        label: "字大",
        enabled: scale < MAX_SCALE,
        click: () => {
          updateScale(scale + SCALE_STEP);
        }
      },
      {
        label: "立即刷新",
        click: () => {
          showWindow();
          void pushSnapshot();
        }
      },
      {
        label: alwaysOnTop ? "取消置顶" : "保持置顶",
        click: () => {
          if (!mainWindow) {
            return;
          }

          alwaysOnTop = !alwaysOnTop;
          mainWindow.setAlwaysOnTop(alwaysOnTop);
          rebuildTrayMenu();
        }
      },
      {
        type: "separator"
      },
      {
        label: "退出",
        click: () => app.quit()
      }
    ])
  );
}

function snapWindowToEdge() {
  if (!mainWindow) {
    return;
  }

  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  let nextX = bounds.x;
  let nextY = bounds.y;

  if (Math.abs(bounds.x - area.x) <= SNAP_DISTANCE) {
    nextX = area.x;
  }

  const rightGap = Math.abs(bounds.x + bounds.width - (area.x + area.width));
  if (rightGap <= SNAP_DISTANCE) {
    nextX = area.x + area.width - bounds.width;
  }

  if (Math.abs(bounds.y - area.y) <= SNAP_DISTANCE) {
    nextY = area.y;
  }

  const bottomGap = Math.abs(bounds.y + bounds.height - (area.y + area.height));
  if (bottomGap <= SNAP_DISTANCE) {
    nextY = area.y + area.height - bounds.height;
  }

  if (nextX !== bounds.x || nextY !== bounds.y) {
    mainWindow.setBounds({
      ...bounds,
      x: nextX,
      y: nextY
    });
    queueStateSave();
  }
}

function createTray() {
  const image = nativeImage.createEmpty();
  tray = new Tray(image);
  tray.setToolTip("Agent Pet");
  tray.on("click", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }

    rebuildTrayMenu();
  });
  rebuildTrayMenu();
}

function startPolling() {
  timer = setInterval(async () => {
    await pushSnapshot();
  }, 3000);
}

app.whenReady().then(async () => {
  const initialState = await loadAppState();
  await loadUserConfig();
  expanded = initialState.expanded;
  scale = clampScale(initialState.scale);
  expandedSize = clampExpandedSize(initialState.expandedSize ?? DEFAULT_EXPANDED_SIZE);

  ipcMain.handle("agent:getConfig", async () => getUserConfig());
  ipcMain.handle("agent:probeEnvironment", async () => probeEnvironment());
  ipcMain.handle("agent:getSnapshot", async () => withReminderTimes(await readAgentSnapshot()));
  ipcMain.handle("agent:saveConfig", async (_event, config: AppUserConfig) => {
    const saved = await saveUserConfig(config);
    await pushSnapshot();
    return saved;
  });
  ipcMain.handle("agent:openDashboard", async (_event, url: string) => {
    await openDashboardInChrome(url);
  });
  ipcMain.handle("agent:openLogPath", async (_event, logPath: string) => {
    await fs.access(logPath);
    shell.showItemInFolder(logPath);
  });
  ipcMain.handle("window:getExpanded", async () => expanded);
  ipcMain.handle("window:getScale", async () => scale);
  ipcMain.handle("window:getWindowSize", async () => expandedSize);
  ipcMain.handle("agent:refreshSnapshot", async () => pushSnapshot());
  ipcMain.handle("window:minimize", async (event) => {
    const targetWindow = senderWindow(event);
    targetWindow?.minimize();
    rebuildTrayMenu();
  });
  ipcMain.handle("window:close", async (event) => {
    const targetWindow = senderWindow(event);
    targetWindow?.hide();
    rebuildTrayMenu();
  });
  ipcMain.handle("window:setExpanded", async (_event, nextExpanded: boolean) => {
    expanded = nextExpanded;
    resizeWindow(expanded);
    rebuildTrayMenu();
  });
  ipcMain.handle("window:setScale", async (_event, nextScale: number) => {
    return updateScale(nextScale);
  });
  ipcMain.handle("window:setWindowSize", async (_event, nextSize: { width: number; height: number }) => {
    return updateExpandedSize(nextSize);
  });
  ipcMain.handle("window:resizeByEdge", async (_event, edge: WindowResizeEdge, deltaX: number, deltaY: number) => {
    return resizeWindowByEdge(edge, deltaX, deltaY);
  });
  await createWindow({
    ...initialState,
    scale,
    bounds: {
      ...initialState.bounds,
      width: Math.round((expanded ? expandedSize.width : COLLAPSED_SIZE.width) * scale),
      height: Math.round((expanded ? expandedSize.height : COLLAPSED_SIZE.height) * scale)
    }
  });
  createTray();
  startPolling();
  await pushSnapshot();
  mainWindow?.webContents.setZoomFactor(scale);
  rebuildTrayMenu();
});

app.on("activate", () => {
  showWindow();
  rebuildTrayMenu();
});

app.on("before-quit", () => {
  isQuitting = true;

  if (timer) {
    clearInterval(timer);
  }

  if (snapTimer) {
    clearTimeout(snapTimer);
  }

  if (stateSaveTimer) {
    clearTimeout(stateSaveTimer);
  }

  void persistWindowState();
});
