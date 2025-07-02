import { usePreviewApi } from "@app/usePreviewApi";
import { Duration, TimeUnit, useSetting } from "@app/useSettings";
import astroSrc from "@images/astro.png";
import heartSrc from "@images/heart.png";
import { debounce, nullFn, unreachable } from "@util";
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Preview.css";
import { ProgressBar } from "./ProgressBar";

export type Speed = 1 | 0.5 | 0.25 | 0.1;

interface UsePreview {
  preview: ReactElement;
  isPlaying: boolean;
  playPreview(): void;
  stopPreview(): void;
  togglePreview(): void;
  setDuration(duration: Duration): void;
  duration: Duration;
  isRepeat: boolean;
  setIsRepeat(repeat: boolean): void;
  isAutoPlay: boolean;
  setIsAutoPlay(autoPlay: boolean): void;
  speed: Speed;
  setSpeed(percent: Speed): void;
}

interface Props {
  keyframeText: string;
}

interface PreviousState {
  keyframeText: string;
  durationTime: number | null;
  durationUnit: TimeUnit;
  speed: Speed;
}

const HelloWorld = "Hello, World!";

function normalizePreviewText(text: string) {
  text = text.trim();

  if (text.length === 0) return HelloWorld;

  return text;
}

export function usePreview({ keyframeText }: Props): UsePreview {
  const graphicRef = useRef<HTMLDivElement>(null);

  const { isRepeat, ...previewApi } = usePreviewApi();
  const [isAutoPlay, setIsAutoPlay] = useSetting("isPreviewAutoPlay", true);
  const [durationUnit, setDurationUnit] = useSetting("previewDurationUnit", "s");
  const [durationTime, setDurationTime] = useSetting("previewDurationTime", 1);
  const [speed, setSpeed] = useSetting("previewSpeed", 1);
  const [graphic] = useSetting("previewGraphic", "astro");

  const setDuration = useCallback(
    (duration: Duration) => {
      // TODO: validate time and unit
      setDurationTime(duration.time === null ? null : Math.max(0, duration.time));
      setDurationUnit(duration.unit);
    },
    [setDurationUnit, setDurationTime]
  );

  const duration = useMemo(
    () =>
      ({
        time: durationTime,
        unit: durationUnit,
      }) as Duration,
    [durationUnit, durationTime]
  );

  const durationMs = useMemo(() => {
    switch (durationUnit) {
      case "ms":
        return durationTime ?? 0;
      case "s":
        return (durationTime ?? 0) * 1000;

      default:
        unreachable(durationUnit);
        return 1000;
    }
  }, [durationUnit, durationTime]);

  const playSoonCancellerRef = useRef(nullFn);

  const playPreview = useCallback(function playPreview() {
    if (!graphicRef.current) return;

    // Must toggle animate class off and on to ensure it runs. Just changing the keyframes is not enough
    graphicRef.current.classList.remove("is-animate");
    void graphicRef.current.offsetHeight;
    graphicRef.current.classList.add("is-animate");
    setIterationCount((prev) => prev + 1);
  }, []);

  const stopPreview = useCallback(function stopAnimation() {
    playSoonCancellerRef?.current();
    setIsPlaying(false);

    if (graphicRef.current) graphicRef.current.classList.remove("is-animate");
  }, []);

  const setIsRepeat = useCallback(
    function setIsRepeat(repeat: boolean) {
      previewApi.setIsRepeat(repeat);

      if (repeat) {
        // Play when repeat is set to true as a convenience since they probably want this. When
        // repeat is set to false, we just let the current animation continue, but it won't repeat.
        playPreview();
      }
    },
    [playPreview, previewApi]
  );

  const playPreviewSoon = useMemo(() => {
    if (playSoonCancellerRef.current) playSoonCancellerRef.current();
    return debounce(playPreview, 500);
  }, [playPreview]);

  const previousState = useRef<PreviousState>({
    keyframeText: "",
    durationTime: null,
    durationUnit: "s",
    speed: -1 as Speed,
  });
  // const prevKeyframeTextRef = useRef("");

  useEffect(
    function playAutomatically() {
      const prev = previousState.current;
      // Must always store the last keyframe even if off. Otherwise, when setting repeat to false we
      // will come in here, thinks it's a changed and fire the animation an extra time since we
      // won't know if it's a response to a change or not.
      if (
        keyframeText === prev.keyframeText &&
        duration.time === prev.durationTime &&
        duration.unit === prev.durationUnit &&
        speed === prev.speed
      ) {
        return;
      }

      try {
        // Don't auto play on mount. This must be in the try block to now save the keyframe text and
        // play auto next time
        if (!prev.keyframeText) return;

        // if we're repeating anyway, we can ignore this.
        if (isRepeat) return;

        if (playSoonCancellerRef.current) playSoonCancellerRef.current();

        if (keyframeText === prev.keyframeText) {
          // This is a change to something besides they keyframes, so just start it right away.
          playPreview();
          return;
        }

        // This was a keyframe change from interacting with the timeline, so delay it a bit so we
        // aren't constantly starting previews as they drag around.
        stopPreview();
        const cancel = playPreviewSoon();
        playSoonCancellerRef.current = cancel;
        return cancel;
      } finally {
        prev.keyframeText = keyframeText;
        prev.durationTime = duration.time;
        prev.durationUnit = duration.unit;
        prev.speed = speed;
      }
    },
    [keyframeText, playPreviewSoon, isRepeat, duration, speed, playPreview, stopPreview]
  );

  const [isPlaying, setIsPlaying] = useState(false);

  const didStart = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const didEnd = useCallback(() => {
    stopPreview();
  }, [stopPreview]);

  const togglePreview = useCallback(() => {
    if (isPlaying) {
      stopPreview();
    } else {
      playPreview();
    }
  }, [isPlaying, stopPreview, playPreview]);

  const didIteration = useCallback(() => {
    setIterationCount((prev) => prev + 1);
  }, []);

  const progressBarPosition = useMemo(
    () =>
      ({
        position: "absolute",
        bottom: "0",
        insetInline: "0",
      }) as React.CSSProperties,
    []
  );

  const cssVariables = useMemo(
    () =>
      ({
        "--repeat": isRepeat ? "infinite" : "1",
        "--duration": `${durationMs / speed}ms`,
      }) as React.CSSProperties,
    [isRepeat, durationMs, speed]
  );

  const namedKeyframes = useMemo(() => {
    void keyframeText;
    return `@keyframes preview-anim1 {\n${keyframeText}\n}`;
  }, [keyframeText]);

  // Count each unique play or iteration, since it's a way to easily know if the progress bar needs
  // to restart without needing to toggle isPlaying off/on for a render.
  const [iterationCount, setIterationCount] = useState(0);

  // This key is used to force a remount of the ProgressPlayer, effectively restarting it. React is weird.
  const progressPlayerKey = useMemo(() => String(iterationCount), [iterationCount]);

  const [previewText] = useSetting("previewText", HelloWorld);

  function renderGraphic() {
    switch (graphic) {
      case "astro":
        return <img src={astroSrc} className="Preview__astro" />;

      case "ball":
        return <div className="Preview__ball" />;

      case "heart":
        return <img src={heartSrc} className="Preview__heart" />;

      case "text":
        return <div className="Preview__text">{normalizePreviewText(previewText)}</div>;

      default: {
        unreachable(graphic);
        return <img src={astroSrc} className="Preview__astro" />;
      }
    }
  }

  const preview = (
    <div
      className="tile grid flex-1 cursor-pointer place-items-center overflow-hidden bg-white"
      style={cssVariables}
      onAnimationStart={didStart}
      onAnimationEnd={didEnd}
      onAnimationIteration={didIteration}
      onClick={togglePreview}
    >
      <div className="relative border-1 border-dashed border-gray-300">
        <style>{namedKeyframes}</style>
        <div className="Preview__graphic" ref={graphicRef}>
          {renderGraphic()}
        </div>
      </div>

      <ProgressBar
        durationMs={durationMs / speed}
        isPlaying={isPlaying}
        style={progressBarPosition}
        key={progressPlayerKey}
      />
    </div>
  );

  return {
    preview,
    isPlaying,
    stopPreview,
    playPreview,
    togglePreview,
    duration,
    setDuration,
    isRepeat,
    setIsRepeat,
    isAutoPlay,
    setIsAutoPlay,
    speed,
    setSpeed,
  };
}
