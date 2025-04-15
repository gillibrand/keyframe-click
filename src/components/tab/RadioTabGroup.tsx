import Plus from "@images/plus.svg?react";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback, useState } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";
import { getFirstFocusableElement, isEl } from "@util";
import { ColorName } from "@util/Colors";

export interface TabData {
  label: string;
  color: ColorName;
  value: string;
}

interface Props {
  name: string;
  tabs: TabData[];
  onDelete: (value: string) => void;
  onNew: () => void;
}

export function RadioTabGroup({ tabs, name, onDelete, onNew }: Props) {
  const [checkedValue, setCheckedValue] = useState(tabs[0].value);

  const handleChange = useCallback((value: string) => {
    setCheckedValue(value);
  }, []);

  async function handleCanDelete(label: string): Promise<boolean> {
    void label;

    // Require 1 tab at least
    if (tabs.length <= 1) return false;

    // TODO: Prompt to delete? Better with Undo later
    // return confirm(`Delete "${label}"?`);

    // Before we can delete, change the checked value to the next value
    const index = tabs.findIndex((t) => t.value === checkedValue);
    let next = tabs[index + 1];
    if (!next) next = tabs[index - 1];

    // Should not happen since we checked that there is >1 already
    if (!next) return false;

    setCheckedValue(next.value);

    // Set keyboard focus too since we will remove the one with active focus
    const nextTabNode = parentRef.current?.querySelector(`[data-value="${next.value}"]`);
    if (isEl(nextTabNode)) {
      getFirstFocusableElement(nextTabNode, true);
    }

    return true;
  }

  const { parentRef } = useChildAnimator<HTMLDivElement>("both");

  return (
    <div className="RadioTabGroup flex" ref={parentRef} tabIndex={-1}>
      {tabs.map((t) => (
        // Wrap each tab in a div. That's what we animate in/out since it has no padding or margin
        // so can shrink to 0 width
        <div key={t.value}>
          <RadioTab
            value={t.value}
            label={t.label}
            radioName={name}
            color={t.color}
            checked={checkedValue === t.value}
            onCheck={handleChange}
            canDelete={tabs.length > 1 ? handleCanDelete : undefined}
            onDelete={onDelete}
          />
        </div>
      ))}
      <button className="round-btn" onClick={onNew}>
        <Plus />
      </button>
    </div>
  );
}
