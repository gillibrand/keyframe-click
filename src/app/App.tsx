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

function genCssKeyframeText(samples: Point[], outProperty: string, invertValues: boolean): string {
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
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [keyframeText, setKeyframeText] = useState("");
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // settings
  const [outProperty, setOutProperty] = useSetting("outProperty");
  const [sampleCount, setSampleCount] = useSetting("sampleCount");
  const [snapToGrid, setSnapToGrid] = useSetting("snapToGrid");
  const [invertValues, setInvertValues] = useSetting("invertValues");

  /**
   * Update the app display to match the current timeline values.
   */
  const pullDataFromTimeline = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    setSelectedDot(timeline.getSelectedDot());
    setKeyframeText(genCssKeyframeText(timeline.getSamples(), outProperty, invertValues));
  }, [invertValues, outProperty]);

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
    /**
     * Timeline is not reactive, so we need to manually update it with any changes to settings. Note
     * that these are NOT set in the timeline factory function so that we only create it once. So
     * this sets the initial settings, plus updates later.
     */
    function pushSettingsToTimeline() {
      const timeline = timelineRef.current;
      if (!timeline) return;

      timeline.setSampleCount(sampleCount);
      timeline.setSnapToGrid(snapToGrid);
    },
    [sampleCount, snapToGrid]
  );

  useEffect(
    /**
     * Adds callback to timeline for data changes. This only fires once.
     */
    function setCallbacksOnTimeline() {
      const timeline = timelineRef.current;
      if (!timeline) return;

      const saveDotsDebounced = debounce(saveDots, 2000);
      const pullDataFromTimelineThrottled = throttle(pullDataFromTimeline, 100);

      timeline.onDraw = () => {
        isDotsDirty(true);
        pullDataFromTimelineThrottled();
        saveDotsDebounced();
      };

      timeline.onAdding = (adding: boolean) => {
        setIsAdding(adding);
      };
    },
    [pullDataFromTimeline, saveDots]
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
    pullDataFromTimeline();
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
