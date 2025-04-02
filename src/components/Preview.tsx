import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSetting } from "../app/useSettings";
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

export const Preview = memo(function Preview({ keyframeText }: { keyframeText: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const [repeat, setRepeat] = useSetting("repeatPreview", false);
  const [durationMs] = useState(1000);

  function startAnimation(keyframeText: string) {
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
  }

  function stopAnimation() {
    if (!ballRef.current || !ref.current) return;
    ballRef.current.classList.remove("is-animate");

    setIsRunning(false);
    setProgress(0);
  }

  const startAnimationSoon = useMemo(() => debounce(startAnimation, 500), []);

  const startAnimationCancellerRef = useRef(nullFn);

  useEffect(() => {
    const cancel = startAnimationSoon(keyframeText);
    startAnimationCancellerRef.current = cancel;
    return cancel;
  }, [keyframeText, startAnimationSoon]);

  const repeatStyle = !repeat
    ? undefined
    : ({
        "--repeat": "infinite",
      } as React.CSSProperties);

  function handleClickStart() {
    startAnimation(keyframeText);
  }

  function handleClickStop() {
    startAnimationCancellerRef?.current();
    stopAnimation();
    setRepeat(false);
  }

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalTimer = useRef(-1);

  function didStart() {
    setIsRunning(true);
    setProgress(0);
  }

  function didEnd() {
    setIsRunning(false);
    setProgress(100);
  }

  function didIteration() {
    setProgress(0);
  }

  useEffect(
    function updateProgress() {
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

  function handleClickRepeat(e: React.ChangeEvent<HTMLInputElement>) {
    const willRepeat = e.target.checked;
    setRepeat(willRepeat);

    if (willRepeat) {
      startAnimation(keyframeText);
    } else {
      stopAnimation();
    }
  }

  const progressBarPosition = useMemo(
    () =>
      ({
        position: "absolute",
        bottom: "0",
        insetInline: "0",
      } as React.CSSProperties),
    []
  );

  return (
    <div onAnimationStart={didStart} onAnimationEnd={didEnd} onAnimationIteration={didIteration}>
      <div className="Preview" ref={ref} style={repeatStyle} onClick={handleClickStart}>
        <div className="Preview__content">
          <div className="Preview__ball" ref={ballRef}></div>
        </div>
        <ProgressBar value={progress} style={progressBarPosition} />
      </div>
      <label className="block-label">
        <input type="checkbox" checked={repeat} onChange={handleClickRepeat} />
        <span>Loop</span>
      </label>
      <div>
        {isRunning ? (
          <button className="push-button" onClick={handleClickStop}>
            Stop
          </button>
        ) : (
          <button className="push-button" onClick={handleClickStart}>
            Start
          </button>
        )}
      </div>
    </div>
  );
});
