import Close from "@images/close.svg?react";
import { CssProp } from "@timeline/CssInfo";
import { ColorName, Colors } from "@util/Colors";
import cx from "classnames";
import { CSSProperties, useId, useMemo, useRef } from "react";

interface Props {
  label: string;
  radioName: string;
  value: CssProp;
  checked?: boolean;
  color: ColorName;
  onCheck: (value: CssProp) => void;
  canDelete?: (label: string) => Promise<boolean>;
  onDelete: (value: CssProp) => void;
}

export function RadioTab({ label, radioName, checked, color, onCheck, value, canDelete, onDelete }: Props) {
  const style = useMemo(
    () =>
      ({
        "--tab-bg-color": Colors[color],
      } as CSSProperties),
    [color]
  );

  async function promptToDelete(e: React.UIEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (!canDelete) return;

    if (!(await canDelete(label))) return;

    onDelete(value);
  }

  function handleDelKey(e: React.KeyboardEvent) {
    if (e.key === "Delete" || e.key === "Backspace") {
      promptToDelete(e);
    }
  }

  function moveFocusToInputOnClick(e: React.MouseEvent) {
    if (e.target === inputRef.current || (e.target as Node).nodeName === "LABEL") {
      e.stopPropagation();
      return;
    }

    inputRef.current?.click();
    inputRef.current?.focus();
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div
      className={cx("RadioTab flex flex-nowrap gap-3 items-center", { "can-delete": !!canDelete })}
      style={style}
      onKeyDown={handleDelKey}
      onClick={moveFocusToInputOnClick}
      data-value={value}
    >
      <label htmlFor={inputId}>{label}</label>

      <input
        ref={inputRef}
        id={inputId}
        type="radio"
        name={radioName}
        value={label}
        checked={checked}
        onChange={(e) => {
          if (e.target.checked) onCheck(value);
        }}
      />

      <button
        className="round-btn"
        title="close"
        onClick={promptToDelete}
        tabIndex={-1} // no focus; use Del key to invoke instead
        onFocus={() => inputRef.current?.focus()}
      >
        <Close />
      </button>
    </div>
  );
}
