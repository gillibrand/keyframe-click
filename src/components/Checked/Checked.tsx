import Check from "@images/check-small.svg?react";
import clsx from "clsx";

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

// No longer using radios anywhere. Maybe restore this in the future
//
// interface RadioProps extends BaseProps {
//   type: "radio";
//   name: string;
//   value: string;
// }

export function CheckedInput({ label, onChange, checked, name, value }: CheckboxProps) {
  // Checkbox shows a check SVG when checked. Radio button only uses CSS instead of an image.
  // const icon = type === "checkbox" && checked ? <Check /> : undefined;

  return (
    <label className="block-label group cursor-pointer gap-2">
      <input
        type="checkbox"
        onChange={onChange}
        className="peer sr-only"
        checked={checked}
        name={name}
        value={value}
      />
      <i
        aria-hidden={true}
        className={clsx(
          "shadow-hard border-neo size-[18px]",
          "group-hover:brightness-95 group-active:brightness-90",
          checked ? "bg-neo-blue text-white" : "bg-white text-black",
          "peer-focus-visible:focus-outline peer-focus-visible:shadow-none"
        )}
      >
        {checked && <Check />}
      </i>
      <span>{label}</span>
    </label>
  );
}
