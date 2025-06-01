import { SavedDemo } from "./demoTypes";

const modules = import.meta.glob("./demos/*.json") as Record<string, () => Promise<{ default: SavedDemo }>>;

const DemoPaths = {
  BlackHole: "./demos/black-hole.json",
  CourseClear: "./demos/course-clear.json",
  Floating: "./demos/floating.json",
  NewTimeline: "./demos/new-timeline.json",
  Bounce: "./demos/bounce.json",
} as const;

export type DemoName = keyof typeof DemoPaths;

/**
 * Cache of loaded demos as JSON just so we know if the current timeline is an exact demo or not. We can use that decide
 * if we need to confirm the overwrite or not (unchanged demos are OK to overwrite since we can always reload them).
 *
 * This would be better with a build plugin to generate checksums. That would take less mem and we could preload all the
 * checksums before any JSON loads were needed.
 *
 * We don't need to cache this for performance.
 */
const JsonCache: Map<DemoName, string> = new Map();

/**
 * Checks if the other JSON matches a loaded demo exactly.
 *
 * @param otherJson The JSON for the layers only to check.
 * @returns
 */
export function isJsonDemo(otherJson: string): boolean {
  for (const demoJson of JsonCache.values()) {
    if (demoJson === otherJson) return true;
  }

  return false;
}

/**
 * Loads a saved JSON demo at runtime. This avoids need to load them all if not used.
 *
 * @param demoName Name of a JSON demo file.
 * @returns Resolves to the saved JSON.
 */
export async function loadJsonDemo(demoName: DemoName): Promise<SavedDemo> {
  const path = DemoPaths[demoName];
  const module = await modules[path]();
  const saved = module.default as SavedDemo;

  if (!JsonCache.has(demoName)) {
    JsonCache.set(demoName, JSON.stringify(saved.layers));
  }
  return saved;
}
