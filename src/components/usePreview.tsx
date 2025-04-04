import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Duration, useSetting } from "../app/useSettings";
import { debounce, nullFn, unreachable } from "../util";
import "./Preview.css";
import { ProgressBar } from "./ProgressBar";

function createNamedKeyframes(animName: string, keyframeText: string) {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes ${animName} {
      ${keyframeText}
    }
  `;
  return styleSheet;
}

interface UsePreview {
  preview: ReactElement;
  isPlaying: boolean;
  playPreview(): void;
  stopPreview(): void;
  setDuration(duration: Duration): void;
  duration: Duration;
  isRepeat: boolean;
  setIsRepeat(repeat: boolean): void;
}

interface Props {
  keyframeText: string;
}

export function usePreview({ keyframeText }: Props): UsePreview {
  const ref = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const [isRepeat, setIsRepeatRaw] = useState(false);
  const [durationUnit, setDurationUnit] = useSetting("previewDurationUnit", "ms");
  const [durationTime, setDurationTime] = useSetting("previewDurationTime", 1000);

  function setDuration(duration: Duration) {
    // TODO: validate time and unit
    setDurationTime(duration.time);
    setDurationUnit(duration.unit);
  }

  const duration = useMemo(
    () =>
      ({
        time: durationTime,
        unit: durationUnit,
      } as Duration),
    [durationUnit, durationTime]
  );

  const durationMs = useMemo(() => {
    switch (durationUnit) {
      case "ms":
        return durationTime;
      case "s":
        return durationTime * 1000;

      default:
        unreachable(durationUnit);
        return 1000;
    }
  }, [durationUnit, durationTime]);

  const startAnimationCancellerRef = useRef(nullFn);

  const playAnimation = useCallback(() => {
    if (!ballRef.current || !ref.current) return;

    // remove old styles first
    for (const el of Array.from(ref.current.children)) {
      if (el.nodeName === "STYLE") el.parentNode?.removeChild(el);
    }

    const styleEl = createNamedKeyframes("preview-anim1", keyframeText);
    ref.current.appendChild(styleEl);

    // Must toggle animate class off and on to ensure it runs. Just changing the keyframes is not enough
    ballRef.current.classList.remove("is-animate");
    void ballRef.current.offsetHeight;
    ballRef.current.classList.add("is-animate");
  }, [keyframeText]);

  const stopAnimation = useCallback(() => {
    startAnimationCancellerRef?.current();
    setIsPlaying(false);
    setProgress(0);
    setIsRepeatRaw(false);

    if (ballRef.current) ballRef.current.classList.remove("is-animate");
  }, [setIsRepeatRaw]);

  const setIsRepeat = useCallback(
    (repeat: boolean) => {
      if (repeat) {
        setIsRepeatRaw(true);
        playAnimation();
      } else {
        stopAnimation();
      }
    },
    [playAnimation, stopAnimation, setIsRepeatRaw]
  );

  const startAnimationSoon = useMemo(() => {
    if (startAnimationCancellerRef.current) startAnimationCancellerRef.current();
    return debounce(playAnimation, 500);
  }, [playAnimation]);

  useEffect(() => {
    if (startAnimationCancellerRef.current) startAnimationCancellerRef.current();
    const cancel = startAnimationSoon();
    startAnimationCancellerRef.current = cancel;
    return cancel;
  }, [keyframeText, startAnimationSoon]);

  const style = useMemo(
    () =>
      ({
        "--repeat": isRepeat ? "infinite" : "1",
        "--duration": `${durationMs}ms`,
      } as React.CSSProperties),
    [isRepeat, durationMs]
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalTimer = useRef(-1);

  const didStart = useCallback(() => {
    setIsPlaying(true);
    setProgress(0);
  }, []);

  const didEnd = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
  }, []);

  const didIteration = useCallback(() => {
    setProgress(0);
  }, []);

  useEffect(
    function updateProgressInterval() {
      clearInterval(intervalTimer.current);

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

  const progressBarPosition = useMemo(
    () =>
      ({
        position: "absolute",
        bottom: "0",
        insetInline: "0",
      } as React.CSSProperties),
    []
  );

  const preview = (
    <div
      className="Preview"
      ref={ref}
      style={style}
      onAnimationStart={didStart}
      onAnimationEnd={didEnd}
      onAnimationIteration={didIteration}
    >
      <div className="Preview__content">
        <div className="Preview__ball" ref={ballRef}></div>
      </div>
      <ProgressBar value={progress} style={progressBarPosition} />
    </div>
  );

  return {
    preview,
    isPlaying,
    stopPreview: stopAnimation,
    playPreview: playAnimation,
    duration,
    setDuration,
    isRepeat,
    setIsRepeat,
  };
}
