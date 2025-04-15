import { asRealX } from "./convert";
import { findYForX, Point, RealDot } from "./point";

/**
 * A single animatable property and it's complete state. A timeline is built of multiple property
 * layers to produce the final animation.
 */
interface RealLayer {
  cssProp: string;
  isInvertValue: boolean;
  dots: RealDot[];

  sampleCount: number;

  // transient
  samples: Point[] | null;
}

export class Layers {
  private active = 0;
  private layers: RealLayer[];

  constructor(layers: RealLayer[]) {
    console.assert(layers.length > 0);
    this.layers = layers;
    this.active = 0;
  }

  private getActiveLayer() {
    if (this.active >= this.layers.length) {
      console.warn("active layer out of bound", this.active);
      return this.layers[0];
    }

    return this.layers[this.active];
  }

  getActiveDots() {
    return this.getActiveLayer().dots;
  }

  getActiveSamples() {
    const layer = this.getActiveLayer();
    if (!layer.samples) {
      computeSamples(layer);
    }

    return layer.samples;
  }

  purgeActiveSamples() {
    this.getActiveLayer().samples = null;
  }

  setActiveLayer(n: number) {
    this.active = Math.max(0, Math.min(n, this.layers.length - 1));
    this.purgeActiveSamples();
  }
}

/**
 * Clears and recomputes the samples for a layer. The layer is modified in place.
 *
 * @param layer Layer to update samples on from its current dots.
 */
function computeSamples(layer: RealLayer) {
  const dots = layer.dots;
  const samples: Point[] = (layer.samples = []);

  if (dots.length < 2) return;

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
}
