import Close from "@images/close.svg?react";
import "./CloseButton.css";
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
      className="CloseButton"
    >
      <Close />
    </button>
  );
});
