import clsx from "clsx";
import { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  className?: string;
}

/**
 * A hint is a small piece of text that provides additional information about a component or a
 * feature. It is typically displayed in a smaller font size and lighter color than the main text,
 * and is used to guide the user or provide context.
 *
 * If the hint is static text, pair with `useStatic` to prevent re-renders.
 */
export function Hint({ children, className }: Props) {
  return <div className={clsx("text-xs text-gray-500", className)}>{children}</div>;
}
