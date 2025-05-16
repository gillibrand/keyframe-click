import Close from "@images/close.svg?react";
import { ColorName, Colors } from "@util/Colors";
import { cx } from "@util/cx";
import { CSSProperties, memo, useId, useMemo, useRef } from "react";

interface Props {
  label: string;
  radioName: string;
  id: string;
  checked?: boolean;
  color: ColorName;
  onCheck: (id: string) => void;
  canDelete?: (id: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export const RadioTab = memo(function RadioTab({
  id,
  label,
  radioName,
  checked,
  color,
  onCheck,
  canDelete,
  onDelete,
}: Props) {
  const style = useMemo(
    () =>
      ({
        "--tab-bg-color": Colors[color],
      }) as CSSProperties,
    [color]
  );

  async function promptToDelete(e: React.UIEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (!canDelete) return;

    if (!(await canDelete(id))) return;

    onDelete(id);
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
      data-id={id}
    >
      <label className="truncate" htmlFor={inputId}>
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="radio"
        name={radioName}
        value={label}
        checked={checked}
        data-checked={checked ? "true" : "false"}
        className="sr-only"
        onChange={(e) => {
          if (e.target.checked) onCheck(id);
        }}
      />

      <button
        className="RadioTab__button"
        title="Close"
        onClick={promptToDelete}
        tabIndex={-1} // no focus; use Del key to invoke instead
        onFocus={() => inputRef.current?.focus()}
      >
        <Close />
      </button>
    </div>
  );
});
