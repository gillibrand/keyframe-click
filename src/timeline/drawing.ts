import { Colors } from "@util/Colors";
import { Point } from "./point";

/**
 * Rounds a number to the nearest .5. This is used in drawing to ensure lines are drawn centered in pixels to they are
 * crisper.
 *
 * @param n Any number.
 * @returns Closest .5 number to n.
 */
export function center(n: number) {
  return Math.round(n + 0.5) + -0.5;
}

export function dot(p: Point, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
  ctx.fill();
}

export function ex(p: Point, c: CanvasRenderingContext2D) {
  c.beginPath();
  const l = 5;
  c.moveTo(p.x - l, p.y - l);
  c.lineTo(p.x + l, p.y + l);
  c.moveTo(p.x - l, p.y + l);
  c.lineTo(p.x + l, p.y - l);
  c.stroke();
}

export function dash(p: Point, c: CanvasRenderingContext2D) {
  c.beginPath();
  const l = 12;
  const x = center(p.x);
  const y = center(p.y);
  c.moveTo(x - l, y);
  c.lineTo(x + l, y);
  c.stroke();
}
export function circle(p: Point, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  const x = center(p.x);
  const y = center(p.y);

  ctx.arc(x, y, 7, 0, 2 * Math.PI);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function bullsEye(p: Point, focused: boolean, ctx: CanvasRenderingContext2D) {
  willDraw(ctx, () => {
    const x = center(p.x);
    const y = center(p.y);
    ctx.fillStyle = Colors.White;
    ctx.strokeStyle = Colors.Black;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = focused ? Colors.Blue : Colors.Gray400;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}

export function diamond(p: Point, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  const x = center(p.x);
  const y = center(p.y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 5, y);
  ctx.closePath();
  ctx.fill();
}

export function willDraw(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save();
  try {
    fn();
  } finally {
    ctx.restore();
  }
}
