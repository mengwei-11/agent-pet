export interface AgentRule {
  id: string;
  name: string;
  matchers: string[];
  aggregateByAgent?: boolean;
  dashboardUrl?: string;
  statusUrl?: string;
}

export interface MonitorThresholds {
  runningCpu: number;
  runningMemoryMb: number;
  warningCpu: number;
  warningMemoryMb: number;
}

export interface AgentLogRule {
  agentId: string;
  path: string;
  tailLines?: number;
  errorMatchers?: string[];
  runningMatchers?: string[];
  progressMatchers?: string[];
  completionMatchers?: string[];
}

export const AGENT_RULES: AgentRule[] = [
  {
    id: "codex",
    name: "Codex",
    matchers: ["codex", "openai"],
    dashboardUrl: "codex://activate"
  },
  {
    id: "claude-code",
    name: "Claude Code",
    matchers: ["claude", "anthropic"]
  },
  {
    id: "windsurf",
    name: "Windsurf",
    matchers: ["windsurf", "codeium"]
  },
  {
    id: "kimi",
    name: "Kimi",
    matchers: ["kimi", "moonshot"],
    aggregateByAgent: true,
    dashboardUrl: "kimi://activate"
  },
  {
    id: "hermes",
    name: "Hermes",
    matchers: ["hermes", "hermes-web-ui", "hermes-agent"],
    aggregateByAgent: true,
    dashboardUrl: "http://localhost:8648/#/hermes/session/mpo74xjzfa24qp"
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    matchers: ["openclaw", "openclaw/dist/index.js"],
    aggregateByAgent: true,
    dashboardUrl: "http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain"
  },
  {
    id: "node-agent",
    name: "Node Agent",
    matchers: ["tsx", "ts-node", "node worker", "node agent"]
  },
  {
    id: "python-agent",
    name: "Python Agent",
    matchers: ["python", "uv run", "langgraph", "autogen"]
  }
];

export const MONITOR_THRESHOLDS: MonitorThresholds = {
  runningCpu: 1,
  runningMemoryMb: 250,
  warningCpu: 60,
  warningMemoryMb: 1500
};

export const AGENT_LOG_RULES: AgentLogRule[] = [
  {
    agentId: "codex",
    path: "/Users/a111/.codex/log/codex-tui.log",
    tailLines: 10,
    errorMatchers: ["error", "failed", "exception", "unauthorized", "invalid_api_key"],
    runningMatchers: ["running", "started", "working", "retrying", "falling back"],
    completionMatchers: ["completed", "finished", "done", "success", "close time.busy"]
  },
  {
    agentId: "claude-code",
    path: "/Users/a111/.claude/logs/latest.log",
    tailLines: 10,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "kimi",
    path: "/Users/a111/Library/Logs/kimi-desktop/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "created new session", "starting wire server"],
    progressMatchers: ["%", "/", "step", "phase"],
    completionMatchers: ["completed", "finished", "done", "success", "回答完成"]
  },
  {
    agentId: "hermes",
    path: "/Users/a111/.hermes/logs/agent.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception", "panic", "traceback", "unauthorized"],
    runningMatchers: ["running", "started", "working", "processing", "api call #", "tool ", "pondering", "thinking", "replying"],
    progressMatchers: ["%", "/", "step", "phase", "api call #", "pondering", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success", "turn ended", "finish_reason=stop"]
  },
  {
    agentId: "openclaw",
    path: "/Users/a111/.openclaw/logs/commands.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "\"action\":\"new\""],
    progressMatchers: ["%", "/", "step", "phase"],
    completionMatchers: ["completed", "finished", "done", "success"]
  }
];
