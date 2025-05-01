import Plus from "@images/plus.svg?react";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";
import { cx } from "@util/cx";

export interface TabData {
  cssProp: CssProp;
  id: string;
}

interface Props {
  radioGroupName: string;
  tabs: TabData[];
  checkedId: string;
  onDelete: (id: string) => void;
  canAddNew: boolean;
  onAddNew: () => void;
  onChange: (id: string) => void;
  canDelete?: (id: string) => Promise<boolean>;
  className?: string;
}

export function RadioTabGroup({
  tabs,
  radioGroupName,
  onDelete,
  canAddNew,
  onAddNew,
  checkedId,
  canDelete,
  onChange,
  className,
}: Props) {
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
    (id: string) => {
      onDelete(id);

      // The delete will trigger a re-render of the tabs. We need to wait for that to happen before
      // we can find and focus on the new checked tab
      setTimeout(() => {
        focusOnCheckedTab();
      });
    },
    [onDelete, focusOnCheckedTab]
  );

  return (
    <div className={cx("RadioTabGroup", "flex", className)} ref={parentRef}>
      {tabs.map((t) => (
        // Wrap each tab in a div. That's what we animate in/out since it has no padding or margin
        // so can shrink to 0 width
        <div key={t.id}>
          <RadioTab
            id={t.id}
            label={CssInfos[t.cssProp].label}
            radioName={radioGroupName}
            color={CssInfos[t.cssProp].color}
            checked={checkedId === t.id}
            onCheck={onChange}
            canDelete={canDelete}
            onDelete={handleDelete}
          />
        </div>
      ))}
      <button
        className="round-btn"
        onClick={onAddNew}
        disabled={!canAddNew}
        title={!canAddNew ? "All properties are already being used" : "Add property"}
      >
        <span className="sr-only">Add Property</span>
        <Plus />
      </button>
    </div>
  );
}
