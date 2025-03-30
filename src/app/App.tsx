import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Inspector } from "../components/Inspector";
import { Preview } from "../components/Preview";
import { BezierTimeline, createBezierTimeline } from "../timeline/BezierTimeline";
import { Point, UserDot, createRound, createSquare } from "../timeline/point";
import { debounce, round2dp, throttle } from "../util";
import "./App.css";
import { OutFunctions, OutProperty } from "./OutFunctions";
import { useSetting } from "./useSettings";

const defaultDots: UserDot[] = [
  createSquare(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSquare(75, 50),
  createSquare(100, 0),
];

function genCssKeyframeText(samples: Point[], outProperty: OutProperty, invertValues: boolean): string {
  const frames = [];

  const fn = OutFunctions[outProperty].fn;

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
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // settings
  const [outProperty, setOutProperty] = useSetting("outProperty", "translateX");
  const [sampleCount, setSampleCount] = useSetting("sampleCount", 10);
  const [snapToGrid, setSnapToGrid] = useSetting("snapToGrid", true);
  const [invertValues, setInvertValues] = useSetting("invertValues", false);

  // Used to force a reactive update after the timeline redraws itself. Since the timeline is not
  // React, we instead listen to its callback and manually call this.
  const [timelineDrawCount, incrementTimelineDrawCount] = useReducer((old: number) => {
    return old + 1;
  }, 0);

  /**
   * Save dot and settings data to localStorage.
   */
  const saveDots = useCallback(() => {
    isDotsDirty(false);
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

    if (!canvas) return;

    const timeline = createBezierTimeline({ canvas, savedUserDots: loadSavedDots() });
    timelineRef.current = timeline;
  }, []);

  useEffect(
    function pushSampleCount() {
      if (timelineRef.current) timelineRef.current.setSampleCount(sampleCount);
    },
    [sampleCount]
  );

  useEffect(
    function pushSnapToGrid() {
      if (timelineRef.current) timelineRef.current.setSnapToGrid(snapToGrid);
    },
    [snapToGrid]
  );

  useEffect(
    /**
     * Adds callback to timeline for data changes.
     */
    function setCallbacksOnTimeline() {
      const timeline = timelineRef.current;
      if (!timeline) return;

      const saveDotsDebounced = debounce(saveDots, 2000);

      const didDrawThrottled = throttle(() => {
        setSelectedDot(timeline.getSelectedDot());
        incrementTimelineDrawCount();
      }, 100);

      timeline.onDraw = () => {
        isDotsDirty(true);
        didDrawThrottled();
        saveDotsDebounced();
      };

      timeline.onAdding = (adding: boolean) => {
        setIsAdding(adding);
      };
    },
    [saveDots]
  );

  useEffect(
    /**
     * We debounce saves for a bit since changes are so frequent. If the user navigates away during
     * that time changes would be lost. Whenever we're dirty, this adds a page-hide listener to
     * immediately save those changes. We don't always have this since these listener can interfere
     * with bfcaches.
     */
    function addSaveBeforePageHide() {
      if (!isDataDirty) return;

      window.addEventListener("pagehide", saveDots);
      return () => {
        window.removeEventListener("pagehide", saveDots);
      };
    },
    [isDataDirty, saveDots]
  );

  function handleClickAdd() {
    timelineRef.current!.beginAddingDot();
  }

  function handleClickDelete() {
    timelineRef.current!.deleteSelectedDot();
  }

  useEffect(function addEventListenersOnMount() {
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

    // Update the selected dot not so it is not throttled. While this will get pulled again in
    // response to the timeline drawing, that is throttled and we don't want to wait.
    setSelectedDot(dot);
  }

  const keyframeText = useMemo(() => {
    void timelineDrawCount;
    if (!timelineRef.current) return "";

    return genCssKeyframeText(timelineRef.current.getSamples(), outProperty, invertValues);
  }, [outProperty, invertValues, timelineDrawCount]);

  return (
    <div className="stack">
      {/* 100 x 300 logical | 100% x (200% over 100%) */}
      <div className="timeline-row">
        <div className="timeline-wrapper">
          <canvas
            width={940}
            height={640}
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
          onSampleCount={setSampleCount}
          onInvertValues={setInvertValues}
          onSnapToGrid={setSnapToGrid}
          selected={selectedDot}
          onChangeSelected={handleInspectorSelectedChange}
        />
      </div>
      <div>
        <button onClick={handleClickAdd} disabled={isAdding}>
          Add
        </button>

        <button onClick={handleClickDelete} disabled={!selectedDot}>
          Delete
        </button>
      </div>

      <Preview keyframeText={keyframeText} />

      <div>
        <textarea cols={80} rows={10} disabled value={keyframeText}></textarea>
      </div>
    </div>
  );
}

export default App;
