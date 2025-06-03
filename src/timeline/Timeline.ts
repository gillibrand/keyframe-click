import { throttle } from "@util";
import { ColorName, Colors } from "@util/Colors";
import {
  asRealDot,
  asRealPoint,
  asRealX,
  asRealY,
  asUserPoint,
  asUserX,
  asUserY,
  InsetX,
  InsetY,
  OffsetX,
  offsetY,
  getMaxY,
  getMinY,
  setUserPxWidth,
  setUserPxHeight,
  getYRange,
  zoomInY,
  zoomOutY,
  setMaxY,
} from "./convert";
import { CssInfos } from "./CssInfo";
import { bullsEye, circle, diamond, ex, willDraw } from "./drawing";
import { Layers } from "./Layers";
import { diffPt, findYForXInCurve, nearPt, Point, togglePt, UserDot } from "./point";
import { isFocusVisible } from "@util/focusVisible";

/** Point being actively dragged. */
type DraggingPoint = {
  point: UserDot;
  minX: number;
  maxX: number;
};

/** Handle being actively dragged. */
type DraggingHandle = {
  point: UserDot;
  handle: Point;
  otherHandle: Point;
};

/** Point or handle being dragged. */
type Dragging = DraggingPoint | DraggingHandle;

/**
 * Creates a stateful function that detects if the mouse has moved past a threshold. Used to ignore "drags" or very
 * short distances that are probably just sloppy clicks.
 *
 * @returns A function that returns true if the mouse has moved past the threshold.
 * @realOrigin The starting point of the drag in real coordinates.
 * @threshold The distance in pixels to consider a drag.
 */
function createThreshold(realOrigin: Point, threshold: number) {
  let passed = false;

  return (e: MouseEvent) => {
    if (!passed) {
      if (!nearPt(realOrigin, e.offsetX, e.offsetY, threshold)) {
        passed = true;
      }
    }

    return passed;
  };
}

/** The API to interact with the timeline. The React world calls into an instance of this.. */
export interface Timeline {
  /** Destroys the timeline and removes all event listeners. Must call when done. */
  destroy: () => void;

  /**
   * Draws the timeline soon. This is called automatically when changing the timeline with this API, but external
   * changes to layers are not automatically drawn. Call this to force a redraw.
   */
  draw: () => void;

  /**
   * Zooms out of the Y-axis of the timeline.
   *
   * @returns New max Y value.
   */
  zoomOut: () => number;

  /**
   * Zooms in on the Y-axis of the timeline.
   *
   * @returns New max Y value.
   */
  zoomIn: () => number;

  setSnapToGrid: (snapToGrid: boolean) => void;
  setLabelYAxis: (setLabelYAxis: boolean) => void;

  /**
   * Sets the callback to call when the timeline is drawn. This is called after the draw() method is called and the
   * canvas is drawn. Since a draw normally only happens when the data changes, the listener can assume there is a data
   * change (of the dots probably) that needs to be saved. Also called when the selected dot changes. The listener
   * should be fast or throttled since this is called a lot on window resize now.
   */
  set onDraw(onChangeCallback: (() => void) | undefined);

  /**
   * Sets the callback to call when the timeline is in "adding" mode or not. This is called when the user clicks the Add
   * Point button and starts adding a point or cancels or finishes that.
   */
  set onAdding(onAddingCallback: ((isAdding: boolean) => void) | undefined);

  /**
   * Sets the callback to call when the timeline is in "moving" mode or not. This is called when the user starts moving
   * a point or handle and when they stop moving it.
   */
  set onMoving(onMovingCallback: ((isMoving: boolean) => void) | undefined);

  /**
   * Move the timeline into "adding" mode. This is used for using external shortcuts to start an add.
   *
   * @param at Point to start adding a dot at. If not provided, the dot will be added at a default location on the
   *   right, which assumes the "Add point" button is near.
   */
  beginAddingDot(at?: Point): void;

  /** @returns The selected dot if any. Used by the sidebar. */
  getSelectedDot(): UserDot | null;

  /**
   * Updates properties of the selected dot. This is used by the sidebar to update the selected dot.
   *
   * @param d The new dot to set.
   */
  updateSelectedDot: (d: UserDot) => void;

  /** Deletes the selected dot. This is used by the sidebar to delete the selected dot. */
  deleteSelectedDot: () => void;

  /**
   * Cancels any mode the timeline is in. This is used to cancel adding or moving a dot based on user clicks and
   * keyboard events.
   */
  cancel: () => void;
}

export interface InitTimelineProps {
  canvas: HTMLCanvasElement;
  layers: Layers;
  maxY?: number;
}

/**
 * Modes the timeline can be in.
 *
 * XXX: Honestly this isn't as used as I imagined it would be. Investigate if really needed sometime.
 */
type State = "adding" | "default";

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 *
 * @returns Controller to interact with the timeline.
 */
export function createTimeline({ canvas: _canvas, layers: _layers, maxY: initialMaxY }: InitTimelineProps): Timeline {
  let drawTimer: number | null = null;

  if (initialMaxY) setMaxY(initialMaxY);

  function height() {
    return _canvas.clientHeight;
  }

  function width() {
    return _canvas.clientWidth;
  }

  const _cx = _canvas.getContext("2d")!;

  let _snapToGrid = true;
  let _labelYAxis = true;

  /** While adding a new point, this is set to the possible position of that new point. */
  let _addingAtUserPoint: Point | null = null;

  /** 0 based index of the selected dot, or null. */
  let _selectedIndex: number | null = null;

  /** The point or handle being dragged. */
  let _dragging: Dragging | null = null;

  let _onDidDraw: (() => void) | undefined;
  let _onIsAdding: ((adding: boolean) => void) | undefined;
  let _onIsMoving: ((moving: boolean) => void) | undefined;

  let _state: State = "default";

  /** Watches the canvas ro resizes and updates and redraws it if needed. */
  let _resizeObserver: ResizeObserver | undefined;

  // We save whether focus is "visible" (based on keyboard vs mouse activity) when we focus on the
  // canvas. This lets us maintain the same visible focus state the entire time so we don't Tab in,
  // then click a dot and have the border disappear. Similarly, if we click with the mouse first, we
  // don't want the focus ring to appear if we hit the keyboard. Basically, only show focus ring if
  // we Tabbed into this.
  //
  // I want o investigate a more subtle ring later so maybe we always show it. It's useful but is a
  // little distracting as-is.
  let _isFocusVisible = false;

  /**
   * Call after a zoom or resize. This calcs the correct logical pixel sizes and re-centers the timeline. Without this,
   * the canvas will be distorted. Will redraw automatically.
   *
   * @param borderBoxWidthPx Width of the canvas.
   * @param borderBoxHeightPx Height of the canvas.
   */
  function rescale(borderBoxWidthPx: number, borderBoxHeightPx: number) {
    // Set the internal sizes to the scaled size for the DPI and width
    const scale = window.devicePixelRatio || 1;

    // Logical sizes so we can draw at higher DPIs
    const newWidth = borderBoxWidthPx * scale;
    const newHeight = borderBoxHeightPx * scale;

    setUserPxWidth((newWidth - InsetX * 2 * scale) / (100 * scale));
    setUserPxHeight((newHeight - InsetY * 2 * scale) / (getYRange() * scale));

    _canvas.width = newWidth;
    _canvas.height = newHeight;

    // Need to reset DPI scale after each width change
    _cx.scale(scale, scale);
    drawNow(false);
  }

  /**
   * Applies scaling to match the retina screen resolution. This will increase the actual canvas element size, but scale
   * it down again with CSS. The result is a crisp hi-res canvas at the same size.
   *
   * @param canvas To scale. It supports an extra property to know if this was already done or not. That's needed during
   *   dev since React will pass the same element it init each time and if we scale it based on the current size it will
   *   get bigger each time.
   */
  function connectResizeObserver(canvas: HTMLCanvasElement) {
    const onResize = throttle((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      rescale(entry.borderBoxSize[0].inlineSize, entry.borderBoxSize[0].blockSize);
    }, 50);

    if (_resizeObserver) _resizeObserver.disconnect();
    _resizeObserver = new ResizeObserver(onResize);
    _resizeObserver.observe(canvas);
  }

  /**
   * Clones the selected dot. This is used to copy the dot to the clipboard or to create a new dot based on the selected
   * one.
   *
   * @returns Copy of selected dot.
   */
  function cloneSelectedDot(): UserDot | null {
    // XXX: shallow clone. Good enough for React to notice a diff
    const dots = _layers.getDots();
    if (_selectedIndex === null || _selectedIndex >= dots.length) {
      // This happens if there is a selected index and we change to a layer with fewer dot. Just clear the selection
      _selectedIndex = null;
      return null;
    }
    return { ..._layers.getDots()[_selectedIndex] };
  }

  function getSelectedDot(): UserDot | null {
    return cloneSelectedDot();
  }

  function didDraw() {
    if (_onDidDraw) _onDidDraw();
  }

  function setSelectedIndex(index: number | null) {
    if (index === _selectedIndex) return;

    _selectedIndex = index;
    draw();
  }

  function onMouseDown(e: MouseEvent) {
    if (_addingAtUserPoint !== null) return;

    _dragging = null;
    const realX = e.offsetX;
    const x = asUserX(realX);
    const realY = e.offsetY;
    const y = asUserY(realY);

    const isConvertClick = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    let newSelected: number | null = null;

    const dots = _layers.getDots();

    try {
      if (isConvertClick) {
        for (let i = 0; i < dots.length; i++) {
          const p = dots[i];

          if (nearPt(asRealPoint(p), realX, realY)) {
            togglePt(p);
            newSelected = i;
            // TODO: this can cause two draws. May need to buffer
            draw();

            return;
          }
        }
      } else {
        for (let i = 0; i < dots.length; i++) {
          const p = dots[i];
          if (nearPt(asRealPoint(p), realX, realY)) {
            newSelected = i;
            const maxX = dots[i + 1] ? dots[i + 1].x : width();
            const minX = i > 0 ? dots[i - 1].x : 0;
            _dragging = { point: p, maxX, minX };
            break;
          }

          if (p.type === "round") {
            if (nearPt(asRealPoint(p.h1), realX, realY)) {
              newSelected = i;
              _dragging = { point: p, handle: p.h1, otherHandle: p.h2 };
            } else if (nearPt(asRealPoint(p.h2), realX, realY)) {
              newSelected = i;
              _dragging = { point: p, handle: p.h2, otherHandle: p.h1 };
            }
          }
        }
      }
    } finally {
      setSelectedIndex(newSelected);
    }

    if (_dragging) startDrag(x, y);
  }

  let isPastThreshold: (e: MouseEvent) => boolean = () => false;

  /**
   * Drag handle when dragging dots and handles
   *
   * @param e
   * @returns
   */
  function onMouseMoveDrag(e: MouseEvent) {
    if (!isPastThreshold(e)) return;

    if (!_dragging || e.buttons === 0) {
      endDrag();
      return;
    }

    const rect = _canvas.getBoundingClientRect();

    let x = asUserX(Math.max(InsetX, Math.min(e.pageX - window.scrollX - rect.x, width() - InsetX)));
    const y = asUserY(Math.max(InsetY, Math.min(e.pageY - window.scrollY - rect.y, height() - InsetY)));

    if ("handle" in _dragging) {
      moveHandle(_dragging, x, y);
    } else {
      x = Math.max(_dragging.minX, Math.min(x, _dragging.maxX));
      moveDot(_dragging.point, x, y);
    }
  }

  function moveHandle({ point, handle, otherHandle }: DraggingHandle, toX: number, toY: number) {
    // move handle
    handle.x = toX;
    handle.y = toY;

    // move other handle to mirror position
    const diff = diffPt(handle, point);
    otherHandle.x = point.x - diff.x;
    otherHandle.y = point.y - diff.y;

    draw();
  }

  /**
   * Updates the given dot in place with a new position and redraws.
   *
   * @param d Dot to update.
   * @param toUserX New x position in user coordinates.
   * @param toUserY New y position in user coordinates.
   */
  function moveDot(d: UserDot, toUserX: number, toUserY: number) {
    const origin = { ...d };

    if (_snapToGrid) {
      toUserX = Math.round(toUserX);
      toUserY = Math.round(toUserY);

      const fromUserX = Math.round(d.x);
      const fromUserY = Math.round(d.y);

      if (toUserX === fromUserX && toUserY === fromUserY) return;
    }

    // move point
    d.x = toUserX;
    d.y = toUserY;

    // move handles
    const diffPoint = diffPt(d, origin);
    d.h1.x += diffPoint.x;
    d.h1.y += diffPoint.y;
    d.h2.x += diffPoint.x;
    d.h2.y += diffPoint.y;

    draw();
  }

  function onMouseUpDrag() {
    endDrag();
  }

  /**
   * Starts a possible drag. Nothing will happen visually until the mouse moves past a threshold.
   *
   * @param x Initial x position in user coordinates.
   * @param y Initial y position in user coordinates.
   */
  function startDrag(x: number, y: number) {
    isPastThreshold = createThreshold({ x: asRealX(x), y: asRealY(y) }, 2);
    document.addEventListener("mousemove", onMouseMoveDrag);
    document.addEventListener("mouseup", onMouseUpDrag);
    if (_onIsMoving) _onIsMoving(true);
  }

  /**
   * Ends the drag and cleans up the event listeners. This is called when the mouse is released or moved outside the\
   * Canvas.
   */
  function endDrag() {
    document.removeEventListener("mousemove", onMouseMoveDrag);
    document.removeEventListener("mouseup", onMouseUpDrag);
    _dragging = null;
    if (_onIsMoving) _onIsMoving(false);
  }

  /**
   * Draw the border and grid behind the graph. Includes the focus ring if the canvas is focused. The border is inset a
   * bit to have room to draw dots a little outside the border without cutting them off when they are very near the
   * edge.
   */
  function drawGrid() {
    _cx.lineWidth = 1;

    // above 100% gray
    _cx.fillStyle = Colors.Gray50;

    const fullDiffReal = asRealY(getMinY()) - asRealY(getMaxY());

    _cx.fillStyle = Colors.White;
    _cx.fillRect(InsetX, InsetY, width() - 2 * InsetX, fullDiffReal);

    // vertical lines
    for (let x = 0; x <= 100; x += 10) {
      _cx.strokeStyle = x % 50 === 0 ? Colors.Gray200 : Colors.Gray100;

      const px = asRealX(x);
      _cx.beginPath();
      _cx.moveTo(px, InsetY);
      _cx.lineTo(px, height() - InsetY);
      _cx.stroke();
    }

    const range = getYRange();
    const tick = range >= 1400 ? 100 : range >= 900 ? 100 : range >= 80 ? 10 : 1;
    const minY100 = Math.ceil(getMinY() / tick) * tick;

    // horizontal lines
    for (let y = minY100; y <= getMaxY(); y += tick) {
      _cx.beginPath();
      const py = asRealY(y);
      _cx.moveTo(InsetX, py);

      if (y % 100 === 0) {
        _cx.strokeStyle = Colors.Gray300;
      } else {
        _cx.strokeStyle = Colors.Gray100;
      }

      _cx.lineTo(width() - InsetX, py);
      _cx.stroke();
    }

    drawAxisText();

    // border
    _cx.lineWidth = 2;
    _cx.strokeStyle = Colors.NeoBlack;
    _cx.strokeRect(InsetX, InsetY, width() - 2 * InsetX - 1, fullDiffReal);

    const isFocused = _isFocusVisible;

    // shadow
    if (!isFocused) {
      _cx.strokeStyle = Colors.NeoBlack;
      _cx.lineWidth = 4;
      _cx.beginPath();
      _cx.moveTo(InsetX + 4, _canvas.clientHeight - InsetY + 2);
      _cx.lineTo(width() - InsetX + 2, _canvas.clientHeight - InsetY + 2);
      _cx.lineTo(width() - InsetX + 2, InsetY + 4);
      _cx.stroke();
    }

    // Draw our own focus ring. This is because we draw large dots that appear to break out of the canvas
    if (isFocused) {
      // blue line
      _cx.lineWidth = 3;
      _cx.strokeStyle = "#1c7ef3";
      _cx.strokeRect(InsetX - 3, InsetY - 3, width() - 2 * InsetX - 1 + 6, fullDiffReal + 6);

      // inset white line to cover background color and ensure the outer client is well contrasted
      _cx.strokeRect(InsetX - 3, InsetY - 3, width() - 2 * InsetX - 1 + 6, fullDiffReal + 6);
      _cx.lineWidth = 1;
      _cx.strokeStyle = "white";
      _cx.strokeRect(InsetX - 1, InsetY - 1, width() - 2 * InsetX - 1 + 2, fullDiffReal + 2);
    }
  }

  /**
   * Draws the Y axis labels right on the grid to save space, plus it looks neat and they are not that important. There
   * is a setting to toggle them off.
   */
  function drawAxisText() {
    if (!_labelYAxis) return;

    willDraw(_cx, () => {
      clipTimeline();

      _cx.textAlign = "left";
      _cx.textRendering = "optimizeSpeed";
      _cx.textBaseline = "middle";
      _cx.font = "14px sans-serif ";
      _cx.fillStyle = Colors.Gray500;

      const x = 20;

      const units = _layers.getUnits();

      const range = getYRange();
      const tick = range <= 40 ? 5 : range <= 200 ? 10 : 100;

      const minY100 = Math.floor(getMinY() / tick) * tick;
      for (let y = minY100; y <= getMaxY(); y += tick) {
        const ry = asRealY(y);
        const text = y === 0 ? "0" : y < 0 ? ` -${Math.abs(y)}${units}` : `${y}${units}`;
        const r = _cx.measureText(text);

        _cx.fillStyle = Colors.White;
        _cx.fillRect(x, ry - 4, r.width, 8);

        _cx.fillStyle = Colors.Gray400;
        _cx.fillText(text, x, ry);
      }
    });
  }

  function drawSamples(color: ColorName) {
    const dots = _layers.getDots();
    if (dots.length < 2) return;

    _cx.lineWidth = 1;
    _cx.setLineDash([]);

    const samples = _layers.getSamples().map((s) => asRealPoint(s));

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];

      // draw the guide lines
      willDraw(_cx, () => {
        _cx.strokeStyle = Colors[color];
        _cx.lineWidth = 1;
        ex(s, _cx);
        _cx.setLineDash([5, 5]);
        _cx.beginPath();
        _cx.moveTo(s.x, offsetY());
        _cx.lineTo(s.x, s.y);
        _cx.stroke();
      });
    }

    // Fill the sample area
    _cx.beginPath();
    _cx.moveTo(OffsetX, offsetY());
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      _cx.lineTo(s.x, s.y);
    }

    _cx.lineTo(width() - OffsetX, offsetY());
    _cx.fillStyle = Colors[color];
    _cx.globalAlpha = 0.1;
    _cx.fill();
  }

  function drawAddMarker() {
    if (_addingAtUserPoint === null) return;

    _cx.strokeStyle = Colors.Danger;
    _cx.lineWidth = 2;

    const dots = _layers.getDots();
    let y = findYForXInCurve(_addingAtUserPoint.x, dots);
    if (y === null) y = _addingAtUserPoint.y;

    _cx.beginPath();
    const realX = asRealX(_addingAtUserPoint.x);
    _cx.moveTo(realX, InsetX);
    _cx.lineTo(realX, height() - InsetX);
    _cx.stroke();

    bullsEye({ x: realX, y: asRealY(y) }, true, _cx);
  }

  /**
   * Schedules the canvas to redraw completely on the next animation frames. Can be called multiple times and will only
   * redraw once during the next frame.
   *
   * @param notify If true, fires onDrawCallback. Normally that's right, since listeners need to know data changed that
   *   caused the draw. But in some cases, like drawing where a point might be added, the drawing doesn't affect the
   *   data and we can skip the callback. Defaults to true.
   */
  function draw(notify: boolean = true) {
    if (drawTimer !== null) return;

    drawTimer = requestAnimationFrame(() => {
      try {
        drawNow(notify);
      } catch (e) {
        // Just in case. Can't happen :)
        console.error(e);
      } finally {
        drawTimer = null;
      }
    });
  }

  /**
   * Clips the canvas to the timeline area. This is used for most drawing except the dots themselves so they can be
   * dragged more easily near the edges.
   */
  function clipTimeline() {
    _cx.beginPath();
    _cx.rect(InsetX, InsetY, width() - 2 * InsetX, height() - 2 * InsetY);
    _cx.clip();
  }

  function drawCurveForDots(dots: UserDot[], lineWidth: number, color: ColorName) {
    if (dots.length === 0) return;

    _cx.strokeStyle = Colors[color];

    const origin = dots[0];
    _cx.beginPath();
    _cx.moveTo(asRealX(origin.x), asRealY(origin.y));

    for (let i = 1; i < dots.length; i++) {
      const pp = dots[i - 1];
      const p = dots[i];

      const cp1 = pp.type === "square" ? pp : pp.h2;
      const cp2 = p.type === "square" ? p : p.h1;
      _cx.bezierCurveTo(asRealX(cp1.x), asRealY(cp1.y), asRealX(cp2.x), asRealY(cp2.y), asRealX(p.x), asRealY(p.y));
    }

    _cx.setLineDash([]);
    _cx.lineWidth = lineWidth;
    _cx.stroke();
  }

  /**
   * Draws the entire canvas right now. Generally should call .draw() instead to schedule on next animation frame for
   * better performance.
   *
   * @param notify If true, fires onDrawCallback. Normally that's right, since listeners need to know data changed that
   *   caused the draw. But in some cases, like drawing where a point might be added, the drawing doesn't affect the
   *   data and we can skip the callback. Defaults to true.
   */
  function drawNow(notify: boolean) {
    _cx.clearRect(0, 0, _canvas.width, _canvas.height);

    willDraw(_cx, () => {
      // TODO: translate all drawing?
      _cx.translate(0.5, 0.5);
      drawGrid();
    });

    _layers.purgeActiveSamples();
    const dots = _layers.getDots();

    // draw curves
    willDraw(_cx, () => {
      clipTimeline();

      // Draw background layer curves in thinner lines
      _cx.globalAlpha = 0.25;
      _cx.setLineDash([1, 2]);
      _layers.getBackgroundLayers().forEach((l) => {
        drawCurveForDots(l.dots, 2, CssInfos[l.cssProp].color);
      });
      _cx.globalAlpha = 1;

      const color = _layers.getColor();
      drawCurveForDots(dots, 3, color);

      drawSamples(color);
    });

    const isFocused = document.activeElement === _canvas;

    // draw the key points and their handles
    for (let i = 0; i < dots.length; i++) {
      const p = asRealDot(dots[i]);

      if (p.type === "round" && i === _selectedIndex) {
        const h1 = p.h1;
        const h2 = p.h2;

        willDraw(_cx, () => {
          clipTimeline();

          _cx.strokeStyle = Colors.Blue;
          _cx.setLineDash([5, 2]);

          for (const h of [h1, h2]) {
            _cx.beginPath();
            _cx.moveTo(p.x, p.y);
            _cx.lineTo(h.x, h.y);
            _cx.stroke();
          }

          if (p.type === "round") {
            _cx.fillStyle = Colors.Blue;
            diamond(p.h1, _cx);
            diamond(p.h2, _cx);
          }
        });
      }

      _cx.fillStyle = Colors.White;
      _cx.strokeStyle = Colors.Black;
      if (_selectedIndex === i && _addingAtUserPoint === null) {
        bullsEye(p, isFocused, _cx);
      } else {
        circle(p, _cx);
      }
    }

    drawAddMarker();
    if (notify) didDraw();
  }

  /**
   * Adds a new point after the selected one. If none selected, then after the first. If none at all, then right at the
   * start of the timeline.
   */
  function newPointFromSelected() {
    const dots = _layers.getDots();

    let newX = 0;
    let newY = 0;

    if (dots.length > 0) {
      // We'll create a new dot after the selected. If none selected, then after the first
      if (_selectedIndex === null) {
        _selectedIndex = 0;
      }

      const { x, y } = dots[_selectedIndex];
      newY = y;

      const nextDot: UserDot | undefined = dots[_selectedIndex + 1];
      const nextX = nextDot ? nextDot.x : 100;

      // x for the new dot will be right in the middle of the the selected and next dots
      newX = x + (nextX - x) / 2;
    }

    _addingAtUserPoint = {
      x: newX,
      y: newY,
    };

    // This mouse method doesn't care about the mouse, just that _addingAtUserPoint is set. Should simplify this.
    onMouseDownAdding();
  }

  function onKeyDown(e: KeyboardEvent) {
    const dots = _layers.getDots();
    const dot = _selectedIndex === null ? null : dots[_selectedIndex];
    const i = _selectedIndex;

    const increment = e.altKey ? 10 : 1;

    switch (e.key) {
      case "Delete":
      case "Backspace":
        deleteSelectedDot();
        break;

      case "c": {
        if (_selectedIndex === null) return;
        const p = dots[_selectedIndex];
        togglePt(p);
        break;
      }

      case "n": {
        newPointFromSelected();
        break;
      }

      case ".":
      case "d":
        if (_selectedIndex === null) {
          _selectedIndex = 0;
        } else if (_selectedIndex < dots.length - 1) {
          _selectedIndex++;
        }
        break;

      case ",":
      case "a":
        if (_selectedIndex === null) {
          _selectedIndex = dots.length - 1;
        } else if (_selectedIndex > 0) {
          _selectedIndex--;
        }
        break;

      case "ArrowUp":
        if (dot) moveDot(dot, dot.x, Math.min(getMaxY(), dot.y + increment));
        e.preventDefault();
        break;

      case "ArrowDown":
        if (dot) {
          moveDot(dot, dot.x, Math.max(getMinY(), dot.y - increment));
        }
        e.preventDefault();
        break;

      case "ArrowLeft": {
        if (dot && i !== null) {
          const minX = i > 0 ? dots[i - 1].x : 0;
          moveDot(dot, Math.max(minX, dot.x - increment), dot.y);
        }
        e.preventDefault();
        break;
      }

      case "ArrowRight": {
        if (dot && i !== null) {
          const maxX = dots[i + 1] ? dots[i + 1].x : 100;
          moveDot(dot, Math.min(dot.x + increment, maxX), dot.y);
        }
        e.preventDefault();
        break;
      }

      case "0":
      case "1":
      case "2": {
        const num = parseInt(e.key, 10);
        if (dot) moveDot(dot, dot.x, num * 100);
        e.preventDefault();
        break;
      }

      default:
        // bail without redrawing
        return;
    }

    draw();
  }

  function onFocus() {
    _isFocusVisible = isFocusVisible();
    draw();
  }

  function onBlur() {
    _isFocusVisible = false;
    draw();
  }

  _canvas.addEventListener("focus", onFocus);
  _canvas.addEventListener("blur", onBlur);
  _canvas.addEventListener("mousedown", onMouseDown);
  _canvas.addEventListener("keydown", onKeyDown);

  function destroy() {
    endAddingDot(false);

    _canvas.removeEventListener("keydown", onKeyDown);
    _canvas.removeEventListener("mousedown", onMouseDown);
    _canvas.removeEventListener("focus", onFocus);
    _canvas.removeEventListener("blur", onBlur);

    _canvas.removeEventListener("mousemove", onMouseMoveDrag);
    _canvas.removeEventListener("mouseup", onMouseUpDrag);

    _canvas.removeEventListener("mousemove", onMouseMoveAdding);

    if (drawTimer !== null) {
      cancelAnimationFrame(drawTimer);
      drawTimer = null;
    }

    if (_resizeObserver) _resizeObserver.disconnect();
  }

  function updateSelectedDot(d: UserDot) {
    if (_selectedIndex === null) return;
    _layers.getDots()[_selectedIndex] = d;
    draw();
  }

  function setSnapToGrid(snapToGrid: boolean) {
    _snapToGrid = snapToGrid;
  }

  function setLabelYAxis(labelYAxis: boolean) {
    if (_labelYAxis === labelYAxis) return;
    _labelYAxis = labelYAxis;
    draw();
  }

  function endAddingDot(notify: boolean = true) {
    const oldState = _state;
    _addingAtUserPoint = null;
    _state = "default";

    window.removeEventListener("keydown", onKeyDownAdding);
    _canvas.removeEventListener("mouseleave", onMouseLeaveAdding);
    _canvas.removeEventListener("mousedown", onMouseDownAdding);
    _canvas.removeEventListener("mousemove", onMouseMoveAdding);

    if (notify) draw();

    // Only notify if really changed. We remove all listeners anyways just in case there's a mismatch
    if (_onIsAdding && oldState === "adding") _onIsAdding(false);
  }

  function onMouseMoveAdding(e: MouseEvent) {
    _addingAtUserPoint = { x: Math.max(0, Math.min(asUserX(e.offsetX), 100)), y: asUserY(e.offsetY) };
    draw(false);
  }

  function onMouseLeaveAdding() {
    endAddingDot();
  }

  function onMouseDownAdding() {
    if (_addingAtUserPoint !== null) {
      const dots = _layers.getDots();

      let x = _addingAtUserPoint.x;
      let y = findYForXInCurve(x, dots);
      if (y === null) y = _addingAtUserPoint.y;

      if (_snapToGrid) {
        x = Math.round(x);
        y = Math.round(y);
      }

      const newDot: UserDot = {
        type: "square",
        space: "user",
        x: x,
        y: y,
        h1: {
          x: x - 10,
          y: y,
        },
        h2: {
          x: x + 10,
          y: y,
        },
      };

      // try to add before next highest x
      let didAdd = false;
      for (let i = 0; i < dots.length; i++) {
        if (dots[i].x >= newDot.x) {
          didAdd = true;
          dots.splice(i, 0, newDot);
          _selectedIndex = i;
          break;
        }
      }

      if (!didAdd) {
        // add at end
        dots.push(newDot);
        _selectedIndex = dots.length - 1;
      }
    }

    endAddingDot();
  }

  function onKeyDownAdding(e: KeyboardEvent) {
    if (e.key === "Escape") {
      endAddingDot();
      endDrag();
    }
  }

  function beginAddingDot(at?: Point) {
    if (_state === "adding") return;

    // cleanup
    endAddingDot();
    _state = "adding";

    // Start where the mouse is, or at a default when they click the Add Point button off the
    // timeline. That starts on the right side to be near the button.
    _addingAtUserPoint = at
      ? asUserPoint(at)
      : {
          x: 95,
          y: 50,
        };

    _canvas.addEventListener("mousemove", onMouseMoveAdding);
    _canvas.addEventListener("mousedown", onMouseDownAdding);
    _canvas.addEventListener("mouseleave", onMouseLeaveAdding);
    window.addEventListener("keydown", onKeyDownAdding);

    draw();

    if (_onIsAdding) _onIsAdding(true);
  }

  function deleteSelectedDot() {
    if (_selectedIndex === null) return;

    const dots = _layers.getDots();
    dots.splice(_selectedIndex, 1);

    if (dots.length === 0) {
      _selectedIndex = null;
    } else if (_selectedIndex !== 0) {
      _selectedIndex--;
    }

    draw();
  }

  function cancel() {
    endAddingDot();
  }

  function zoomIn() {
    const maxY = zoomInY();
    const { width, height } = _canvas.getBoundingClientRect();
    rescale(width, height);
    return maxY;
  }

  function zoomOut() {
    const maxY = zoomOutY();
    const { width, height } = _canvas.getBoundingClientRect();
    rescale(width, height);
    return maxY;
  }

  // initial render
  connectResizeObserver(_canvas);
  draw();

  // type Timeline
  return {
    destroy,
    updateSelectedDot,
    getSelectedDot,
    set onDraw(onDrawCallback: (() => void) | undefined) {
      _onDidDraw = onDrawCallback;
    },
    set onAdding(onAddCallback: ((isAdding: boolean) => void) | undefined) {
      _onIsAdding = onAddCallback;
    },
    set onMoving(onMovingCallback: ((isMoving: boolean) => void) | undefined) {
      _onIsMoving = onMovingCallback;
    },
    beginAddingDot,
    deleteSelectedDot,
    cancel,

    setSnapToGrid,
    setLabelYAxis,

    zoomIn,
    zoomOut,

    draw,
  };
}
