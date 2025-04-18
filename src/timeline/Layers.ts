import { Colors } from "@util/Colors";
import { asRealX, asUserPoint } from "./convert";
import { CssInfos, CssProp } from "./CssInfo";
import { findYForX, Point, RealDot } from "./point";

/**
 * A single animatable property and it's complete state. A timeline is built of multiple property layers to produce the
 * final animation.
 */
interface RealLayer {
  dots: RealDot[];

  // Inspector
  cssProp: CssProp;
  isFlipped: boolean;
  sampleCount: number;

  // transient
  samples: Point[] | null;
}

export type BackgroundLayer = Pick<RealLayer, "cssProp" | "dots">;
export type SampleLayer = Pick<RealLayer, "cssProp" | "isFlipped"> & { userSamples: Point[] };

const SaveStorageKey = "kc.layers";

function createDefaultLayer(): RealLayer {
  // TODO: default dots
  return {
    cssProp: "translateY",
    dots: [],
    isFlipped: true,
    sampleCount: 10,
    samples: null,
  };
}

function loadSavedRealLayers(): RealLayer[] {
  const json = localStorage.getItem(SaveStorageKey);
  if (!json) {
    return [createDefaultLayer()];
  }

  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn("Error loading saved data. Using defaults. " + e);
    return [createDefaultLayer()];
  }
}

export function loadSavedLayers(activeIndex: number = 0, onChange: () => void) {
  const layers = new Layers(loadSavedRealLayers(), onChange);
  layers.setActiveLayer(activeIndex);
  return layers;
}

// const defaultDots: UserDot[] = [
//   createSquare(0, 0),
//   { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
//   createRound(50, 10),
//   createSquare(75, 50),
//   createSquare(100, 0),
// ];

/**
 * Holds all data for the different layers of the timeline. Each layer is a separate CSS property with its own dots.
 * There is one active layer at a time which is what the user can drag around. All layers are used for output.
 */
export class Layers {
  private active = 0;

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
    if (this.active >= this.layers.length) {
      console.warn("active layer out of bound", this.active);
      return this.layers[0];
    }

    return this.layers[this.active];
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
        userSamples.push(asUserPoint(sample));
      }

      sampleLayers.push({
        cssProp: layer.cssProp,
        isFlipped: layer.isFlipped,
        userSamples,
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
  setActiveLayer(n: number) {
    this.active = Math.max(0, Math.min(n, this.layers.length - 1));
    this.purgeActiveSamples();
    this.onChange();
    return this.getActiveLayer();
  }

  addNewLayer(cssProp: CssProp) {
    this.layers.push({
      dots: [],
      cssProp,
      isFlipped: false,
      sampleCount: 10,
      samples: null,
    });
    this.onChange();
  }

  getNextLayerIndexAfterDelete(deleteLayerIndex: number) {
    const all = this.layers;
    // Require 1 tab at least
    if (all.length <= 1) return null;

    // Before we can delete, change the checked value to the next value
    // const index = layers.activeIndex;
    let next = all[deleteLayerIndex + 1];
    if (!next) next = all[deleteLayerIndex - 1] || null;

    return next;
  }

  deleteLayer(index: number) {
    // console.info(
    //   ">>> old layers",
    //   index,
    //   this.layers.map((l) => l.cssProp)
    // );

    this.layers.splice(index, 1);
    // console.info(
    //   ">>> new layers",
    //   this.layers.map((l) => l.cssProp)
    // );

    this.onChange();
  }

  setCssProp(prop: CssProp) {
    console.info(">>> SET CSS PROP", prop);
    this.getActiveLayer().cssProp = prop;

    this.onChange();
  }

  setSampleCount(count: number) {
    count = Math.max(2, Math.min(count, 100));
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
    return this.layers.filter((_, i) => i !== this.active);
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

  get activeIndex() {
    return this.active;
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

  const inc = 100 / (layer.sampleCount - 1);

  // We walk left to right over the entire user space. (Maybe calc real width and walk that?)
  for (let userX = 0; userX < 101; userX += inc) {
    if (userX > 100) userX = 100;
    const x = asRealX(userX);

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
  return samples;
}
