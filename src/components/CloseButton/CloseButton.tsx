import Close from "@images/close.svg?react";
import "./CloseButton.css";

interface Props {
  tabIndex?: number;
  onFocus?: (e: React.FocusEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

export function CloseButton({ onClick, onFocus, tabIndex = 0 }: Props) {
  return (
    <button className="CloseButton" title="Close" onClick={onClick} tabIndex={tabIndex} onFocus={onFocus}>
      <Close />
    </button>
  );
}
