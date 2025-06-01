import { Saved } from "./demoTypes";

const modules = import.meta.glob("./demos/*.json") as Record<string, () => Promise<{ default: Saved }>>;

const DemoPaths = {
  BlackHole: "./demos/black-hole.json",
  CourseClear: "./demos/course-clear.json",
  Floating: "./demos/floating.json",
  NewTimeline: "./demos/new-timeline.json",
} as const;

export type DemoName = keyof typeof DemoPaths;

/**
 * Cache of loaded demos just so we know if the current file is a demo or not. We don't need to cache this for
 * performance.
 */
const JsonCache: Map<DemoName, string> = new Map();

export async function loadJsonDemo(demo: DemoName) {
  let json = JsonCache.get(demo);
  if (json) return json;

  const path = DemoPaths[demo];
  const module = await modules[path]();
  const saved = module.default as Saved;

  json = JSON.stringify(saved);

  JsonCache.set(demo, json);
  return json;
}
