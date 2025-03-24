interface Point {
  x: number;
  y: number;
}

type KeyPointType = "sharp" | "round";

interface KeyPoint extends Point {
  type: KeyPointType;
  h1: Point;
  h2: Point;
}

function sharpPoint(x: number, y: number): KeyPoint {
  return { type: "sharp", x, y, h1: { x: x - 10, y }, h2: { x: x + 10, y } };
}

function roundPoint(x: number, y: number): KeyPoint {
  return { type: "round", x, y, h1: { x: x - 10, y }, h2: { x: x + 10, y } };
}

function diffPt(p1: Point, p2: Point) {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}
function nearPt(p: Point, x: number, y: number, minDistance: number = 8) {
  const dx = x - p.x;
  const dy = y - p.y;
  return dx * dx + dy * dy < minDistance * minDistance;
}

function toggleType(p: KeyPoint) {
  p.type = p.type === "sharp" ? "round" : "sharp";
}

export type { Point, KeyPoint, KeyPointType };
export { sharpPoint, roundPoint, diffPt, nearPt, toggleType };

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3;
}

function cubicBezierDerivative(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return 3 * mt ** 2 * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t ** 2 * (p3 - p2);
}

export function findYForX(x: number, curves: KeyPoint[], tolerance = 1e-6, maxIterations = 100) {
  for (let i = 1; i < curves.length - 1; i++) {
    const pp = curves[i - 1];
    const p = curves[i];

    const [x0, y0] = [pp.x, pp.y];
    const [x1, y1] = [p.h1.x, p.h1.y];
    const [x2, y2] = [p.h2.x, p.h2.y];
    const [x3, y3] = [p.x, p.y];

    if (x < x0 || x > x3) continue; // Skip if not in this curve range

    // Initial guess using linear interpolation
    let t = (x - x0) / (x3 - x0);

    for (let i = 0; i < maxIterations; i++) {
      const currentX = cubicBezier(t, x0, x1, x2, x3);
      const error = currentX - x;

      if (Math.abs(error) < tolerance) {
        return cubicBezier(t, y0, y1, y2, y3); // Return the y value
      }

      const derivative = cubicBezierDerivative(t, x0, x1, x2, x3);
      if (Math.abs(derivative) < tolerance) break; // Prevent division by zero

      t -= error / derivative;
      t = Math.max(0, Math.min(1, t)); // Keep t within bounds
    }
  }

  throw new Error("x value out of bounds or no solution found");
}
