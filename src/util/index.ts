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

export function nullFn(): void {}

/**
 * Type guard to check if a node is a full DOM element.
 * @param node Node to check.
 * @returns True if it's an HTML element.
 */
export function isEl(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || getComputedStyle(el).visibility !== "hidden";
}

export function getFirstFocusableElement(parent: HTMLElement, andFocus: boolean = false): HTMLElement | null {
  const focusableSelectors = [
    "a[href]",
    "area[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "iframe",
    "object",
    "embed",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
  ];

  const focusable = parent.querySelectorAll<HTMLElement>(focusableSelectors.join(","));
  const firstVisible = Array.from(focusable).find((el) => isVisible(el)) || null;
  if (firstVisible && andFocus) firstVisible.focus();
  return firstVisible;
}
