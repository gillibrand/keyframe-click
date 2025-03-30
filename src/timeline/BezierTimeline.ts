import { stopEvent } from "../util";
import { Black, Blue, bullsEye, circle, dash, diamond, Gray, LightGray, Red, White, willDraw } from "./drawing";
import { BaseDot, diffPt, findYForX, findYForXInCurve, nearPt, PhysDot, Point, togglePt, UserDot } from "./point";

type DraggingPoint = {
  point: PhysDot;
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
  getUserDots(): UserDot[];
  getSamples(): Point[];
  setSampleCount(count: number): void;

  set onDraw(onChangeCallback: (() => void) | undefined);
  set onAdding(onAddingCallback: ((isAdding: boolean) => void) | undefined);

  beginAddingDot(): void;

  getSelectedDot(): UserDot | null;
  updateSelectedDot: (p: UserDot) => void;
  deleteSelectedDot: () => void;
  cancel: () => void;
}

export interface BezierTimelineProps {
  canvas: HTMLCanvasElement;
  savedUserDots: UserDot[];
}

type State = "adding" | "default";

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 * @returns Controller to interact with the graph.
 */
export function createBezierTimeline({ canvas: _canvas, savedUserDots }: BezierTimelineProps): BezierTimeline {
  const ScaleX = 9;
  const ScaleY = 2;

  const Inset = 20;
  const Height = _canvas.height;
  const Width = _canvas.width;

  // logical: 100 x 300

  const OffsetX = 0 + Inset;
  const OffsetY = 400 + Inset;
  const _cx = _canvas.getContext("2d")!;

  const _dots = savedUserDots.map((p) => asPhysDot(p));
  const _samples: Point[] = [];

  let _snapToGrid = true;
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
            _dragging = { point: p };
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

    const x = Math.max(Inset, Math.min(e.pageX - rect.x, Width - Inset));
    const y = Math.max(Inset, Math.min(e.pageY - rect.y, Height - Inset));

    if ("handle" in _dragging) {
      moveHandle(_dragging, x, y);
    } else {
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
    _cx.strokeStyle = LightGray;
    _cx.lineWidth = 1;

    for (let x = 0; x <= 100; x += 10) {
      const px = asPhysX(x);
      _cx.beginPath();
      _cx.moveTo(px, Inset);
      _cx.lineTo(px, Height - Inset);
      _cx.stroke();
    }

    for (let y = -100; y <= 200; y += 10) {
      _cx.beginPath();
      const py = asPhysY(y);
      _cx.moveTo(Inset, py);

      if (y === 100) {
        _cx.strokeStyle = Gray;
        _cx.setLineDash([5, 2]);
      } else if (y === 0) {
        _cx.strokeStyle = Gray;
        _cx.setLineDash([]);
      } else {
        _cx.strokeStyle = LightGray;
        _cx.setLineDash([]);
      }

      _cx.lineTo(Width - Inset, py);
      _cx.stroke();
    }
  }

  function drawSamples() {
    _samples.length = 0;
    if (_dots.length < 2) return;

    let dotIndex = 1;

    let da = _dots[dotIndex - 1];
    let db = _dots[dotIndex];

    const inc = 100 / (_sampleCount - 1);

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
    _cx.moveTo(0, OffsetY);
    for (let i = 0; i < _samples.length; i++) {
      const s = _samples[i];
      _cx.lineTo(s.x, s.y);
    }
    _cx.lineTo(_canvas.width, OffsetY);
    _cx.lineTo(0, OffsetY);
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
      drawTimer = null;
      drawNow(notify);
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

    drawGrid();

    // draw curve
    if (_dots.length > 0) {
      _cx.strokeStyle = Black;
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
      _cx.stroke();

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
        if (_selectedIndex === i) {
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

      case "a":
        stopEvent(e);
        beginAddingDot();
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

  // Always listen for mouse down
  _canvas.addEventListener("mousedown", onMouseDown);
  _canvas.addEventListener("keydown", onKeyDown);
  // _canvas.addEventListener("dblclick", onDblClick);
  // _canvas.addEventListener("click", onClick);

  function destroy() {
    // _canvas.addEventListener("dblclick", onDblClick);
    _canvas.removeEventListener("keydown", onKeyDown);
    _canvas.removeEventListener("mousedown", onMouseDown);

    _canvas.removeEventListener("mousemove", onMouseMoveDrag);
    _canvas.removeEventListener("mouseup", onMouseUpDrag);

    _canvas.removeEventListener("mousemove", onMouseMoveAdding);
    // _canvas.removeEventListener("mousedown", onMouseDown);
  }

  function updateSelectedDot(p: UserDot) {
    if (_selectedIndex === null) return;
    _dots[_selectedIndex] = asPhysDot(p);
    draw();
  }

  function setSnapToGrid(snapToGrid: boolean) {
    _snapToGrid = snapToGrid;
  }

  function getSamples() {
    return _samples.map((s) => asUserPoint(s));
  }

  function endAddingDot() {
    _addingAtPoint = null;
    _state = "default";

    window.removeEventListener("keydown", onKeyDownCancel);
    _canvas.removeEventListener("mouseleave", onMouseLeaveAdding);
    _canvas.removeEventListener("click", onClickAdding);
    _canvas.removeEventListener("mousemove", onMouseMoveAdding);

    draw();
    if (_onIsAdding) _onIsAdding(false);
  }

  function onMouseMoveAdding(e: MouseEvent) {
    _addingAtPoint = { x: e.offsetX, y: e.offsetY };
    draw(false);
  }

  function onMouseLeaveAdding() {
    // null out the line, but the event listeners are still active if it returns
    _addingAtPoint = null;
    draw(false);
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

  function beginAddingDot() {
    if (_state === "adding") return;

    // cleanup
    endAddingDot();
    _state = "adding";

    _canvas.addEventListener("mousemove", onMouseMoveAdding);
    _canvas.addEventListener("click", onClickAdding);
    _canvas.addEventListener("mouseleave", onMouseLeaveAdding);
    window.addEventListener("keydown", onKeyDownCancel);

    // _selectedIndex = null;
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
  };
}
