export interface AgentMonitorConfigItem {
  id: string;
  name: string;
  enabled: boolean;
  aggregateByAgent: boolean;
  matchers: string[];
  dashboardUrl: string;
  statusUrl: string;
  logPath: string;
  tailLines: number;
  errorMatchers: string[];
  runningMatchers: string[];
  progressMatchers: string[];
  completionMatchers: string[];
}

export interface AppUserConfig {
  onboardingComplete: boolean;
  agents: AgentMonitorConfigItem[];
}
