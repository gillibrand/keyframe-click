import {
  Black,
  Blue,
  bullsEye,
  circle,
  dash,
  diamond,
  Gray200,
  Gray300,
  Gray400,
  Gray50,
  Gray500,
  Gray900,
  Red,
  White,
  willDraw,
} from "./drawing";
import { BaseDot, diffPt, findYForX, findYForXInCurve, nearPt, PhysDot, Point, togglePt, UserDot } from "./point";

type DraggingPoint = {
  point: PhysDot;
  minX: number;
  maxX: number;
};

type DraggingHandle = {
  point: PhysDot;
  handle: Point;
  otherHandle: Point;
};

type Dragging = DraggingPoint | DraggingHandle;

function createThreshold(origin: Point, threshold: number) {
  let passed = false;

  return (e: MouseEvent) => {
    if (!passed) {
      if (!nearPt(origin, e.offsetX, e.offsetY, threshold)) {
        passed = true;
      }
    }

    return passed;
  };
}

export interface BezierTimeline {
  destroy: () => void;

  setSnapToGrid: (snapToGrid: boolean) => void;
  setLabelYAxis: (setLabelYAxis: boolean) => void;
  getUserDots(): UserDot[];
  getSamples(): Point[];
  setSampleCount(count: number): void;

  set onDraw(onChangeCallback: (() => void) | undefined);
  set onAdding(onAddingCallback: ((isAdding: boolean) => void) | undefined);

  beginAddingDot(at?: Point): void;

  getSelectedDot(): UserDot | null;
  updateSelectedDot: (p: UserDot) => void;
  deleteSelectedDot: () => void;
  cancel: () => void;
}

export interface BezierTimelineProps {
  canvas: HTMLCanvasElement & { isScaledForScreenDpi?: boolean };
  savedUserDots: UserDot[];
}

type State = "adding" | "default";

/**
 * Applies scaling to match the retina screen resolution. This will increase the actual canvas
 * element size, but scale it down again with CSS. The result is a crisp hi-res canvas at the same
 * size.
 *
 * @param canvas To scale. It supports an extra property to know if this was already done or not.
 * That's needed during dev since React will pass the same element it init each time and if we scale
 * it based on the current size it will get bigger each time.
 */
function enableRetina(canvas: HTMLCanvasElement & { isScaledForScreenDpi?: boolean }) {
  const isScaled = canvas.isScaledForScreenDpi || false;
  if (isScaled) return;

  const scale = window.devicePixelRatio || 1;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";

  // Scale the drawing context
  const cx = canvas.getContext("2d")!;
  cx.scale(scale, scale);
  canvas.isScaledForScreenDpi = true;
}

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 * @returns Controller to interact with the graph.
 */
export function createBezierTimeline({ canvas: _canvas, savedUserDots }: BezierTimelineProps): BezierTimeline {
  enableRetina(_canvas);

  const ScaleX = 9;
  const ScaleY = 2;
  const InsetX = 10;
  const InsetY = 10;
  const Height = _canvas.clientHeight;
  const Width = _canvas.clientWidth;
  const OffsetX = 0 + InsetX;
  const OffsetY = 400 + InsetY;

  const _cx = _canvas.getContext("2d")!;

  const _dots = savedUserDots.map((p) => asPhysDot(p));
  const _samples: Point[] = [];

  let _snapToGrid = true;
  let _labelYAxis = true;
  let _sampleCount = 10;
  let _addingAtPoint: Point | null = null;
  let _selectedIndex: number | null = null;
  let _dragging: Dragging | null = null;

  let _onDidDraw: (() => void) | undefined;
  let _onIsAdding: ((adding: boolean) => void) | undefined;

  let _state: State = "default";

  function cloneSelectedDot(): PhysDot | null {
    // XXX: shallow clone. Good enough for React to notice a diff
    return _selectedIndex === null ? null : { ..._dots[_selectedIndex] };
  }

  function getSelectedDot(): UserDot | null {
    const clone = cloneSelectedDot();
    return clone === null ? null : asUserDot(clone);
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
    if (_addingAtPoint !== null) return;

    _dragging = null;
    const x = e.offsetX;
    const y = e.offsetY;

    const isConvertClick = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    let newSelected: number | null = null;

    try {
      if (isConvertClick) {
        for (let i = 0; i < _dots.length; i++) {
          const p = _dots[i];

          if (nearPt(p, x, y)) {
            togglePt(p);
            newSelected = i;
            // TODO: this can cause two draws. May need to buffer
            draw();

            return;
          }
        }
      } else {
        for (let i = 0; i < _dots.length; i++) {
          const p = _dots[i];
          if (nearPt(p, x, y)) {
            newSelected = i;
            const maxX = _dots[i + 1] ? _dots[i + 1].x - ScaleX : Width;
            const minX = i > 0 ? _dots[i - 1].x + ScaleX : 0;
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

  function asPhysPoint(user: Point): Point {
    return { x: user.x * ScaleX + OffsetX, y: user.y * ScaleY * -1 + OffsetY };
  }

  function asUserPoint(pd: Point) {
    return { x: (pd.x - OffsetX) / ScaleX, y: ((pd.y - OffsetY) / ScaleY) * -1 };
  }

  function asPhysDot(user: UserDot): PhysDot {
    return {
      space: "physical",
      type: user.type,
      x: user.x * ScaleX + OffsetX,
      y: user.y * ScaleY * -1 + OffsetY,
      h1: asPhysPoint(user.h1),
      h2: asPhysPoint(user.h2),
    };
  }

  function asUserDot(pd: PhysDot): UserDot {
    return {
      ...pd,
      x: (pd.x - OffsetX) / ScaleX,
      y: ((pd.y - OffsetY) / ScaleY) * -1,
      space: "user",
      h1: asUserPoint(pd.h1),
      h2: asUserPoint(pd.h2),
    };
  }

  let isPastThreshold: (e: MouseEvent) => boolean = () => false;

  /**
   * Drag handle when dragging dots and handles
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

    let x = Math.max(InsetX, Math.min(e.pageX - rect.x, Width - InsetX));
    const y = Math.max(InsetY, Math.min(e.pageY - rect.y, Height - InsetY));

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

  function asUserX(x: number): number {
    return (x - OffsetX) / ScaleX;
  }

  function asUserY(y: number): number {
    return ((y - OffsetY) / ScaleY) * -1;
  }

  function asPhysX(x: number): number {
    return x * ScaleX + OffsetX;
  }

  function asPhysY(y: number): number {
    return y * ScaleY * -1 + OffsetY;
  }

  function moveDot(p: BaseDot, toX: number, toY: number) {
    const origin = { ...p };

    if (_snapToGrid) {
      const toUserX = Math.round(asUserX(toX));
      const toUserY = Math.round(asUserY(toY));

      const fromUserX = Math.round(asUserX(p.x));
      const fromUserY = Math.round(asUserY(p.y));

      // bail if no real change
      if (toUserX === fromUserX && toUserY === fromUserY) return;
      toX = asPhysX(toUserX);
      toY = asPhysY(toUserY);
    }

    // move point
    p.x = toX;
    p.y = toY;

    // move handles
    const diffPoint = diffPt(p, origin);
    p.h1.x += diffPoint.x;
    p.h1.y += diffPoint.y;
    p.h2.x += diffPoint.x;
    p.h2.y += diffPoint.y;

    draw();
  }

  function onMouseUpDrag() {
    endDrag();
  }

  function startDrag(x: number, y: number) {
    isPastThreshold = createThreshold({ x, y }, 2);
    document.addEventListener("mousemove", onMouseMoveDrag);
    document.addEventListener("mouseup", onMouseUpDrag);
  }

  function endDrag() {
    document.removeEventListener("mousemove", onMouseMoveDrag);
    document.removeEventListener("mouseup", onMouseUpDrag);
    _dragging = null;
  }

  function drawGrid() {
    _cx.lineWidth = 1;

    // above 100% gray
    _cx.fillStyle = Gray50;

    const p200 = asPhysY(200);
    const pNeg100 = asPhysY(-100);
    const fullDiff = pNeg100 - p200;

    _cx.fillStyle = White;
    _cx.fillRect(InsetX, InsetY, Width - 2 * InsetX, fullDiff);

    // below 100% gray
    // _cx.fillRect(InsetX, py0, Width - 2 * InsetX, ph100);

    // vertical lines
    for (let x = 0; x <= 100; x += 10) {
      _cx.strokeStyle = x % 50 === 0 ? Gray300 : Gray200;

      const px = asPhysX(x);
      _cx.beginPath();
      _cx.moveTo(px, InsetY);
      _cx.lineTo(px, Height - InsetY);
      _cx.stroke();
    }

    // horizontal lines
    for (let y = -100; y <= 200; y += 10) {
      _cx.beginPath();
      const py = asPhysY(y);
      _cx.moveTo(InsetX, py);

      if (y === 0) {
        // zero baseline
        _cx.strokeStyle = Gray500;
      } else if (y % 100 === 0) {
        _cx.strokeStyle = Gray400;
      } else {
        _cx.strokeStyle = Gray200;
      }

      _cx.lineTo(Width - InsetX, py);
      _cx.stroke();
    }

    if (document.activeElement === _canvas) {
      // Draw our own focus ring. This is because we draw large dots that appear to break out of the canvas
      _cx.lineWidth = 2;
      _cx.strokeStyle = "#1c7ef3";
      _cx.lineJoin = "round";
    } else {
      _cx.lineWidth = 1;
      _cx.strokeStyle = Gray900;
    }

    _cx.strokeRect(InsetX, InsetY, Width - 2 * InsetX, fullDiff);
    _cx.lineWidth = 1;

    drawAxisText();
  }

  function drawAxisText() {
    if (!_labelYAxis) return;

    _cx.textAlign = "left";
    _cx.textRendering = "optimizeSpeed";
    _cx.textBaseline = "middle";
    _cx.font = "14px sans-serif ";
    _cx.fillStyle = Gray500;

    for (let y = -100; y <= 200; y += 100) {
      const tp = asPhysPoint({ x: 1, y });
      const text = y === 0 ? "0" : `${y}%`;
      const r = _cx.measureText(text);

      _cx.fillStyle = White;
      _cx.fillRect(tp.x, tp.y - 4, r.width, 8);

      _cx.fillStyle = Gray400;
      _cx.fillText(text, tp.x, tp.y);
    }
  }

  function drawSamples() {
    _samples.length = 0;
    if (_dots.length < 2) return;

    let dotIndex = 1;

    let da = _dots[dotIndex - 1];
    let db = _dots[dotIndex];

    const inc = 100 / (_sampleCount - 1);

    _cx.setLineDash([]);

    for (let x = 0; x < 101; x += inc) {
      if (x > 100) x = 100;
      const px = asPhysX(x);

      if (px < da.x) {
        // Haven't hit a curve yet, so skip this dot
        continue;
      }

      while (px > db.x) {
        // Keep moving to next curve segment until contains the point
        if (dotIndex++ >= _dots.length - 1) break;
        da = _dots[dotIndex - 1];
        db = _dots[dotIndex];
      }

      const [x0, y0] = [da.x, da.y];
      const [x1, y1] = da.type === "square" ? [da.x, da.y] : [da.h2.x, da.h2.y];
      const [x2, y2] = db.type === "square" ? [db.x, db.y] : [db.h1.x, db.h1.y];
      const [x3, y3] = [db.x, db.y];

      const py = findYForX(px, x0, y0, x1, y1, x2, y2, x3, y3);

      if (py !== null) {
        const sample = { x: px, y: py };
        _samples.push(sample);

        // draw the guide lines
        willDraw(_cx, () => {
          _cx.strokeStyle = Red;
          dash(sample, _cx);
          _cx.setLineDash([5, 5]);
          _cx.beginPath();
          _cx.moveTo(px, OffsetY);
          _cx.lineTo(px, py);
          _cx.stroke();
        });
      }
    }

    // Fill the sample area
    _cx.beginPath();
    _cx.moveTo(OffsetX, OffsetY);
    for (let i = 0; i < _samples.length; i++) {
      const s = _samples[i];
      _cx.lineTo(s.x, s.y);
    }
    _cx.lineTo(Width - OffsetX, OffsetY);
    _cx.lineTo(OffsetX, OffsetY);
    _cx.fillStyle = "rgba(255 0 0 / .075)";
    _cx.fill();
  }

  function drawAddMarker() {
    if (_addingAtPoint === null) return;

    _cx.strokeStyle = Blue;

    let y = findYForXInCurve(_addingAtPoint.x, _dots);
    if (y === null) y = _addingAtPoint.y;

    _cx.beginPath();
    _cx.moveTo(_addingAtPoint.x, 0);
    _cx.lineTo(_addingAtPoint.x, _canvas.height);
    _cx.stroke();

    bullsEye({ x: _addingAtPoint.x, y }, _cx);
  }

  let drawTimer: number | null = null;

  /**
   * Schedules the canvas to redraw completely on the next animation frames. Can be called multiple
   * times and will only redraw once during the next frame.
   *
   * @param notify If true, fires onDrawCallback. Normally that's right, since listeners need to
   * know data changed that caused the draw. But in some cases, like drawing where a point might be
   * added, the drawing doesn't affect the data and we can skip the callback. Defaults to true.
   */
  function draw(notify: boolean = true) {
    if (drawTimer !== null) return;

    drawTimer = requestAnimationFrame(() => {
      drawNow(notify);
      drawTimer = null;
    });
  }

  /**
   * Draws the entire canvas right now. Generally should call .draw() instead to schedule on next
   * animation frame for better performance.
   *
   * @param notify If true, fires onDrawCallback. Normally that's right, since listeners need to
   * know data changed that caused the draw. But in some cases, like drawing where a point might be
   * added, the drawing doesn't affect the data and we can skip the callback. Defaults to true.
   */
  function drawNow(notify: boolean) {
    _cx.clearRect(0, 0, _canvas.width, _canvas.height);

    willDraw(_cx, () => {
      _cx.translate(0.5, 0.5);
      drawGrid();
    });

    // draw curve
    if (_dots.length > 0) {
      _cx.strokeStyle = Gray900;
      const origin = _dots[0];
      _cx.beginPath();
      _cx.moveTo(origin.x, origin.y);

      for (let i = 1; i < _dots.length; i++) {
        const pp = _dots[i - 1];
        const p = _dots[i];

        const cp1 = pp.type === "square" ? pp : pp.h2;
        const cp2 = p.type === "square" ? p : p.h1;
        _cx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
      }
      _cx.setLineDash([]);
      _cx.lineWidth = 3;
      _cx.stroke();

      _cx.lineWidth = 1;

      drawSamples();

      // draw the key points and their handles
      for (let i = 0; i < _dots.length; i++) {
        const p = _dots[i];

        if (p.type === "round" && i === _selectedIndex) {
          const h1 = p.h1;
          const h2 = p.h2;

          willDraw(_cx, () => {
            _cx.strokeStyle = Blue;
            _cx.setLineDash([5, 2]);

            for (const h of [h1, h2]) {
              _cx.beginPath();
              _cx.moveTo(p.x, p.y);
              _cx.lineTo(h.x, h.y);
              _cx.stroke();
            }

            if (p.type === "round") {
              _cx.fillStyle = Blue;
              diamond(p.h1, _cx);
              diamond(p.h2, _cx);
            }
          });
        }

        _cx.fillStyle = White;
        _cx.strokeStyle = Black;
        if (_selectedIndex === i && _addingAtPoint === null) {
          bullsEye(p, _cx);
        } else {
          circle(p, _cx);
        }
      }
    }

    drawAddMarker();
    if (notify) didDraw();
  }

  function onKeyDown(e: KeyboardEvent) {
    // if (selected === null) return;

    // const amount = e.shiftKey ? 10 : 1;

    const p = _selectedIndex === null ? null : _dots[_selectedIndex];

    switch (e.key) {
      case "Delete":
      case "Backspace":
        deleteSelectedDot();
        break;

      case "c": {
        if (_selectedIndex === null) return;
        const p = _dots[_selectedIndex];
        togglePt(p);
        break;
      }

      case ".":
        if (_selectedIndex === null) {
          _selectedIndex = 0;
        } else if (_selectedIndex < _dots.length - 1) {
          _selectedIndex++;
        }
        break;

      case ",":
        if (_selectedIndex === null) {
          _selectedIndex = _dots.length - 1;
        } else if (_selectedIndex > 0) {
          _selectedIndex--;
        }
        break;

      case "ArrowUp":
        if (p) moveDot(p, p.x, p.y - ScaleY);
        e.preventDefault();
        break;
      case "ArrowDown":
        if (p) moveDot(p, p.x, p.y + ScaleY);
        e.preventDefault();
        break;
      case "ArrowLeft":
        if (p) moveDot(p, p.x - ScaleX, p.y);
        e.preventDefault();
        break;
      case "ArrowRight":
        if (p) moveDot(p, p.x + ScaleX, p.y);
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

  // Always listen for mouse down
  _canvas.addEventListener("focus", onFocus);
  _canvas.addEventListener("blur", onBlur);
  _canvas.addEventListener("mousedown", onMouseDown);
  _canvas.addEventListener("keydown", onKeyDown);

  function destroy() {
    _canvas.removeEventListener("keydown", onKeyDown);
    _canvas.removeEventListener("mousedown", onMouseDown);
    _canvas.addEventListener("focus", onFocus);
    _canvas.addEventListener("blur", onBlur);

    _canvas.removeEventListener("mousemove", onMouseMoveDrag);
    _canvas.removeEventListener("mouseup", onMouseUpDrag);

    _canvas.removeEventListener("mousemove", onMouseMoveAdding);

    if (drawTimer !== null) cancelAnimationFrame(drawTimer);
  }

  function updateSelectedDot(p: UserDot) {
    if (_selectedIndex === null) return;
    _dots[_selectedIndex] = asPhysDot(p);
    draw();
  }

  function setSnapToGrid(snapToGrid: boolean) {
    _snapToGrid = snapToGrid;
  }

  function setLabelYAxis(labelYAxis: boolean) {
    _labelYAxis = labelYAxis;
    draw();
  }

  function getSamples() {
    return _samples.map((s) => asUserPoint(s));
  }

  function endAddingDot() {
    const oldState = _state;
    _addingAtPoint = null;
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
    _addingAtPoint = { x: e.offsetX, y: e.offsetY };
    draw(false);
  }

  function onMouseLeaveAdding() {
    endAddingDot();
  }

  function onClickAdding() {
    if (_addingAtPoint !== null) {
      let y = findYForXInCurve(_addingAtPoint.x, _dots);
      if (y === null) y = _addingAtPoint.y;

      const newDot: PhysDot = {
        type: "square",
        space: "physical",
        x: _addingAtPoint.x,
        y: y,
        h1: {
          x: _addingAtPoint.x - 50,
          y: y,
        },
        h2: {
          x: _addingAtPoint.x + 50,
          y: y,
        },
      };

      // try to add before next highest x
      let didAdd = false;
      for (let i = 0; i < _dots.length; i++) {
        if (_dots[i].x >= newDot.x) {
          didAdd = true;
          _dots.splice(i, 0, newDot);
          _selectedIndex = i;
          break;
        }
      }

      if (!didAdd) {
        // add at end
        _dots.push(newDot);
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

    _addingAtPoint = at ?? null;

    _canvas.addEventListener("mousemove", onMouseMoveAdding);
    _canvas.addEventListener("click", onClickAdding);
    _canvas.addEventListener("mouseleave", onMouseLeaveAdding);
    window.addEventListener("keydown", onKeyDownCancel);

    draw();

    if (_onIsAdding) _onIsAdding(true);
  }

  function deleteSelectedDot() {
    if (_selectedIndex === null) return;

    _dots.splice(_selectedIndex, 1);

    if (_dots.length === 0) {
      _selectedIndex = null;
    } else if (_selectedIndex !== 0) {
      _selectedIndex--;
    }

    draw();
  }

  function cancel() {
    endAddingDot();
  }

  function setSampleCount(count: number) {
    _sampleCount = Math.min(50, Math.max(3, count));
    draw();
  }

  // initial render
  draw();

  // type BezierTimeline
  return {
    destroy,
    updateSelectedDot,
    setSnapToGrid,
    getSamples,
    getSelectedDot,
    set onDraw(onDrawCallback: (() => void) | undefined) {
      _onDidDraw = onDrawCallback;
    },
    set onAdding(onAddCallback: ((isAdding: boolean) => void) | undefined) {
      _onIsAdding = onAddCallback;
    },
    getUserDots: () => {
      return _dots.map((d) => asUserDot(d));
    },
    beginAddingDot,
    deleteSelectedDot,
    cancel,
    setSampleCount,
    setLabelYAxis,
  };
}
