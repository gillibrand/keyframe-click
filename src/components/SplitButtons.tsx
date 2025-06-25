import { forwardRef, PropsWithChildren } from "react";
import "./SplitButtons.css";
import clsx from "clsx";

interface Props extends PropsWithChildren {
  className?: string;
}

/**
 * Buttons that are closely related to appear attached visually. To use, just add normal HTML
 * `button` as children. This effectively just styles them.
 */
export const SplitButtons = forwardRef<HTMLDivElement, Props>(function SplitButtons(
  { children, className },
  ref
) {
  return (
    <div className={clsx("SplitButtons flex flex-nowrap items-stretch", className)} ref={ref}>
      {children}
    </div>
  );
});
