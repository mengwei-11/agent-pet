import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { MONITOR_THRESHOLDS } from "../shared/agentConfig.js";
import { getUserConfig } from "./userConfig.js";
import type { AgentHealth, AgentProcess } from "../shared/types";
import type { AgentMonitorConfigItem } from "../shared/config.js";

const execAsync = promisify(exec);

export interface AgentMonitorSource {
  id: string;
  read: () => Promise<AgentProcess[]>;
}

interface AgentLogSummary {
  summary: string;
  detail?: string;
  status?: AgentHealth;
  phase?: string;
  progressPercent?: number;
  isComplete?: boolean;
}

const LOG_STALE_MS = 1000 * 60 * 20;
const KIMI_ACTIVITY_WINDOW_MS = 1000 * 60 * 3;

function isInfrastructureSummary(summary: string) {
  const lower = summary.toLowerCase();

  return (
    lower.includes("session_loop") ||
    lower.includes("thread_id=") ||
    lower.includes("submission_dispatch") ||
    lower.includes("turn.id=") ||
    lower.includes("agent.auxiliary") ||
    lower.includes("auxiliary_cl") ||
    lower.includes("app-helper") ||
    lower.includes("user-path") ||
    lower.includes("tmp-runtime")
  );
}

function computeStatus(agentId: string, cpu: number, memoryMb: number, summary: string): AgentHealth {
  if (
    agentId === "kimi" &&
    (summary.includes("Kimi 桌面进程在线") ||
      summary.includes("正在连接本地通道") ||
      summary.includes("已创建新会话") ||
      summary.includes("已加载配置") ||
      summary.includes("模型已就绪"))
  ) {
    return "idle";
  }

  if (summary.toLowerCase().includes("error")) {
    return "error";
  }

  if (cpu > MONITOR_THRESHOLDS.warningCpu || memoryMb > MONITOR_THRESHOLDS.warningMemoryMb) {
    return "warning";
  }

  if (cpu > MONITOR_THRESHOLDS.runningCpu) {
    return "running";
  }

  return "idle";
}

function parseElapsedToSeconds(input: string): number {
  const daySplit = input.split("-");
  const timePart = daySplit.length === 2 ? daySplit[1] : daySplit[0];
  const days = daySplit.length === 2 ? Number(daySplit[0]) : 0;
  const units = timePart.split(":").map((part) => Number(part));

  if (units.some(Number.isNaN)) {
    return 0;
  }

  if (units.length === 3) {
    const [hours, minutes, seconds] = units;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  if (units.length === 2) {
    const [minutes, seconds] = units;
    return days * 86400 + minutes * 60 + seconds;
  }

  return days * 86400 + units[0];
}

function compactCommand(command: string) {
  return command
    .replace(/\/Applications\/[^ ]+?\.app\/Contents\/Frameworks\/[^ ]+?(?=\s|$)/g, "app-helper")
    .replace(/\/Applications\/[^ ]+?\.app\/Contents\/MacOS\/[^ ]+?(?=\s|$)/g, "app-main")
    .replace(/\/private\/var\/folders\/[^ ]+?(?=\s|$)/g, "tmp-runtime")
    .replace(/\/Users\/[^ ]+?(?=\s|$)/g, "user-path");
}

function trimSummary(command: string, agentName: string) {
  if (command.includes(".app/Contents/Frameworks/") || command.includes(".app/Contents/MacOS/")) {
    return `${agentName} 桌面进程在线`;
  }

  const compact = compactCommand(command);
  if (compact.length <= 96) {
    return compact;
  }

  return `${compact.slice(0, 93)}...`;
}

function sortAgents(agents: AgentProcess[]) {
  const order = new Map(
    getUserConfig().agents.filter((agent) => agent.enabled).map((agent, index) => [agent.id, index])
  );

  return [...agents].sort((left, right) => {
    const leftOrder = order.get(left.agentId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.agentId) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function mergeRelatedProcesses(agents: AgentProcess[]) {
  const merged = new Map<string, AgentProcess>();

  for (const agent of agents) {
    const groupKey = `agent:${agent.agentId}`;

    const existing = merged.get(groupKey);
    if (!existing) {
      merged.set(groupKey, {
        ...agent,
        id: groupKey,
        processCount: 1
      });
      continue;
    }

    const processCount = (existing.processCount ?? 1) + 1;
    const statusPriority = { error: 3, warning: 2, running: 1, idle: 0 };
    const resolvedStatus =
      statusPriority[agent.status] > statusPriority[existing.status]
        ? agent.status
        : existing.status;
    const representativeAgent =
      agent.progressPercent !== undefined ||
      agent.phase ||
      agent.isComplete ||
      (!!agent.detail && !existing.detail) ||
      (!isInfrastructureSummary(agent.summary) && isInfrastructureSummary(existing.summary)) ||
      agent.cpu > existing.cpu ||
      agent.memoryMb > existing.memoryMb
        ? agent
        : existing;

    merged.set(groupKey, {
      ...existing,
      ...representativeAgent,
      id: groupKey,
      pid: Math.min(existing.pid, agent.pid),
      cpu: Number((existing.cpu + agent.cpu).toFixed(1)),
      memoryMb: Number((existing.memoryMb + agent.memoryMb).toFixed(1)),
      uptimeSeconds: Math.max(existing.uptimeSeconds, agent.uptimeSeconds),
      status: resolvedStatus,
      processCount
    });
  }

  return [...merged.values()];
}

function inferStatusFromLog(
  agentId: string,
  summary: string,
  errorMatchers: string[],
  runningMatchers: string[]
) {
  const lower = summary.toLowerCase();

  if (
    agentId === "kimi" &&
    (lower.includes("正在连接本地通道") ||
      lower.includes("已创建新会话") ||
      lower.includes("桌面进程在线") ||
      lower.includes("已加载配置") ||
      lower.includes("模型已就绪"))
  ) {
    return "idle" as const;
  }

  if (
    lower.includes("空闲待命") ||
    lower.includes("服务在线") ||
    lower.includes("模型已就绪") ||
    lower.includes("已加载配置") ||
    lower.includes("已加载工具") ||
    lower.includes("已创建新会话") ||
    lower.includes("close time.busy")
  ) {
    return "idle" as const;
  }

  if (
    lower.includes("正在整理这一轮结果") ||
    lower.includes("正在连接本地通道") ||
    lower.includes("正在准备系统提示") ||
    lower.includes("pondering") ||
    lower.includes("thinking") ||
    lower.includes("replying")
  ) {
    return "running" as const;
  }

  if (errorMatchers.some((matcher) => lower.includes(matcher.toLowerCase()))) {
    return "error" as const;
  }

  if (runningMatchers.some((matcher) => lower.includes(matcher.toLowerCase()))) {
    return "running" as const;
  }

  return undefined;
}

function extractProgress(summary: string) {
  const percentMatch = summary.match(/(\d{1,3})\s*%/);
  if (percentMatch) {
    const progressPercent = Number(percentMatch[1]);
    if (progressPercent >= 0 && progressPercent <= 100) {
      return progressPercent;
    }
  }

  const fractionMatch = summary.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const current = Number(fractionMatch[1]);
    const total = Number(fractionMatch[2]);

    if (total > 0 && current >= 0 && current <= total) {
      return Math.round((current / total) * 100);
    }
  }

  return undefined;
}

function extractPhase(summary: string) {
  const toolMatch = summary.match(/tool\s+([a-z0-9_:-]+)\s+completed/i);
  if (toolMatch) {
    return `工具 ${toolMatch[1]}`;
  }

  const apiCallMatch = summary.match(/api call\s+#(\d+)/i);
  if (apiCallMatch) {
    return `第 ${apiCallMatch[1]} 次调用`;
  }

  const phaseMatch = summary.match(/(?:phase|step|stage)[:\s#-]*([^\]|,;]+)/i);
  if (!phaseMatch) {
    return undefined;
  }

  return phaseMatch[1].trim();
}

function inferCompletion(
  summary: string,
  progressPercent: number | undefined,
  completionMatchers: string[]
) {
  const lower = summary.toLowerCase();

  if (completionMatchers.some((matcher) => lower.includes(matcher.toLowerCase()))) {
    return true;
  }

  if (progressPercent === 100) {
    return true;
  }

  return false;
}

function normalizeLogSummary(agentId: string, summary: string) {
  const cleaned = summary
    .replace(/^\d{4}-\d{2}-\d{2}[ T]\S+\s+/i, "")
    .replace(/^\d{2}:\d{2}:\d{2}\s+/i, "")
    .replace(/\b(INFO|WARN|WARNING|ERROR|DEBUG|TRACE)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = cleaned.toLowerCase();

  if (agentId === "openclaw" && summary.includes("\"action\":\"new\"")) {
    return "OpenClaw 已创建新的会话命令";
  }

  if (agentId === "kimi" && lower.includes("kimi_cli.wire.server:serve")) {
    return "正在连接本地通道";
  }

  if (agentId === "kimi" && lower.includes("kimi_cli.cli:_run")) {
    return "已创建新会话";
  }

  if (agentId === "hermes" && lower.includes("gateway.memory_monitor")) {
    return "空闲待命";
  }

  if (agentId === "hermes" && (lower.includes("pondering") || lower.includes("thinking"))) {
    return "Hermes 正在思考";
  }

  if (agentId === "hermes" && lower.includes("agent.auxiliary")) {
    return "Hermes 正在处理辅助步骤";
  }

  if (agentId === "codex" && lower.includes("falling back to http")) {
    return "Codex 已降级到 HTTP 通道";
  }

  if (
    agentId === "codex" &&
    (lower.includes("session_loop") ||
      lower.includes("thread_id=") ||
      lower.includes("submission_dispatch") ||
      lower.includes("turn.id="))
  ) {
    return lower.includes("close time.busy") ? "空闲待命" : "正在整理这一轮结果";
  }

  if (agentId === "claude-code" && (lower.includes("thinking") || lower.includes("tool "))) {
    return "Claude Code 正在处理任务";
  }

  if (agentId === "openclaw" && lower.includes("message failed")) {
    return "OpenClaw 正在重试发送";
  }

  if (lower.includes("shutting down")) {
    return "正在关闭";
  }

  if (lower.includes("created new session") || lower.includes("new session")) {
    return "已创建新会话";
  }

  if (lower.includes("starting wire server") || lower.includes("wire server")) {
    return "正在连接本地通道";
  }

  if (lower.includes("loaded config")) {
    return "已加载配置";
  }

  if (lower.includes("loaded tools")) {
    return "已加载工具";
  }

  if (lower.includes("loading system prompt")) {
    return "正在准备系统提示";
  }

  if (lower.includes("using llm model")) {
    return "模型已就绪";
  }

  if (lower.includes("using llm provider")) {
    return "服务提供方已连接";
  }

  if (lower.includes("memory_monitor") || lower.includes("[memory]") || lower.includes("rss=")) {
    return "空闲待命";
  }

  if (lower.includes("gateway") && lower.includes("uptime=")) {
    return "服务在线";
  }

  if (lower.includes("completed") || lower.includes("finished") || lower.includes("done")) {
    return "任务已完成";
  }

  if (lower.includes("running") || lower.includes("working") || lower.includes("processing")) {
    return "正在执行任务";
  }

  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception")) {
    return "执行异常，需要查看";
  }

  if (cleaned.length <= 32) {
    return cleaned;
  }

  return `${cleaned.slice(0, 29)}...`;
}

async function newestMtimeMs(paths: string[]) {
  const mtimes = await Promise.all(
    paths.map(async (targetPath) => {
      try {
        const stat = await fs.stat(targetPath);
        return stat.mtimeMs;
      } catch {
        return 0;
      }
    })
  );

  return Math.max(...mtimes, 0);
}

async function readKimiDesktopSummary(logPath: string): Promise<AgentLogSummary | null> {
  try {
    const sessionDir = `${process.env.HOME ?? ""}/Library/Application Support/kimi-desktop/Session Storage`;
    const localStoragePath =
      `${process.env.HOME ?? ""}/Library/Application Support/kimi-desktop/Local Storage/leveldb/000003.log`;
    const sessionEntries = await fs.readdir(sessionDir);
    const sessionPaths = sessionEntries.map((entry) => `${sessionDir}/${entry}`);
    const latestDesktopActivity = await newestMtimeMs([logPath, localStoragePath, ...sessionPaths]);

    if (!latestDesktopActivity) {
      return null;
    }

    const detail = await fs.readFile(logPath, "utf8").catch(() => "");
    const tail = detail
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-12)
      .join("\n");

    if (Date.now() - latestDesktopActivity <= KIMI_ACTIVITY_WINDOW_MS) {
      return {
        summary: "Kimi 正在当前会话中",
        status: "running",
        phase: "正在处理这轮对话",
        detail: tail || undefined
      };
    }

    return {
      summary: "Kimi 桌面进程在线",
      status: "idle",
      detail: tail || undefined
    };
  } catch {
    return null;
  }
}

async function readCodexSqliteSummary(): Promise<AgentLogSummary | null> {
  try {
    const dbPath = `${process.env.HOME ?? ""}/.codex/logs_2.sqlite`;
    const query = [
      "sqlite3",
      dbPath,
      `"select ts, target, feedback_log_body from logs order by id desc limit 80;"`
    ].join(" ");
    const { stdout } = await execAsync(query);
    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const recent = lines
      .map((line) => {
        const [tsRaw, target = "", ...bodyParts] = line.split("|");
        return {
          ts: Number(tsRaw),
          target,
          body: bodyParts.join("|")
        };
      })
      .filter((entry) => Number.isFinite(entry.ts) && nowSeconds - entry.ts <= 60 * 20);

    if (recent.length === 0) {
      return null;
    }

    const bodies = recent.map((entry) => entry.body.toLowerCase());
    const detail = recent
      .slice(0, 8)
      .map((entry) => entry.body)
      .join("\n");

    const runningSignals = [
      "response.function_call_arguments.delta",
      "response.output_item.added",
      "status\":\"in_progress\"",
      "retrying sampling request",
      "stream_request",
      "responses_websocket.stream_request",
      "model_client.stream_responses"
    ];

    const errorSignals = ["incorrect api key", "unauthorized", "invalid_api_key", "stream disconnected"];

    const hasRunning = bodies.some((body) => runningSignals.some((signal) => body.includes(signal)));
    const hasError = bodies.some((body) => errorSignals.some((signal) => body.includes(signal)));

    if (hasRunning) {
      return {
        summary: "Codex 正在处理当前对话",
        status: "running",
        detail
      };
    }

    if (hasError) {
      return {
        summary: "Codex 连接有点不稳，正在重试",
        status: "warning",
        detail
      };
    }

    return {
      summary: "空闲待命",
      status: "idle",
      detail
    };
  } catch {
    return null;
  }
}

async function readLogSummaries() {
  const agents = getUserConfig().agents.filter((agent) => agent.enabled && agent.logPath);
  const entries = await Promise.all(
    agents.map(async (rule) => {
      try {
        if (rule.id === "codex") {
          const codexSummary = await readCodexSqliteSummary();
          if (codexSummary) {
            return [rule.id, codexSummary] as const;
          }
        }

        if (rule.id === "kimi") {
          const kimiSummary = await readKimiDesktopSummary(rule.logPath);
          if (kimiSummary) {
            return [rule.id, kimiSummary] as const;
          }
        }

        const stat = await fs.stat(rule.logPath);
        if (Date.now() - stat.mtimeMs > LOG_STALE_MS) {
          return null;
        }

        const raw = await fs.readFile(rule.logPath, "utf8");
        const lines = raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length === 0) {
          return null;
        }

        const tail = lines.slice(-(rule.tailLines ?? 8));
        const summary = tail[tail.length - 1];
        const detail = tail.join("\n");
        const normalizedSummary = normalizeLogSummary(rule.id, summary);
        const status = inferStatusFromLog(
          rule.id,
          normalizedSummary,
          rule.errorMatchers ?? [],
          rule.runningMatchers ?? []
        );
        const progressPercent =
          rule.progressMatchers && rule.progressMatchers.some((matcher) => normalizedSummary.includes(matcher))
            ? extractProgress(normalizedSummary)
            : extractProgress(normalizedSummary);
        const phase = extractPhase(normalizedSummary);
        const isComplete = inferCompletion(
          normalizedSummary,
          progressPercent,
          rule.completionMatchers ?? []
        );

        return [
          rule.id,
          { summary: normalizedSummary, detail, status, phase, progressPercent, isComplete }
        ] as const;
      } catch {
        return null;
      }
    })
  );

  const normalizedEntries: Array<[string, AgentLogSummary]> = [];

  for (const entry of entries) {
    if (entry) {
      normalizedEntries.push([entry[0], entry[1]]);
    }
  }

  return new Map<string, AgentLogSummary>(normalizedEntries);
}

async function readProcessAgents() {
  const configuredAgents = getUserConfig().agents.filter((agent) => agent.enabled);
  const logSummaries = await readLogSummaries();
  const { stdout } = await execAsync("ps -axo pid,ppid,pcpu,rss,etime,command");
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const agents = new Map<number, AgentProcess>();

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) {
      continue;
    }

    const pid = Number(match[1]);
    const cpu = Number(match[3]);
    const memoryMb = Number(match[4]) / 1024;
    const elapsed = match[5];
    const command = match[6];
    const commandLower = command.toLowerCase();

    if (commandLower.includes("grep ")) {
      continue;
    }

    const rule = configuredAgents.find((item) =>
      item.matchers.some((matcher) => commandLower.includes(matcher.toLowerCase()))
    );

    if (!rule) {
      continue;
    }

    if (
      commandLower.includes("textinputuimachelp") ||
      commandLower.includes("cursorservices")
    ) {
      continue;
    }

    const summary = trimSummary(command, rule.name);
    const logSummary = logSummaries.get(rule.id);
    const resolvedSummary = logSummary?.summary ?? summary;
    const resolvedStatus = logSummary?.isComplete
      ? "idle"
      : (logSummary?.status ?? computeStatus(rule.id, cpu, memoryMb, resolvedSummary));

    const nextAgent: AgentProcess = {
      id: `${rule.id}-${pid}`,
      agentId: rule.id,
      name: rule.name,
      matcher: rule.matchers[0],
      source: "process",
      pid,
      cpu,
      memoryMb: Number(memoryMb.toFixed(1)),
      uptimeSeconds: parseElapsedToSeconds(elapsed),
      status: resolvedStatus,
      summary: resolvedSummary,
      detail: logSummary?.detail,
      phase: logSummary?.phase,
      progressPercent: logSummary?.progressPercent,
      isComplete: logSummary?.isComplete,
      dashboardUrl: rule.dashboardUrl,
      statusUrl: rule.statusUrl
    };

    agents.set(
      pid,
      rule.aggregateByAgent
        ? {
            ...nextAgent,
            id: `agent:${rule.id}`
          }
        : nextAgent
    );
  }

  return sortAgents(mergeRelatedProcesses([...agents.values()]));
}

export const monitorSources: AgentMonitorSource[] = [
  {
    id: "process",
    read: readProcessAgents
  }
];
