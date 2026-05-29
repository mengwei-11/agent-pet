export interface AgentRule {
  id: string;
  name: string;
  matchers: string[];
  aggregateByAgent?: boolean;
  appNames?: string[];
  logPathCandidates?: string[];
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
    appNames: ["Codex"],
    logPathCandidates: [
      "~/.codex/logs_2.sqlite",
      "~/.codex/log/codex-tui.log"
    ],
    dashboardUrl: "codex://activate"
  },
  {
    id: "claude-code",
    name: "Claude Code",
    matchers: ["claude", "anthropic"],
    appNames: ["Claude", "Claude Code"],
    logPathCandidates: ["~/.claude/logs/latest.log"]
  },
  {
    id: "cline",
    name: "Cline",
    matchers: ["cline"],
    appNames: ["Cline"],
    logPathCandidates: [
      "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log"
    ]
  },
  {
    id: "aider",
    name: "Aider",
    matchers: ["aider"],
    logPathCandidates: [
      "~/.aider.log",
      "~/.local/state/aider/aider.log"
    ]
  },
  {
    id: "trae",
    name: "Trae",
    matchers: ["trae"],
    appNames: ["Trae"],
    logPathCandidates: [
      "~/Library/Application Support/Trae/logs/main.log"
    ]
  },
  {
    id: "windsurf",
    name: "Windsurf",
    matchers: ["windsurf", "codeium"],
    appNames: ["Windsurf"]
  },
  {
    id: "cursor",
    name: "Cursor",
    matchers: ["cursor", "cursor-agent"],
    appNames: ["Cursor"],
    logPathCandidates: [
      "~/Library/Application Support/Cursor/logs/main.log"
    ]
  },
  {
    id: "gemini",
    name: "Gemini",
    matchers: ["gemini", "google-generativeai", "gemini-cli"],
    appNames: ["Gemini"],
    logPathCandidates: [
      "~/.gemini/logs/latest.log",
      "~/.config/gemini/logs/latest.log"
    ]
  },
  {
    id: "kimi",
    name: "Kimi",
    matchers: ["kimi", "moonshot"],
    aggregateByAgent: true,
    appNames: ["Kimi"],
    logPathCandidates: [
      "~/Library/Logs/kimi-desktop/main.log",
      "~/.kimi/logs/kimi.log"
    ],
    dashboardUrl: "kimi://activate"
  },
  {
    id: "hermes",
    name: "Hermes",
    matchers: ["hermes", "hermes-web-ui", "hermes-agent"],
    aggregateByAgent: true,
    appNames: ["Hermes"],
    logPathCandidates: ["~/.hermes/logs/agent.log"],
    dashboardUrl: "http://localhost:8648/#/hermes/session/mpo74xjzfa24qp"
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    matchers: ["openclaw", "openclaw/dist/index.js"],
    aggregateByAgent: true,
    appNames: ["OpenClaw"],
    logPathCandidates: ["~/.openclaw/logs/commands.log"],
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
    agentId: "cline",
    path: "/Users/a111/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "thinking", "tool"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "aider",
    path: "/Users/a111/.aider.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "trae",
    path: "/Users/a111/Library/Application Support/Trae/logs/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "cursor",
    path: "/Users/a111/Library/Application Support/Cursor/logs/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "gemini",
    path: "/Users/a111/.gemini/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
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
