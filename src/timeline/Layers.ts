import { Colors } from "@util/Colors";
import { asRealX } from "./convert";
import { CssInfos, CssProp } from "./CssInfo";
import { findYForX, Point, RealDot } from "./point";

/**
 * A single animatable property and it's complete state. A timeline is built of multiple property
 * layers to produce the final animation.
 */
interface RealLayer {
  cssProp: CssProp;
  isFlipped: boolean;
  dots: RealDot[];

  sampleCount: number;

  // transient
  samples: Point[] | null;
}

export type BackgroundLayer = Pick<RealLayer, "cssProp" | "dots">;

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

export function loadSavedLayers(activeIndex: number = 0) {
  const layers = new Layers(loadSavedRealLayers());
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
 * Holds all data for the different layers of the timeline. Each layer is a separate CSS property
 * with its own dots. There is one active layer at a time which is what the user can drag around.
 * All layers are used for output.
 */
export class Layers {
  private active = 0;
  private layers: RealLayer[];

  constructor(layers: RealLayer[]) {
    console.assert(layers.length > 0);
    this.layers = layers;
    this.active = 0;
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

  getActiveDots() {
    return this.getActiveLayer().dots;
  }

  getSamples(): Point[] {
    const layer = this.getActiveLayer();
    return layer.samples ? layer.samples : cacheSamples(layer);
  }

  purgeActiveSamples() {
    this.getActiveLayer().samples = null;
  }

  /**
   * Updates the currently active layer. This affects what is currently being modified in the
   * timeline.
   *
   * @param n Index of layer to activate.
   * @returns The new active layer (whether is changed or not).
   */
  setActiveLayer(n: number) {
    this.active = Math.max(0, Math.min(n, this.layers.length - 1));
    this.purgeActiveSamples();
    return this.getActiveLayer();
  }

  setCssProp(prop: CssProp) {
    this.getActiveLayer().cssProp = prop;
  }

  setSampleCount(count: number) {
    count = Math.max(2, Math.min(count, 100));
    this.getActiveLayer().sampleCount = count;
    this.purgeActiveSamples();
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
  }

  getIsFlipped() {
    return this.getActiveLayer().isFlipped;
  }

  get activeIndex() {
    return this.active;
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

    const py = findYForX(x, x0, y0, x1, y1, x2, y2, x3, y3);

    if (py !== null) {
      const sample = { x: x, y: py };
      samples.push(sample);
    }
  }

  return samples;
}
