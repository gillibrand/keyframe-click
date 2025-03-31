import { describe, test, expect } from "vitest";
import { center } from "./drawing";

describe("drawing tests", () => {
  test("center to nearest .5", () => {
    expect(center(-0.1)).toBe(-0.5);
    expect(center(-0.5)).toBe(-0.5);
    expect(center(0)).toBe(0.5);
    expect(center(0.25)).toBe(0.5);
    expect(center(0.5)).toBe(0.5);
    expect(center(0.75)).toBe(0.5);
    expect(center(0.8)).toBe(0.5);
    expect(center(0.9)).toBe(0.5);
    expect(center(1)).toBe(1.5);
    expect(center(1.1)).toBe(1.5);
    expect(center(1.25)).toBe(1.5);
    expect(center(1.5)).toBe(1.5);
    expect(center(1.6)).toBe(1.5);
    expect(center(1.75)).toBe(1.5);
    expect(center(100)).toBe(100.5);
  });
});
