import { PropsWithChildren } from "react";
import "./Select.css";
import Down from "@images/down.svg?react";

interface Props extends PropsWithChildren {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
}

export function Select({ value, children, onChange, disabled }: Props) {
  return (
    <div className="Select">
      <select value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
      <Down />
    </div>
  );
}
