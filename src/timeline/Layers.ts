import { Colors } from "@util/Colors";
import { CssInfos, CssProp } from "./CssInfo";
import { findYForX, Point, UserDot } from "./point";

export type Unit = "px" | "%";

/**
 * A single animatable property and it's complete state. A timeline is built of multiple property layers to produce the
 * final animation.
 */
interface RealLayer {
  id: string;
  dots: UserDot[];

  // Inspector
  cssProp: CssProp;
  units: Unit;
  isFlipped: boolean;
  sampleCount: number;

  // transient
  samples: Point[] | null;
}

export type BackgroundLayer = Pick<RealLayer, "cssProp" | "dots">;
export type SampleLayer = Pick<RealLayer, "cssProp" | "isFlipped" | "units"> & { userSamples: Point[] };

const SaveStorageKey = "kc.layers";

function createDefaultLayer(): RealLayer {
  return {
    cssProp: "translateX",
    dots: createDefaultDots(),
    isFlipped: false,
    sampleCount: 0,
    samples: null,
    id: newId(),
    units: "%",
  };
}

function loadSavedRealLayers(): RealLayer[] {
  const json = localStorage.getItem(SaveStorageKey);

  if (!json) {
    return [createDefaultLayer()];
  }

  try {
    const layers = JSON.parse(json) as RealLayer[];
    return layers;
  } catch (e) {
    console.warn("Error loading saved data. Using defaults. " + e);
    return [createDefaultLayer()];
  }
}

/**
 * @returns A new ID for a layer. This is a UUID. We need a unique ID to use as their React keys when rendered as tabs
 *   since the CSS prop can change over time. The ID is what is used to track the active layer/tab so that it's stable
 *   during a delete (unlike the index).
 */
function newId() {
  return crypto.randomUUID();
}

function createDefaultDots(): UserDot[] {
  return [
    {
      space: "user",
      x: 0,
      y: 0,
      h1: { x: -10, y: 0 },
      h2: { x: 10, y: 0 },
      type: "square",
    },
    {
      space: "user",
      x: 100,
      y: 100,
      h1: { x: 90, y: 100 },
      h2: { x: 110, y: 100 },
      type: "square",
    },
  ];
}

export function loadSavedLayers(activeLayerId: string, onChange: () => void) {
  const layers = new Layers(loadSavedRealLayers(), onChange);
  // todo
  layers.setActiveLayer(activeLayerId);
  return layers;
}

/**
 * @param name CSS prop to check.
 * @param units The units we want to use with it--possibly saved with an old layer--but we need to check if it's
 *   allowed.
 * @returns Percent if the prop only support percentage values (or unitless, which are basically percentages anyway).
 *   Otherwise, just the same as teh given unit.
 */
function normalizeUnits(name: CssProp, units: Unit) {
  return CssInfos[name].supportsPx ? units : "%";
}
/**
 * Holds all data for the different layers of the timeline. Each layer is a separate CSS property with its own dots.
 * There is one active layer at a time which is what the user can drag around. All layers are used for output.
 */
export class Layers {
  private activeId = "";

  constructor(
    private layers: RealLayer[],
    private onChange: () => void
  ) {
    console.assert(layers.length > 0);
  }

  save() {
    const slimLayers = this.layers.map((l) => {
      const slim = { ...l };
      slim.samples = null;
      return slim;
    });
    localStorage.setItem(SaveStorageKey, JSON.stringify(slimLayers));
  }

  getActiveLayer() {
    if (this.activeId) {
      const i = this.layers.findIndex((layer) => layer.id === this.activeId);
      if (i !== -1) {
        return this.layers[i];
      }
    }

    return this.layers[0];
  }

  getDots() {
    return this.getActiveLayer().dots;
  }

  getSamples(): Point[] {
    const layer = this.getActiveLayer();
    return layer.samples ? layer.samples : cacheSamples(layer);
  }

  /**
   * Return samples for all layers mapped into user space, which is needed for outputting to keyframes. In user space, x
   * goes from 0 to 100 like a percentage.
   *
   * While this can used cached samples, to does need to convert to user space coordinates on each call so has some
   * performance cost. (TODO: it might be worth caching the user space samples too since they never change in background
   * layers.)
   *
   * @returns The samples for all layers in user space.
   */
  getAllUserSamples(): SampleLayer[] {
    const sampleLayers: SampleLayer[] = [];

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];

      const userSamples: Point[] = [];
      const samples = layer.samples || cacheSamples(layer);

      for (let j = 0; j < samples.length; j++) {
        const sample = samples[j];
        userSamples.push(sample);
      }

      sampleLayers.push({
        cssProp: layer.cssProp,
        isFlipped: layer.isFlipped,
        userSamples,
        units: normalizeUnits(layer.cssProp, layer.units),
      });
    }

    return sampleLayers;
  }

  purgeActiveSamples() {
    this.getActiveLayer().samples = null;
  }

  /**
   * Updates the currently active layer. This affects what is currently being modified in the timeline.
   *
   * @param n Index of layer to activate.
   * @returns The new active layer (whether is changed or not).
   */
  setActiveLayer(id: string) {
    this.activeId = id;
    this.purgeActiveSamples();
    this.onChange();
    return this.getActiveLayer();
  }

  /** Sets the active layer to the next one in the list. This is used for keyboard navigation. */
  nextLayer() {
    const i = this.findLayerIndex(this.activeId);
    if (i === null) return;

    const next = this.layers[i + 1];
    if (next) this.setActiveLayer(next.id);
  }

  /** Sets the active layer to the previous one in the list. This is used for keyboard navigation. */
  prevLayer() {
    const i = this.findLayerIndex(this.activeId);
    if (i === null) return;
    const prev = this.layers[i - 1];
    if (prev) this.setActiveLayer(prev.id);
  }

  /**
   * Adds a new layer to the timeline.
   *
   * @param cssProp The CSS property to use for the new layer. There should be at most one layer per CSS property.
   */
  addNewLayer(cssProp: CssProp) {
    const id = newId();
    this.layers.push({
      dots: createDefaultDots(),
      cssProp,
      isFlipped: false,
      sampleCount: 0,
      samples: null,
      id: id,
      units: "%",
    });
    this.activeId = id;
    this.onChange();
  }

  private findLayerIndex(id: string) {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === -1) {
      console.info("Layer not found", id);
      return null;
    }
    return index;
  }

  getNextLayerAfterDelete(deleteId: string) {
    const all = this.layers;
    // Require 1 tab at least
    if (all.length <= 1) return null;

    const i = this.findLayerIndex(deleteId);

    if (i === null) {
      return null;
    } else {
      let next = this.layers[i + 1];
      if (!next) next = this.layers[i - 1];
      return next;
    }
  }

  deleteLayer(id: string) {
    const next = this.getNextLayerAfterDelete(id);
    if (next !== null) this.setActiveLayer(next.id);

    const i = this.findLayerIndex(id);
    if (i === null) return;

    this.layers.splice(i, 1);
    this.onChange();
  }

  setCssProp(prop: CssProp) {
    this.getActiveLayer().cssProp = prop;
    this.onChange();
  }

  setUnits(units: Unit) {
    const layer = this.getActiveLayer();
    if (!CssInfos[layer.cssProp].supportsPx) units = "%";

    layer.units = units;
    this.onChange();
  }

  getUnits() {
    const layer = this.getActiveLayer();
    return normalizeUnits(layer.cssProp, layer.units);
  }

  setSampleCount(count: number) {
    count = Math.max(0, Math.min(count, 100));
    this.getActiveLayer().sampleCount = count;
    this.purgeActiveSamples();

    this.onChange();
  }

  getSampleCount() {
    return this.getActiveLayer().sampleCount;
  }

  getColor() {
    const layer = this.getActiveLayer();
    return CssInfos[layer.cssProp].color || Colors.Gray400;
  }

  getBackgroundLayers(): BackgroundLayer[] {
    return this.layers.filter((layer) => layer.id !== this.activeId);
  }

  getAll(): RealLayer[] {
    return this.layers;
  }

  getCssPropForLayer(index: number) {
    return this.layers[index].cssProp;
  }

  getCssProp() {
    return this.getActiveLayer().cssProp;
  }

  setIsFlipped(value: boolean) {
    this.getActiveLayer().isFlipped = value;
    this.onChange();
  }

  getIsFlipped() {
    return this.getActiveLayer().isFlipped;
  }

  get activeLayerId() {
    return this.activeId;
  }

  get size() {
    return this.layers.length;
  }
}

/**
 * Clears and recomputes the samples for a layer. The layer is modified in place.
 *
 * @param layer Layer to update samples on from its current dots.
 */
function cacheSamples(layer: RealLayer) {
  const dots = layer.dots;
  const samples: Point[] = (layer.samples = []);

  if (dots.length < 2) return samples;

  let dotIndex = 1;

  let a = dots[dotIndex - 1];
  let b = dots[dotIndex];

  for (const dot of dots) {
    samples.push({ x: dot.x, y: dot.y });
  }

  if (layer.sampleCount <= 0) return samples;

  const inc = 100 / (layer.sampleCount + 1);

  // We walk left to right over the entire user space. (Maybe calc real width and walk that?)
  for (let i = 1; i < layer.sampleCount + 1; i++) {
    const x = i * inc;

    if (x < a.x) {
      // Haven't hit a curve yet, so skip this dot
      continue;
    }

    while (x > b.x) {
      // Keep moving to next curve segment until contains the point
      if (dotIndex++ >= dots.length - 1) break;
      a = dots[dotIndex - 1];
      b = dots[dotIndex];
    }

    const [x0, y0] = [a.x, a.y];
    const [x1, y1] = a.type === "square" ? [a.x, a.y] : [a.h2.x, a.h2.y];
    const [x2, y2] = b.type === "square" ? [b.x, b.y] : [b.h1.x, b.h1.y];
    const [x3, y3] = [b.x, b.y];

    const y = findYForX(x, x0, y0, x1, y1, x2, y2, x3, y3);

    if (y !== null) {
      const sample = { x, y };
      samples.push(sample);
    }
  }

  // sort these since the real samples are not in order with the dot positions. I thought this was
  // needed so draw the samples in order right, but it doesn't seem to matter. Are we sorting these
  // later? Maybe investigate, but not a big deal.
  samples.sort((a, b) => a.x - b.x);

  return samples;
}
