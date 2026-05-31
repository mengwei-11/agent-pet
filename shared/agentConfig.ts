export interface AgentRule {
  id: string;
  name: string;
  matchers: string[];
  aggregateByAgent?: boolean;
  appNames?: string[];
  appBundleIds?: string[];
  appDataPathCandidates?: string[];
  logPathCandidates?: string[];
  dashboardUrl?: string;
  dashboardCandidates?: string[];
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
    appBundleIds: ["com.openai.codex"],
    logPathCandidates: [
      "~/.codex/logs_2.sqlite",
      "~/.codex/log/codex-tui.log"
    ],
    dashboardUrl: "codex://activate",
    dashboardCandidates: ["codex://activate"]
  },
  {
    id: "claude-code",
    name: "Claude Code",
    matchers: ["claude", "anthropic"],
    appNames: ["Claude", "Claude Code"],
    appBundleIds: ["ai.anthropic.claudefordesktop"],
    logPathCandidates: ["~/.claude/logs/latest.log"]
  },
  {
    id: "cline",
    name: "Cline",
    matchers: ["cline"],
    appNames: ["Cline"],
    logPathCandidates: [
      "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log",
      "~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log",
      "~/Library/Application Support/Windsurf/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log"
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
    appBundleIds: ["com.trae.app"],
    logPathCandidates: [
      "~/Library/Application Support/Trae/logs/main.log"
    ]
  },
  {
    id: "windsurf",
    name: "Windsurf",
    matchers: ["windsurf", "codeium"],
    appNames: ["Windsurf"],
    appBundleIds: ["com.exafunction.windsurf"],
    logPathCandidates: [
      "~/Library/Application Support/Windsurf/logs/main.log",
      "~/Library/Application Support/Codeium/logs/main.log"
    ]
  },
  {
    id: "cursor",
    name: "Cursor",
    matchers: ["cursor", "cursor-agent"],
    appNames: ["Cursor"],
    appBundleIds: ["com.todesktop.230313mzl4w4u92"],
    logPathCandidates: [
      "~/Library/Application Support/Cursor/logs/main.log"
    ]
  },
  {
    id: "gemini",
    name: "Gemini",
    matchers: ["gemini", "google-generativeai", "gemini-cli"],
    appNames: ["Gemini"],
    appBundleIds: ["com.google.gemini"],
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
    appBundleIds: ["com.moonshot.kimichat"],
    appDataPathCandidates: [
      "~/Library/Application Support/kimi-desktop"
    ],
    logPathCandidates: [
      "~/Library/Logs/kimi-desktop/main.log",
      "~/.kimi/logs/kimi.log"
    ],
    dashboardUrl: "kimi://activate",
    dashboardCandidates: ["kimi://activate", "https://kimi.moonshot.cn/"]
  },
  {
    id: "hermes",
    name: "Hermes",
    matchers: ["hermes", "hermes-web-ui", "hermes-agent"],
    aggregateByAgent: true,
    appNames: ["Hermes"],
    appBundleIds: ["ai.hermes.desktop"],
    logPathCandidates: ["~/.hermes/logs/agent.log"],
    dashboardUrl: "http://localhost:8648/",
    dashboardCandidates: [
      "http://localhost:8648/",
      "http://127.0.0.1:8648/"
    ]
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    matchers: ["openclaw", "openclaw/dist/index.js"],
    aggregateByAgent: true,
    appNames: ["OpenClaw"],
    appBundleIds: ["ai.openclaw.desktop"],
    logPathCandidates: ["~/.openclaw/logs/commands.log"],
    dashboardUrl: "http://127.0.0.1:18789/",
    dashboardCandidates: [
      "http://127.0.0.1:18789/",
      "http://localhost:18789/"
    ]
  },
  {
    id: "roo-code",
    name: "Roo Code",
    matchers: ["roo", "roo-code", "roocode"],
    appNames: ["Roo Code"],
    appBundleIds: ["com.roocode.desktop"],
    logPathCandidates: [
      "~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/logs/roo.log",
      "~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/logs/roo.log",
      "~/Library/Application Support/Windsurf/User/globalStorage/rooveterinaryinc.roo-cline/logs/roo.log"
    ]
  },
  {
    id: "goose",
    name: "Goose",
    matchers: ["goose", "block/goose"],
    appNames: ["Goose"],
    appBundleIds: ["ai.block.goose"],
    logPathCandidates: [
      "~/.config/goose/logs/latest.log",
      "~/.local/state/goose/logs/latest.log"
    ]
  },
  {
    id: "openhands",
    name: "OpenHands",
    matchers: ["openhands", "all-hands-ai", "allhands"],
    appNames: ["OpenHands"],
    appBundleIds: ["ai.allhands.desktop"],
    logPathCandidates: [
      "~/.openhands/logs/latest.log",
      "~/.config/openhands/logs/latest.log"
    ]
  },
  {
    id: "qoder",
    name: "Qoder",
    matchers: ["qoder"],
    appNames: ["Qoder", "Qoder CN"],
    appBundleIds: ["com.qoder.ide", "com.aliyun.lingma.ide"],
    logPathCandidates: [
      "~/.qoder/logs/latest.log",
      "~/Library/Logs/Qoder/main.log",
      "~/Library/Logs/Qoder CN/main.log"
    ]
  },
  {
    id: "marscode",
    name: "MarsCode",
    matchers: ["marscode", "doubao", "trae-cn"],
    appNames: ["MarsCode", "豆包 MarsCode", "豆包"],
    appBundleIds: ["com.bot.neotix.doubao"],
    logPathCandidates: [
      "~/.marscode/logs/latest.log",
      "~/Library/Logs/MarsCode/main.log",
      "~/Library/Logs/Doubao/main.log"
    ]
  },
  {
    id: "coze",
    name: "Coze",
    matchers: ["coze", "扣子"],
    appNames: ["Coze", "扣子"],
    appBundleIds: ["com.coze.desktop"],
    logPathCandidates: [
      "~/.coze/logs/latest.log",
      "~/Library/Logs/Coze/main.log"
    ]
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
    path: "~/.codex/log/codex-tui.log",
    tailLines: 10,
    errorMatchers: ["error", "failed", "exception", "unauthorized", "invalid_api_key"],
    runningMatchers: ["running", "started", "working", "retrying", "falling back"],
    completionMatchers: ["completed", "finished", "done", "success", "close time.busy"]
  },
  {
    agentId: "claude-code",
    path: "~/.claude/logs/latest.log",
    tailLines: 10,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "cline",
    path: "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/logs/cline.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "thinking", "tool"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "aider",
    path: "~/.aider.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "trae",
    path: "~/Library/Application Support/Trae/logs/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "cursor",
    path: "~/Library/Application Support/Cursor/logs/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "gemini",
    path: "~/.gemini/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "kimi",
    path: "~/Library/Logs/kimi-desktop/main.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "created new session", "starting wire server"],
    progressMatchers: ["%", "/", "step", "phase"],
    completionMatchers: ["completed", "finished", "done", "success", "回答完成"]
  },
  {
    agentId: "hermes",
    path: "~/.hermes/logs/agent.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception", "panic", "traceback", "unauthorized"],
    runningMatchers: ["running", "started", "working", "processing", "api call #", "tool ", "pondering", "thinking", "replying"],
    progressMatchers: ["%", "/", "step", "phase", "api call #", "pondering", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success", "turn ended", "finish_reason=stop"]
  },
  {
    agentId: "openclaw",
    path: "~/.openclaw/logs/commands.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "\"action\":\"new\""],
    progressMatchers: ["%", "/", "step", "phase"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "roo-code",
    path: "~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/logs/roo.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "thinking", "tool"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "goose",
    path: "~/.config/goose/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "thinking", "tool"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "openhands",
    path: "~/.openhands/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "qoder",
    path: "~/.qoder/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "marscode",
    path: "~/.marscode/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing", "thinking"],
    completionMatchers: ["completed", "finished", "done", "success"]
  },
  {
    agentId: "coze",
    path: "~/.coze/logs/latest.log",
    tailLines: 12,
    errorMatchers: ["error", "failed", "exception"],
    runningMatchers: ["running", "started", "working", "processing"],
    completionMatchers: ["completed", "finished", "done", "success"]
  }
];
