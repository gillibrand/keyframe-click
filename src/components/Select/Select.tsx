import { PropsWithChildren } from "react";
import Down from "@images/down.svg?react";
import clsx from "clsx";

interface Props extends PropsWithChildren {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
}

export function Select({ value, children, onChange, disabled }: Props) {
  return (
    <div className="relative" data-select-wrapper>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={clsx(
          "border-neo shadow-hard peer block w-full appearance-none bg-white p-1 leading-none",
          "focus-visible:focus-outline focus-visible:shadow-none",
          "disabled:border-disabled disabled:text-disabled disabled:shadow-none"
        )}
      >
        {children}
      </select>
      <Down
        className="pointer-events-none absolute top-1.5 right-2 peer-disabled:opacity-25"
        aria-hidden
      />
    </div>
  );
}
