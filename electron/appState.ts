import { promises as fs } from "node:fs";
import * as path from "node:path";
import { app, screen, type Rectangle } from "electron";

const DEFAULT_EXPANDED = true;
const DEFAULT_SCALE = 1;
const DEFAULT_BOUNDS = {
  width: 460,
  height: 760
};
const DEFAULT_EXPANDED_SIZE = {
  width: 460,
  height: 760
};

export interface PersistedAppState {
  expanded: boolean;
  scale: number;
  bounds: Rectangle;
  expandedSize: {
    width: number;
    height: number;
  };
}

function defaultBounds(): Rectangle {
  const area = screen.getPrimaryDisplay().workArea;

  return {
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
    x: area.x + area.width - DEFAULT_BOUNDS.width - 32,
    y: area.y + 32
  };
}

function defaultState(): PersistedAppState {
  return {
    expanded: DEFAULT_EXPANDED,
    scale: DEFAULT_SCALE,
    bounds: defaultBounds(),
    expandedSize: { ...DEFAULT_EXPANDED_SIZE }
  };
}

function getStatePath() {
  return path.join(app.getPath("userData"), "agent-pet-state.json");
}

export async function loadAppState(): Promise<PersistedAppState> {
  try {
    const raw = await fs.readFile(getStatePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    const fallback = defaultState();

    if (!parsed.bounds) {
      return fallback;
    }

    return {
      expanded: parsed.expanded ?? fallback.expanded,
      scale: parsed.scale ?? fallback.scale,
      expandedSize: {
        width: parsed.expandedSize?.width ?? fallback.expandedSize.width,
        height: parsed.expandedSize?.height ?? fallback.expandedSize.height
      },
      bounds: {
        width: parsed.bounds.width ?? fallback.bounds.width,
        height: parsed.bounds.height ?? fallback.bounds.height,
        x: parsed.bounds.x ?? fallback.bounds.x,
        y: parsed.bounds.y ?? fallback.bounds.y
      }
    };
  } catch {
    return defaultState();
  }
}

export async function saveAppState(state: PersistedAppState) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getStatePath(), JSON.stringify(state, null, 2), "utf8");
}

export function normalizeBounds(bounds: Rectangle) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);

  const x = Math.min(Math.max(bounds.x, area.x), area.x + area.width - width);
  const y = Math.min(Math.max(bounds.y, area.y), area.y + area.height - height);

  return { x, y, width, height };
}
