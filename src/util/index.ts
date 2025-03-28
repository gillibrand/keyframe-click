import { Point } from "../timeline/point";

export function throttle<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
  let lastArgs: T | null = null;
  let lastTime = 0;
  let timeout = -1;

  function invoke() {
    if (lastArgs === null) return;
    fn(...lastArgs);
    timeout = -1;
  }

  return function (...args: T) {
    lastArgs = args;
    const now = Date.now();
    if (now - lastTime > delay) {
      invoke();
      lastTime = now;
    } else if (timeout === -1) {
      timeout = window.setTimeout(invoke, delay);
    }
  };
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number) {
  let timeout = -1;

  return (...args: Args): (() => void) => {
    clearTimeout(timeout);

    timeout = setTimeout(function callFromDebounce() {
      fn(...args);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
    };
  };
}

export function stopEvent(e: Event) {
  e.stopPropagation();
  e.preventDefault();
}

export function round2dp(n: number): number;
export function round2dp(p: Point): Point;
export function round2dp(p: Point | number): Point | number {
  if (typeof p === "number") {
    return Math.round(p * 100) / 100;
  } else {
    return {
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
    };
  }
}

export function round3dp(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function unreachable(value: never) {
  return new Error("unreachable value: " + value);
}
