import { memo, useEffect, useMemo, useState } from "react";
import "./ProgressBar.css";
import clsx from "clsx";

interface Props {
  /**
   * The duration of the animation in milliseconds. This is used to set the CSS transition duration.
   * Changing this reset the progress.
   */
  durationMs: number;

  /** Arbitrary styles used to position the progress bar relative to the preview. */
  style?: React.CSSProperties;

  /**
   * Whether the preview is playing or not. This is used to trigger the CSS animation. When set to
   * true, it always starts from 0 and runs for the full duration.
   */
  isPlaying: boolean;

  iterationCount?: number;
}

/**
 * A progress bar that animates when the preview is playing. It uses CSS transitions to animate the
 * progress bar efficiently, but that means it can only play for an exact duration. It does not
 * support pausing or resuming the animation or setting a progress value.
 */
export const ProgressBar = memo(function ProgressBar({ isPlaying, durationMs, style }: Props) {
  const allStyle = useMemo(() => {
    return { ...style, "--duration-ms": `${durationMs}ms` };
  }, [durationMs, style]);

  // This uses a CSS transition to animate the progress bar. To trigger the animation, we need to
  // force a reflow of the element. So we start it always false with the indirect shouldPlay state.
  // Then in the effect we match shouldPlay with isPlaying to trigger the reflow.
  const [shouldPlay, setShouldPlay] = useState(false);
  useEffect(() => {
    // Must read a layout prop to ensure a reflow and the animation will trigger.
    void document.body.offsetHeight;
    setShouldPlay(isPlaying);
  }, [isPlaying]);

  return (
    // Animating this with CSS, so we can't set the aria-valuenow. Just make this purely
    // presentational for the sake fo performance :(
    <div className={clsx("ProgressBar", { "is-playing": shouldPlay })} style={allStyle}>
      {/* <div className="ProgressBar__bg"></div> */}
      <div className="ProgressBar__bar"></div>
    </div>
  );
});
