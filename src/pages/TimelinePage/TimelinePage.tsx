import { useSetting } from "@app/useSettings";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Point, UserDot } from "@timeline/point";
import { createTimeline, Timeline } from "@timeline/Timeline";
import { TimelineInspector } from "@timeline/TimelineInspector";
import { debounce, isMac, isSpaceBarHandler, throttle } from "@util";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./TimelinePage.css";

import { useNoteApi } from "@components/note";
import { SplitButtons } from "@components/SplitButtons";
import { RadioTabGroup, TabData } from "@components/tab/RadioTabGroup";
import { useTooltip } from "@components/Tooltip";
import { ExportDialog } from "@export/ExportDialog";
import { copyToClipboard, genKeyframeText } from "@export/output";
import Copy from "@images/copy.svg?react";
import Down from "@images/down.svg?react";
import ZoomIn from "@images/zoom-in.svg?react";
import ZoomOut from "@images/zoom-out.svg?react";
import Trash from "@images/trash.svg?react";
import { useRouter } from "@router/useRouter";
import { GlobalLayers, Unit } from "@timeline/Layers";
import { cx } from "@util/cx";
import { useForceRender, useLiveState } from "@util/hooks";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { usePageIndicator } from "./usePageIndicator";

export function TimelinePage() {
  const timelineRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [layersDidChange, forceLayerChange] = useForceRender();
  const [savedActiveLayerId, setSavedActiveLayerId] = useSetting("activeLayerId", "");

  // `layers` is not real state since it's never set again. This is just an easy way to init it once
  // on mount with the saved active layer
  const [layers] = useState(() => {
    GlobalLayers.setOnChange(function onChange() {
      forceLayerChange();
      timelineRef.current?.draw();
    });
    GlobalLayers.setActiveLayer(savedActiveLayerId);
    return GlobalLayers;
  });

  // Transient state
  const [selectedDot, setSelectedDot] = useState<UserDot | null>(null);
  const [isDataDirty, setIsDataDirty] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Timeline global settings

  const [savedMaxY, setSavedMaxY] = useSetting("maxY", 110);
  const [getCurrentMaxY, setCurrentMaxY] = useLiveState(savedMaxY);

  // Output settings
  const [ruleName] = useSetting("ruleName", "my-anim");
  const [format] = useSetting("format", "css");

  /**
   * Sets the max-y value to save it in settings, but also make it available as a ref when creating a timeline. This
   * seems overly complex, but we don't want to fire the "setup" function again after changing this. This should work
   * more like `snapToGrid` probably to be a little cleaner.
   *
   * Max-y is essentially the zoom level.
   */
  const setMaxY = useCallback(
    (y: number) => {
      setSavedMaxY(y);
      setCurrentMaxY(y);
    },
    [setSavedMaxY, setCurrentMaxY]
  );

  const { sendNote } = useNoteApi();

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
    setIsDataDirty(false);
  }, [layers]);

  /** Callback when canvas element is created. Wraps it with a timeline. */
  useEffect(
    function setupTimeline() {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("no canvas to create timeline with");
        return;
      }

      const timeline = createTimeline({ canvas, layers: layers, maxY: getCurrentMaxY() });

      const saveLayersDebounced = debounce(saveLayers, 2000);

      const didDrawThrottled = throttle(() => {
        setSelectedDot(timeline.getSelectedDot());
        // After a draw the samples are usually different, so we need to force keyframe text to
        // update.
        fireKeyframeTextChange();
      }, 100);

      timeline.onDraw = () => {
        setIsDataDirty(true);
        didDrawThrottled();
        saveLayersDebounced();
      };

      timeline.onAdding = (adding: boolean) => {
        setIsAdding(adding);
      };

      timeline.onMoving = (moving: boolean) => {
        setIsMoving(moving);
      };

      timelineRef.current = timeline;

      return () => {
        timeline.destroy();
        timelineRef.current = null;
      };
    },
    [layers, saveLayers, fireKeyframeTextChange, getCurrentMaxY]
  );

  // useEffect(
  //   function pushSettingsToTimeline() {
  //     const timeline = timelineRef.current;
  //     if (!timeline) return;

  //     timeline.setSnapToGrid(snapToGrid);
  //     timeline.setLabelYAxis(labelYAxis);
  //   },
  //   [labelYAxis, snapToGrid]
  // );

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
    [saveLayers, isDataDirty]
  );

  useEffect(
    function saveLayersOnUnMount() {
      return () => {
        if (isDataDirty) saveLayers();
      };
    },
    [saveLayers, isDataDirty]
  );

  const handleClickAdd = useCallback(() => {
    if (!canvasRef.current) return;

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

  const cssKeyframeText = useMemo(() => {
    void keyframeTextNeedsRender;
    return genKeyframeText(layers, "css");
  }, [layers, keyframeTextNeedsRender]);

  useEffect(() => {
    document.body.classList.toggle("is-adding", isAdding);
    document.body.classList.toggle("is-moving", isMoving);
    return () => {
      document.body.classList.remove("is-adding", "is-moving");
    };
  }, [isAdding, isMoving]);

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
    keyframeText: cssKeyframeText,
  });

  const [getIsExportOpen, setIsExportOpen] = useLiveState(false);

  useEffect(
    function addEventListenersOnMount() {
      function handleKeyDown(e: KeyboardEvent) {
        switch (e.key) {
          case "Shift": {
            if (timelineRef.current && canvasRef.current && !getIsExportOpen()) {
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
    [togglePreview, getIsExportOpen]
  );

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

  const setUnits = useCallback(
    (units: Unit) => {
      layers.setUnits(units);
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

  const startExport = useCallback(() => {
    setIsExportOpen(true);
  }, [setIsExportOpen]);

  const stopExporting = useCallback(() => setIsExportOpen(false), [setIsExportOpen]);

  const copyNow = useCallback(async () => {
    const note = await copyToClipboard(layers, format, ruleName);
    sendNote(note);
  }, [layers, format, ruleName, sendNote]);

  const exportDialogId = useId();
  const isExporting = getIsExportOpen();
  const activeExportId = isExporting ? exportDialogId : undefined;

  const zoomIn = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    setMaxY(timeline.zoomIn());
  }, [setMaxY]);

  const zoomOut = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    setMaxY(timeline.zoomOut());
  }, [setMaxY]);

  const { tooltip: copyTooltip, ...copyTooltipProps } = useTooltip<HTMLButtonElement>(
    isMac ? "Copy - ⌘C" : "Copy - Ctrl+C"
  );
  const copyButtonRef = useRef<HTMLButtonElement>(null);

  useGlobalShortcuts({ layers, zoomIn, zoomOut, copyNow: isExporting ? null : copyNow });

  const {
    pageIndicator: timelinePageIndicator,
    scrollParentRef: timelineParentRef,
    page1Ref: timelinePage1Ref,
    page2Ref: timelinePage2Ref,
  } = usePageIndicator();

  const {
    pageIndicator: previewPageIndicator,
    scrollParentRef: previewParentRef,
    page1Ref: previewPage1Ref,
    page2Ref: previewPage2Ref,
  } = usePageIndicator();

  const {
    args: { playDemo },
  } = useRouter();

  useEffect(() => {
    if (playDemo) {
      previewParentRef.current?.scrollIntoView({ behavior: "smooth" });
      playPreview();
    }
  }, [playDemo, playPreview, previewParentRef]);

  function renderCopyButtons(isDesktop: boolean, className?: string) {
    let buttons = [
      <button
        key="copy"
        title="Set options and copy keyframes"
        onClick={startExport}
        className={cx("grow  flex-center gap-2 is-icon", { "is-pressed": isExporting })}
        ref={isDesktop ? copyButtonRef : undefined}
        aria-haspopup="dialog"
        aria-controls={activeExportId}
      >
        {isDesktop && "Copy"} <Down />
      </button>,
      <button
        key="copy-options"
        aria-haspopup="dialog"
        aria-expanded={isExporting}
        aria-controls={activeExportId}
        onClick={copyNow}
        className="center"
        {...copyTooltipProps}
      >
        <Copy />
        <span className="sr-only">Copy with current options</span>
        {copyTooltip}
      </button>,
    ];

    // On mobile we show only the icon for copy, so put the drop down (with no text) after the icon.
    if (!isDesktop) buttons = buttons.reverse();

    return <SplitButtons className={className}>{[buttons]}</SplitButtons>;
  }

  return (
    <main className={cx("grow [ flex-col ]", { "is-dialog-open": isExporting })}>
      {isExporting && (
        <ExportDialog
          open={true}
          onClose={stopExporting}
          layers={layers}
          id={exportDialogId}
          near={copyButtonRef.current ?? undefined}
        />
      )}

      <div className="flex-col grow">
        {/* TABS and SETTINGS at top */}
        <div className="wrapper">
          <section className="flex gap-4 items-center justify-between">
            <RadioTabGroup
              tabs={tabs}
              label="Active property"
              radioGroupName="property"
              canAddNew={remainingCssProps.size > 0}
              onAddNew={addNewTab}
              onDelete={deleteTab}
              canDelete={layers.size > 1 ? canDeleteTab : undefined}
              checkedId={layers.getActiveLayer().id}
              onChange={changeTab}
            />

            {renderCopyButtons(true, "desktop-only")}
          </section>
        </div>

        {/* TIMELINE ROW */}
        <div className="wrapper grow flex-col">
          <section className="inspector-sidebar grow relative" ref={timelineParentRef}>
            <div className="timeline-wrapper" ref={timelinePage1Ref}>
              <canvas
                className={"timeline " + (isAdding ? "is-adding" : "")}
                width={1}
                height={1}
                id="canvas"
                ref={canvasRef}
                tabIndex={0}
              />

              <SplitButtons className="zoom-buttons">
                <button
                  className="is-secondary is-small text-large font-bold"
                  title="Zoom out values"
                  onClick={zoomOut}
                >
                  <ZoomOut />
                  <span className="sr-only">zoom out values</span>
                </button>
                <button className="is-secondary is-small text-large font-bold" title="Zoom in values" onClick={zoomIn}>
                  <ZoomIn />
                  <span className="sr-only">zoom in values</span>
                </button>
              </SplitButtons>
            </div>

            {/* This wrapper div is needed to make the inspector sticky since the timeline grid stretches the direct child items */}
            <div className="tile" ref={timelinePage2Ref}>
              <TimelineInspector
                cssProp={layers.getCssProp()}
                onChangeCssProp={setCssProp}
                sampleCount={layers.getSampleCount()}
                onChangeSampleCount={setSampleCount}
                units={layers.getUnits()}
                onChangeUnits={setUnits}
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
          </section>

          <div className="PageIndicator--row mobile-only">{timelinePageIndicator}</div>

          {/* Mobile only toolbar row */}
          <div className="mobile-only flex gap-2 justify-between mt-0">
            <div className="flex gap-2">
              <button
                className={cx("button is-small", { "is-pressed": isAdding })}
                aria-pressed={isAdding}
                onClick={handleClickAdd}
              >
                Add
              </button>
              {selectedDot && (
                <button className="button is-small is-danger" onClick={handleClickDelete} disabled={!selectedDot}>
                  <Trash />
                </button>
              )}
              {/* <button className="button">
              <Trash />
            </button> */}
            </div>
            {renderCopyButtons(false, "ml-auto")}
          </div>
        </div>

        {/* PREVIEW ROW */}
        <div className="wrapper mt-neg-4:lg tinted-wrapper:sm">
          <section className="inspector-sidebar" ref={previewParentRef}>
            <div className="flex-col" ref={previewPage1Ref}>
              {preview}
            </div>

            <div className="tile" ref={previewPage2Ref}>
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
          </section>

          <div className="PageIndicator--row mobile-only mb-4">{previewPageIndicator}</div>
        </div>
      </div>
    </main>
  );
}
