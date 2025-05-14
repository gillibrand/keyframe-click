import { PropsWithChildren } from "react";
import "./SplitButtons.css";
import { cx } from "@util/cx";

interface Props extends PropsWithChildren {
  className?: string;
}

/**
 * Buttons that are closely related to appear attached visually. To use, just add normal HTML `button` as children. This
 * effectively just styles them.
 */
export function SplitButtons({ children, className }: Props) {
  return <div className={cx("SplitButtons flex flex-nowrap items-stretch", className)}>{children}</div>;
}
