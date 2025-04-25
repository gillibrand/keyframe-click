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
  OffsetY,
  MaxY,
  MinY,
  setUserPxWidth,
} from "./convert";
import { CssInfos } from "./CssInfo";
import { bullsEye, circle, diamond, ex, willDraw } from "./drawing";
import { Layers } from "./Layers";
import { diffPt, findYForXInCurve, nearPt, Point, togglePt, UserDot } from "./point";

type DraggingPoint = {
  point: UserDot;
  minX: number;
  maxX: number;
};

type DraggingHandle = {
  point: UserDot;
  handle: Point;
  otherHandle: Point;
};

type Dragging = DraggingPoint | DraggingHandle;

function createThreshold(origin: Point, threshold: number) {
  let passed = false;

  return (e: MouseEvent) => {
    if (!passed) {
      if (!nearPt(origin, asUserX(e.offsetX), asUserY(e.offsetY), threshold)) {
        passed = true;
      }
    }

    return passed;
  };
}

export interface Timeline {
  destroy: () => void;

  draw: () => void;

  setSnapToGrid: (snapToGrid: boolean) => void;
  setLabelYAxis: (setLabelYAxis: boolean) => void;

  set onDraw(onChangeCallback: (() => void) | undefined);
  set onAdding(onAddingCallback: ((isAdding: boolean) => void) | undefined);

  beginAddingDot(at?: Point): void;

  getSelectedDot(): UserDot | null;
  updateSelectedDot: (d: UserDot) => void;
  deleteSelectedDot: () => void;
  cancel: () => void;
}

export interface TimelineProps {
  canvas: HTMLCanvasElement & { isScaledForScreenDpi?: boolean };
  layers: Layers;
}

type State = "adding" | "default";

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 *
 * @returns Controller to interact with the graph.
 */
export function createTimeline({ canvas: _canvas, layers: _layers }: TimelineProps): Timeline {
  let drawTimer: number | null = null;

  enableRetina(_canvas);

  // const Height = _canvas.clientHeight;
  // const Width = _canvas.clientWidth;

  function height() {
    return _canvas.clientHeight;
  }

  function width() {
    return _canvas.clientWidth;
  }

  const _cx = _canvas.getContext("2d")!;

  let _snapToGrid = true;
  let _labelYAxis = true;

  let _addingAtUserPoint: Point | null = null;
  let _selectedIndex: number | null = null;
  let _dragging: Dragging | null = null;

  let _onDidDraw: (() => void) | undefined;
  let _onIsAdding: ((adding: boolean) => void) | undefined;

  let _state: State = "default";

  /**
   * Applies scaling to match the retina screen resolution. This will increase the actual canvas element size, but scale
   * it down again with CSS. The result is a crisp hi-res canvas at the same size.
   *
   * @param canvas To scale. It supports an extra property to know if this was already done or not. That's needed during
   *   dev since React will pass the same element it init each time and if we scale it based on the current size it will
   *   get bigger each time.
   */
  function enableRetina(canvas: HTMLCanvasElement & { isScaledForScreenDpi?: boolean }) {
    const isScaled = canvas.isScaledForScreenDpi || false;
    if (isScaled) return;

    const cx = canvas.getContext("2d")!;

    // Set the internal sizes to the scaled size for the DPI and width
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.width * scale;
    canvas.height = canvas.height * scale;

    cx.scale(scale, scale);
    canvas.isScaledForScreenDpi = true;

    const onResize = throttle((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      const newWidth = entry.borderBoxSize[0].inlineSize * scale;
      if (canvas.width === newWidth) return;

      setUserPxWidth((newWidth - InsetX * 2 * scale) / (100 * scale));
      canvas.width = newWidth;
      // Need to reset DPI scale after each width change
      cx.scale(scale, scale);
      drawNow(false);
    }, 32);

    new ResizeObserver(onResize).observe(canvas);
  }

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
    const x = asUserX(e.offsetX);
    const y = asUserY(e.offsetY);

    const isConvertClick = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    let newSelected: number | null = null;

    const dots = _layers.getDots();

    try {
      if (isConvertClick) {
        for (let i = 0; i < dots.length; i++) {
          const p = dots[i];

          if (nearPt(p, x, y)) {
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
          if (nearPt(p, x, y)) {
            newSelected = i;
            const maxX = dots[i + 1] ? dots[i + 1].x : width();
            const minX = i > 0 ? dots[i - 1].x : 0;
            _dragging = { point: p, maxX, minX };
            break;
          }

          if (p.type === "round") {
            if (nearPt(p.h1, x, y)) {
              newSelected = i;
              _dragging = { point: p, handle: p.h1, otherHandle: p.h2 };
            } else if (nearPt(p.h2, x, y)) {
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

    let x = asUserX(Math.max(InsetX, Math.min(e.pageX - rect.x, width() - InsetX)));
    const y = asUserY(Math.max(InsetY, Math.min(e.pageY - rect.y, height() - InsetY)));
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

  function startDrag(x: number, y: number) {
    isPastThreshold = createThreshold({ x, y }, 1);
    document.addEventListener("mousemove", onMouseMoveDrag);
    document.addEventListener("mouseup", onMouseUpDrag);
  }

  function endDrag() {
    document.removeEventListener("mousemove", onMouseMoveDrag);
    document.removeEventListener("mouseup", onMouseUpDrag);
    _dragging = null;
  }

  /**
   * Draw the border and grid behind the graph. Includes the focus ring if the canvas is focused. The border is inset by
   * the... inset in the `convert` module.
   */
  function drawGrid() {
    _cx.lineWidth = 1;

    // above 100% gray
    _cx.fillStyle = Colors.Gray50;

    const fullDiffReal = asRealY(MinY) - asRealY(MaxY);

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

    const minY100 = Math.floor(MinY / 100) * 100;

    // horizontal lines
    for (let y = minY100; y <= MaxY; y += 10) {
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

    if (document.activeElement === _canvas) {
      // Draw our own focus ring. This is because we draw large dots that appear to break out of the canvas
      _cx.lineWidth = 2;
      _cx.strokeStyle = "#1c7ef3";
      _cx.lineJoin = "round";
    } else {
      _cx.lineWidth = 1;
      _cx.strokeStyle = Colors.Gray900;
    }

    _cx.strokeRect(InsetX, InsetY, width() - 2 * InsetX, fullDiffReal);
    _cx.lineWidth = 1;

    drawAxisText();
  }

  /**
   * Draws the Y axis labels right on the grid to save space, plus it looks neat and they are not that important. There
   * is a setting to toggle them off.
   */
  function drawAxisText() {
    if (!_labelYAxis) return;

    _cx.textAlign = "left";
    _cx.textRendering = "optimizeSpeed";
    _cx.textBaseline = "middle";
    _cx.font = "14px sans-serif ";
    _cx.fillStyle = Colors.Gray500;

    const x = 20;

    const minY100 = Math.floor(MinY / 100) * 100;
    for (let y = minY100; y <= MaxY; y += 100) {
      const ry = asRealY(y);
      const text = y === 0 ? "0" : y < 0 ? ` -${Math.abs(y)}%` : `${y}%`;
      const r = _cx.measureText(text);

      _cx.fillStyle = Colors.White;
      _cx.fillRect(x, ry - 4, r.width, 8);

      _cx.fillStyle = Colors.Gray400;
      _cx.fillText(text, x, ry);
    }
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
        _cx.moveTo(s.x, OffsetY);
        _cx.lineTo(s.x, s.y);
        _cx.stroke();
      });
    }

    // Fill the sample area
    _cx.beginPath();
    _cx.moveTo(OffsetX, OffsetY);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      _cx.lineTo(s.x, s.y);
    }

    _cx.lineTo(width() - OffsetX, OffsetY);
    _cx.fillStyle = Colors[color];
    _cx.globalAlpha = 0.1;
    _cx.fill();
  }

  function drawAddMarker() {
    if (_addingAtUserPoint === null) return;

    _cx.strokeStyle = Colors.Blue;

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
    // return;
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

  function onKeyDown(e: KeyboardEvent) {
    const dots = _layers.getDots();
    const dot = _selectedIndex === null ? null : dots[_selectedIndex];

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

      case ".":
        if (_selectedIndex === null) {
          _selectedIndex = 0;
        } else if (_selectedIndex < dots.length - 1) {
          _selectedIndex++;
        }
        break;

      case ",":
        if (_selectedIndex === null) {
          _selectedIndex = dots.length - 1;
        } else if (_selectedIndex > 0) {
          _selectedIndex--;
        }
        break;

      case "ArrowUp":
        if (dot) moveDot(dot, dot.x, dot.y + 1);
        e.preventDefault();
        break;
      case "ArrowDown":
        if (dot) moveDot(dot, dot.x, dot.y - 1);
        e.preventDefault();
        break;
      case "ArrowLeft":
        if (dot) moveDot(dot, dot.x - 1, dot.y);
        e.preventDefault();
        break;
      case "ArrowRight":
        if (dot) moveDot(dot, dot.x + 1, dot.y);
        e.preventDefault();
        break;

      default:
        // bail without redrawing
        return;
    }

    draw();
  }

  function onFocus() {
    draw();
  }

  function onBlur() {
    draw();
  }

  _canvas.addEventListener("focus", onFocus);
  _canvas.addEventListener("blur", onBlur);
  _canvas.addEventListener("mousedown", onMouseDown);
  _canvas.addEventListener("keydown", onKeyDown);

  function destroy() {
    endAddingDot();

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

  function endAddingDot() {
    const oldState = _state;
    _addingAtUserPoint = null;
    _state = "default";

    window.removeEventListener("keydown", onKeyDownCancel);
    _canvas.removeEventListener("mouseleave", onMouseLeaveAdding);
    _canvas.removeEventListener("click", onClickAdding);
    _canvas.removeEventListener("mousemove", onMouseMoveAdding);

    draw();

    // Only notify if really changed. We remove all listeners anyways just in case there's a mismatch
    if (_onIsAdding && oldState === "adding") _onIsAdding(false);
  }

  function onMouseMoveAdding(e: MouseEvent) {
    _addingAtUserPoint = { x: asUserX(e.offsetX), y: asUserY(e.offsetY) };
    draw(false);
  }

  function onMouseLeaveAdding() {
    endAddingDot();
  }

  function onClickAdding() {
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

  function onKeyDownCancel(e: KeyboardEvent) {
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

    _addingAtUserPoint = at ? asUserPoint(at) : null;

    _canvas.addEventListener("mousemove", onMouseMoveAdding);
    _canvas.addEventListener("click", onClickAdding);
    _canvas.addEventListener("mouseleave", onMouseLeaveAdding);
    window.addEventListener("keydown", onKeyDownCancel);

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

  // initial render
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
    beginAddingDot,
    deleteSelectedDot,
    cancel,

    setSnapToGrid,
    setLabelYAxis,

    draw,
  };
}
