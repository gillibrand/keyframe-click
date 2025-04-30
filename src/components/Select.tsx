import { PropsWithChildren } from "react";
import "./Select.css";
import Down from "@images/down.svg?react";

interface Props extends PropsWithChildren {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export function Select({ value, children, onChange }: Props) {
  return (
    <div className="Select">
      <select value={value} onChange={onChange}>
        {children}
      </select>
      <Down />
    </div>
  );
}
