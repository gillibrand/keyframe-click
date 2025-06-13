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
import { useChildAnimator, wipeInHeight, wipeOutHeight } from "@util/useChildAnimator";
import { stopEvent } from "@util";

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
  function handleDurationTimeChange(timeString: string) {
    const time = parseInt(timeString);

    onChangeDuration({
      time: time < 0 || isNaN(time) ? null : time,
      unit: duration.unit,
    });
  }

  function handleDurationUnitChange(unit: string) {
    if (duration.unit === unit) return;

    // Convert between s and ms values when the unit changes the preview takes about the same time
    // still. Don't want to change 1000ms to 1000sl make it 1s
    const newTime =
      duration.time === null
        ? null
        : unit === "ms"
          ? Math.round(duration.time * 1000)
          : Math.max(1, Math.round(duration.time / 1000));

    onChangeDuration({
      time: newTime,
      unit: unit as TimeUnit,
    });
  }

  const [graphic, setGraphic] = useSetting("previewGraphic", "astro");

  const speedId = useId();

  const { parentRef } = useChildAnimator<HTMLDivElement>("both", {
    animateIn: wipeInHeight,
    animateOut: wipeOutHeight,
  });

  const [previewText, setPreviewTextSetting] = useSetting("previewText", "Hello, World!");

  function setPreviewText(text: string) {
    const max = 42;
    setPreviewTextSetting(text.length > max ? text.slice(0, max) : text);
  }

  return (
    <aside className="inspector stack" ref={parentRef}>
      <h2>Preview</h2>

      <div className="stack-small desktop-only">
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
          label="Repeat"
          checked={isRepeat}
          onChange={(e) => onChangeIsRepeat(e.target.checked)}
        />
      </div>

      <hr />

      <label className="stacked-label">
        <span>Example</span>
        <Select value={graphic} onChange={(e) => setGraphic(e.target.value as Graphic)}>
          <option value="astro">Astronaut</option>
          <option value="ball">Ball</option>
          <option value="heart">Heart</option>
          <option value="text">Text</option>
        </Select>
      </label>

      {graphic === "text" && (
        <form
          className="mt-0"
          onSubmit={(e) => {
            stopEvent(e);
            onClickPlay();
          }}
        >
          <label className="stacked-label mt-stack">
            <span className="sr-only">Your text</span>
            <input
              type="text"
              className="textbox"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="e.g your name"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </label>
        </form>
      )}

      <label className="stacked-label">
        <span>Duration</span>
        <div className="col-2 gap-2">
          <input
            required
            type="number"
            className="textbox"
            min={1}
            onChange={(e) => handleDurationTimeChange(e.target.value)}
            value={duration.time === null ? "" : duration.time}
            placeholder={duration.unit === "ms" ? "e.g. 1500" : "e.g. 2"}
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
