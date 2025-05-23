import { Duration, TimeUnit, useSetting } from "@app/useSettings";
import { CheckedInput } from "@components/Checked/Checked";
import { Segmented, SegmentedButton } from "@components/Segmented";
import { Select } from "@components/Select";
import Play from "@images/play.svg?react";
import Stop from "@images/stop.svg?react";
import "@style/inspector.css";
import { memo, useId } from "react";
import { Graphic } from "./previewTypes";
import { Speed } from "./usePreview";

interface Props {
  duration: Duration;
  onChangeDuration: (duration: Duration) => void;

  isRepeat: boolean;
  onChangeIsRepeat: (repeat: boolean) => void;

  isPlaying: boolean;
  onClickPlay: () => void;
  onClickStop: () => void;

  speed: Speed;
  onChangeSpeed: (speed: Speed) => void;
}

export const PreviewInspector = memo(function PreviewInspector({
  isPlaying,
  onClickPlay,
  onClickStop,
  onChangeIsRepeat,
  isRepeat,
  duration,
  onChangeDuration,
  speed,
  onChangeSpeed,
}: Props) {
  function handleDurationTimChange(timeString: string) {
    const time = parseInt(timeString);
    if (isNaN(time) || time < 0) return;

    onChangeDuration({
      time: time,
      unit: duration.unit,
    });
  }

  function handleDurationUnitChange(unit: string) {
    onChangeDuration({
      time: duration.time,
      unit: unit as TimeUnit,
    });
  }

  const [graphic, setGraphic] = useSetting("previewGraphic", "astro");

  const speedId = useId();

  return (
    <aside className="inspector stack">
      <h2>Preview</h2>

      <div className="stack-small">
        {isPlaying ? (
          <button className="button w-full flex-center gap-2" onClick={onClickStop}>
            Stop <Stop />
          </button>
        ) : (
          <button className="button w-full flex-center gap-2 " onClick={onClickPlay}>
            Play <Play />
          </button>
        )}
      </div>

      <div className="stack-small">
        <CheckedInput
          type="checkbox"
          label="Loop"
          checked={isRepeat}
          onChange={(e) => onChangeIsRepeat(e.target.checked)}
        />
      </div>

      <hr />

      <label className="stacked-label">
        <span>Image</span>
        <Select value={graphic} onChange={(e) => setGraphic(e.target.value as Graphic)}>
          <option value="astro">Astronaut</option>
          <option value="ball">Ball</option>
          <option value="heart">Heart</option>
        </Select>
      </label>

      <label className="stacked-label">
        <span>Duration</span>
        <div className="col-2 gap-2">
          <input
            type="number"
            className="textbox"
            min={1}
            onChange={(e) => handleDurationTimChange(e.target.value)}
            value={duration.time}
          />

          <Select value={duration.unit} onChange={(e) => handleDurationUnitChange(e.target.value)}>
            <option value="ms">milliseconds</option>
            <option value="s">seconds</option>
          </Select>
        </div>
      </label>

      <div className="stacked-label">
        <span id={speedId}>Speed</span>
        <Segmented onChange={onChangeSpeed} checkedValue={speed} labelledBy={speedId}>
          <SegmentedButton value={1}>
            100<span className="text-small">%</span>
          </SegmentedButton>
          <SegmentedButton value={0.5}>
            50<span className="text-small">%</span>
          </SegmentedButton>
          <SegmentedButton value={0.25}>
            25<span className="text-small">%</span>
          </SegmentedButton>
          <SegmentedButton value={0.1}>
            10<span className="text-small">%</span>
          </SegmentedButton>
        </Segmented>
      </div>
    </aside>
  );
});
