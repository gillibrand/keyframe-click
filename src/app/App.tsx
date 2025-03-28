import { useCallback, useEffect, useRef, useState } from "react";
import { Inspector } from "../components/Inspector";
import { Preview } from "../components/Preview";
import { BezierTimeline, createBezierTimeline } from "../timeline/BezierTimeline";
import { Point, UserDot, createRound, createSquare } from "../timeline/point";
import { debounce, round2dp, throttle } from "../util";
import "./App.css";
import { OutputFunctions } from "./OutputFunctions";
import { useSetting } from "./useSettings";

const defaultDots: UserDot[] = [
  createSquare(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSquare(75, 50),
  createSquare(100, 0),
];

function genCssKeyframes(samples: Point[], outProperty: string, invertValues: boolean): string {
  const frames = [];

  const fn = OutputFunctions[outProperty].fn;

  for (const sample of samples) {
    const timePercent = round2dp(sample.x);
    const value = round2dp(sample.y);
    frames.push(`${timePercent}% { ${fn(invertValues ? -value : value)} }`);
  }

  return frames.join("\n");
}

const StorageDots = "kc.dots";

function loadSavedDots(): UserDot[] {
  const json = localStorage.getItem(StorageDots);
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
  const [output, setOutput] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // settings
  const [outProperty, setOutProperty] = useSetting("outProperty");
  const [sampleCount, setSampleCount] = useSetting("sampleCount");
  const [snapToGrid, setSnapToGridRaw] = useSetting("snapToGrid");
  const [invertValues, setInvertValues] = useSetting("invertValues");

  /**
   * Update the app display to match the current timeline values.
   */
  const syncWithTimeline = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    setSelectedPoint(timeline.getSelectedDot());
    setOutput(genCssKeyframes(timeline.getSamples(), outProperty, invertValues));
  }, [invertValues, outProperty]);

  /**
   * Save dot and settings data to localStorage.
   */
  const saveDots = useCallback(() => {
    setIsDirty(false);
    if (!timelineRef.current) return;

    const dots = timelineRef.current.getUserDots();
    localStorage.setItem(StorageDots, JSON.stringify(dots));
  }, []);

  /**
   * Callback when canvas element is created. Wraps it with a timeline.
   */
  const setCanvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (timelineRef.current) {
      timelineRef.current.destroy();
      timelineRef.current = null;
    }

    timelineRef.current = canvas ? createBezierTimeline({ canvas, savedUserDots: loadSavedDots() }) : null;
  }, []);

  useEffect(
    function setCallbacksOnTimeline() {
      if (!timelineRef.current) return;

      const saveDotsDebounced = debounce(saveDots, 2000);
      const syncWithTimelineThrottled = throttle(syncWithTimeline, 100);

      timelineRef.current.onDraw = () => {
        setIsDirty(true);
        syncWithTimelineThrottled();
        saveDotsDebounced();
      };

      timelineRef.current.onAdding = (adding: boolean) => {
        setIsAdding(adding);
      };
    },
    [syncWithTimeline, saveDots]
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
    [isDirty, saveDots]
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

    timelineRef.current.updateSelectedDot(dot);
    syncWithTimeline();
  }

  function handleSampleCountChange(count: number) {
    setSampleCount(count);
    if (timelineRef.current) timelineRef.current.setSampleCount(count);
  }

  useEffect(
    function syncOnLoad() {
      syncWithTimeline();
    },
    [syncWithTimeline]
  );

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
          outProperty={outProperty}
          sampleCount={sampleCount}
          invertValues={invertValues}
          snapToGrid={snapToGrid}
          onOutProperty={setOutProperty}
          onSampleCount={handleSampleCountChange}
          onInvertValues={setInvertValues}
          onSnapToGrid={setSnapToGrid}
          selected={selectedPoint}
          onChangeSelected={handleInspectorSelectedChange}
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
        <textarea cols={80} rows={10} disabled value={output}></textarea>
      </div>
    </div>
  );
}

export default App;
