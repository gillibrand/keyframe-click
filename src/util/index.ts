import { Point } from "@timeline/point";

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

export function stopEvent(e: React.UIEvent | Event | React.FormEvent) {
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

export type Callback = () => unknown;

export function nullFn(): void {}

/**
 * Type guard to check if a node is a full DOM element.
 *
 * @param node Node to check.
 * @returns True if it's an HTML element.
 */
export function isEl(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

/**
 * Gets a value from the map, or sets and return an initial value if the key is not already set.
 *
 * @param map Map to get value from.
 * @param key Key to get.
 * @param dflt Default value to add to map and return if the key is not present.
 * @returns The existing value at key or the default value.
 */
export function getOrInit<K, V>(map: Map<K, V>, key: K, dflt: V) {
  const value = map.get(key);
  if (value !== undefined) return value;

  map.set(key, dflt);
  return dflt;
}

/** @returns True if the app is running in development mode. Otherwise this is production. */
export const isDevMode = import.meta.env.MODE === "development"; // This is specific to Vite.

/**
 * Checks if the element natively handles space bar events. This is used to ignore space bar events
 * on elements that natively handle them, like input, textarea, and select elements instead of
 * handling them with global handlers. This is more elements than just a `isKeyboardHandler`.
 *
 * @param el Element to check.
 * @returns True if the element is a space bar handler. This is true for input, textarea, and select
 *   elements. This is used to check if the element is a space bar handler, so that we can prevent
 *   the default behavior of
 */
export function isSpaceBarHandler(el: HTMLElement | EventTarget | null): boolean {
  if (!isEl(el)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.tagName === "BUTTON"
  );
}

/**
 * Checks if the element natively handles keyboard events. This is used to ignore keyboard events on
 * elements that natively handle them, like input, textarea, and select elements instead of handling
 * them with global handlers.
 *
 * @param el Element to check.
 * @returns True if the element is a keyboard handler. This is true for input, textarea, and select
 *   elements. This is used to check if the element is a keyboard handler, so that we can prevent
 *   the default behavior of
 */
export function isKeyboardHandler(el: HTMLElement | EventTarget | null): boolean {
  if (!isEl(el)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

/** @returns True if the current platform is a Mac. This is based on the navigator.platform value. */
export const isMac =
  typeof navigator === "undefined"
    ? true
    : typeof navigator.platform !== "string"
      ? true
      : navigator.platform.toUpperCase().indexOf("MAC") >= 0;

let nextId = 1;

export function randomId() {
  // This is really just for testing without https, which is not normal or safe
  return crypto.randomUUID ? crypto.randomUUID() : Math.random() + ":" + nextId++ + Date.now();
}

const IsTest = typeof window === "undefined";
export const IsTouch = !IsTest && "ontouchstart" in window;
