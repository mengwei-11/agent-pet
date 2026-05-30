import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AppUserConfig, AgentMonitorConfigItem } from "../shared/config";
import type {
  AgentHealth,
  AgentPetBridge,
  AgentSnapshot,
  EnvironmentProbe,
  PetAlert,
  WindowResizeEdge
} from "../shared/types";

declare global {
  interface Window {
    agentPet?: AgentPetBridge;
  }
}

const emptySnapshot: AgentSnapshot = {
  updatedAt: "",
  agents: []
};

const RESIZE_HANDLES: WindowResizeEdge[] = [
  "top",
  "right",
  "bottom",
  "left",
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left"
];

const EASTER_EGGS = [
  { face: "•⩊•", message: "摸鱼巡逻中，顺便替你盯着进度。" },
  { face: "•ᴥ•", message: "我有在认真值班，只是看起来很软。" },
  { face: "•ヮ•", message: "一切平稳，我先晃一会儿。" },
  { face: "•ω•", message: "要不要点开看看，它们有没有新结果。" },
  { face: "•ᴗ•", message: "今天也在安静陪跑这些 Agent。" },
  { face: "•ᵕ•", message: "状态平稳，我先轻轻晃一会儿。" }
] as const;

type PetMode = "idle" | "running" | "complete" | "warning" | "error" | "easter";

function petFace(status: AgentHealth) {
  switch (status) {
    case "running":
      return "•ᴗ•";
    case "warning":
      return "•_•!";
    case "error":
      return "x_x";
    case "idle":
    default:
      return "˶ᵔ ᵕ ᵔ˶";
  }
}

function resolvePetMode(snapshot: AgentSnapshot): Exclude<PetMode, "easter"> {
  const completed = snapshot.agents.filter((agent) => agent.isComplete).length;

  if (snapshot.agents.some((item) => item.status === "error")) {
    return "error";
  }

  if (snapshot.agents.some((item) => item.status === "warning")) {
    return "warning";
  }

  if (snapshot.agents.some((item) => item.status === "running")) {
    return "running";
  }

  if (completed > 0) {
    return "complete";
  }

  return "idle";
}

function overallStatus(snapshot: AgentSnapshot): AgentHealth {
  if (snapshot.agents.some((item) => item.status === "error")) {
    return "error";
  }

  if (snapshot.agents.some((item) => item.status === "warning")) {
    return "warning";
  }

  if (snapshot.agents.some((item) => item.status === "running")) {
    return "running";
  }

  return "idle";
}

function formatUpdatedAt(updatedAt: string) {
  if (!updatedAt) {
    return "尚未刷新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(updatedAt));
}

function formatProgress(progressPercent?: number) {
  if (progressPercent === undefined) {
    return "进度未知";
  }

  return `${progressPercent}%`;
}

function statusLabel(status: AgentHealth) {
  switch (status) {
    case "running":
      return "执行中";
    case "warning":
      return "需注意";
    case "error":
      return "异常";
    case "idle":
    default:
      return "等待中";
  }
}

function petExpression(mode: PetMode, easterFace?: string) {
  switch (mode) {
    case "running":
      return "•ω•";
    case "complete":
      return "•ᵕ•";
    case "warning":
      return "•︵•";
    case "error":
      return "•⌢•";
    case "easter":
      return easterFace ?? "•ヮ•";
    case "idle":
    default:
      return "•ᴗ•";
  }
}

function petHintText(mode: PetMode) {
  switch (mode) {
    case "running":
      return "它们在忙，我也在盯着";
    case "complete":
      return "有结果了，可以点开看看";
    case "warning":
      return "有点不对劲，最好看一眼";
    case "error":
      return "出错了，先处理这个";
    case "easter":
      return "我在这儿陪你值班";
    case "idle":
    default:
      return "现在比较安静";
  }
}

function bubbleIcon(kind: "completion" | "attention", mode: PetMode) {
  if (kind === "attention") {
    return mode === "error" ? "!" : "…";
  }

  if (mode === "easter") {
    return "✦";
  }

  if (mode === "complete") {
    return "♥";
  }

  return "•";
}

function petCountText(snapshot: AgentSnapshot) {
  const running = snapshot.agents.filter((agent) => agent.status === "running").length;

  return {
    online: `${snapshot.agents.length} 个 Agent 在线`,
    running: running > 0 ? `${running} 个正在执行` : "都在等待中"
  };
}

function featuredAgent(snapshot: AgentSnapshot) {
  return [...snapshot.agents].sort((left, right) => {
    const leftScore =
      (left.status === "error" ? 50 : 0) +
      (left.status === "warning" ? 40 : 0) +
      (left.status === "running" ? 30 : 0) +
      (left.isComplete ? 20 : 0) +
      (left.progressPercent ?? 0);
    const rightScore =
      (right.status === "error" ? 50 : 0) +
      (right.status === "warning" ? 40 : 0) +
      (right.status === "running" ? 30 : 0) +
      (right.isComplete ? 20 : 0) +
      (right.progressPercent ?? 0);

    return rightScore - leftScore;
  })[0];
}

function overallSummary(snapshot: AgentSnapshot) {
  const completed = snapshot.agents.filter((agent) => agent.isComplete).length;
  const warning = snapshot.agents.filter((agent) => agent.status === "warning").length;
  const error = snapshot.agents.filter((agent) => agent.status === "error").length;
  const running = snapshot.agents.filter((agent) => agent.status === "running").length;

  if (error > 0) {
    return `${error} 个 Agent 异常，优先处理`;
  }

  if (warning > 0) {
    return `${warning} 个 Agent 需要注意`;
  }

  if (completed > 0) {
    return `${completed} 个 Agent 已完成，等你查看结果`;
  }

  if (running > 0) {
    return `${running} 个 Agent 正在执行`;
  }

  return "现在很安静，等待下一条任务";
}

function bubbleSummary(snapshot: AgentSnapshot, mode: PetMode) {
  const agent = featuredAgent(snapshot);

  if (!agent) {
    return "现在没有谁在忙，我先在这里陪你等下一条任务。";
  }

  if (mode === "error") {
    return `${agent.name} 好像卡住了，${agent.phase ?? agent.summary ?? "最好现在点开看一眼"}。`;
  }

  if (mode === "warning") {
    return `${agent.name} 现在有点不对劲，${agent.phase ?? agent.summary ?? "我建议你顺手确认一下"}。`;
  }

  if (mode === "running") {
    if (agent.progressPercent !== undefined) {
      return `${agent.name} 还在忙，已经走到 ${agent.progressPercent}% 了${agent.phase ? `，${agent.phase}` : ""}。`;
    }

    return `${agent.name} 正在处理这轮任务，${agent.phase ?? agent.summary ?? "我在这里替你盯着它"}。`;
  }

  if (mode === "complete") {
    return `${agent.name} 已经交卷了，${agent.phase ?? "你现在可以点开看看结果"}。`;
  }

  return `${agent.name} 现在在休息，${agent.phase ?? agent.summary ?? "我会继续在旁边陪你值班"}。`;
}

function agentHeadline(
  summary: string,
  phase?: string,
  isComplete?: boolean
) {
  if (isComplete) {
    return "已完成，等待你查看结果";
  }

  if (phase) {
    return phase;
  }

  return summary || "正在等待新任务";
}

function compactAgentHeadline(
  summary: string,
  phase?: string,
  isComplete?: boolean
) {
  const text = agentHeadline(summary, phase, isComplete).trim();

  if (!text) {
    return "等待中";
  }

  if (text.length <= 18) {
    return text;
  }

  return `${text.slice(0, 18)}...`;
}

function listToText(values: string[]) {
  return values.join(", ");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function probeForAgent(probe: EnvironmentProbe | null, agentId: string) {
  return probe?.agents.find((item) => item.id === agentId) ?? null;
}

function nextCustomAgentId(current: AppUserConfig) {
  let index = 1;

  while (current.agents.some((agent) => agent.id === `custom-agent-${index}`)) {
    index += 1;
  }

  return `custom-agent-${index}`;
}

export default function App() {
  const bridge = window.agentPet;
  const [snapshot, setSnapshot] = useState<AgentSnapshot>(emptySnapshot);
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<AppUserConfig | null>(null);
  const [petBump, setPetBump] = useState(0);
  const [petAlert, setPetAlert] = useState<PetAlert | null>(null);
  const [easterEgg, setEasterEgg] = useState<(typeof EASTER_EGGS)[number] | null>(null);
  const [dismissedBubbleKey, setDismissedBubbleKey] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [orderedAgentIds, setOrderedAgentIds] = useState<string[]>([]);
  const [environmentProbe, setEnvironmentProbe] = useState<EnvironmentProbe | null>(null);
  const status = overallStatus(snapshot);
  const summary = overallSummary(snapshot);
  const basePetMode = resolvePetMode(snapshot);
  const petMode: PetMode = easterEgg ? "easter" : basePetMode;
  const counts = petCountText(snapshot);
  const bubbleTitle = petAlert ? petAlert.agentName : easterEgg ? "值班小彩蛋" : "状态播报";
  const bubbleBody = petAlert
    ? petAlert.message
    : easterEgg?.message ?? bubbleSummary(snapshot, petMode);
  const bubbleKind = petAlert ? petAlert.kind : "completion";
  const bubbleKey = petAlert
    ? `alert:${petAlert.createdAt}:${petAlert.agentId}`
    : easterEgg
      ? `egg:${easterEgg.face}:${easterEgg.message}`
      : `summary:${summary}:${petMode}`;
  const showBubble = bubbleKey !== dismissedBubbleKey && (Boolean(petAlert) || Boolean(easterEgg) || Boolean(summary));

  const orderedAgents = (() => {
    const indexMap = new Map(orderedAgentIds.map((id, index) => [id, index]));

    return [...snapshot.agents].sort((left, right) => {
      const leftIndex = indexMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = indexMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.name.localeCompare(right.name);
    });
  })();

  const canProbeEnvironment = typeof bridge?.probeEnvironment === "function";

  useEffect(() => {
    let mounted = true;

    if (!bridge) {
      setBridgeError("`window.agentPet` 未注入，preload 可能没有成功加载。");
      return () => {
        mounted = false;
      };
    }

    Promise.all([
      bridge.getSnapshot(),
      bridge.getExpanded(),
      bridge.getScale(),
      bridge.getConfig(),
      canProbeEnvironment ? bridge.probeEnvironment() : Promise.resolve(null)
    ])
      .then(([data, savedExpanded, savedScale, config, probe]) => {
        if (mounted) {
          setSnapshot(data);
          setExpanded(savedExpanded);
          setScale(savedScale);
          setConfigDraft(config);
          setEnvironmentProbe(probe);
          if (!config.onboardingComplete) {
            setSettingsOpen(true);
          }
          setBridgeError(null);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setBridgeError(error instanceof Error ? error.message : String(error));
        }
      });

    const unsubscribe = bridge.onSnapshot((data) => {
      setSnapshot(data);
    });
    const unsubscribeAlert = bridge.onPetAlert((alert) => {
      setPetAlert(alert);
      setPetBump((value) => value + 1);
    });

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeAlert();
    };
  }, [bridge, canProbeEnvironment]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.metaKey) {
        return;
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        void updateScale(scale + 0.1);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        void updateScale(scale - 0.1);
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        void updateScale(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [scale]);

  useEffect(() => {
    setPetBump((value) => value + 1);
  }, [status, snapshot.agents.length]);

  useEffect(() => {
    setDismissedBubbleKey(null);
  }, [bubbleKey]);

  useEffect(() => {
    setEasterEgg(null);
  }, [basePetMode, petAlert?.createdAt]);

  useEffect(() => {
    if (!petAlert) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPetAlert((current) =>
        current?.createdAt === petAlert.createdAt ? null : current
      );
    }, 9000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [petAlert]);

  useEffect(() => {
    let idleTimer: number | null = null;
    let clearTimer: number | null = null;

    function clearEaster() {
      if (clearTimer) {
        window.clearTimeout(clearTimer);
      }

      clearTimer = window.setTimeout(() => {
        setEasterEgg(null);
      }, 9000);
    }

    function schedule() {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      if (basePetMode !== "idle" || petAlert) {
        setEasterEgg(null);
        return;
      }

      idleTimer = window.setTimeout(() => {
        const next = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
        setEasterEgg(next);
        setPetBump((value) => value + 1);
        clearEaster();
      }, 45000);
    }

    function onActivity() {
      setEasterEgg(null);
      schedule();
    }

    schedule();

    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);

    return () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      if (clearTimer) {
        window.clearTimeout(clearTimer);
      }

      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [basePetMode, petAlert]);

  useEffect(() => {
    setOrderedAgentIds((current) => {
      const liveIds = snapshot.agents.map((agent) => agent.id);
      const retained = current.filter((id) => liveIds.includes(id));
      const appended = liveIds.filter((id) => !retained.includes(id));
      const next = [...retained, ...appended];

      if (
        next.length === current.length &&
        next.every((id, index) => id === current[index])
      ) {
        return current;
      }

      return next;
    });
  }, [snapshot.agents]);

  async function refreshNow() {
    if (!bridge) {
      setBridgeError("`window.agentPet` 未注入，无法刷新状态。");
      return;
    }

    setRefreshing(true);

    try {
      const nextSnapshot = await bridge.refreshSnapshot();
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function openDashboard(url: string) {
    if (!bridge) {
      return;
    }

    try {
      await bridge.openAgentDashboard(url);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function minimizeWindow() {
    if (!bridge) {
      return;
    }

    try {
      await bridge.minimizeWindow();
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function closeWindow() {
    if (!bridge) {
      return;
    }

    try {
      await bridge.closeWindow();
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function openLogPath(logPath: string) {
    if (!bridge || !logPath) {
      return;
    }

    try {
      await bridge.openAgentLogPath(logPath);
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateScale(nextScale: number) {
    if (!bridge) {
      return;
    }

    try {
      const resolvedScale = await bridge.setScale(nextScale);
      setScale(resolvedScale);
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  function updateAgentConfig(
    agentId: string,
    updater: (agent: AgentMonitorConfigItem) => AgentMonitorConfigItem
  ) {
    setConfigDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        agents: current.agents.map((agent) =>
          agent.id === agentId ? updater(agent) : agent
        )
      };
    });
  }

  function addCustomAgent() {
    setConfigDraft((current) => {
      if (!current) {
        return current;
      }

      const id = nextCustomAgentId(current);

      return {
        ...current,
        agents: [
          ...current.agents,
          {
            id,
            name: `Custom Agent ${current.agents.filter((agent) => agent.id.startsWith("custom-agent-")).length + 1}`,
            enabled: true,
            aggregateByAgent: false,
            matchers: [],
            dashboardUrl: "",
            statusUrl: "",
            logPath: "",
            tailLines: 10,
            errorMatchers: ["error", "failed", "exception"],
            runningMatchers: ["running", "started", "working", "processing"],
            progressMatchers: ["%", "/", "step", "phase"],
            completionMatchers: ["completed", "finished", "done", "success"]
          }
        ]
      };
    });
  }

  function removeAgent(agentId: string) {
    setConfigDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        agents: current.agents.filter((agent) => agent.id !== agentId)
      };
    });
  }

  function applyDetectedConfig() {
    if (!configDraft || !environmentProbe) {
      return;
    }

    setConfigDraft({
      onboardingComplete: true,
      agents: configDraft.agents.map((agent) => {
        const detected = environmentProbe.agents.find((item) => item.id === agent.id);
        if (!detected) {
          return agent;
        }

        return {
          ...agent,
          enabled: detected.appDetected || detected.logDetected,
          logPath: detected.logPath || agent.logPath,
          dashboardUrl: detected.dashboardUrl || agent.dashboardUrl
        };
      })
    });
  }

  async function rerunEnvironmentProbe() {
    if (!bridge || !canProbeEnvironment) {
      return;
    }

    try {
      const probe = await bridge.probeEnvironment();
      setEnvironmentProbe(probe);
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveSettings() {
    if (!bridge || !configDraft) {
      return;
    }

    setSavingConfig(true);

    try {
      const saved = await bridge.saveConfig(configDraft);
      const probe = canProbeEnvironment ? await bridge.probeEnvironment() : null;
      setConfigDraft(saved);
      setEnvironmentProbe(probe);
      const nextSnapshot = await bridge.refreshSnapshot();
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
      setSettingsOpen(false);
      setBridgeError(null);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingConfig(false);
    }
  }

  async function toggleExpanded() {
    if (!bridge) {
      return;
    }

    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    setPetBump((value) => value + 1);

    try {
      await bridge.setExpanded(nextExpanded);
      setBridgeError(null);
    } catch (error) {
      setExpanded(expanded);
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }

  function startResize(edge: WindowResizeEdge, startEvent: ReactPointerEvent<HTMLDivElement>) {
    if (!bridge || !expanded) {
      return;
    }

    startEvent.preventDefault();
    startEvent.stopPropagation();

    let lastX = startEvent.screenX;
    let lastY = startEvent.screenY;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.screenX - lastX;
      const deltaY = moveEvent.screenY - lastY;
      lastX = moveEvent.screenX;
      lastY = moveEvent.screenY;
      void bridge.resizeWindowByEdge(edge, deltaX, deltaY);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className={`shell shell-${petMode} ${expanded ? "" : "shell-compact"}`}
      style={{ ["--panel-scale" as "--panel-scale"]: String(scale) }}
    >
      {expanded
        ? RESIZE_HANDLES.map((edge) => (
            <div
              className={`resize-handle resize-${edge}`}
              key={edge}
              onPointerDown={(event) => startResize(edge, event)}
            />
          ))
        : null}

      <div className="topbar">
        <div className="window-controls">
          <button
            aria-label="关闭应用"
            className="window-control window-control-close"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void closeWindow();
            }}
            type="button"
          >
            ×
          </button>
          <button
            aria-label="最小化"
            className="window-control window-control-minimize"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void minimizeWindow();
            }}
            type="button"
          >
            −
          </button>
        </div>

        <div className="drag-bar">
          <div className="drag-pill" />
        </div>

        <div className="topbar-spacer" />
      </div>

      <div className={`hero ${showBubble ? "" : "hero-no-bubble"}`}>
        <button
          className={`pet pet-${petMode} pet-button pet-bump-${petBump % 2}`}
          onClick={() => void toggleExpanded()}
          type="button"
        >
          <div className="pet-glow" />
          <div className="pet-body">
            <div className="pet-face">{petExpression(petMode, easterEgg?.face)}</div>
            <div className="pet-text">{counts.online}</div>
            <div className="pet-summary">{counts.running}</div>
          </div>
        </button>

        {showBubble ? (
          <div className={`pet-bubble pet-bubble-${bubbleKind}`}>
            <button
              aria-label="关闭提示"
              className="pet-bubble-close"
              onClick={() => setDismissedBubbleKey(bubbleKey)}
              type="button"
            >
              ×
            </button>
            <div className="pet-bubble-header">
              <span className={`pet-bubble-icon pet-bubble-icon-${bubbleKind}`}>
                {bubbleIcon(bubbleKind, petMode)}
              </span>
              <div className="pet-bubble-title">{bubbleTitle}</div>
            </div>
            <div className="pet-bubble-body">{bubbleBody}</div>
          </div>
        ) : null}
      </div>

      {bridgeError ? (
        <div className="debug-card">
          <div className="debug-title">Renderer Init Error</div>
          <div className="debug-body">{bridgeError}</div>
        </div>
      ) : null}

        <div className={`panel ${expanded ? "" : "panel-hidden"}`}>
        <div className="panel-header">
          <div className="panel-title">
            <span>今日状态</span>
            <span className="panel-updated">更新于 {formatUpdatedAt(snapshot.updatedAt)}</span>
          </div>
          <div className="panel-actions">
            <button
              className="ghost-button"
              disabled={refreshing}
              onClick={() => void refreshNow()}
              type="button"
            >
              {refreshing ? "刷新中" : "刷新"}
            </button>
            <button
              className="ghost-button"
              onClick={() => setSettingsOpen((value) => !value)}
              type="button"
            >
              {settingsOpen ? "关闭设置" : "设置"}
            </button>
            <button
              className="ghost-button"
              onClick={() => void toggleExpanded()}
              type="button"
            >
              {expanded ? "收起" : "展开"}
            </button>
            <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
          </div>
        </div>
        {!settingsOpen ? (
          <div className="panel-summary-strip">
            <span>{summary}</span>
          </div>
        ) : null}

        {settingsOpen && configDraft ? (
          <div className="settings-panel">
            <div className="settings-toolbar">
              <div>
                <div className="settings-title">监控设置</div>
                <div className="settings-subtitle">
                  这些配置会保存到本机。首次使用时，建议先应用一轮自动探测结果。
                </div>
              </div>
              <div className="settings-actions">
                <button
                  className="ghost-button"
                  onClick={addCustomAgent}
                  type="button"
                >
                  新增自定义 Agent
                </button>
                <button
                  className="ghost-button"
                  disabled={savingConfig}
                  onClick={() => setSettingsOpen(false)}
                  type="button"
                >
                  关闭
                </button>
                <button
                  className="ghost-button ghost-button-primary"
                  disabled={savingConfig}
                  onClick={() => void saveSettings()}
                  type="button"
                >
                  {savingConfig ? "保存中" : "保存设置"}
                </button>
              </div>
            </div>

            {environmentProbe ? (
              <div className="settings-detection-card">
                <div className="settings-title">首次配置建议</div>
                <div className="settings-subtitle">
                  已探测到 {environmentProbe.readyCount} 个可用 Agent，本地应用 {environmentProbe.appDetectedCount} 个，日志路径 {environmentProbe.logDetectedCount} 个。
                </div>
                <div className="settings-inline-actions">
                  <button
                    className="ghost-button ghost-button-primary"
                    onClick={applyDetectedConfig}
                    type="button"
                  >
                    应用推荐配置
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => void rerunEnvironmentProbe()}
                    type="button"
                  >
                    重新探测
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-detection-card">
                <div className="settings-title">兼容模式</div>
                <div className="settings-subtitle">
                  当前运行环境没有暴露自动探测接口。你仍然可以手动填写日志路径、入口 URL 和匹配关键字。
                </div>
              </div>
            )}

            <div className="settings-list">
              {configDraft.agents.map((agent) => (
                <div className="settings-card" key={agent.id}>
                  {(() => {
                    const detected = probeForAgent(environmentProbe, agent.id);

                    return (
                      <>
                  <div className="settings-card-header">
                    <strong>{agent.name}</strong>
                    <div className="settings-card-actions">
                      <label className="settings-checkbox">
                        <input
                          checked={agent.enabled}
                          onChange={(event) =>
                            updateAgentConfig(agent.id, (current) => ({
                              ...current,
                              enabled: event.target.checked
                            }))
                          }
                          type="checkbox"
                        />
                        启用
                      </label>
                      {agent.id.startsWith("custom-agent-") ? (
                        <button
                          className="settings-remove-button"
                          onClick={() => removeAgent(agent.id)}
                          type="button"
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {agent.id.startsWith("custom-agent-") ? (
                    <label className="settings-field">
                      <span>显示名称</span>
                      <input
                        className="settings-input"
                        onChange={(event) =>
                          updateAgentConfig(agent.id, (current) => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        type="text"
                        value={agent.name}
                      />
                    </label>
                  ) : null}

                  {detected ? (
                    <div className="settings-detected-notes">
                      {detected.notes.join(" · ")}
                    </div>
                  ) : null}

                  {detected?.appCandidates.length ? (
                    <div className="settings-help-text">
                      应用候选：{detected.appCandidates.join(" / ")}
                    </div>
                  ) : null}

                  {detected?.logPathCandidates.length ? (
                    <div className="settings-help-text">
                      日志候选：{detected.logPathCandidates.join(" · ")}
                    </div>
                  ) : null}

                  <label className="settings-field">
                    <span>匹配关键字</span>
                    <input
                      className="settings-input"
                      onChange={(event) =>
                        updateAgentConfig(agent.id, (current) => ({
                          ...current,
                          matchers: textToList(event.target.value)
                        }))
                      }
                      type="text"
                      value={listToText(agent.matchers)}
                    />
                  </label>

                  <label className="settings-field">
                    <span>日志路径</span>
                    <input
                      className="settings-input"
                      onChange={(event) =>
                        updateAgentConfig(agent.id, (current) => ({
                          ...current,
                          logPath: event.target.value
                        }))
                      }
                      type="text"
                      value={agent.logPath}
                    />
                  </label>
                  <div className="settings-inline-actions">
                    <button
                      className="ghost-button"
                      disabled={!agent.logPath}
                      onClick={() => void openLogPath(agent.logPath)}
                      type="button"
                    >
                      定位日志
                    </button>
                    {detected?.logPath ? (
                      <button
                        className="ghost-button"
                        onClick={() =>
                          updateAgentConfig(agent.id, (current) => ({
                            ...current,
                            logPath: detected.logPath
                          }))
                        }
                        type="button"
                      >
                        使用探测路径
                      </button>
                    ) : null}
                  </div>

                  <label className="settings-field">
                    <span>会话页面 URL</span>
                    <input
                      className="settings-input"
                      onChange={(event) =>
                        updateAgentConfig(agent.id, (current) => ({
                          ...current,
                          dashboardUrl: event.target.value
                        }))
                      }
                      type="text"
                      value={agent.dashboardUrl}
                    />
                  </label>

                  <label className="settings-field">
                    <span>状态接口 URL</span>
                    <input
                      className="settings-input"
                      onChange={(event) =>
                        updateAgentConfig(agent.id, (current) => ({
                          ...current,
                          statusUrl: event.target.value
                        }))
                      }
                      type="text"
                      value={agent.statusUrl}
                    />
                  </label>

                  <label className="settings-checkbox">
                    <input
                      checked={agent.aggregateByAgent}
                      onChange={(event) =>
                        updateAgentConfig(agent.id, (current) => ({
                          ...current,
                          aggregateByAgent: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    辅助进程聚合到主卡
                  </label>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="panel-list">
          {orderedAgents.length === 0 ? (
            <div className="empty">当前没有匹配到监控目标。</div>
          ) : (
            orderedAgents.map((agent) => (
              <div className="agent-card" key={agent.id}>
                <div className="agent-inline">
                  <strong className="agent-name">{agent.name}</strong>
                  <div className="agent-headline">
                    {compactAgentHeadline(agent.summary, agent.phase, agent.isComplete)}
                  </div>
                  {agent.progressPercent !== undefined ? (
                    <div className="agent-progress agent-progress-inline">
                      <div className="agent-progress-bar">
                        <div
                          className="agent-progress-fill"
                          style={{ width: `${agent.progressPercent}%` }}
                        />
                      </div>
                      <span className="agent-progress-label">
                        {formatProgress(agent.progressPercent)}
                      </span>
                    </div>
                  ) : null}
                  <div className="agent-links">
                    {agent.dashboardUrl ? (
                      <button
                        className="link-button"
                        onClick={() => void openDashboard(agent.dashboardUrl!)}
                        type="button"
                      >
                        Web UI
                      </button>
                    ) : null}
                  </div>
                  <span className={`badge badge-${agent.status}`}>
                    {statusLabel(agent.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        )}
      </div>

      <button
        className="compact-toggle"
        onClick={() => void toggleExpanded()}
        type="button"
      >
        {expanded ? "收起监控面板" : "展开监控面板"}
      </button>
    </div>
  );
}
