import { MutableRefObject, ReactNode, useCallback, useMemo, useReducer, useRef } from "react";

/**
 * A custom hook that returns a memoized value that never changes. This is useful for preventing
 * unnecessary re-renders when the value is static.
 *
 * @param value - The value to be memoized.
 * @returns The memoized value.
 *
 * @example
 * const memoizedValue = useStable(value);
 */
export function useStable(value: ReactNode) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, []);
}

/**
 * `useRef` but the initial value comes from the init function.
 *
 * @param init Function to create the initial value.
 * @returns A defined ref with the initial value the first time, or whatever value has been set.
 */
export function useInitedRef<T>(init: () => T) {
  const ref = useRef<T>();

  if (ref.current === undefined) {
    ref.current = init();
  }

  return ref as MutableRefObject<T>;
}

/**
 * Tracks the latest value (usually state) given to this hook and returns a function to get that
 * value later. This is to work around closures that might have old state values. By wrapping the
 * latest value, even stale closures can call the getter this returns to get the latest value the
 * component was rendered with.
 *
 * Normally, you should keep closures fresh with correct dependency lists, but with some async code
 * you might see state  be updated during an `await`. In that case, using the getter method will
 * ensure you can access the current state even after wait.
 *
 * @param value The latest value to save and return from the getter.
 * @returns A getter function that returns the most recent value.
 */
export function useGetter<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;

  return useCallback(function getValue() {
    return ref.current;
  }, []);
}

/**
 * Used to force a render by using some dummy state. This is needed if some non-reactive state is
 * changed but we still want to perform a render against that state. This is just an opaque piece of
 * reactive state.
 *
 * @returns A tuple of some state that can be used as a dependency, and a function that can be used
 * to change that state and force a render of the current component.
 */
export function useForceRender() {
  return useReducer((old: number) => {
    return old + 1;
  }, 0) as [unknown, () => void];
}
