import { Hint } from "@components/Hint";
import "@style/inspector.css";
import { OutFunctions, OutProperty } from "@timeline/OutFunctions";
import { DotType, UserDot } from "@timeline/point";
import { useStable } from "@util/hooks";
import { round3dp } from "@util/index";
import cx from "classnames";
import { memo, useId } from "react";

interface GlobalProps {
  invertValues: boolean;
  sampleCount: number;
  outProperty: string;
  onInvertValues: (value: boolean) => void;
  onSampleCount: (count: number) => void;
  onOutProperty: (property: OutProperty) => void;
}

interface Props extends GlobalProps {
  selected: UserDot | null;
  onChangeSelectedProps: (dot: UserDot) => void;
  onClickAdd: () => void;
  onClickDelete: () => void;
  isAdding: boolean;
}

const GlobalSettings = memo(function GlobalSettings({
  invertValues,
  sampleCount,
  outProperty,
  onInvertValues,
  onSampleCount,
  onOutProperty,
}: GlobalProps) {
  const samplesId = useId();

  return (
    <>
      <h2>Animation</h2>

      <label className="stacked-label">
        <span>Property</span>
        <select value={outProperty} onChange={(e) => onOutProperty(e.target.value as OutProperty)}>
          {Object.entries(OutFunctions).map(([key, namedFn]) => (
            <option key={key} value={key}>
              {namedFn.label}
            </option>
          ))}
        </select>
      </label>

      <label className="stacked-label">
        <span>Steps</span>
        <div className="flex gap-4">
          <input
            type="range"
            min={3}
            max={50}
            className="flex-auto"
            value={sampleCount}
            onChange={(e) => onSampleCount(parseInt(e.target.value))}
            id={samplesId}
          />
          <output htmlFor={samplesId}>{sampleCount}</output>
        </div>
      </label>

      <label className="block-label">
        <input type="checkbox" checked={invertValues} onChange={(e) => onInvertValues(e.target.checked)} />{" "}
        <span>Flip values</span>
      </label>
    </>
  );
});

function normalX(n: number) {
  n = Math.max(0, Math.min(n, 100));
  return round3dp(n);
}

function normalY(n: number) {
  n = Math.max(-1000, Math.min(n, 1000));
  return round3dp(n);
}

export const TimelineInspector = memo(function Inspector({
  selected,
  onChangeSelectedProps,
  onClickAdd,
  onClickDelete,
  isAdding,
  ...props
}: Props) {
  const xId = useId();
  const yId = useId();

  function handleChangeX(x: number) {
    if (!selected || isNaN(x)) return;
    const dot = { ...selected, x };
    onChangeSelectedProps(dot);
  }

  function handleChangeY(y: number) {
    if (!selected || isNaN(y)) return;
    const dot = { ...selected, y };
    onChangeSelectedProps(dot);
  }

  function handleTypeChange(value: string) {
    if (!selected) return;
    const dot: UserDot = { ...selected, type: value as DotType };
    onChangeSelectedProps(dot);
  }

  return (
    <aside className="inspector stack">
      <GlobalSettings {...props} />

      <h2>Point</h2>

      <div className="stack-small">
        <div className="flex gap-2">
          <button
            className={cx("push-button flex-auto basis-1", { "is-pressed": isAdding })}
            aria-pressed={isAdding}
            onClick={onClickAdd}
          >
            Add Point
          </button>
          <button className="push-button flex-auto basis-1" onClick={onClickDelete} disabled={!selected}>
            Delete{" "}
          </button>
        </div>
        <Hint>
          {useStable(
            <>
              Hold <kbd>Shift</kbd> on timeline to add points quickly
            </>
          )}
        </Hint>
      </div>

      {selected && (
        <>
          <label className="stacked-label">
            <span>Style</span>
            <select onChange={(e) => handleTypeChange(e.target.value)} value={selected.type}>
              <option value="square">Corner</option>
              <option value="round">Rounded</option>
            </select>
          </label>

          <div className="col-2 gap-2">
            <label className="stacked-label">
              <span>
                Offset <span className="text-light">%</span>
              </span>
              <input
                type="number"
                id={xId}
                value={normalX(selected.x)}
                onChange={(e) => handleChangeX(parseFloat(e.target.value))}
              />
            </label>

            <label className="stacked-label">
              <span>
                Value <span className="text-light">%</span>
              </span>
              <input
                id={yId}
                value={normalY(selected.y)}
                type="number"
                onChange={(e) => handleChangeY(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </>
      )}
    </aside>
  );
});
