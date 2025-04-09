import { Duration, useSetting } from "@app/useSettings";
import { debounce, nullFn, unreachable } from "@util";
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Preview.css";
import { ProgressBar } from "./ProgressBar";

interface UsePreview {
  preview: ReactElement;
  isPlaying: boolean;
  playPreview(): void;
  stopPreview(): void;
  setDuration(duration: Duration): void;
  duration: Duration;
  isRepeat: boolean;
  setIsRepeat(repeat: boolean): void;
  isAutoPlay: boolean;
  setIsAutoPlay(autoPlay: boolean): void;
}

interface Props {
  keyframeText: string;
}

export function usePreview({ keyframeText }: Props): UsePreview {
  const ref = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const [isRepeat, setIsRepeatRaw] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useSetting("isPreviewAutoPlay", true);
  const [durationUnit, setDurationUnit] = useSetting("previewDurationUnit", "ms");
  const [durationTime, setDurationTime] = useSetting("previewDurationTime", 1000);

  function setDuration(duration: Duration) {
    // TODO: validate time and unit
    setDurationTime(Math.max(1, duration.time));
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

  const playSoonCancellerRef = useRef(nullFn);

  const playAnimation = useCallback(function playAnimation() {
    if (!ballRef.current || !ref.current) return;

    // Must toggle animate class off and on to ensure it runs. Just changing the keyframes is not enough
    ballRef.current.classList.remove("is-animate");
    void ballRef.current.offsetHeight;
    ballRef.current.classList.add("is-animate");
  }, []);

  const stopAnimation = useCallback(function stopAnimation() {
    playSoonCancellerRef?.current();
    setIsPlaying(false);
    setProgress(0);

    if (ballRef.current) ballRef.current.classList.remove("is-animate");
  }, []);

  const setIsRepeat = useCallback(
    function setIsRepeat(repeat: boolean) {
      setIsRepeatRaw(repeat);

      if (repeat) {
        // Play when repeat is set to true as a convenience since they probably want this. When
        // repeat is set to false, we just let the current animation continue, but it won't repeat.
        playAnimation();
      }
    },
    [playAnimation, setIsRepeatRaw]
  );

  const playAnimationSoon = useMemo(() => {
    if (playSoonCancellerRef.current) playSoonCancellerRef.current();
    return debounce(playAnimation, 500);
  }, [playAnimation]);

  const prevKeyframeTextRef = useRef("");

  useEffect(
    function playAutomatically() {
      // Must always store the last keyframe even if off. Otherwise, when setting repeat to false we
      // will come in here, thinks it's a changed and fire the animation an extra time since we
      // won't know if it's a response to a change or not.
      if (keyframeText === prevKeyframeTextRef.current) return;
      prevKeyframeTextRef.current = keyframeText;

      // only fire if autoPlay is set
      if (!isAutoPlay) return;

      // if we're repeating anyway, we can ignore this.
      if (isRepeat) return;

      if (playSoonCancellerRef.current) playSoonCancellerRef.current();
      const cancel = playAnimationSoon();
      playSoonCancellerRef.current = cancel;
      return cancel;
    },
    [keyframeText, playAnimationSoon, isAutoPlay, isRepeat]
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

  const cssVariables = useMemo(
    () =>
      ({
        "--repeat": isRepeat ? "infinite" : "1",
        "--duration": `${durationMs}ms`,
      } as React.CSSProperties),
    [isRepeat, durationMs]
  );

  const namedKeyframes = useMemo(() => {
    void keyframeText;
    return `@keyframes preview-anim1 {\n${keyframeText}\n}`;
  }, [keyframeText]);

  const preview = (
    <div
      className="Preview"
      ref={ref}
      style={cssVariables}
      onAnimationStart={didStart}
      onAnimationEnd={didEnd}
      onAnimationIteration={didIteration}
      onClick={playAnimation}
    >
      <style>{namedKeyframes}</style>
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
    isAutoPlay,
    setIsAutoPlay,
  };
}
