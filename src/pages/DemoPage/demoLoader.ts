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
const JsonCache: Map<DemoName, Saved> = new Map();

export async function loadJsonDemo(demo: DemoName) {
  let saved = JsonCache.get(demo);
  if (saved) return saved;

  const path = DemoPaths[demo];
  const module = await modules[path]();
  saved = module.default as Saved;

  //   json = JSON.stringify(saved);

  JsonCache.set(demo, saved);
  return saved;
}
