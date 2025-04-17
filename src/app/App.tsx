import { MenuButton, MenuItem } from "@components/menu";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos } from "@timeline/CssInfo";
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
  // The current active layer, which is needed early to select which inspector info to show
  const [activeLayer, setActiveLayer] = useSetting("activeLayer", 0);

  // `layers` is not real state since it's never set again. This is just an easy way to init it once
  // on mount with the saved active layer
  const [layers] = useState(() => {
    return loadSavedLayers(activeLayer);
  });

  // Visible inspector values for active layer. These are inited from the saved layers data the first time
  // through. After that, they will push their changes into the active layer and saved. (To do it all again on reload.)
  const [inspectorCssProp, setInspectorCssProp] = useState(layers.getCssProp());
  const [inspectorSampleCount, setInspectorSampleCount] = useState(layers.getSampleCount());
  const [inspectorIsFlipped, setInspectorIsFlipped] = useState(layers.getIsFlipped());

  // Transient state
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, isDotsDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Timeline global settings
  const [snapToGrid, setSnapToGrid] = useSetting("isSnapToGrid", true);
  const [labelYAxis, setLabelYAxis] = useSetting("isLabelYAxis", true);

  // Used to force a reactive update after the timeline redraws itself. Since the timeline is not
  // React, we instead listen to its callback and manually call this to force a render if needed.
  const [keyframeTextNeedsRender, forceKeyframeTextChange] = useForceRender();
  const [tabsNeedRender, forceRenderTabs] = useForceRender();

  const timelineRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        forceKeyframeTextChange();
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
    [layers, saveLayers, forceKeyframeTextChange]
  );

  useEffect(
    function pushPropsToLayerAndRenderTabs() {
      layers.setCssProp(inspectorCssProp);
      // Fire explicit change to get the tabs to rerender the new CSS prop name based on current
      // layers
      forceRenderTabs();
    },
    [layers, inspectorCssProp, forceRenderTabs]
  );

  useEffect(
    function pushPropsToLayerAndDrawTimeline() {
      layers.setSampleCount(inspectorSampleCount);
      layers.setIsFlipped(inspectorIsFlipped);
      timelineRef.current?.draw();
    },
    [layers, inspectorSampleCount, inspectorIsFlipped]
  );

  useEffect(
    function pushSettingsToTimelineQuiet() {
      if (!timelineRef.current) return;
      timelineRef.current.setSnapToGrid(snapToGrid);
    },
    [snapToGrid]
  );

  useEffect(
    function pushSettingsToTimeline() {
      const timeline = timelineRef.current;
      if (!timeline) return;

      timeline.setLabelYAxis(labelYAxis);
      timeline.draw();
    },
    [inspectorCssProp, labelYAxis]
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

  const tabs = useMemo<TabData<number>[]>(() => {
    void tabsNeedRender;

    return layers.getAll().map((layer, i) => {
      const cssInfo = CssInfos[layer.cssProp];
      return {
        label: cssInfo.label,
        color: cssInfo.color,
        value: i,
      };
    });
  }, [layers, tabsNeedRender]);

  function handleDeleteTab(value: number) {
    console.info(">>> todo: delete tab", value);
    // setTabs((prev) => {
    //   const i = prev.findIndex((t) => t.value === value);
    //   if (i === -1) return prev;
    //   const tabs = [...prev];
    //   tabs.splice(i, 1);
    //   return tabs;
    // });
  }

  // const count = useRef(0);

  function handleNewTab() {
    console.info(">>> todo: new tab");
    // setTabs((prev) => {
    //   const value = count.current++;
    //   const newTabs: TabData<number>[] = [
    //     ...prev,
    //     {
    //       label: "New " + value,
    //       value: tabs.length,
    //       color: "rose",
    //     },
    //   ];
    //   return newTabs;
    // });
  }

  // function setActiveTabName(cssProp: CssProp) {
  //   setTabs((prev) => {
  //     const newTabs = [...prev];
  //     const css = CssInfos[cssProp];
  //     const oldTab = newTabs[activeLayer];
  //     const newTab: TabData<number> = { value: oldTab.value, label: css.label, color: css.color };
  //     newTabs[activeLayer] = newTab;
  //     return newTabs;
  //   });
  // }

  // const [checkedValue, setCheckedValue] = useState(tabs[0].value);

  async function handleCanDeleteTab(label: string): Promise<boolean> {
    console.info(">>> todo: can delete tab");
    void label;

    // Require 1 tab at least
    if (tabs.length <= 1) return false;

    // TODO: Prompt to delete? Better with Undo later
    // return confirm(`Delete "${label}"?`);

    // Before we can delete, change the checked value to the next value
    const index = layers.activeIndex;
    let next = tabs[index + 1];
    if (!next) next = tabs[index - 1];

    // Should not happen since we checked that there is >1 already
    if (!next) return false;

    return false;
    // setActiveCssProp(layers.getCssPropForLayer(next.value));
    // return true;
  }

  function handleTabChange(i: number) {
    setActiveLayer(i);
    const activeLayer = layers.setActiveLayer(i);

    // Update all visible React value for the layer to  match. XXX: should we return less layer data
    // here? Feels like RealLayer might be better private
    setInspectorCssProp(activeLayer.cssProp);
    setInspectorIsFlipped(activeLayer.isFlipped);
    setInspectorSampleCount(activeLayer.sampleCount);
  }

  /** The inspector should disable the CSS props used on other layers. They can only be active on one layer at a time. */
  const disabledCssProps = useMemo(() => {
    void activeLayer;
    return new Set(layers.getBackgroundLayers().map((l) => l.cssProp));
  }, [layers, activeLayer]);

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
            canDelete={handleCanDeleteTab}
            checkedValue={activeLayer}
            onChange={handleTabChange}
          />

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
              cssProp={inspectorCssProp}
              onChangeCssProp={setInspectorCssProp}
              sampleCount={inspectorSampleCount}
              onChangeSampleCount={setInspectorSampleCount}
              isFlipped={inspectorIsFlipped}
              onChangeIsFlipped={setInspectorIsFlipped}
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
