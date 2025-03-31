import { Point } from "./point";

export const Black = "black";
export const Red = "red";
export const Gray900 = "oklch(0.21 0.034 264.665)";
export const Gray600 = "oklch(0.446 0.03 256.802)";
export const Gray500 = "oklch(0.551 0.027 264.364)";
export const Gray400 = "oklch(0.704 0.04 256.788)";
export const Gray300 = "oklch(0.872 0.01 258.338)";
export const Gray200 = "oklch(0.928 0.006 264.531)";
export const Gray100 = "oklch(0.967 0.003 264.542)";
export const Gray50 = "oklch(0.985 0.002 247.839)";
export const LightGray = "#eee";
export const White = "white";
export const Blue = "#1c7ef3";

/**
 * Rounds a number to the nearest .5. This is used in drawing to ensure lines are drawn centered in
 * pixels to they are crisper.
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
  const l = 4;
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

  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

export function bullsEye(p: Point, ctx: CanvasRenderingContext2D) {
  willDraw(ctx, () => {
    const x = center(p.x);
    const y = center(p.y);
    ctx.fillStyle = White;
    ctx.strokeStyle = Black;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = Blue;
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
