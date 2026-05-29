import { monitorSources } from "./monitorSources.js";
import type { AgentProcess, AgentSnapshot } from "../shared/types";

function mergeAgents(agentLists: AgentProcess[][]) {
  const merged = new Map<string, AgentProcess>();

  for (const agents of agentLists) {
    for (const agent of agents) {
      merged.set(agent.id, agent);
    }
  }

  const priority = { error: 0, warning: 1, running: 2, idle: 3 };

  return [...merged.values()].sort((left, right) => {
    if (left.status !== right.status) {
      return priority[left.status] - priority[right.status];
    }

    return right.cpu - left.cpu;
  });
}

export async function readAgentSnapshot(): Promise<AgentSnapshot> {
  try {
    const results = await Promise.all(
      monitorSources.map(async (source) => {
        try {
          return await source.read();
        } catch {
          return [];
        }
      })
    );
    const agents = mergeAgents(results);

    return {
      updatedAt: new Date().toISOString(),
      agents
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      agents: []
    };
  }
}
