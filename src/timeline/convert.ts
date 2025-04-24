import { Point, RealDot, UserDot } from "./point";

/** How many real px are required for a single user px. */
let pxWidth = 9;

/** How many real px are required for a single user px. */
export const PxHeight = 2;

/**
 * Sets the width of a user px in real px. This is used to convert between user and real space. This must be set any
 * time the canvas width changes. We essentially want 100 user px to be the same as the width of the canvas so that it
 * stretches from 0 to 100 over time.
 *
 * @param w Width in real px of a single user px.
 */
export function setUserPxWidth(w: number) {
  pxWidth = w;
}

// Edges in real px that we inset the visible canvas. Allows for dots to appear to overflow the
// canvas a bit.
export const InsetX = 0;
export const InsetY = 0;

// Offset in real px in order for the 0,0 origin to it in a logical place for user dots.
export const OffsetX = 0 + InsetX;
export const OffsetY = 400 + InsetY;

export function asRealPoint(user: Point): Point {
  return { x: user.x * pxWidth + OffsetX, y: user.y * PxHeight * -1 + OffsetY };
}

export function asUserPoint(real: Point) {
  return { x: (real.x - OffsetX) / pxWidth, y: ((real.y - OffsetY) / PxHeight) * -1 };
}

export function asRealDot(user: UserDot): RealDot {
  return {
    space: "real",
    type: user.type,
    x: user.x * pxWidth + OffsetX,
    y: user.y * PxHeight * -1 + OffsetY,
    h1: asRealPoint(user.h1),
    h2: asRealPoint(user.h2),
  };
}

export function asUserDot(rd: RealDot): UserDot {
  return {
    ...rd,
    x: (rd.x - OffsetX) / pxWidth,
    y: ((rd.y - OffsetY) / PxHeight) * -1,
    space: "user",
    h1: asUserPoint(rd.h1),
    h2: asUserPoint(rd.h2),
  };
}

export function asUserX(x: number): number {
  return (x - OffsetX) / pxWidth;
}

export function asUserY(y: number): number {
  return ((y - OffsetY) / PxHeight) * -1;
}

export function asRealX(x: number): number {
  return x * pxWidth + OffsetX;
}

export function asRealY(y: number): number {
  return y * PxHeight * -1 + OffsetY;
}
