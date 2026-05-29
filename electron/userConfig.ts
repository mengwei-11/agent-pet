import { promises as fs } from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import { AGENT_LOG_RULES, AGENT_RULES } from "../shared/agentConfig.js";
import type { AgentLogRule, AgentRule } from "../shared/agentConfig.js";
import type { AppUserConfig, AgentMonitorConfigItem } from "../shared/config.js";

let currentConfig: AppUserConfig | null = null;
const DEPRECATED_AGENT_IDS = new Set<string>();
const LEGACY_KIMI_LOG_PATH = path.join(process.env.HOME ?? "", ".kimi/logs/kimi.log");

function expandHome(input: string) {
  if (input.startsWith("~/")) {
    return path.join(process.env.HOME ?? "", input.slice(2));
  }

  return input;
}

function firstCandidateLogPath(rule: AgentRule, logRule?: AgentLogRule) {
  if (rule.logPathCandidates?.length) {
    return expandHome(rule.logPathCandidates[0]);
  }

  return logRule?.path ? expandHome(logRule.path) : "";
}

function getConfigPath() {
  return path.join(app.getPath("userData"), "agent-pet-config.json");
}

function buildAgentConfig(rule: AgentRule, logRule?: AgentLogRule): AgentMonitorConfigItem {
  return {
    id: rule.id,
    name: rule.name,
    enabled: !["cursor", "windsurf", "node-agent", "python-agent"].includes(rule.id),
    aggregateByAgent: rule.aggregateByAgent ?? false,
    matchers: [...rule.matchers],
    dashboardUrl: rule.dashboardUrl ?? "",
    statusUrl: rule.statusUrl ?? "",
    logPath: firstCandidateLogPath(rule, logRule),
    tailLines: logRule?.tailLines ?? 10,
    errorMatchers: [...(logRule?.errorMatchers ?? ["error", "failed", "exception"])],
    runningMatchers: [...(logRule?.runningMatchers ?? ["running", "started", "working"])],
    progressMatchers: [...(logRule?.progressMatchers ?? ["%", "/", "step", "phase"])],
    completionMatchers: [...(logRule?.completionMatchers ?? ["completed", "finished", "done", "success"])]
  };
}

export function defaultUserConfig(): AppUserConfig {
  return {
    onboardingComplete: false,
    agents: AGENT_RULES.map((rule) =>
      buildAgentConfig(
        rule,
        AGENT_LOG_RULES.find((logRule) => logRule.agentId === rule.id)
      )
    )
  };
}

function normalizeAgentConfig(
  agent: Partial<AgentMonitorConfigItem>,
  fallback: AgentMonitorConfigItem
): AgentMonitorConfigItem {
  const normalizedErrorMatchers = Array.isArray(agent.errorMatchers)
    ? agent.errorMatchers.filter(Boolean)
    : fallback.errorMatchers;
  const resolvedId = agent.id ?? fallback.id;
  const dashboardUrl =
    (resolvedId === "codex" || resolvedId === "kimi") && !agent.dashboardUrl
      ? fallback.dashboardUrl
      : (agent.dashboardUrl ?? fallback.dashboardUrl);
  const logPath =
    resolvedId === "kimi" && (!agent.logPath || agent.logPath === LEGACY_KIMI_LOG_PATH)
      ? fallback.logPath
      : (agent.logPath ?? fallback.logPath);

  return {
    id: resolvedId,
    name: agent.name ?? fallback.name,
    enabled: agent.enabled ?? fallback.enabled,
    aggregateByAgent: agent.aggregateByAgent ?? fallback.aggregateByAgent,
    matchers: Array.isArray(agent.matchers) ? agent.matchers.filter(Boolean) : fallback.matchers,
    dashboardUrl,
    statusUrl: agent.statusUrl ?? fallback.statusUrl,
    logPath,
    tailLines: agent.tailLines ?? fallback.tailLines,
    errorMatchers:
      resolvedId === "hermes"
        ? normalizedErrorMatchers.filter((matcher) => matcher.toLowerCase() !== "warning")
        : normalizedErrorMatchers,
    runningMatchers: Array.isArray(agent.runningMatchers)
      ? agent.runningMatchers.filter(Boolean)
      : fallback.runningMatchers,
    progressMatchers: Array.isArray(agent.progressMatchers)
      ? agent.progressMatchers.filter(Boolean)
      : fallback.progressMatchers,
    completionMatchers: Array.isArray(agent.completionMatchers)
      ? agent.completionMatchers.filter(Boolean)
      : fallback.completionMatchers
  };
}

function normalizeUserConfig(input?: Partial<AppUserConfig> | null): AppUserConfig {
  const defaults = defaultUserConfig();
  const byId = new Map((input?.agents ?? []).map((agent) => [agent.id, agent]));

  const agents = defaults.agents.map((fallback) =>
    normalizeAgentConfig(byId.get(fallback.id) ?? {}, fallback)
  );

  const extras = (input?.agents ?? [])
    .filter(
      (agent): agent is AgentMonitorConfigItem =>
        !!agent.id &&
        !DEPRECATED_AGENT_IDS.has(agent.id) &&
        !agents.some((item) => item.id === agent.id)
    )
    .map((agent) =>
      normalizeAgentConfig(agent, {
        id: agent.id,
        name: agent.name ?? agent.id,
        enabled: agent.enabled ?? true,
        aggregateByAgent: agent.aggregateByAgent ?? false,
        matchers: agent.matchers ?? [],
        dashboardUrl: agent.dashboardUrl ?? "",
        statusUrl: agent.statusUrl ?? "",
        logPath: agent.logPath ?? "",
        tailLines: agent.tailLines ?? 10,
        errorMatchers: agent.errorMatchers ?? ["error", "failed", "exception"],
        runningMatchers: agent.runningMatchers ?? ["running", "started", "working"],
        progressMatchers: agent.progressMatchers ?? ["%", "/", "step", "phase"],
        completionMatchers: agent.completionMatchers ?? ["completed", "finished", "done", "success"]
      })
    );

  return {
    onboardingComplete: input?.onboardingComplete ?? defaults.onboardingComplete,
    agents: [...agents, ...extras]
  };
}

export async function loadUserConfig(): Promise<AppUserConfig> {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppUserConfig>;
    currentConfig = normalizeUserConfig(parsed);
    return currentConfig;
  } catch {
    currentConfig = defaultUserConfig();
    return currentConfig;
  }
}

export function getUserConfig(): AppUserConfig {
  if (!currentConfig) {
    currentConfig = defaultUserConfig();
  }

  return currentConfig;
}

export async function saveUserConfig(config: AppUserConfig): Promise<AppUserConfig> {
  currentConfig = normalizeUserConfig(config);
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(currentConfig, null, 2), "utf8");
  return currentConfig;
}
