import cx from "classnames";
import { memo } from "react";
import Check from "@images/check.svg?react";

interface ToggleMenuItemProps {
  label: string;
  isChecked: boolean;
  isHover: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}

export const ToggleMenuItem = memo(function ToggleMenuItem({
  isChecked,
  isHover,
  onClick,
  label,
  onEnter,
  onLeave,
}: ToggleMenuItemProps) {
  return (
    <li
      className={cx("ToggleMenuItem", { "is-hover": isHover })}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      role="menuitemcheckbox"
      aria-checked={isChecked}
      onClick={onClick}
    >
      <span className="ToggleMenuItem__checkmark">{isChecked ? <Check /> : ""}</span>
      {label}
    </li>
  );
});

export const LabelMenuItem = memo(function LabelMenuItem({ label }: { label: string }) {
  return (
    <li className="LabelMenuItem" role="heading">
      <span className="LabelMenuItem__label">{label}</span>
    </li>
  );
});

export interface ToggleMenuItem {
  type: "toggle";
  label: string;
  isChecked: boolean;
  onClick: () => void;
}

export interface LabelMenuItem {
  type: "label";
  label: string;
}

export type MenuItem = ToggleMenuItem | LabelMenuItem;
