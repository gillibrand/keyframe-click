import Close from "@images/close.svg?react";
import cx from "classnames";
import { CSSProperties, useMemo } from "react";
import type { Color } from "./RadioTabGroup";
import { Colors } from "./RadioTabGroup";

interface Props {
  label: string;
  radioName: string;
  value: string;
  checked?: boolean;
  color: Color;
  onCheck: (value: string) => void;
  canDelete?: (label: string) => Promise<boolean>;
  onDelete: (value: string) => void;
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

  return (
    <div>
      <label
        className={cx("RadioTab flex flex-nowrap gap-3 items-center o", { "can-delete": !!canDelete })}
        style={style}
        onKeyDown={handleDelKey}
      >
        <style>--tab-bg-color: {Colors[color]};</style>
        <span>{label}</span>
        <div className="round-btn" tabIndex={-1} title="close" role="button" onClick={promptToDelete}>
          {/* a real button in a label causes problems, so kinda fake one. No keyboard focus; use Del key instead */}
          <Close />
        </div>
        <input
          type="radio"
          name={radioName}
          value={label}
          checked={checked}
          onChange={(e) => {
            if (e.target.checked) onCheck(value);
          }}
        />
      </label>
    </div>
  );
}
