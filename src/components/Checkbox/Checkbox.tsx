import { cx } from "@util/cx";
import "./Checkbox.css";
import Check from "@images/check-small.svg?react";

interface Props {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export function Checkbox({ label, onChange, checked }: Props) {
  return (
    <label className={cx("Checkbox block-label gap-2 cursor-pointer", { "is-checked": checked })}>
      <input type="checkbox" onChange={onChange} className="sr-only" checked={checked} />
      <div className="Checkbox_box">{checked && <Check />}</div>
      <span>{label}</span>
    </label>
  );
}
