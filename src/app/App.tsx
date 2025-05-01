import { MenuButton, MenuItem } from "@components/menu";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Point, UserDot } from "@timeline/point";
import { Timeline, createTimeline } from "@timeline/Timeline";
import { TimelineInspector } from "@timeline/TimelineInspector";
import { debounce, isSpaceBarHandler, throttle } from "@util";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./App.css";
import { useSetting } from "./useSettings";

import { MenuProvider } from "@components/menu/MenuContext";
import { useSendNote, NoteList } from "@components/note";
import { SplitButtons } from "@components/SplitButtons";
import { RadioTabGroup, TabData } from "@components/tab/RadioTabGroup";
import { ExportDialog } from "@export/ExportDialog";
import { copyToClipboard, genCssKeyframeList } from "@export/output";
import Copy from "@images/copy.svg?react";
import Gear from "@images/gear.svg?react";
import { loadSavedLayers } from "@timeline/Layers";
import { useForceRender } from "@util/hooks";
import { cx } from "@util/cx";

function App() {
  const timelineRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [layersDidChange, forceLayerChange] = useForceRender();
  const [savedActiveLayerId, setSavedActiveLayerId] = useSetting("activeLayerId", "0");

  // `layers` is not real state since it's never set again. This is just an easy way to init it once
  // on mount with the saved active layer
  const [layers] = useState(() => {
    return loadSavedLayers(savedActiveLayerId, function onChange() {
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

  // const [ruleName] = useSetting("ruleName", "my-animation");

  useEffect(
    /**
     * This just mirrors the active layer to the saved one. This is used to restore the active layer when the app is
     * reloaded.
     */
    function saveActiveLayerSetting() {
      setSavedActiveLayerId(layers.activeLayerId);
    },
    [layers.activeLayerId, setSavedActiveLayerId]
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

  const handleInspectorSelectedChange = useCallback((dot: UserDot) => {
    if (!timelineRef.current) return;

    timelineRef.current.updateSelectedDot(dot);

    // Update the selected dot not so it is not throttled. While this will get pulled again in
    // response to the timeline drawing, that is throttled and we don't want to wait.
    setSelectedDot(dot);
  }, []);

  const keyframeText = useMemo(() => {
    void keyframeTextNeedsRender;
    return genCssKeyframeList(layers);
  }, [layers, keyframeTextNeedsRender]);

  useEffect(() => {
    document.body.classList.toggle("is-adding", isAdding);
    return () => document.body.classList.remove("is-adding");
  }, [isAdding]);

  const {
    preview,
    isPlaying,
    playPreview,
    stopPreview,
    togglePreview,
    duration,
    setDuration,
    setIsRepeat,
    isRepeat,
    speed,
    setSpeed,
  } = usePreview({
    keyframeText,
  });

  useEffect(
    function addEventListenersOnMount() {
      function handleKeyDown(e: KeyboardEvent) {
        switch (e.key) {
          case "Shift": {
            if (timelineRef.current && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const at = {
                x: lastMouseRef.current.x - rect.x,
                y: lastMouseRef.current.y - rect.y,
              };

              timelineRef.current.beginAddingDot(at);
            }
            break;
          }

          case " ": {
            if (isSpaceBarHandler(e.target)) break;
            e.preventDefault();
            togglePreview();
            break;
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
    },
    [togglePreview]
  );

  const items: MenuItem[] = [
    {
      type: "label",
      label: "Timeline settings",
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
    hash.push(layers.activeLayerId);
    return hash.join(",");
  }, [layers, layersDidChange]);

  const tabs = useMemo<TabData[]>(() => {
    void tabsChecksum;

    return layers.getAll().map((layer) => {
      return {
        cssProp: layer.cssProp,
        id: layer.id,
      };
    });
  }, [layers, tabsChecksum]);

  /**
   * This has to be below effects that push changes to Layers. This is also used to know what prop to default to on new
   * tabs.
   */
  const remainingCssProps = useMemo(() => {
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
    (id: string) => {
      layers.setActiveLayer(id);
    },
    [layers]
  );

  const addNewTab = useCallback(() => {
    const cssProp = remainingCssProps.values().next().value as CssProp;
    layers.addNewLayer(cssProp);
  }, [layers, remainingCssProps]);

  const canDeleteTab = useCallback(async (): Promise<boolean> => {
    return layers.size > 1;

    // return confirm(`Delete "${label}"?`);
  }, [layers]);

  const deleteTab = useCallback(
    (id: string) => {
      layers.deleteLayer(id);
    },
    [layers]
  );

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

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);
  }, []);

  const [ruleName] = useSetting("ruleName", "my-anim");

  const sendNote = useSendNote();

  function handleCopyNow() {
    const note = copyToClipboard(layers, ruleName);
    sendNote(note);
  }

  const exportDialogId = useId();
  const activeExportId = isExporting ? exportDialogId : undefined;

  const classes = cx("relative", { "is-dialog-open": isExporting });

  return (
    <div className={classes}>
      {isExporting && (
        <ExportDialog open={isExporting} onClose={() => setIsExporting(false)} layers={layers} id={exportDialogId} />
      )}

      <NoteList />

      <div className="[ h-screen ] [ flex flex-col ] [ mt-4 stack stack--trail ]">
        {/* TABS and SETTINGS at top */}
        <div className="row">
          <div className="flex gap-4 items-center">
            <RadioTabGroup
              tabs={tabs}
              radioGroupName="property"
              canAddNew={remainingCssProps.size > 0}
              onAddNew={addNewTab}
              onDelete={deleteTab}
              canDelete={layers.size > 1 ? canDeleteTab : undefined}
              checkedId={layers.getActiveLayer().id}
              onChange={changeTab}
              className="grow"
            />

            <MenuProvider items={items}>
              <MenuButton
                style={{
                  // TODO: standard icon colors
                  color: "var(--c-neo-black)",
                }}
                title="Settings"
              >
                <Gear />
              </MenuButton>
            </MenuProvider>

            <SplitButtons>
              <button
                title="Set options and copy keyframes"
                onClick={handleExport}
                className={cx("grow", { "is-pressed": isExporting })}
              >
                Copy...
              </button>
              <button
                title="Copy keyframes with current options"
                aria-haspopup="dialog"
                aria-expanded={isExporting}
                aria-controls={activeExportId}
                onClick={handleCopyNow}
              >
                <Copy />
                <span className="sr-only">Copy keyframes to clipboard with current options</span>
              </button>
            </SplitButtons>
          </div>
        </div>

        {/* TIMELINE ROW */}
        <div className="[ gradient-row ] [ grow ] [ flex flex-col ]">
          <div className="inspector-sidebar grow">
            <div className="timeline-wrapper ">
              <canvas
                className={"timeline " + (isAdding ? "is-adding" : "")}
                width={1}
                height={1}
                id="canvas"
                ref={canvasRef}
                tabIndex={0}
              />

              {isAdding && showMessage && <div className="timeline-message">Click timeline to add</div>}
            </div>

            {/* This wrapper div is needed to make the inspector sticky since the timeline grid stretches the direct child items */}
            <div className="tile">
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

        {/* PREVIEW ROW */}
        <div className="gradient-row">
          <aside className="inspector-sidebar">
            {preview}

            <div className="tile">
              <PreviewInspector
                isPlaying={isPlaying}
                duration={duration}
                onChangeDuration={setDuration}
                isRepeat={isRepeat}
                onChangeIsRepeat={setIsRepeat}
                onClickPlay={playPreview}
                onClickStop={stopPreview}
                speed={speed}
                onChangeSpeed={setSpeed}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;
