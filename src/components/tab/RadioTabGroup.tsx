import Plus from "@images/plus.svg?react";
import { getFirstFocusableElement, isEl } from "@util";
import { ColorName } from "@util/Colors";
import { useGetter } from "@util/hooks";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";
import { CssProp } from "@timeline/CssInfo";

export interface TabData {
  label: string;
  color: ColorName;
  value: CssProp;
}

interface Props {
  name: string;
  checkedValue: string;
  tabs: TabData[];
  onDelete: (value: string) => void;
  onNew: () => void;
  onChange: (value: CssProp) => void;
  canDelete?: (label: string) => Promise<boolean>;
}

export function RadioTabGroup({ tabs, name, onDelete, onNew, checkedValue, canDelete, onChange }: Props) {
  const getCheckedValue = useGetter(checkedValue);
  const { parentRef } = useChildAnimator<HTMLDivElement>("both");

  /**
   * Change keyboard focus to the tab that is currently checked. This uses the ref to the checked
   * value so that it is always up-to-date.
   */
  const focusOnCheckedTab = useCallback(() => {
    const checkedTabNode = parentRef.current?.querySelector(`[data-value="${getCheckedValue()}"]`);

    if (isEl(checkedTabNode)) {
      getFirstFocusableElement(checkedTabNode, true);
    }
  }, [parentRef, getCheckedValue]);

  const handleDelete = useCallback(
    (value: string) => {
      onDelete(value);
      // Note that this WILL have an update checkedValueRef since canDelete is async and this tab
      // will already be rendered again before the real delete. If that was not async, we'd need to
      // setTimeout this call to be sure it's up to date.
      //
      // We expect the parent to change the active tab before allowing it to be deleted.
      focusOnCheckedTab();
    },
    [onDelete, focusOnCheckedTab]
  );

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
