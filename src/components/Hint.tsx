import { memo, PropsWithChildren } from "react";

/**
 * A hint is a small piece of text that provides additional information about a component or a feature. It is typically
 * displayed in a smaller font size and lighter color than the main text, and is used to guide the user or provide
 * context.
 *
 * If the hint is static text, pair with `useStatic` to prevent re-renders.
 */
export const Hint = memo(function Hint({ children }: PropsWithChildren) {
  return <div className="text-light text-x-small">{children}</div>;
});
