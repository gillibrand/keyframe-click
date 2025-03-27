import { DotType, UserDot } from "../timeline/point";
import "./Inspector.css";

import { memo, useId } from "react";
import { round3dp } from "../util/index";
import { OutputFunctions } from "./OutputFunctions";

interface GlobalProps {
  snapToGrid: boolean;
  invertValues: boolean;
  sampleCount: number;
  outProperty: string;
  onSnapToGrid: (value: boolean) => void;
  onInvertValues: (value: boolean) => void;
  onSampleCount: (count: number) => void;
  onOutProperty: (property: string) => void;
}

interface Props extends GlobalProps {
  selected: UserDot | null;
  onChangeSelected: (dot: UserDot) => void;
}

const GlobalSettings = memo(function GlobalSettings({
  snapToGrid,
  invertValues,
  sampleCount,
  outProperty,
  onInvertValues,
  onSnapToGrid,
  onSampleCount,
  onOutProperty,
}: GlobalProps) {
  return (
    <>
      <h2>Output</h2>

      <label className="stacked-label">
        <span>Property</span>
        <select value={outProperty} onChange={(e) => onOutProperty(e.target.value)}>
          {Object.entries(OutputFunctions).map(([key, namedFn]) => (
            <option key={key} value={key}>
              {namedFn.label}
            </option>
          ))}
        </select>
      </label>

      <label className="stacked-label">
        <span>Samples</span>
        <div className="flex">
          <input
            type="range"
            min={3}
            max={50}
            className="flex-auto"
            value={sampleCount}
            onChange={(e) => onSampleCount(parseInt(e.target.value))}
          />
          <span>{sampleCount}</span>
        </div>
      </label>

      <div className="stack-small">
        <label className="block-label">
          <input type="checkbox" checked={invertValues} onChange={(e) => onInvertValues(e.target.checked)} />{" "}
          <span>Invert values</span>
        </label>

        <label className="block-label">
          <input type="checkbox" checked={snapToGrid} onChange={(e) => onSnapToGrid(e.target.checked)} />{" "}
          <span>Snap to grid</span>
        </label>
      </div>
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

export const Inspector = memo(function Inspector({ selected, onChangeSelected, ...props }: Props) {
  const xId = useId();
  const yId = useId();

  function handleChangeX(x: number) {
    if (!selected || isNaN(x)) return;
    const dot = { ...selected, x };
    onChangeSelected(dot);
  }

  function handleChangeY(y: number) {
    if (!selected || isNaN(y)) return;
    const dot = { ...selected, y };
    onChangeSelected(dot);
  }

  function handleTypeChange(value: string) {
    if (!selected) return;
    const dot: UserDot = { ...selected, type: value as DotType };
    onChangeSelected(dot);
  }

  return (
    <aside className="Inspector stack">
      <GlobalSettings {...props} />

      {selected && (
        <>
          <h2>Point</h2>

          <label className="stacked-label">
            <span>Style</span>
            <select onChange={(e) => handleTypeChange(e.target.value)} value={selected.type}>
              <option value="square">Square</option>
              <option value="round">Smooth</option>
            </select>
          </label>

          <div className="col-2">
            <label className="stacked-label">
              <span>Offset</span>
              <input
                type="number"
                id={xId}
                value={normalX(selected.x)}
                onChange={(e) => handleChangeX(parseFloat(e.target.value))}
              />
            </label>

            <label className="stacked-label">
              <span>Value</span>
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
