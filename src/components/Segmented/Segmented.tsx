import { useUuid } from "@util/hooks";
import { createContext, memo, PropsWithChildren, Provider, useContext, useId, useMemo } from "react";
import "./Segmented.css";
import { cx } from "@util/cx";

/** A type for the radio group properties to pass via context to the radio buttons. */
interface ContextType<T> {
  /** Any group name just to tue the radios together. This is generated. */
  groupName: string;

  /** The currently checked value. */
  checkedValue: T;

  /** Callback to call when the checked value changes. */
  onChange?: (value: T) => void;
}

const Context = createContext(null as unknown as ContextType<unknown>);

interface Props<T> extends PropsWithChildren {
  label?: string;
  labelledBy?: string;
  checkedValue: T;
  onChange?: (value: T) => void;
  className?: string;
}

const genericMemo: <T>(component: T) => T = memo;

/**
 * A segmented control is a group of buttons that act like radio buttons but present as a single control of push
 * buttons. This is essentially a compact way to present mutually exclusive options that uses less space than
 * traditional radio buttons.
 */
export const Segmented = genericMemo(function Segmented<T = string>({
  children,
  label,
  labelledBy,
  checkedValue,
  onChange,
  className,
}: Props<T>) {
  // We just need a common name to tie the radio buttons together. This is not seen, so we can use a UUID.
  const groupName = useUuid();

  // Use a context to pass the group name down to the radio button children.
  const contextValue: ContextType<T> = useMemo(
    () => ({
      groupName,
      checkedValue,
      onChange,
    }),
    [checkedValue, groupName, onChange]
  );

  const Provider = Context.Provider as Provider<ContextType<T>>;

  const labelId = useId();
  const maybeLabelId = labelledBy ? labelledBy : label ? labelId : undefined;

  return (
    // This should be a fieldset, but it has rendering errors with a border radius and overflow in Chrome as of 135.0.7049.96
    <div className={cx("Segmented", className)} role="radiogroup" aria-labelledby={maybeLabelId} title={label}>
      <Provider value={contextValue}>{children}</Provider>
      {label && (
        <span className="sr-only" id={labelId}>
          {label}
        </span>
      )}
    </div>
  );
});

interface ButtonProps<T> extends PropsWithChildren {
  /** The value of this button. This is used to determine if this button is checked or not. This must be unique. */
  value: T;
}

/**
 * A single button in a segmented control. The caller creates one of these for each button in the group and passes them
 * as children to the parent `Segmented` component.
 */
export const SegmentedButton = memo(function SegmentedButton<T>({ value, children }: ButtonProps<T>) {
  const { groupName, checkedValue, onChange } = useContext(Context) as ContextType<T>;
  void value;

  function handleChange() {
    if (onChange) onChange(value);
  }

  return (
    <label className="Segmented__button">
      <span>{children}</span>
      <input
        className="sr-only"
        type="radio"
        name={groupName}
        checked={value === checkedValue}
        value={String(value)}
        onChange={handleChange}
      />
    </label>
  );
});
