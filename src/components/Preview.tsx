import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { debounce, nullFn } from "../util";
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
  startPreview(): void;
  stopPreview(): void;
  isRunning: boolean;
  preview: ReactElement;
}

interface Props {
  keyframeText: string;
  durationMs: number;
  repeat: boolean;
}

export function usePreview({ keyframeText, durationMs, repeat }: Props): UsePreview {
  const ref = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const startAnimationCancellerRef = useRef(nullFn);

  const startAnimation = useCallback(() => {
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
    setIsRunning(false);
    setProgress(0);
    // setRepeat(false);

    if (ballRef.current) ballRef.current.classList.remove("is-animate");
  }, []);

  const startAnimationSoon = useMemo(() => {
    if (startAnimationCancellerRef.current) startAnimationCancellerRef.current();
    return debounce(startAnimation, 500);
  }, [startAnimation]);

  useEffect(() => {
    if (startAnimationCancellerRef.current) startAnimationCancellerRef.current();
    const cancel = startAnimationSoon();
    startAnimationCancellerRef.current = cancel;
    return cancel;
  }, [keyframeText, startAnimationSoon]);

  const repeatStyle = useMemo(
    () =>
      !repeat
        ? undefined
        : ({
            "--repeat": "infinite",
          } as React.CSSProperties),
    [repeat]
  );

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalTimer = useRef(-1);

  const didStart = useCallback(() => {
    setIsRunning(true);
    setProgress(0);
  }, []);

  const didEnd = useCallback(() => {
    setIsRunning(false);
    setProgress(100);
  }, []);

  const didIteration = useCallback(() => {
    setProgress(0);
  }, []);

  useEffect(
    function updateProgressInterval() {
      clearInterval(intervalTimer.current);

      if (!isRunning) {
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
    [isRunning, durationMs]
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
      style={repeatStyle}
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
    startPreview: startAnimation,
    stopPreview: stopAnimation,
    isRunning,
    preview,
  };
}
