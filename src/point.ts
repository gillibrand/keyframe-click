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
  return { type: "sharp", x, y, h1: { x: x - 50, y }, h2: { x: x + 50, y } };
}

function roundPoint(x: number, y: number): KeyPoint {
  return { type: "round", x, y, h1: { x: x - 50, y }, h2: { x: x + 50, y } };
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
