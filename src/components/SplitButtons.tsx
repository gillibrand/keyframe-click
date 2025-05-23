import { PropsWithChildren } from "react";
import "./SplitButtons.css";
import { cx } from "@util/cx";

interface Props extends PropsWithChildren {
  className?: string;
  ref?: React.RefObject<HTMLDivElement>;
}

/**
 * Buttons that are closely related to appear attached visually. To use, just add normal HTML `button` as children. This
 * effectively just styles them.
 */
export const SplitButtons = function SplitButtons({ ref, children, className }: Props) {
  return (
    <div className={cx("SplitButtons flex flex-nowrap items-stretch", className)} ref={ref}>
      {children}
    </div>
  );
};
