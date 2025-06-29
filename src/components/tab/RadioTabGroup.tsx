import { useTooltip } from "@components/Tooltip";
import Plus from "@images/plus.svg?react";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import clsx from "clsx";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback, useId } from "react";
import { RadioTab } from "./RadioTab";

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
   * Change keyboard focus to the tab that is currently checked. This uses the ref to the checked
   * value so that it is always up-to-date.
   */
  const focusOnCheckedTab = useCallback(() => {
    const checkedTabNode =
      animationParentRef.current?.querySelector<HTMLInputElement>("input:checked");
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

  const { tooltip: addTooltip, ...addTooltipProps } = useTooltip<HTMLButtonElement>(
    !canAddNew ? undefined : "Add property"
  );

  return (
    <div className={clsx("flex gap-4", className)}>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        className={clsx(
          "shadow-hard flex min-w-1 overflow-hidden rounded-lg border-2 border-black bg-white",
          "has-focus-visible:focus-outline ring-white has-focus-visible:shadow-none has-focus-visible:ring-2"
        )}
        ref={animationParentRef}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {tabs.map((t, i) => (
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
              isStart={i === 0}
            />
          </div>
        ))}
      </div>

      {addTooltip}
      <button
        className="button is-secondary grid size-9 min-w-0 place-items-center p-0"
        onClick={onAddNew}
        disabled={!canAddNew}
        title={!canAddNew ? "All properties are already being used" : undefined}
        {...addTooltipProps}
      >
        <span className="sr-only">Add Property</span>
        <Plus />
      </button>
    </div>
  );
}
