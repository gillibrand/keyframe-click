import Plus from "@images/plus.svg?react";
import { ColorName } from "@util/Colors";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";

export interface TabData<T> {
  label: string;
  color: ColorName;
  value: T;
}

interface Props<T> {
  name: string;
  checkedValue: T;
  tabs: TabData<T>[];
  onDelete: (value: T) => void;
  onNew: () => void;
  onChange: (value: T) => void;
  canDelete?: (label: string) => Promise<boolean>;
}

export function RadioTabGroup<T>({ tabs, name, onDelete, onNew, checkedValue, canDelete, onChange }: Props<T>) {
  const { parentRef } = useChildAnimator<HTMLDivElement>("both");

  /**
   * Change keyboard focus to the tab that is currently checked. This uses the ref to the checked value so that it is
   * always up-to-date.
   */
  const focusOnCheckedTab = useCallback(() => {
    const checkedTabNode = parentRef.current?.querySelector<HTMLInputElement>("input:checked");
    if (checkedTabNode) checkedTabNode.focus();
  }, [parentRef]);

  const handleDelete = useCallback(
    (value: T) => {
      onDelete(value);
      // Note that this WILL have an updated checked radio since canDelete is async and this tab
      // will already be rendered again before the real delete. If that was not async, we'd need to
      // setTimeout this call to be sure it's up to date.
      //
      // We expect the parent to change the checked tab before allowing it to be deleted.
      focusOnCheckedTab();
    },
    [onDelete, focusOnCheckedTab]
  );

  return (
    <div className="RadioTabGroup flex" ref={parentRef} tabIndex={-1}>
      {tabs.map((t) => (
        // Wrap each tab in a div. That's what we animate in/out since it has no padding or margin
        // so can shrink to 0 width
        <div key={String(t.value)}>
          <RadioTab
            value={t.value}
            label={t.label}
            radioName={name}
            color={t.color}
            checked={checkedValue === t.value}
            onCheck={onChange}
            canDelete={tabs.length > 1 ? canDelete : undefined}
            onDelete={handleDelete}
          />
        </div>
      ))}
      <button className="round-btn" onClick={onNew}>
        <Plus />
      </button>
    </div>
  );
}
