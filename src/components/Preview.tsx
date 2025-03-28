import { memo, useEffect, useMemo, useRef, useState } from "react";
import "./Preview.css";
import { debounce } from "../util";

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
  const [infinite, setInfinite] = useState(false);

  function runAnimation(keyframeText: string) {
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

  const runAnimationSoon = useMemo(() => debounce(runAnimation, 500), []);

  useEffect(() => {
    const cleanup = runAnimationSoon(keyframeText);
    return cleanup;
  }, [keyframeText, runAnimationSoon]);

  const style = !infinite
    ? undefined
    : ({
        "--repeat": "infinite",
      } as React.CSSProperties);

  function handleClick() {
    if (!infinite) {
      runAnimation(keyframeText);
    }
  }

  return (
    <div>
      <div className="Preview" ref={ref} onClick={handleClick} style={style}>
        <div className="Preview__content">
          <div className="Preview__ball" ref={ballRef}></div>
        </div>
      </div>
      <label className="block-label">
        <input type="checkbox" checked={infinite} onChange={(e) => setInfinite(e.target.checked)} />
        <span>Repeat</span>
      </label>
    </div>
  );
});
