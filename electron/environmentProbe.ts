import { promises as fs } from "node:fs";
import * as path from "node:path";
import { AGENT_RULES } from "../shared/agentConfig.js";
import type { AgentEnvironmentProbeItem, EnvironmentProbe } from "../shared/types.js";

function expandHome(input: string) {
  if (input.startsWith("~/")) {
    return path.join(process.env.HOME ?? "", input.slice(2));
  }

  return input;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function detectApp(appNames: string[] | undefined) {
  if (!appNames?.length) {
    return { appDetected: false, appName: undefined };
  }

  for (const appName of appNames) {
    const candidates = [
      path.join("/Applications", `${appName}.app`),
      path.join(process.env.HOME ?? "", "Applications", `${appName}.app`)
    ];

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return { appDetected: true, appName };
      }
    }
  }

  return { appDetected: false, appName: appNames[0] };
}

async function detectLogPath(paths: string[] | undefined) {
  if (!paths?.length) {
    return { logDetected: false, logPath: "" };
  }

  for (const candidate of paths) {
    const expanded = expandHome(candidate);
    if (await pathExists(expanded)) {
      return { logDetected: true, logPath: expanded };
    }
  }

  return { logDetected: false, logPath: expandHome(paths[0]) };
}

export async function probeEnvironment(): Promise<EnvironmentProbe> {
  const agents: AgentEnvironmentProbeItem[] = await Promise.all(
    AGENT_RULES.map(async (rule) => {
      const app = await detectApp(rule.appNames);
      const log = await detectLogPath(rule.logPathCandidates);
      const notes: string[] = [];

      if (app.appDetected) {
        notes.push(`已检测到本地应用 ${app.appName}`);
      } else if (rule.appNames?.length) {
        notes.push(`未检测到本地应用 ${rule.appNames.join(" / ")}`);
      }

      if (log.logDetected) {
        notes.push("已检测到日志路径");
      } else if (log.logPath) {
        notes.push("未检测到默认日志路径，可手动修改");
      }

      if (!rule.dashboardUrl && !app.appDetected) {
        notes.push("当前没有默认入口");
      }

      return {
        id: rule.id,
        name: rule.name,
        appDetected: app.appDetected,
        appName: app.appName,
        logDetected: log.logDetected,
        logPath: log.logPath,
        dashboardUrl: rule.dashboardUrl ?? "",
        notes
      };
    })
  );

  return {
    platform: process.platform,
    readyCount: agents.filter((item) => item.appDetected || item.logDetected).length,
    appDetectedCount: agents.filter((item) => item.appDetected).length,
    logDetectedCount: agents.filter((item) => item.logDetected).length,
    agents
  };
}
