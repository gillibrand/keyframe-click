import Close from "@images/close.svg?react";
import clsx from "clsx";
import { memo } from "react";

interface Props {
  tabIndex?: number;
  onFocus?: (e: React.FocusEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export const CloseButton = memo(function CloseButton({ onClick, onFocus, tabIndex = 0 }: Props) {
  return (
    <button
      title="Close"
      onClick={onClick}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={clsx(
        "grid size-4 cursor-pointer place-items-center rounded-full",
        "bg-white text-slate-600",
        "hover:bg-slate-200 active:bg-slate-300"
      )}
    >
      <Close />
    </button>
  );
});
