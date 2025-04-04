import { ReactNode, useMemo } from "react";

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
