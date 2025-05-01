import { Checkbox } from "@components/Checkbox/Checkbox";
import { Hint } from "@components/Hint";
import { Select } from "@components/Select";
import "@style/inspector.css";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { DotType, moveDot, UserDot } from "@timeline/point";
import { cx } from "@util/cx";
import { useStable } from "@util/hooks";
import { round3dp } from "@util/index";
import { memo, useId } from "react";

interface GlobalProps {
  isFlipped: boolean;
  sampleCount: number;
  cssProp: CssProp;
  onChangeIsFlipped: (value: boolean) => void;
  onChangeSampleCount: (count: number) => void;
  onChangeCssProp: (property: CssProp) => void;
  disabledCssProps: Set<CssProp>;
}

interface Props extends GlobalProps {
  selected: UserDot | null;
  onChangeSelectedProps: (dot: UserDot) => void;
  onClickAdd: () => void;
  onClickDelete: () => void;
  isAdding: boolean;
}

const GlobalSettings = memo(function GlobalSettings({
  isFlipped,
  sampleCount,
  cssProp,
  onChangeIsFlipped,
  onChangeSampleCount,
  onChangeCssProp,
  disabledCssProps,
}: GlobalProps) {
  const samplesId = useId();

  function isCssPropDisabled(name: CssProp) {
    if (disabledCssProps.has(name)) return true;

    if (name === "scale") {
      return disabledCssProps.has("scaleX") || disabledCssProps.has("scaleY");
    } else if (name === "scaleX" || name === "scaleY") {
      return disabledCssProps.has("scale");
    }
  }

  return (
    <>
      <h2>Timeline</h2>
      <label className="stacked-label">
        <span>Property</span>
        <Select value={cssProp} onChange={(e) => onChangeCssProp(e.target.value as CssProp)}>
          {Object.entries(CssInfos).map(([otherCssProp, namedFn]) => (
            <option key={otherCssProp} value={otherCssProp} disabled={isCssPropDisabled(otherCssProp as CssProp)}>
              {namedFn.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="stacked-label">
        <span>Extra frames</span>
        <div className="flex gap-4">
          <input
            type="range"
            min={0}
            max={50}
            className="flex-auto"
            value={sampleCount}
            onChange={(e) => onChangeSampleCount(parseInt(e.target.value))}
            id={samplesId}
          />
          <output htmlFor={samplesId}>{sampleCount}</output>
        </div>
      </label>
      <Checkbox label="Flip values" checked={isFlipped} onChange={(e) => onChangeIsFlipped(e.target.checked)} />
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
    const dot = { ...selected };
    moveDot(dot, x, selected.y);
    onChangeSelectedProps(dot);
  }

  function handleChangeY(y: number) {
    if (!selected || isNaN(y)) return;
    const dot = { ...selected };
    moveDot(dot, selected.x, y);
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
            className={cx("button flex-auto basis-1", { "is-pressed": isAdding })}
            aria-pressed={isAdding}
            onClick={onClickAdd}
          >
            Add Point
          </button>
          <button className="button flex-auto basis-1" onClick={onClickDelete} disabled={!selected}>
            Delete{" "}
          </button>
        </div>
        <Hint>
          {useStable(
            <>
              Hold <kbd>Shift</kbd> over the grid to add quickly
            </>
          )}
        </Hint>
      </div>

      {selected && (
        <>
          <label className="stacked-label">
            <span>Style</span>
            <Select onChange={(e) => handleTypeChange(e.target.value)} value={selected.type}>
              <option value="square">Square</option>
              <option value="round">Round</option>
            </Select>
          </label>

          <div className="col-2 gap-2">
            <label className="stacked-label">
              <span>
                Offset <span className="text-light">%</span>
              </span>
              <input
                className="textbox"
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
                className="textbox"
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
