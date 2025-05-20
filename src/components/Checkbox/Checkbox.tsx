import Check from "@images/check-small.svg?react";
import { cx } from "@util/cx";
import "./Checkbox.css";

interface Props {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  type?: "checkbox" | "radio";
  name?: string;
  value?: string;
}

export function Checkbox({ label, onChange, checked, type = "checkbox", name, value }: Props) {
  const isCheckbox = type === "checkbox";
  const check = !checked ? undefined : isCheckbox ? <Check /> : undefined;

  return (
    <label
      className={cx(
        "Checkbox block-label gap-2 cursor-pointer",
        { "is-checked": checked },
        { "Checkbox--radio": !isCheckbox }
      )}
    >
      <input type={type} onChange={onChange} className="sr-only" checked={checked} name={name} value={value} />
      <i aria-hidden={true} className={type === "checkbox" ? "Checkbox__box" : "Checkbox__dot"}>
        {check}
      </i>
      <span>{label}</span>
    </label>
  );
}
