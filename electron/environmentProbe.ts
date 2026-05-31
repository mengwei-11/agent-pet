import { promises as fs } from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AGENT_RULES } from "../shared/agentConfig.js";
import type { AgentEnvironmentProbeItem, EnvironmentProbe } from "../shared/types.js";

const execFileAsync = promisify(execFile);

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

async function detectApp(appNames: string[] | undefined, bundleIds: string[] | undefined) {
  if (!appNames?.length && !bundleIds?.length) {
    return { appDetected: false, appName: undefined, appBundleId: undefined };
  }

  for (const bundleId of bundleIds ?? []) {
    try {
      const { stdout } = await execFileAsync("mdfind", [`kMDItemCFBundleIdentifier == "${bundleId}"`]);
      const firstMatch = stdout
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean);

      if (firstMatch) {
        const matchedName = appNames?.[0] ?? bundleId;
        return { appDetected: true, appName: matchedName, appBundleId: bundleId };
      }
    } catch {
      // Ignore Spotlight errors and keep trying other probes.
    }

    try {
      const { stdout } = await execFileAsync("osascript", [
        "-e",
        'tell application "System Events" to get bundle identifier of every process'
      ]);
      const bundleList = stdout
        .split(",")
        .map((item) => item.trim());

      if (bundleList.includes(bundleId)) {
        const matchedName = appNames?.[0] ?? bundleId;
        return { appDetected: true, appName: matchedName, appBundleId: bundleId };
      }
    } catch {
      // Ignore GUI process probe errors and keep trying other probes.
    }
  }

  for (const appName of appNames ?? []) {
    const candidates = [
      path.join("/Applications", `${appName}.app`),
      path.join(process.env.HOME ?? "", "Applications", `${appName}.app`)
    ];

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return { appDetected: true, appName, appBundleId: bundleIds?.[0] };
      }
    }

    try {
      const { stdout } = await execFileAsync("mdfind", [`kMDItemFSName == "${appName}.app"`]);
      const firstMatch = stdout
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean);

      if (firstMatch) {
        return { appDetected: true, appName, appBundleId: bundleIds?.[0] };
      }
    } catch {
      // Ignore Spotlight errors and keep trying other probes.
    }

    try {
      const { stdout } = await execFileAsync("ps", ["-axo", "command"]);
      const lowerAppName = appName.toLowerCase();
      const matchedProcess = stdout
        .split("\n")
        .map((line) => line.trim())
        .find((line) => {
          const lowerLine = line.toLowerCase();
          return lowerLine.includes(`/${lowerAppName}.app/`) || lowerLine.includes(`${lowerAppName}.app`);
        });

      if (matchedProcess) {
        return { appDetected: true, appName, appBundleId: bundleIds?.[0] };
      }
    } catch {
      // Ignore process probe errors and keep trying other probes.
    }

    try {
      const { stdout } = await execFileAsync("osascript", [
        "-e",
        'tell application "System Events" to get name of every process'
      ]);
      const lowerAppName = appName.toLowerCase();
      const matchedProcessName = stdout
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .find((item) => item === lowerAppName);

      if (matchedProcessName) {
        return { appDetected: true, appName, appBundleId: bundleIds?.[0] };
      }
    } catch {
      // Ignore GUI process probe errors and keep trying other probes.
    }
  }

  return {
    appDetected: false,
    appName: appNames?.[0] ?? bundleIds?.[0],
    appBundleId: bundleIds?.[0]
  };
}

async function detectAppDataPath(paths: string[] | undefined) {
  if (!paths?.length) {
    return false;
  }

  for (const candidate of paths) {
    if (await pathExists(expandHome(candidate))) {
      return true;
    }
  }

  return false;
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

async function detectDashboard(
  urls: string[] | undefined,
  appDetected: boolean,
  logDetected: boolean,
  appName: string | undefined,
  appBundleId: string | undefined
) {
  if (!urls?.length) {
    if (appDetected && appBundleId) {
      return {
        dashboardDetected: true,
        dashboardUrl: `app://bundle/${encodeURIComponent(appBundleId)}`,
        dashboardCandidates: [`app://bundle/${encodeURIComponent(appBundleId)}`]
      };
    }

    if (appDetected && appName) {
      return {
        dashboardDetected: true,
        dashboardUrl: `app://name/${encodeURIComponent(appName)}`,
        dashboardCandidates: [`app://name/${encodeURIComponent(appName)}`]
      };
    }

    return { dashboardDetected: false, dashboardUrl: "", dashboardCandidates: [] as string[] };
  }

  const candidates = [...urls];

  if (appDetected || logDetected) {
    const appSchemeUrl = candidates.find((candidate) => candidate.includes("://") && !candidate.startsWith("http"));
    if (appSchemeUrl) {
      return {
        dashboardDetected: true,
        dashboardUrl: appSchemeUrl,
        dashboardCandidates: candidates
      };
    }
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
      continue;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800);
      const response = await fetch(candidate, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok || (response.status >= 300 && response.status < 500)) {
        return {
          dashboardDetected: true,
          dashboardUrl: candidate,
          dashboardCandidates: candidates
        };
      }
    } catch {
      continue;
    }
  }

  if (logDetected) {
    const localhostCandidate = candidates.find((candidate) =>
      candidate.startsWith("http://localhost") || candidate.startsWith("http://127.0.0.1")
    );

    if (localhostCandidate) {
      return {
        dashboardDetected: true,
        dashboardUrl: localhostCandidate,
        dashboardCandidates: candidates
      };
    }
  }

  return {
    dashboardDetected: false,
    dashboardUrl: candidates[0] ?? "",
    dashboardCandidates: candidates
  };
}

export async function probeEnvironment(): Promise<EnvironmentProbe> {
  const agents: AgentEnvironmentProbeItem[] = await Promise.all(
    AGENT_RULES.map(async (rule) => {
      const app = await detectApp(rule.appNames, rule.appBundleIds);
      const appDataDetected = await detectAppDataPath(rule.appDataPathCandidates);
      const appDetected = app.appDetected || appDataDetected;
      const log = await detectLogPath(rule.logPathCandidates);
      const dashboard = await detectDashboard(
        rule.dashboardCandidates ?? (rule.dashboardUrl ? [rule.dashboardUrl] : []),
        appDetected,
        log.logDetected,
        app.appName,
        app.appBundleId
      );
      const notes: string[] = [];

      if (appDetected) {
        notes.push(`已检测到本地应用 ${app.appName}`);
      } else if (rule.appNames?.length) {
        notes.push(`未检测到本地应用 ${rule.appNames.join(" / ")}`);
      }

      if (log.logDetected) {
        notes.push("已检测到日志路径");
      } else if (log.logPath) {
        notes.push("未检测到默认日志路径，可手动修改");
      }

      if (dashboard.dashboardDetected) {
        notes.push("已检测到可用入口");
      } else if (dashboard.dashboardCandidates.length) {
        notes.push("未检测到可用入口，可手动修改");
      }

      if (!rule.dashboardUrl && !app.appDetected && !dashboard.dashboardCandidates.length) {
        notes.push("当前没有默认入口");
      }

      return {
        id: rule.id,
        name: rule.name,
        appDetected,
        appName: app.appName,
        appBundleId: app.appBundleId,
        appCandidates: [...(rule.appNames ?? [])],
        logDetected: log.logDetected,
        logPath: log.logPath,
        logPathCandidates: (rule.logPathCandidates ?? []).map(expandHome),
        dashboardUrl: dashboard.dashboardUrl,
        dashboardCandidates: dashboard.dashboardCandidates,
        dashboardDetected: dashboard.dashboardDetected,
        notes
      };
    })
  );

  return {
    platform: process.platform,
    readyCount: agents.filter((item) => item.appDetected || item.logDetected || item.dashboardDetected).length,
    appDetectedCount: agents.filter((item) => item.appDetected).length,
    logDetectedCount: agents.filter((item) => item.logDetected).length,
    dashboardDetectedCount: agents.filter((item) => item.dashboardDetected).length,
    agents
  };
}
