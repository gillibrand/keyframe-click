import { cx } from "@util/cx";
import { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  center?: boolean;
}

/**
 * A hint is a small piece of text that provides additional information about a component or a feature. It is typically
 * displayed in a smaller font size and lighter color than the main text, and is used to guide the user or provide
 * context.
 *
 * If the hint is static text, pair with `useStatic` to prevent re-renders.
 */
export function Hint({ children, center }: Props) {
  return <div className={cx("text-light text-x-small", { "text-center": center })}>{children}</div>;
}
