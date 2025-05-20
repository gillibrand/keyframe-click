import Check from "@images/check-small.svg?react";
import "./Checked.css";

interface BaseProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

interface CheckboxProps extends BaseProps {
  type: "checkbox";
  name?: string;
  value?: string;
}

interface RadioProps extends BaseProps {
  type: "radio";
  name: string;
  value: string;
}

export function CheckedInput({ label, onChange, checked, type = "checkbox", name, value }: CheckboxProps | RadioProps) {
  // Checkbox shows a check SVG when checked. Radio button only uses CSS instead of an image.
  const icon = type === "checkbox" && checked ? <Check /> : undefined;

  return (
    <label className="Checked block-label gap-2">
      <input type={type} onChange={onChange} className="sr-only" checked={checked} name={name} value={value} />
      <i aria-hidden={true} className={type === "checkbox" ? "Checked__box" : "Checked__dot"}>
        {icon}
      </i>
      <span>{label}</span>
    </label>
  );
}
