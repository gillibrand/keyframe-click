import { Duration, TimeUnit } from "@app/useSettings";
import "@style/inspector.css";

interface Props {
  duration: Duration;
  onChangeDuration: (duration: Duration) => void;

  isRepeat: boolean;
  onChangeIsRepeat: (repeat: boolean) => void;

  isPlaying: boolean;
  onClickPlay: () => void;
  onClickStop: () => void;

  // isAutoPlay: boolean;
  // onChangeAutoPlay: (autoPlay: boolean) => void;
}

export function PreviewInspector({
  isPlaying,
  onClickPlay,
  onClickStop,
  onChangeIsRepeat,
  isRepeat,
  duration,
  onChangeDuration,
}: // isAutoPlay,
// onChangeAutoPlay,
Props) {
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

  return (
    <aside className="inspector stack">
      <h2>Preview</h2>

      <div className="stack-small">
        {isPlaying ? (
          <button className="push-button w-full" onClick={onClickStop}>
            Stop
          </button>
        ) : (
          <button className="push-button w-full" onClick={onClickPlay}>
            Play
          </button>
        )}
      </div>

      <div className="stack-small">
        <label className="block-label">
          <input type="checkbox" onChange={(e) => onChangeIsRepeat(e.target.checked)} checked={isRepeat} />
          <span>Repeat</span>
        </label>

        {/* <label className="block-label">
          <input type="checkbox" checked={isAutoPlay} onChange={(e) => onChangeAutoPlay(e.target.checked)} />
          <span>Play after each change</span>
        </label> */}
      </div>

      <hr />

      <label className="stacked-label">
        <span>Image</span>
        <select name="" id="">
          <option value="ball">Ball</option>
        </select>
      </label>

      <label className="stacked-label">
        <span>Duration</span>
        <div className="col-2 gap-2">
          <input
            type="number"
            min={1}
            onChange={(e) => handleDurationTimChange(e.target.value)}
            value={duration.time}
          />

          <select value={duration.unit} onChange={(e) => handleDurationUnitChange(e.target.value)}>
            <option value="ms">milliseconds</option>
            <option value="s">seconds</option>
          </select>
        </div>
      </label>
    </aside>
  );
}
