import { memo } from "react";
import clsx from "clsx";

function Dot({ checked }: { checked: boolean }) {
  return (
    <span
      className={clsx(
        "size-[10px] rounded-full bg-black",
        "transition-opacity duration-200",
        checked ? "opacity-100" : "opacity-25"
      )}
      aria-hidden
    />
  );
}

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => unknown;
  label: string;
}

/**
 * The "dots" under slidable mobile pages. In this case, we only support two pages, so this is a
 * checkbox underneath.
 */
export const PageIndicator = memo(function PageIndicator({ checked, onChange, label }: Props) {
  return (
    <label className="focus-within:focus-outline inline-flex justify-center gap-1.5 rounded-full">
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        className="sr-only"
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />

      <Dot checked={!checked} />
      <Dot checked={checked} />
    </label>
  );
});
