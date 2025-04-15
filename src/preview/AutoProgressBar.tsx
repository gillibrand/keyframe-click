import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "./ProgressBar";

interface Props {
  /**
   * True is playing. Resets to 0 percent when not playing. Restart from 0 when it start playing
   * again.
   */
  isPlaying: boolean;

  /**
   * The time to complete from 0 to 100 percent. If changed, the progress starts over.
   */
  durationMs: number;

  /**
   * Styles to abs position the progress bar if needed.
   */
  style?: React.CSSProperties;
}

/**
 * A component that auto-increments a wrapped progress bar from 0 to 100 over a given duration. Will restart
 * the progress bar if the duration changes.
 *
 * This is used to confine state changes of progress to this class. Before `usePreview` was tracking
 * progress, which caused it to render a lot, and since it's a hook, any callers would rerender.
 * Isolates those progress related renders this class and the progress bar.
 */
export function AutoProgressBar({ isPlaying, durationMs, style }: Props) {
  const [progress, setProgress] = useState(0);

  const intervalTimer = useRef(-1);

  useEffect(
    function updateProgressInterval() {
      clearInterval(intervalTimer.current);
      setProgress(0);

      if (!isPlaying) {
        return;
      }

      const frequencyMs = durationMs / 100;

      intervalTimer.current = setInterval(() => {
        setProgress((prev) => {
          return prev + 1;
        });
      }, frequencyMs);

      return () => clearInterval(intervalTimer.current);
    },
    [isPlaying, durationMs]
  );

  return <ProgressBar value={progress} style={style} />;
}
