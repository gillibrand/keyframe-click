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
