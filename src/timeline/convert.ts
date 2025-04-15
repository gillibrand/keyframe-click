import { RealDot, Point, UserDot } from "./point";

// How many real px are required for a single user px
export const ScaleX = 9;
export const ScaleY = 2;

// Edges in real px that we inset the visible canvas. Allows for dots to appear to overflow the
// canvas a bit.
export const InsetX = 10;
export const InsetY = 10;

// Offset in real px in order for the 0,0 origin to it in a logical place for user dots.
export const OffsetX = 0 + InsetX;
export const OffsetY = 400 + InsetY;

export function asRealPoint(user: Point): Point {
  return { x: user.x * ScaleX + OffsetX, y: user.y * ScaleY * -1 + OffsetY };
}

export function asUserPoint(real: Point) {
  return { x: (real.x - OffsetX) / ScaleX, y: ((real.y - OffsetY) / ScaleY) * -1 };
}

export function asRealDot(user: UserDot): RealDot {
  return {
    space: "real",
    type: user.type,
    x: user.x * ScaleX + OffsetX,
    y: user.y * ScaleY * -1 + OffsetY,
    h1: asRealPoint(user.h1),
    h2: asRealPoint(user.h2),
  };
}

export function asUserDot(rd: RealDot): UserDot {
  return {
    ...rd,
    x: (rd.x - OffsetX) / ScaleX,
    y: ((rd.y - OffsetY) / ScaleY) * -1,
    space: "user",
    h1: asUserPoint(rd.h1),
    h2: asUserPoint(rd.h2),
  };
}

export function asUserX(x: number): number {
  return (x - OffsetX) / ScaleX;
}

export function asUserY(y: number): number {
  return ((y - OffsetY) / ScaleY) * -1;
}

export function asRealX(x: number): number {
  return x * ScaleX + OffsetX;
}

export function asRealY(y: number): number {
  return y * ScaleY * -1 + OffsetY;
}
