import { useSetting } from "@app/useSettings";
import { PreviewInspector } from "@preview/PreviewInspector";
import { usePreview } from "@preview/usePreview";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Point, UserDot } from "@timeline/point";
import { createTimeline, Timeline } from "@timeline/Timeline";
import { TimelineInspector } from "@timeline/TimelineInspector";
import { debounce, isMac, isSpaceBarHandler, IsTouch, throttle } from "@util";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useNoteApi } from "@components/note";
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
import clsx from "clsx";
import { useForceRender, useLiveState } from "@util/hooks";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { usePageIndicator } from "./usePageIndicator";
import Play from "@images/play.svg?react";
import Stop from "@images/stop.svg?react";

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
    const currentId = GlobalLayers.activeLayerId;
    if (!currentId) {
      // GlobalLayer is preserved between unmount, so we only need this on first page load if
      // nothing is set. If we set it every time, it might switch back to the last saved if save is
      // pending.
      GlobalLayers.setActiveLayer(savedActiveLayerId);
    }
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
   * Sets the max-y value to save it in settings, but also make it available as a ref when creating
   * a timeline. This seems overly complex, but we don't want to fire the "setup" function again
   * after changing this. This should work more like `snapToGrid` probably to be a little cleaner.
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

  const { sendNote, dismissNote } = useNoteApi();

  // Used to force a reactive update after the timeline redraws itself. Since the timeline is not
  // React, we instead listen to its callback and manually call this to force a render if needed.
  const [keyframeTextNeedsRender, fireKeyframeTextChange] = useForceRender();

  /** Save dot and settings data to localStorage. */
  const saveLayers = useCallback(() => {
    layers.save();
    setSavedActiveLayerId(layers.activeLayerId);
    setIsDataDirty(false);
  }, [setSavedActiveLayerId, layers]);

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
        if (!adding) {
          if (touchToAddHintRef.current) dismissNote(touchToAddHintRef.current);
        }
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
    [layers, saveLayers, fireKeyframeTextChange, getCurrentMaxY, dismissNote]
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
     * We debounce saves for a bit since changes are so frequent. If the user navigates away during
     * that time changes would be lost. Whenever we're dirty, this adds a page-hide listener to
     * immediately save those changes. We don't always have this since these listener can interfere
     * with bfcaches.
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

  const touchToAddHintRef = useRef("");

  const handleClickAdd = useCallback(() => {
    if (!canvasRef.current) return;

    const timeline = timelineRef.current;
    if (!timeline) return;

    if (isAdding) {
      timeline.cancel();
    } else {
      if (IsTouch) {
        if (touchToAddHintRef.current) dismissNote(touchToAddHintRef.current);
        touchToAddHintRef.current = sendNote("Touch timeline to add", 10 * 1000);
      }

      timeline.beginAddingDot();
    }
  }, [isAdding, sendNote, dismissNote]);

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
   * A checksum of the current visible tab state. This reflects the number of tabs, what CSS props
   * they are for, and the active tab. This can then be used to trigger updates to the visible tabs
   * and related data when they change.
   *
   * This avoid rendering them each time unrelated state like `sampleCount` changes. Performance is
   * probably not a big deal here, so maybe this is overkill. Tabs weren't rendering so often
   * before, so I want to keep that, but maybe this is more complicated than necessary.
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
   * This has to be below effects that push changes to Layers. This is also used to know what prop
   * to default to on new tabs.
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

  /**
   * The inspector should disable the CSS props used on other layers. They can only be active on one
   * layer at a time.
   */
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
  } = usePageIndicator("timeline options");

  const {
    pageIndicator: previewPageIndicator,
    scrollParentRef: previewParentRef,
    page1Ref: previewPage1Ref,
    page2Ref: previewPage2Ref,
  } = usePageIndicator("preview options");

  const {
    args: { playDemo },
  } = useRouter();

  useEffect(() => {
    if (playDemo) {
      previewParentRef.current?.scrollIntoView({ behavior: "smooth" });
      playPreview();
    }
  }, [playDemo, playPreview, previewParentRef]);

  function renderCopyButtons(isDesktop: boolean) {
    // Ignore the tooltip unless on desktop layout
    const tooltipProps = isDesktop ? copyTooltipProps : {};

    return (
      <div className={clsx("flex", isDesktop && "hidden sm:flex")}>
        <button
          key="copy"
          title="Set options and copy keyframes"
          onClick={startExport}
          className="split-button flex grow-1 gap-2"
          ref={isDesktop ? copyButtonRef : undefined}
          aria-haspopup="dialog"
          aria-controls={activeExportId}
        >
          Copy
          <Down />
        </button>
        <button
          key="copy-options"
          aria-haspopup="dialog"
          aria-expanded={isExporting}
          aria-controls={activeExportId}
          onClick={copyNow}
          className="split-button"
          {...tooltipProps}
        >
          <Copy />
          <span className="sr-only">Copy with current options</span>
          {copyTooltip}
        </button>
      </div>
    );
  }

  return (
    <main className={clsx("flex grow flex-col sm:text-sm", { "is-dialog-open": isExporting })}>
      {isExporting && (
        <ExportDialog
          open={true}
          onClose={stopExporting}
          layers={layers}
          id={exportDialogId}
          near={!IsTouch && copyButtonRef.current ? copyButtonRef.current : undefined}
        />
      )}

      <div className="flex grow flex-col">
        {/* TABS and SETTINGS at top */}
        <div className="wrapper-wide">
          <section className="flex items-center justify-between gap-4">
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

            {renderCopyButtons(true)}
          </section>
        </div>

        {/* TIMELINE ROW */}
        <div className="wrapper-wide flex grow flex-col">
          <section className="inspector-sidebar relative grow" ref={timelineParentRef}>
            {/* Timeline wrapper */}
            <div className="shadow-hard border-neo relative" ref={timelinePage1Ref}>
              <canvas
                className={clsx(
                  "absolute top-[-10px] left-[-10px] h-[calc(100%+19px)] w-[calc(100%+19px)] outline-0",
                  isAdding && "is-adding"
                )}
                width={1}
                height={1}
                id="canvas"
                ref={canvasRef}
                tabIndex={0}
              />

              {/* Mobile only toolbar */}
              <div className="z-sticky absolute bottom-4 left-4 flex gap-2 sm:hidden">
                <div className="flex gap-2">
                  {/* ADD */}
                  <button
                    className={clsx("button min-w-16 px-0", { "is-pressed": isAdding })}
                    aria-pressed={isAdding}
                    onClick={handleClickAdd}
                  >
                    Add
                  </button>

                  {/* DELETE */}
                  {selectedDot && (
                    <button
                      className="button is-danger flex min-w-16 justify-center px-0"
                      onClick={handleClickDelete}
                      disabled={!selectedDot || isAdding}
                    >
                      <Trash />
                    </button>
                  )}
                </div>
              </div>

              {/* ZOOM */}
              <div className="z-sticky absolute right-4 bottom-4">
                <button
                  className="split-button bg-white px-3 py-1.5 text-black"
                  title="Zoom out values"
                  onClick={zoomOut}
                >
                  <ZoomOut />
                  <span className="sr-only">zoom out values</span>
                </button>
                <button
                  className="split-button bg-white px-3 py-1.5 text-black"
                  title="Zoom in values"
                  onClick={zoomIn}
                >
                  <ZoomIn />
                  <span className="sr-only">zoom in values</span>
                </button>
              </div>
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

          <div className="text-center sm:hidden">{timelinePageIndicator}</div>
        </div>

        {/* PREVIEW ROW */}
        <div className="wrapper-wide bg-gr mt-2 bg-linear-to-b from-black/10 to-transparent to-20% sm:-mt-4 sm:bg-none">
          <section className="inspector-sidebar sm:pb-0" ref={previewParentRef}>
            <div className="relative flex flex-col" ref={previewPage1Ref}>
              <button
                className={clsx(
                  // position on tile
                  "z-sticky absolute bottom-4 left-4",
                  // button
                  "button grid size-12 min-w-0 place-items-center p-0 sm:hidden"
                )}
                onClick={isPlaying ? stopPreview : playPreview}
              >
                {isPlaying ? (
                  <Stop className="relative left-0.5 scale-[1.5]" />
                ) : (
                  <Play className="relative left-0.5 scale-[1.5]" />
                )}
              </button>

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

          <div className="mb-4 text-center sm:hidden">{previewPageIndicator}</div>

          <div className="mt-8 mb-4 text-lg sm:hidden">{renderCopyButtons(false)}</div>
        </div>
      </div>
    </main>
  );
}
