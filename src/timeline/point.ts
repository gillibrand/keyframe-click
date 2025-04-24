interface Point {
  x: number;
  y: number;
}

type DotType = "square" | "round";
type DotSpace = "real" | "user";

interface BaseDot extends Point {
  space: DotSpace;
  type: DotType;
  h1: Point;
  h2: Point;
}

export interface RealDot extends BaseDot {
  space: "real";
}

export interface UserDot extends BaseDot {
  space: "user";
}

export function createSquare(x: number, y: number): UserDot {
  return { type: "square", x, y, h1: { x: x - 10, y }, h2: { x: x + 10, y }, space: "user" };
}

export function createRound(x: number, y: number): UserDot {
  return { type: "round", x, y, h1: { x: x - 10, y }, h2: { x: x + 10, y }, space: "user" };
}

export function diffPt(p1: Point, p2: Point) {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function nearPt(p: Point, x: number, y: number, minDistance: number = 8) {
  const dx = x - p.x;
  const dy = y - p.y;
  return dx * dx + dy * dy < minDistance * minDistance;
}

export function roundPt(p: Point) {
  p.x = Math.round(p.x);
  p.y = Math.round(p.y);
}

/**
 * Modify the point position and the handle positions to match. Updates in place.
 *
 * @param d Dot to update.
 * @param x New x in user space.
 * @param y New y in user space.
 */
export function moveDot(d: UserDot, x: number, y: number) {
  const diffPt = { x: d.x - x, y: d.y - y };
  d.x = x;
  d.y = y;

  d.h1.x -= diffPt.x;
  d.h1.y -= diffPt.y;
  d.h2.x -= diffPt.x;
  d.h2.y -= diffPt.y;
}

export function togglePt(p: BaseDot) {
  p.type = p.type === "square" ? "round" : "square";
}

export type { Point, BaseDot, DotType };

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3;
}

function cubicBezierDerivative(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return 3 * mt ** 2 * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t ** 2 * (p3 - p2);
}

export function findYForX(
  xTarget: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tolerance = 1e-3,
  maxIterations = 100
) {
  // Initial guess using linear interpolation
  let t = (xTarget - x0) / (x3 - x0);
  t = Math.max(0, Math.min(1, t)); // Keep t between 0 and 1

  for (let i = 0; i < maxIterations; i++) {
    const x = cubicBezier(t, x0, x1, x2, x3);
    const error = x - xTarget;

    if (Math.abs(error) < tolerance) {
      return cubicBezier(t, y0, y1, y2, y3);
    }

    const derivative = cubicBezierDerivative(t, x0, x1, x2, x3);
    if (Math.abs(derivative) < tolerance) break; // Avoid dividing by zero

    // Newton's method update
    t -= error / derivative;
    t = Math.max(0, Math.min(1, t)); // Clamp t to [0,1]
  }

  // This is normal if point don't fully 100% cover the width.
  return null;
}

export function findYForXInCurve(x: number, curves: UserDot[], tolerance = 1e-6, maxIterations = 100) {
  let i = 0;
  let j = 0;
  for (i = 1; i < curves.length; i++) {
    const pp = curves[i - 1];
    const p = curves[i];

    const [x0, y0] = [pp.x, pp.y];
    const [x1, y1] = pp.type === "square" ? [pp.x, pp.y] : [pp.h2.x, pp.h2.y];
    const [x2, y2] = p.type === "square" ? [p.x, p.y] : [p.h1.x, p.h1.y];
    const [x3, y3] = [p.x, p.y];

    if (x < x0 || x > x3) {
      continue; // Skip if not in this curve range
    }

    // Initial guess using linear interpolation
    let t = (x - x0) / (x3 - x0);

    for (j = 0; j < maxIterations; j++) {
      const currentX = cubicBezier(t, x0, x1, x2, x3);
      const error = currentX - x;

      if (Math.abs(error) < tolerance) {
        return cubicBezier(t, y0, y1, y2, y3); // Return the y value
      }

      const derivative = cubicBezierDerivative(t, x0, x1, x2, x3);
      if (Math.abs(derivative) < tolerance) {
        break; // Prevent division by zero
      }

      t -= error / derivative;
      t = Math.max(0, Math.min(1, t));
    }
  }

  // This is normal if point don't fully 100% cover the width.
  return null;
}
