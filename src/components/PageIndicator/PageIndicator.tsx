import { memo } from "react";
import "./PageIndicator.css";

import DotSmall from "@images/dot-small.svg?react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => unknown;
}

/** The "dots" under slidable mobile pages. In this case, we only support two pages, so this is a checkbox underneath. */
export const PageIndicator = memo(function PageIndicator({ checked, onChange }: Props) {
  // TODO: accessible label

  return (
    <label className="PageIndicator flex">
      <span className="PageIndicator__dot">
        <DotSmall />
      </span>
      <input type="checkbox" checked={checked} className="sr-only" onChange={(e) => onChange(e.target.checked)}></input>
      <span className="PageIndicator__dot">
        <DotSmall />
      </span>
    </label>
  );
});
