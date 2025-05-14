import { Point, RealDot, UserDot } from "./point";

/** How many real px are required for a single user px. */
let pxWidth = 9;

/** How many real px are required for a single user px. */
let pxHeight = 1.5;

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

/**
 * Sets the height of a user px in real px. This is used to convert between user and real space. This must be set any
 *
 * @param w Height in real px of a single user px.
 */
export function setUserPxHeight(w: number) {
  pxHeight = w;
}

// Edges in real px that we inset the visible canvas. Allows for dots to appear to overflow the
// canvas a bit.
export const InsetX = 10;
export const InsetY = 10;

const DefaultMaxY = 110;

let maxY = DefaultMaxY;

export function setMaxY(y: number) {
  maxY = y;
}

export function getMaxY() {
  return maxY;
}

export function getMinY() {
  return -maxY;
}

export function getYRange() {
  return 2 * maxY;
}

/**
 * Gets the change in the zoom level based on the current zoom level. When zoomed in, this is smaller.
 *
 * @param dir Which way we're zooming.
 * @returns The number to change the max/min-Y by.
 */
function getZoomChange(dir: "in" | "out") {
  const range = getYRange();

  if (dir === "in") {
    if (range <= 40) {
      return 0;
    } else if (range <= 120) {
      return 10;
    } else {
      return 50;
    }
  } else {
    if (range < 120) {
      return 10;
    } else if (range >= 2000) {
      return 0;
    } else {
      return 50;
    }
  }
}

export function zoomInY() {
  const zoomChange = getZoomChange("in");
  maxY -= zoomChange;
  return maxY;
}

export function zoomOutY() {
  const zoomChange = getZoomChange("out");
  maxY += zoomChange;
  return maxY;
}

// Offset in real px in order for the 0,0 origin to it in a logical place for user dots.
export const OffsetX = 0 + InsetX;

export function offsetY() {
  return maxY * pxHeight + InsetY;
}

export function asRealPoint(user: Point): Point {
  return { x: user.x * pxWidth + OffsetX, y: user.y * pxHeight * -1 + offsetY() };
}

export function asUserPoint(real: Point) {
  return { x: (real.x - OffsetX) / pxWidth, y: ((real.y - offsetY()) / pxHeight) * -1 };
}

export function asRealDot(user: UserDot): RealDot {
  return {
    space: "real",
    type: user.type,
    x: user.x * pxWidth + OffsetX,
    y: user.y * pxHeight * -1 + offsetY(),
    h1: asRealPoint(user.h1),
    h2: asRealPoint(user.h2),
  };
}

export function asUserDot(rd: RealDot): UserDot {
  return {
    ...rd,
    x: (rd.x - OffsetX) / pxWidth,
    y: ((rd.y - offsetY()) / pxHeight) * -1,
    space: "user",
    h1: asUserPoint(rd.h1),
    h2: asUserPoint(rd.h2),
  };
}

export function asUserX(x: number): number {
  return (x - OffsetX) / pxWidth;
}

export function asUserY(y: number): number {
  return ((y - offsetY()) / pxHeight) * -1;
}

export function asRealX(x: number): number {
  return x * pxWidth + OffsetX;
}

export function asRealY(y: number): number {
  return y * pxHeight * -1 + offsetY();
}
