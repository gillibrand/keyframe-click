import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { PreviewInspector } from "../components/PreviewInspector";
import { TimelineInspector } from "../components/TimelineInspector";
import { usePreview } from "../components/usePreview";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // timeline settings
  const [outProperty, setOutProperty] = useSetting("outProperty", "translateX");
  const [sampleCount, setSampleCount] = useSetting("sampleCount", 10);
  const [snapToGrid, setSnapToGrid] = useSetting("isSnapToGrid", true);
  const [labelYAxis, setLabelYAxis] = useSetting("isLabelYAxis", true);
  const [invertValues, setInvertValues] = useSetting("isInvertValues", false);

  // preview

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
  useEffect(function createTimeline() {
    if (timelineRef.current) {
      timelineRef.current.destroy();
      timelineRef.current = null;
    }

    const canvas = canvasRef.current;
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
    function pushSnapToGrid() {
      if (timelineRef.current) timelineRef.current.setLabelYAxis(labelYAxis);
    },
    [labelYAxis]
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
        if (!adding) setShowMessage(false);
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

  const handleClickAdd = useCallback(() => {
    if (!canvasRef.current) return;

    setShowMessage(true);
    const timeline = timelineRef.current;
    if (!timeline) return;

    if (isAdding) {
      timeline.cancel();
    } else {
      timeline.beginAddingDot();
    }
  }, [isAdding]);

  const handleClickDelete = useCallback(() => {
    timelineRef.current!.deleteSelectedDot();
  }, []);

  const lastMouseRef = useRef<Point>({ x: -1, y: -1 });

  function handleMouseMove(e: MouseEvent) {
    lastMouseRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
  }

  useEffect(function addEventListenersOnMount() {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") {
        if (timelineRef.current && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const at = {
            x: lastMouseRef.current.x - rect.x,
            y: lastMouseRef.current.y - rect.y,
          };

          timelineRef.current.beginAddingDot(at);
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.addEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleInspectorSelectedChange = useCallback((dot: UserDot) => {
    if (!timelineRef.current) return;

    timelineRef.current.updateSelectedDot(dot);

    // Update the selected dot not so it is not throttled. While this will get pulled again in
    // response to the timeline drawing, that is throttled and we don't want to wait.
    setSelectedDot(dot);
  }, []);

  const keyframeText = useMemo(() => {
    void timelineDrawCount;
    if (!timelineRef.current) return "";

    return genCssKeyframeText(timelineRef.current.getSamples(), outProperty, invertValues);
  }, [outProperty, invertValues, timelineDrawCount]);

  useEffect(() => {
    document.body.classList.toggle("is-adding", isAdding);
    return () => document.body.classList.remove("is-adding");
  }, [isAdding]);

  const { preview, isPlaying, playPreview, stopPreview, duration, setDuration, setIsRepeat, isRepeat } = usePreview({
    keyframeText,
  });

  return (
    <>
      {/* <h2>Animation Timeline</h2> */}
      {/* 100 x 300 logical | 100% x (200% over 100%) */}

      <div className="big-row">
        <div className="container">
          <div className="inspector-sidebar">
            <div className="timeline-wrapper">
              {isAdding && showMessage && <div className="timeline-message">Click timeline to add</div>}
              <canvas
                width={920}
                height={620}
                id="canvas"
                ref={canvasRef}
                tabIndex={0}
                className={"timeline " + (isAdding ? "is-adding" : "")}
              />
            </div>

            <TimelineInspector
              outProperty={outProperty}
              sampleCount={sampleCount}
              invertValues={invertValues}
              snapToGrid={snapToGrid}
              onOutProperty={setOutProperty}
              onSampleCount={setSampleCount}
              onInvertValues={setInvertValues}
              onSnapToGrid={setSnapToGrid}
              selected={selectedDot}
              onChangeSelectedProps={handleInspectorSelectedChange}
              labelYAxis={labelYAxis}
              onLabelYAxis={setLabelYAxis}
              onClickAdd={handleClickAdd}
              onClickDelete={handleClickDelete}
              isAdding={isAdding}
            />
          </div>
        </div>
      </div>

      <div className="big-row big-row--alt">
        <div className="container">
          <aside className="inspector-sidebar">
            <div className="col-2 gap-4">
              <code>
                <pre>{keyframeText}</pre>
              </code>
              {preview}
            </div>

            <PreviewInspector
              isPlaying={isPlaying}
              duration={duration}
              onChangeDuration={setDuration}
              isRepeat={isRepeat}
              onChangeIsRepeat={setIsRepeat}
              onClickPlay={playPreview}
              onClickStop={stopPreview}
            />

            {/* <div className="inspector">
              <h2>Preview</h2>
              {isPlaying ? (
                <button className="push-button" onClick={stopPreview}>
                  Stop
                </button>
              ) : (
                <button className="push-button" onClick={startPreview}>
                  Play
                </button>
              )}
            </div> */}
          </aside>
        </div>
      </div>
    </>
  );
}

export default App;
