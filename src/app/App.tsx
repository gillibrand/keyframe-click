import { MenuButton, MenuItem } from "@components/menu";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Point, UserDot } from "@timeline/point";
import { Timeline, createTimeline } from "@timeline/Timeline";
import { TimelineInspector } from "@timeline/TimelineInspector";
import { debounce, throttle } from "@util";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { useSetting } from "./useSettings";

import { MenuProvider } from "@components/menu/MenuContext";
import { RadioTabGroup, TabData } from "@components/tab/RadioTabGroup";
import Gear from "@images/gear.svg?react";
import { loadSavedLayers } from "@timeline/Layers";
import { useForceRender } from "@util/hooks";
import { genCssKeyframeText } from "./output";

function App() {
  const timelineRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [layersDidChange, forceLayerChange] = useForceRender();
  const [savedActiveLayer, setSavedActiveLayer] = useSetting("activeLayer", 0);

  // `layers` is not real state since it's never set again. This is just an easy way to init it once
  // on mount with the saved active layer
  const [layers] = useState(() => {
    return loadSavedLayers(savedActiveLayer, function onChange() {
      forceLayerChange();
      timelineRef.current?.draw();
    });
  });

  // Transient state
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Timeline global settings
  const [snapToGrid, setSnapToGrid] = useSetting("isSnapToGrid", true);
  const [labelYAxis, setLabelYAxis] = useSetting("isLabelYAxis", true);

  useEffect(
    /**
     * This just mirrors the active layer to the saved one. This is used to restore the active layer when the app is
     * reloaded.
     */
    function saveActiveLayerSetting() {
      setSavedActiveLayer(layers.activeIndex);
    },
    [layers.activeIndex, setSavedActiveLayer]
  );

  // Used to force a reactive update after the timeline redraws itself. Since the timeline is not
  // React, we instead listen to its callback and manually call this to force a render if needed.
  const [keyframeTextNeedsRender, fireKeyframeTextChange] = useForceRender();

  /** Save dot and settings data to localStorage. */
  const saveLayers = useCallback(() => {
    layers.save();
    isDotsDirty(false);
  }, [layers]);

  /** Callback when canvas element is created. Wraps it with a timeline. */
  useEffect(
    function setupTimeline() {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("no canvas to create timeline with");
        return;
      }

      const timeline = createTimeline({ canvas, layers: layers });

      const saveLayersDebounced = debounce(saveLayers, 2000);

      const didDrawThrottled = throttle(() => {
        setSelectedDot(timeline.getSelectedDot());
        // After a draw the samples are usually different, so we need to force keyframe text to
        // update.
        fireKeyframeTextChange();
      }, 100);

      timeline.onDraw = () => {
        isDotsDirty(true);
        didDrawThrottled();
        saveLayersDebounced();
      };

      timeline.onAdding = (adding: boolean) => {
        if (!adding) setShowMessage(false);
        setIsAdding(adding);
      };

      timelineRef.current = timeline;

      return () => {
        timeline.destroy();
        timelineRef.current = null;
      };
    },
    [layers, saveLayers, fireKeyframeTextChange]
  );

  useEffect(
    function pushSettingsToTimeline() {
      const timeline = timelineRef.current;
      if (!timeline) return;

      timeline.setSnapToGrid(snapToGrid);
      timeline.setLabelYAxis(labelYAxis);
    },
    [labelYAxis, snapToGrid]
  );

  useEffect(
    /**
     * We debounce saves for a bit since changes are so frequent. If the user navigates away during that time changes
     * would be lost. Whenever we're dirty, this adds a page-hide listener to immediately save those changes. We don't
     * always have this since these listener can interfere with bfcaches.
     */
    function addSaveBeforePageHide() {
      if (!isDataDirty) return;

      window.addEventListener("pagehide", saveLayers);
      return () => {
        window.removeEventListener("pagehide", saveLayers);
      };
    },
    [isDataDirty, saveLayers]
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
    void keyframeTextNeedsRender;
    return genCssKeyframeText(layers);
  }, [layers, keyframeTextNeedsRender]);

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

  /**
   * A checksum of the current visible tab state. This reflects the number of tabs, what CSS props they are for, and the
   * active tab. This can then be used to trigger updates to the visible tabs and related data when they change.
   *
   * This avoid rendering them each time unrelated state like `sampleCount` changes. Performance is probably not a big
   * deal here, so maybe this is overkill. Tabs weren't rendering so often before, so I want to keep that, but maybe
   * this is more complicated than necessary.
   */
  const tabsChecksum = useMemo(() => {
    void layersDidChange;

    const hash = [];
    for (const layer of layers.getAll()) {
      hash.push(layer.cssProp);
    }
    hash.push(layers.activeIndex);
    return hash.join(",");
  }, [layers, layersDidChange]);

  const tabs = useMemo<TabData<number>[]>(() => {
    void tabsChecksum;

    return layers.getAll().map((layer, i) => {
      const cssInfo = CssInfos[layer.cssProp];
      return {
        label: cssInfo.label,
        color: cssInfo.color,
        value: i,
      };
    });
  }, [layers, tabsChecksum]);

  /**
   * This has to be below effects that push changes to Layers. This is also used to know what prop to default to on new
   * tabs.
   */
  const remainingCssProps = useMemo(() => {
    console.info(">>> remainingCssProps");
    void tabsChecksum;

    const remaining = new Set(Object.keys(CssInfos) as CssProp[]);

    for (const layer of layers.getAll()) {
      const prop = layer.cssProp;
      remaining.delete(prop);

      if (prop === "scale") {
        remaining.delete("scaleX");
        remaining.delete("scaleY");
      } else if (prop === "scaleX" || prop === "scaleY") {
        remaining.delete("scale");
      }
    }

    return remaining;
  }, [layers, tabsChecksum]);

  const changeTab = useCallback(
    (i: number) => {
      layers.setActiveLayer(i);
    },
    [layers]
  );

  const addNewTab = useCallback(() => {
    const cssProp = remainingCssProps.values().next().value as CssProp;
    layers.addNewLayer(cssProp);
    changeTab(layers.size - 1);
  }, [layers, remainingCssProps, changeTab]);

  const canDeleteTab = useCallback(
    async (value: number): Promise<boolean> => {
      const next = layers.getNextLayerIndexAfterDelete(value);
      return next !== null;

      // return confirm(`Delete "${label}"?`);
    },
    [layers]
  );

  const deleteTab = useCallback((value: number) => {
    console.info(">>> TODO: delete", value);
  }, []);

  /** The inspector should disable the CSS props used on other layers. They can only be active on one layer at a time. */
  const disabledCssProps = useMemo(() => {
    void layersDidChange;
    return new Set(layers.getBackgroundLayers().map((l) => l.cssProp));
  }, [layers, layersDidChange]);

  const setSampleCount = useCallback(
    (count: number) => {
      layers.setSampleCount(count);
    },
    [layers]
  );

  const setIsFlipped = useCallback(
    (isFlipped: boolean) => {
      layers.setIsFlipped(isFlipped);
    },
    [layers]
  );

  const setCssProp = useCallback(
    (prop: CssProp) => {
      layers.setCssProp(prop);
    },
    [layers]
  );

  return (
    <>
      {/* 100 x 300 logical | 100% x (200% over 100%) */}

      <div className="big-row">
        <div className="container relative stack">
          <RadioTabGroup
            tabs={tabs}
            name="property"
            canNew={remainingCssProps.size > 0}
            onNew={addNewTab}
            onDelete={deleteTab}
            canDelete={canDeleteTab}
            checkedValue={layers.activeIndex}
            onChange={changeTab}
          />

          {/* Setting menu. Probably should move this somewhere else later. */}
          <MenuProvider items={items}>
            <MenuButton
              style={{
                position: "absolute",
                top: "-4px",
                right: "0",
                zIndex: 1,
                color: "var(--c-gray-600)",
              }}
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
              cssProp={layers.getCssProp()}
              onChangeCssProp={setCssProp}
              sampleCount={layers.getSampleCount()}
              onChangeSampleCount={setSampleCount}
              isFlipped={layers.getIsFlipped()}
              onChangeIsFlipped={setIsFlipped}
              selected={selectedDot}
              onChangeSelectedProps={handleInspectorSelectedChange}
              onClickAdd={handleClickAdd}
              onClickDelete={handleClickDelete}
              isAdding={isAdding}
              disabledCssProps={disabledCssProps}
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
