import { MenuButton, MenuItem } from "@components/menu";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Point, UserDot, createRound, createSquare } from "@timeline/point";
import { Timeline, createTimeline } from "@timeline/Timeline";
import { TimelineInspector } from "@timeline/TimelineInspector";
import { debounce, round2dp, throttle } from "@util";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import "./App.css";
import { useSetting } from "./useSettings";

import { MenuProvider } from "@components/menu/MenuContext";
import { RadioTabGroup, TabData } from "@components/tab/RadioTabGroup";
import Gear from "@images/gear.svg?react";
import { Layers, layersFromUserData } from "@timeline/Layers";
import { useInitedRef } from "@util/hooks";

const defaultDots: UserDot[] = [
  createSquare(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSquare(75, 50),
  createSquare(100, 0),
];

function genCssKeyframeText(samples: Point[], cssProp: CssProp, invertValues: boolean): string {
  const frames = [];

  const fn = CssInfos[cssProp].fn;

  for (const sample of samples) {
    const timePercent = round2dp(sample.x);
    const value = round2dp(sample.y);
    frames.push(`${timePercent}% { ${fn(invertValues ? -value : value)} }`);
  }

  return frames.join("\n");
}

const StorageDots = "kc.dots";

function loadSavedDots(): Layers {
  const json = localStorage.getItem(StorageDots);
  if (!json) {
    console.info("No saved dots. Using default.");
    return layersFromUserData(defaultDots, 10);
  }

  try {
    return layersFromUserData(JSON.parse(json) as UserDot[], 10);
  } catch (e) {
    console.warn("Error loading saved data. Using defaults. " + e);
    return layersFromUserData(defaultDots, 10);
  }
}

function App() {
  const timelineRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // transient state
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // timeline layer data
  const [cssProp, setCssProp] = useSetting("cssProp", "translateX");
  const [sampleCount, setSampleCount] = useSetting("sampleCount", 10);
  const [invertValues, setInvertValues] = useSetting("isInvertValues", false);

  // timeline global settings
  const [snapToGrid, setSnapToGrid] = useSetting("isSnapToGrid", true);
  const [labelYAxis, setLabelYAxis] = useSetting("isLabelYAxis", true);

  // Used to force a reactive update after the timeline redraws itself. Since the timeline is not
  // React, we instead listen to its callback and manually call this to force a render if needed.
  const [timelineDrawCount, incrementTimelineDrawCount] = useReducer((old: number) => {
    return old + 1;
  }, 0);

  const layersRef = useInitedRef(loadSavedDots);

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
  useEffect(
    function wrapCanvasInTimeline() {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const timeline = createTimeline({ canvas, layers: layersRef.current });
      timelineRef.current = timeline;
    },
    [layersRef]
  );

  useEffect(
    function pushPropsToTimeline() {
      if (timelineRef.current) timelineRef.current.setSnapToGrid(snapToGrid);
    },
    [snapToGrid]
  );

  useEffect(
    function pushPropsToTimelineAndRedraw() {
      // Update shared layers data
      layersRef.current.setActiveCssProp(cssProp);

      // Update timeline specific data and force a draw
      const timeline = timelineRef.current;
      if (!timeline) return;
      timeline.setLabelYAxis(labelYAxis);
      timeline.setSampleCount(sampleCount);
      timeline.draw();
    },
    [cssProp, layersRef, labelYAxis, sampleCount]
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

    return genCssKeyframeText(timelineRef.current.getUserSamples(), cssProp, invertValues);
  }, [cssProp, invertValues, timelineDrawCount]);

  useEffect(() => {
    document.body.classList.toggle("is-adding", isAdding);
    return () => document.body.classList.remove("is-adding");
  }, [isAdding]);

  const { preview, isPlaying, playPreview, stopPreview, duration, setDuration, setIsRepeat, isRepeat } = usePreview({
    keyframeText,
  });

  const items: MenuItem[] = [
    {
      type: "label",
      label: "Grid settings",
    },
    {
      type: "toggle",
      label: "Snap to grid",
      isChecked: snapToGrid,
      onClick: () => {
        setSnapToGrid(!snapToGrid);
      },
    },
    {
      type: "toggle",
      label: "Show value labels",
      isChecked: labelYAxis,
      onClick: () => {
        setLabelYAxis(!labelYAxis);
      },
    },
  ];

  const [tabs, setTabs] = useState<TabData<CssProp>[]>(() => {
    const layers = layersRef.current;
    if (!layers) return [];

    return layers.getAll().map((layer) => {
      const cssInfo = CssInfos[layer.cssProp];
      return {
        label: cssInfo.label,
        color: cssInfo.color,
        value: layer.cssProp,
      };
    });
  });

  useEffect(() => {}, []);

  function handleDeleteTab(value: string) {
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.value === value);
      if (i === -1) return prev;
      const tabs = [...prev];
      tabs.splice(i, 1);
      return tabs;
    });
  }

  const count = useRef(0);

  function handleNewTab() {
    setTabs((prev) => {
      const value = count.current++;
      const newTabs: TabData<CssProp>[] = [
        ...prev,
        {
          label: "New " + value,
          value: String(value) as CssProp,
          color: "rose",
        },
      ];
      return newTabs;
    });
  }

  // const [checkedValue, setCheckedValue] = useState(tabs[0].value);

  async function handleCanDelete(label: string): Promise<boolean> {
    void label;

    // Require 1 tab at least
    if (tabs.length <= 1) return false;

    // TODO: Prompt to delete? Better with Undo later
    // return confirm(`Delete "${label}"?`);

    // Before we can delete, change the checked value to the next value
    const index = tabs.findIndex((t) => t.value === cssProp);
    let next = tabs[index + 1];
    if (!next) next = tabs[index - 1];

    // Should not happen since we checked that there is >1 already
    if (!next) return false;

    setCssProp(next.value);
    return true;
  }

  function handleTabChange(value: CssProp) {
    setCssProp(value);
  }

  return (
    <>
      {/* 100 x 300 logical | 100% x (200% over 100%) */}

      <div className="big-row">
        <div className="container relative stack">
          <RadioTabGroup
            tabs={tabs}
            name="property"
            onDelete={handleDeleteTab}
            onNew={handleNewTab}
            canDelete={handleCanDelete}
            checkedValue={cssProp}
            onChange={handleTabChange}
          />

          <MenuProvider items={items}>
            <MenuButton
              style={{ position: "absolute", top: "-4px", right: "0", zIndex: 1, color: "var(--c-gray-600)" }}
              title="Settings"
            >
              <Gear />
            </MenuButton>
          </MenuProvider>

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
              cssProp={cssProp}
              onCssProp={setCssProp}
              sampleCount={sampleCount}
              onSampleCount={setSampleCount}
              invertValues={invertValues}
              onInvertValues={setInvertValues}
              selected={selectedDot}
              onChangeSelectedProps={handleInspectorSelectedChange}
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
          </aside>
        </div>
      </div>
    </>
  );
}

export default App;
