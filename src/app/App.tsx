import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BaseDot, UserDot, Point, createSharp, createRound } from "../timeline/point";
import { createBezierTimeline, BezierTimeline } from "../timeline/BezierTimeline";
import { debounce, throttle } from "../util";
import { Preview } from "./Preview";

const defaultDots: UserDot[] = [
  createSharp(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSharp(75, 50),
  createSharp(100, 0),
];

function roundHundredths(n: number): number;
function roundHundredths(p: Point): Point;
function roundHundredths(p: Point | number): Point | number {
  if (typeof p === "number") {
    return Math.round(p * 100) / 100;
  } else {
    return {
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
    };
  }
}

function clean(p: BaseDot): Point {
  return roundHundredths(p);
}

// function translateX(x: number) {
//   return `translate: ${x}% 0;`;
// }

function translateY(y: number) {
  return `translate: 0 ${y}%;`;
}

// function scale(s: number) {
//   return `scale: ${Math.round(s) / 100}`;
// }

function genCssKeyframes(samples: Point[], invertValues: boolean): string {
  const frames = [];

  for (const sample of samples) {
    const timePercent = roundHundredths(sample.x);
    const value = roundHundredths(sample.y);
    frames.push(`${timePercent}% { ${translateY(invertValues ? -value : value)} }`);
  }

  return frames.join("\n");
}

function loadSavedDots(): UserDot[] {
  const json = localStorage.getItem("dots");
  if (!json) return defaultDots;

  try {
    return JSON.parse(json);
  } catch {
    return defaultDots;
  }
}

function App() {
  const timelineRef = useRef<BezierTimeline | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<BaseDot | null>(null);
  const [snapToGrid, setSnapToGridRaw] = useState(true);
  const [invertValues, setInvertValues] = useState(false);
  const [output, setOutput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const updateFromTimeline = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    setSelectedPoint(timeline.getSelectedDot());
    setOutput(genCssKeyframes(timeline.getSamples(), invertValues));
  }, [invertValues]);

  useEffect(() => {
    updateFromTimeline();
  }, [updateFromTimeline]);

  const updateFromTimelineThrottled = useMemo(() => throttle(updateFromTimeline, 100), [updateFromTimeline]);

  function saveDots() {
    console.info(">>> save 2");
    setIsDirty(false);

    if (!timelineRef.current) return;

    const dots = timelineRef.current.getUserDots();

    localStorage.setItem("dots", JSON.stringify(dots));
    console.info(">>> dots", dots);
  }

  const saveDotsDebounced = useMemo(() => debounce(saveDots, 2000), []);

  const handleTimelineChange = useCallback(() => {
    setIsDirty(true);
    updateFromTimelineThrottled();
    saveDotsDebounced();
  }, [updateFromTimelineThrottled, saveDotsDebounced]);

  const setCanvas = useCallback((canvas: HTMLCanvasElement) => {
    if (timelineRef.current) {
      // xxx: data is local to timeline so will be lost
      timelineRef.current.destroy();
      timelineRef.current = null;
    }

    timelineRef.current = canvas ? createBezierTimeline({ canvas, userDots: loadSavedDots() }) : null;
  }, []);

  useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.onChange = handleTimelineChange;
  }, [handleTimelineChange]);

  function setSnapToGrid(snapToGrid: boolean) {
    setSnapToGridRaw(snapToGrid);
    if (timelineRef.current) {
      timelineRef.current.setSnapToGrid(snapToGrid);
    }
  }

  useEffect(
    function addInstantSaveOnPageHide() {
      if (!isDirty) return;
      window.addEventListener("pagehide", saveDots);
      return () => {
        window.removeEventListener("pagehide", saveDots);
      };
    },
    [isDirty]
  );

  // console.info(">>> output", output);
  return (
    <>
      {/* 100 x 300 logical | 100% x (200% over 100%) */}
      <canvas height={600} width={900} id="canvas" ref={setCanvas} tabIndex={0} />
      <p>
        <label>
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} /> Snap to grid
        </label>
        <label>
          <input type="checkbox" checked={invertValues} onChange={(e) => setInvertValues(e.target.checked)} /> Invert
          values
        </label>
        {isDirty && <span>*</span>}
      </p>

      <Preview keyframeText={output} />

      <div>
        <textarea cols={80} rows={25} disabled value={output}></textarea>
      </div>

      <p>{selectedPoint && JSON.stringify(clean(selectedPoint))}</p>
    </>
  );
}

export default App;
