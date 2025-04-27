import "./SplitButtons.css";
import { PropsWithChildren } from "react";

/**
 * Buttons that are closely related to appear attached visually. To use, just add normal HTML `button` as children. This
 * effectively just styles them.
 */
export function SplitButtons({ children }: PropsWithChildren) {
  return <div className="SplitButtons flex flex-nowrap items-stretch">{children}</div>;
}
