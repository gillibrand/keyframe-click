import Plus from "@images/plus.svg?react";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback, useId } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";
import { cx } from "@util/cx";

export interface TabData {
  cssProp: CssProp;
  id: string;
}

interface Props {
  label: string;
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
  label,
  radioGroupName,
  onDelete,
  canAddNew,
  onAddNew,
  checkedId,
  canDelete,
  onChange,
  className,
}: Props) {
  const { parentRef: animationParentRef } = useChildAnimator<HTMLDivElement>("both");

  /**
   * Change keyboard focus to the tab that is currently checked. This uses the ref to the checked value so that it is
   * always up-to-date.
   */
  const focusOnCheckedTab = useCallback(() => {
    const checkedTabNode = animationParentRef.current?.querySelector<HTMLInputElement>("input:checked");
    if (checkedTabNode) checkedTabNode.focus();
  }, [animationParentRef]);

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

  const labelId = useId();

  return (
    <div className={cx("RadioTabGroup gap-4", className)}>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div className="flex min-w-px RadioTabGroup__tabs" ref={animationParentRef}>
        {tabs.map((t) => (
          // Wrap each tab in a div. That's what we animate in/out since it has no padding or margin
          // so can shrink to 0 width
          <div key={t.id} className="RadioTabGroup__tabWrapper min-w-px" role="radiogroup" aria-labelledby={labelId}>
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
      </div>

      <button
        className="button is-secondary is-round"
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
