import { CloseButton } from "@components/CloseButton";
import { ColorName, Colors } from "@util/Colors";
import clsx from "clsx";
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
  isStart: boolean;
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
  isStart,
}: Props) {
  const style = useMemo(
    () =>
      (checked
        ? {
            backgroundColor: Colors[color],
          }
        : {
            color: Colors[color],
          }) as CSSProperties,
    [color, checked]
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
      // className={clsx("RadioTab flex flex-nowrap items-center gap-3", {
      className={clsx(
        "flex h-full flex-nowrap items-center gap-3 py-2 ps-3 pe-2 leading-none select-none",
        "border-black bg-white text-xs text-white sm:text-[length:inherit]",
        !checked && "cursor-pointer hover:brightness-95 active:brightness-90",
        // In x-small tabs this ensure the checked one is a little more visible
        checked && "relative z-10",
        !isStart && "border-s-2"
      )}
      style={style}
      onKeyDown={handleDelKey}
      onClick={moveFocusToInputOnClick}
      data-id={id}
    >
      <label className="cursor-[inherit] truncate" htmlFor={inputId}>
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

      <div className={clsx(!checked && "invisible hidden sm:block")}>
        <CloseButton
          onClick={promptToDelete}
          tabIndex={-1}
          onFocus={() => inputRef.current?.focus()}
        />
      </div>
    </div>
  );
});
