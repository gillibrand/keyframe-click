import "./Segmented.css";
import { createContext, PropsWithChildren, useContext } from "react";

interface Props<T> extends PropsWithChildren {
  name: string;
  onChange?: (value: T) => void;
}

const SegmentedContext = createContext<string>("name");

export function Segmented<T = string>({ children, name }: Props<T>) {
  return (
    <div role="radiogroup" className="Segmented">
      <SegmentedContext.Provider value={name}>{children}</SegmentedContext.Provider>
    </div>
  );
}

interface ButtonProps<T> extends PropsWithChildren {
  value: T;
}

export function SegmentedButton<T>({ value, children }: ButtonProps<T>) {
  const name = useContext(SegmentedContext);
  void value;

  return (
    <label className="Segmented__button">
      <span>{children}</span>
      <input type="radio" name={name} />
    </label>
  );
}
