import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BezierTimeline, createBezierTimeline } from "../timeline/BezierTimeline";
import { BaseDot, Point, UserDot, createRound, createSquare } from "../timeline/point";
import { debounce, round2dp, throttle } from "../util";
import "./App.css";
import { Preview } from "./Preview";
import { Inspector } from "./Inspector";

const defaultDots: UserDot[] = [
  createSquare(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSquare(75, 50),
  createSquare(100, 0),
];

function clean(p: BaseDot): Point {
  return round2dp(p);
}

// function translateX(x: number) {
//   return `translate: ${x}% 0;`;
// }

// function translateY(y: number) {
//   return `translate: 0 ${y}%;`;
// }

// function scale(s: number) {
//   return `scale: ${Math.round(s) / 100}`;
// }

function scaleY(s: number) {
  return `scale: 1 ${Math.round(s) / 100}`;
}

function genCssKeyframes(samples: Point[], invertValues: boolean): string {
  const frames = [];

  for (const sample of samples) {
    const timePercent = round2dp(sample.x);
    const value = round2dp(sample.y);
    frames.push(`${timePercent}% { ${scaleY(invertValues ? -value : value)} }`);
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
  const [selectedPoint, setSelectedPoint] = useState<UserDot | null>(null);
  const [snapToGrid, setSnapToGridRaw] = useState(true);
  const [invertValues, setInvertValues] = useState(false);
  const [output, setOutput] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [sampleCount, setSampleCount] = useState(10);

  /**
   * Update the app display to match the current timeline values.
   */
  const syncWithTimeline = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    setSelectedPoint(timeline.getSelectedDot());
    setOutput(genCssKeyframes(timeline.getSamples(), invertValues));
  }, [invertValues]);

  useEffect(
    function syncOnLoad() {
      syncWithTimeline();
    },
    [syncWithTimeline]
  );

  const syncWithTimelineThrottled = useMemo(() => throttle(syncWithTimeline, 100), [syncWithTimeline]);

  /**
   * Save dot data to localStorage.
   */
  function saveDots() {
    setIsDirty(false);
    if (!timelineRef.current) return;

    const dots = timelineRef.current.getUserDots();
    localStorage.setItem("dots", JSON.stringify(dots));
  }

  const saveDotsDebounced = useMemo(() => debounce(saveDots, 2000), []);

  /**
   * Callback when canvas element is created. Wraps it with a timeline.
   */
  const setCanvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
      }

      timelineRef.current = canvas ? createBezierTimeline({ canvas, userDots: loadSavedDots(), sampleCount }) : null;
    },
    [sampleCount]
  );

  /**
   * Callback for when the timeline changes it isAdding state.
   * @param adding True if adding. False if not.
   */
  const handleAdding = useCallback((adding: boolean) => {
    setIsAdding(adding);
  }, []);

  /**
   * Callback when timeline is changed. Marks as dirty, schedules a save and sync.
   * Fast to return.
   */
  const handleTimelineChange = useCallback(() => {
    setIsDirty(true);
    syncWithTimelineThrottled();
    saveDotsDebounced();
  }, [syncWithTimelineThrottled, saveDotsDebounced]);

  useEffect(
    function setCallbacksOnTimeline() {
      if (!timelineRef.current) return;
      timelineRef.current.onChange = handleTimelineChange;
      timelineRef.current.onAdding = handleAdding;
    },
    [handleTimelineChange, handleAdding]
  );

  function setSnapToGrid(snapToGrid: boolean) {
    setSnapToGridRaw(snapToGrid);
    if (timelineRef.current) {
      timelineRef.current.setSnapToGrid(snapToGrid);
    }
  }

  useEffect(
    /**
     * We debounce saves for a bit since changes are so frequent. If the user navigates away during
     * that time changes would be lost. Whenever we're dirty, this adds a page-hide listener to
     * immediately save those changes. We don't always have this since these listener can interfere
     * with bfcaches.
     */
    function addSaveBeforePageHide() {
      if (!isDirty) return;
      window.addEventListener("pagehide", saveDots);
      return () => {
        window.removeEventListener("pagehide", saveDots);
      };
    },
    [isDirty]
  );

  function handleClickAdd() {
    timelineRef.current!.beginAddingDot();
  }

  function handleClickDelete() {
    timelineRef.current!.deleteSelectedDot();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "a" || e.key === "Shift") {
        if (timelineRef.current) {
          timelineRef.current.beginAddingDot();
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") {
        if (timelineRef.current) {
          timelineRef.current.cancel();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleInspectorSelectedChange(dot: UserDot) {
    if (!timelineRef.current) return;

    console.info(">>> dot.x", dot.x);
    timelineRef.current.updateSelectedDot(dot);
    syncWithTimeline();
    // console.info(">>> dot", dot);
  }

  function handleSampleCountChange(count: number) {
    setSampleCount(count);
    if (timelineRef.current) timelineRef.current.setSampleCount(count);
  }

  return (
    <div className="stack">
      {/* 100 x 300 logical | 100% x (200% over 100%) */}
      <div className="timeline-row">
        <div className="timeline-wrapper">
          <canvas
            height={600}
            width={900}
            id="canvas"
            ref={setCanvasRef}
            tabIndex={0}
            className={"timeline " + (isAdding ? "is-adding" : "")}
          />
        </div>

        <Inspector
          snapToGrid={snapToGrid}
          invertValues={invertValues}
          onSnapToGrid={setSnapToGrid}
          onInvertValues={setInvertValues}
          selected={selectedPoint}
          onChangeSelected={handleInspectorSelectedChange}
          onSampleCount={handleSampleCountChange}
          sampleCount={sampleCount}
        />
      </div>
      <div>
        <button onClick={handleClickAdd} disabled={isAdding}>
          Add
        </button>

        <button onClick={handleClickDelete} disabled={!selectedPoint}>
          Delete
        </button>
      </div>

      <Preview keyframeText={output} />

      <div>
        <textarea cols={80} rows={25} disabled value={output}></textarea>
      </div>

      <p>{selectedPoint && JSON.stringify(clean(selectedPoint))}</p>
    </div>
  );
}

export default App;
