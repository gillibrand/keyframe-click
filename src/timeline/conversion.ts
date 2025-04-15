import { PhysDot, Point, UserDot } from "./point";

export const ScaleX = 9;
export const ScaleY = 2;
export const InsetX = 10;
export const InsetY = 10;
export const OffsetX = 0 + InsetX;
export const OffsetY = 400 + InsetY;

export function asPhysPoint(user: Point): Point {
  return { x: user.x * ScaleX + OffsetX, y: user.y * ScaleY * -1 + OffsetY };
}

export function asUserPoint(pd: Point) {
  return { x: (pd.x - OffsetX) / ScaleX, y: ((pd.y - OffsetY) / ScaleY) * -1 };
}

export function asPhysDot(user: UserDot): PhysDot {
  return {
    space: "physical",
    type: user.type,
    x: user.x * ScaleX + OffsetX,
    y: user.y * ScaleY * -1 + OffsetY,
    h1: asPhysPoint(user.h1),
    h2: asPhysPoint(user.h2),
  };
}

export function asUserDot(pd: PhysDot): UserDot {
  return {
    ...pd,
    x: (pd.x - OffsetX) / ScaleX,
    y: ((pd.y - OffsetY) / ScaleY) * -1,
    space: "user",
    h1: asUserPoint(pd.h1),
    h2: asUserPoint(pd.h2),
  };
}

export function asUserX(x: number): number {
  return (x - OffsetX) / ScaleX;
}

export function asUserY(y: number): number {
  return ((y - OffsetY) / ScaleY) * -1;
}

export function asPhysX(x: number): number {
  return x * ScaleX + OffsetX;
}

export function asPhysY(y: number): number {
  return y * ScaleY * -1 + OffsetY;
}
