import { Callback } from "@util";
import {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

/**
 * A custom hook that returns a memoized value that never changes. This is useful for preventing unnecessary re-renders
 * when the value is static.
 *
 * @example
 *   const memoizedValue = useStable(value);
 *
 * @param value - The value to be memoized.
 * @returns The memoized value.
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
 * Tracks the latest value (usually state) given to this hook and returns a function to get that value later. This is to
 * work around closures that might have old state values. By wrapping the latest value, even stale closures can call the
 * getter this returns to get the latest value the component was rendered with.
 *
 * Normally, you should keep closures fresh with correct dependency lists, but with some async code you might see state
 * be updated during an `await`. In that case, using the getter method will ensure you can access the current state even
 * after wait.
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
 * Used to force a render by using some dummy state. This is needed if some non-reactive state is changed but we still
 * want to perform a render against that state. This is just an opaque piece of reactive state.
 *
 * @returns A tuple of some state that can be used as a dependency, and a function that can be used to change that state
 *   and force a render of the current component.
 */
export function useForceRender() {
  return useReducer((old: number) => {
    return old + 1;
  }, 0) as [unknown, () => void];
}

/**
 * A hook that returns a globally identifier. This can be useful for IDs or radio group names that need to be unique,
 * but aren't shown to the user.
 *
 * @returns A unique identifier as a string.
 */
export function useUuid() {
  const uuid = useRef<string>();
  if (!uuid.current) {
    uuid.current = crypto.randomUUID();
  }
  return uuid.current;
}

function isSetStateFunction<T>(fn: React.SetStateAction<T>): fn is (prevState: T) => T {
  return typeof fn === "function";
}

/**
 * Creates state that you can inspect at any time without needing to add the getter as a dependency.
 *
 * @param initial Initial value.
 * @returns A getter and a setter. When the setter is called it will force a render like normal state. The getter can be
 *   called inside `useEffect` and similar without needing to be a dependency (or add it, but it won't change later--it
 *   is a stable function).
 */
export function useLiveState<T>(initialState: T | (() => T)) {
  const [value, setValue] = useState(initialState);
  const valueRef = useRef<T>(value);

  const setValueAndRef: Dispatch<SetStateAction<T>> = useCallback((valueOrCallback) => {
    setValue((prevValue) => {
      let newValue: T;
      if (isSetStateFunction(valueOrCallback)) {
        newValue = valueOrCallback(prevValue);
      } else {
        newValue = valueOrCallback;
      }

      valueRef.current = newValue;
      return newValue;
    });
  }, []);

  const getValue = useCallback(() => {
    return valueRef.current;
  }, []);

  return [getValue, setValueAndRef] as const;
}

/**
 * Merges multiple refs into a single on. This is needed since a component can only accept a single ref, but different
 * hooks might all need their own. This lets you gather all the refs you need and just pass the merged ref into a
 * component and get them all updated.
 *
 * @param refs Refs to merge.
 * @returns A single ref that wil update all the given refs.
 */
export function useMergeRefs<T>(...refs: React.Ref<T>[]): React.RefCallback<T> {
  return useCallback((value: T) => {
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (typeof ref === "function") {
        ref(value);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<T>).current = value;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

/**
 * Used to install a callback that will fire once if an element is hovered over long enough. This is used to preload
 * data when hovering over demo buttons Returns the React event handlers to spread into you element.
 *
 * @param callback Callback to fire once after the hover delay.
 * @param delayMillis How long to wait before firing.
 * @returns Event listener to spread into an element that want to listen for a hover.
 */
export function useHoverSoon(callback: Callback, delayMillis: number = 500) {
  const timerRef = useRef<number | null>(-1);

  return useMemo(() => {
    function onMouseEnter() {
      if (timerRef.current === null) return;
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        callback();
        timerRef.current = null;
      }, delayMillis);
    }

    function onMouseLeave() {
      if (timerRef.current === null) return;

      clearTimeout(timerRef.current);
    }

    return {
      onMouseEnter,
      onMouseLeave,
    } as const;
  }, [callback, delayMillis]);
}
