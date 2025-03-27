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

  set onChange(onChangeCallback: (() => void) | undefined);
  set onAdding(onAddingCallback: ((isAdding: boolean) => void) | undefined);

  beginAddingDot(): void;

  getSelectedDot(): UserDot | null;
  updateSelectedDot: (p: UserDot) => void;
  deleteSelectedDot: () => void;
  cancel: () => void;
}

export interface BezierTimelineProps {
  canvas: HTMLCanvasElement;
  userDots: UserDot[];
  onChange?: () => void;
  snapToGrid?: boolean;
  sampleCount: number;
}

type State = "adding" | "default";

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 * @returns Controller to interact with the graph.
 */
export function createBezierTimeline({
  canvas: _canvas,
  userDots,
  snapToGrid: _snapToGrid = true,
  sampleCount: _sampleCount,
}: BezierTimelineProps): BezierTimeline {
  const ScaleX = 9;
  const ScaleY = 2;

  const OffsetX = 0;
  const OffsetY = 400;

  const _cx = _canvas.getContext("2d")!;

  const _pDots = userDots.map((p) => asPhysDot(p));
  const _pSamples: Point[] = [];

  let _addingAtPoint: Point | null = null;

  let _selectedIndex: number | null = null;
  let _dragging: Dragging | null = null;

  let _onChange: (() => void) | undefined;
  let _onIsAdding: ((adding: boolean) => void) | undefined;

  let _state: State = "default";

  function cloneSelectedDot(): PhysDot | null {
    // XXX: shallow clone. Good enough for React to notice
    return _selectedIndex === null ? null : { ..._pDots[_selectedIndex] };
  }

  function getSelectedDot(): UserDot | null {
    const clone = cloneSelectedDot();
    return clone === null ? null : asUserDot(clone);
  }

  function didChange() {
    if (_onChange) _onChange();
  }

  function setSelectedIndex(index: number | null) {
    if (index === _selectedIndex) return;

    _selectedIndex = index;
    draw();
    didChange();
  }

  // function onDblClick(e: MouseEvent) {
  //   const x = e.offsetX;
  //   const y = e.offsetY;

  //   for (let i = 0; i < _pDots.length; i++) {
  //     const p = _pDots[i];
  //     if (nearPt(p, x, y)) {
  //       togglePt(p);
  //       draw();
  //       didChange();
  //       return;
  //     }
  //   }
  // }

  function onMouseDown(e: MouseEvent) {
    if (_addingAtPoint !== null) return;

    _dragging = null;
    const x = e.offsetX;
    const y = e.offsetY;

    const isConvertClick = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    let newSelected: number | null = null;

    try {
      if (isConvertClick) {
        for (let i = 0; i < _pDots.length; i++) {
          const p = _pDots[i];

          if (nearPt(p, x, y)) {
            togglePt(p);
            newSelected = i;
            // TODO: this can cause two draws. May need to buffer
            draw();
            didChange();
            return;
          }
        }
      } else {
        for (let i = 0; i < _pDots.length; i++) {
          const p = _pDots[i];
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

  function onMouseMoveDrag(e: MouseEvent) {
    if (!isPastThreshold(e)) return;

    if (!_dragging || e.buttons === 0) {
      endDrag();
      return;
    }

    if ("handle" in _dragging) {
      moveHandle(_dragging, e.offsetX, e.offsetY);
    } else {
      moveKeyPoint(_dragging.point, e.offsetX, e.offsetY);
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
    didChange();
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

  function moveKeyPoint(p: BaseDot, toX: number, toY: number) {
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

    // move key point
    p.x = toX;
    p.y = toY;

    // move handles
    const diffPoint = diffPt(p, origin);
    p.h1.x += diffPoint.x;
    p.h1.y += diffPoint.y;
    p.h2.x += diffPoint.x;
    p.h2.y += diffPoint.y;

    draw();
    didChange();
  }

  function onMouseUpDrag() {
    endDrag();
  }

  function startDrag(x: number, y: number) {
    isPastThreshold = createThreshold({ x, y }, 2);
    _canvas.addEventListener("mousemove", onMouseMoveDrag);
    _canvas.addEventListener("mouseup", onMouseUpDrag);
  }

  function endDrag() {
    _canvas.removeEventListener("mousemove", onMouseMoveDrag);
    _canvas.removeEventListener("mouseup", onMouseUpDrag);
    _dragging = null;
  }

  function drawGrid() {
    _cx.strokeStyle = LightGray;
    _cx.lineWidth = 1;

    for (let x = 0; x < 100 * ScaleX; x += 10 * ScaleX) {
      _cx.beginPath();
      _cx.moveTo(x, 0);
      _cx.lineTo(x, _canvas.height);
      _cx.stroke();
    }

    for (let y = 0; y < 300; y += 10) {
      _cx.beginPath();
      _cx.moveTo(0, y * ScaleY);

      if (y === 100) {
        _cx.strokeStyle = Gray;
        _cx.setLineDash([5, 2]);
      } else if (y === 200) {
        _cx.strokeStyle = Gray;
        _cx.setLineDash([]);
      } else {
        _cx.strokeStyle = LightGray;
        _cx.setLineDash([]);
      }

      _cx.lineTo(_canvas.width, y * ScaleY);
      _cx.stroke();
    }
  }

  function drawSamples() {
    _pSamples.length = 0;
    if (_pDots.length < 2) return;

    let dotIndex = 1;

    let da = _pDots[dotIndex - 1];
    let db = _pDots[dotIndex];

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
        if (dotIndex++ >= _pDots.length - 1) break;
        da = _pDots[dotIndex - 1];
        db = _pDots[dotIndex];
      }

      const [x0, y0] = [da.x, da.y];
      const [x1, y1] = da.type === "square" ? [da.x, da.y] : [da.h2.x, da.h2.y];
      const [x2, y2] = db.type === "square" ? [db.x, db.y] : [db.h1.x, db.h1.y];
      const [x3, y3] = [db.x, db.y];

      const py = findYForX(px, x0, y0, x1, y1, x2, y2, x3, y3);

      if (py !== null) {
        const sample = { x: px, y: py };
        _pSamples.push(sample);

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
    for (let i = 0; i < _pSamples.length; i++) {
      const s = _pSamples[i];
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

    let y = findYForXInCurve(_addingAtPoint.x, _pDots);
    if (y === null) y = _addingAtPoint.y;

    _cx.beginPath();
    _cx.moveTo(_addingAtPoint.x, 0);
    _cx.lineTo(_addingAtPoint.x, _canvas.height);
    _cx.stroke();

    bullsEye({ x: _addingAtPoint.x, y }, _cx);
  }

  function draw() {
    _cx.clearRect(0, 0, _canvas.width, _canvas.height);

    drawGrid();

    // draw curve
    if (_pDots.length > 0) {
      _cx.strokeStyle = Black;
      const origin = _pDots[0];
      _cx.beginPath();
      _cx.moveTo(origin.x, origin.y);

      for (let i = 1; i < _pDots.length; i++) {
        const pp = _pDots[i - 1];
        const p = _pDots[i];

        const cp1 = pp.type === "square" ? pp : pp.h2;
        const cp2 = p.type === "square" ? p : p.h1;
        _cx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
      }
      _cx.stroke();

      drawSamples();

      // draw the key points and their handles
      for (let i = 0; i < _pDots.length; i++) {
        const p = _pDots[i];

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
  }

  function onKeyDown(e: KeyboardEvent) {
    // if (selected === null) return;

    // const amount = e.shiftKey ? 10 : 1;

    const p = _selectedIndex === null ? null : _pDots[_selectedIndex];

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
        const p = _pDots[_selectedIndex];
        togglePt(p);
        break;
      }

      case ".":
        if (_selectedIndex === null) {
          _selectedIndex = 0;
        } else if (_selectedIndex < _pDots.length - 1) {
          _selectedIndex++;
        }
        break;

      case ",":
        if (_selectedIndex === null) {
          _selectedIndex = _pDots.length - 1;
        } else if (_selectedIndex > 0) {
          _selectedIndex--;
        }
        break;

      case "ArrowUp":
        if (p) moveKeyPoint(p, p.x, p.y - ScaleY);
        e.preventDefault();
        break;
      case "ArrowDown":
        if (p) moveKeyPoint(p, p.x, p.y + ScaleY);
        e.preventDefault();
        break;
      case "ArrowLeft":
        if (p) moveKeyPoint(p, p.x - ScaleX, p.y);
        e.preventDefault();
        break;
      case "ArrowRight":
        if (p) moveKeyPoint(p, p.x + ScaleX, p.y);
        e.preventDefault();
        break;

      default:
        // bail without redrawing
        return;
    }

    draw();
    didChange();
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
    _pDots[_selectedIndex] = asPhysDot(p);
    draw();
  }

  function setSnapToGrid(snapToGrid: boolean) {
    _snapToGrid = snapToGrid;
    didChange();
  }

  function getSamples() {
    if (_pSamples.length === 0) {
      draw();
    }

    return _pSamples.map((s) => asUserPoint(s));
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
    draw();
  }

  function onMouseLeaveAdding() {
    // null out the line, but the event listeners are still active if it returns
    _addingAtPoint = null;
    draw();
  }

  function onClickAdding() {
    if (_addingAtPoint !== null) {
      let y = findYForXInCurve(_addingAtPoint.x, _pDots);
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
      for (let i = 0; i < _pDots.length; i++) {
        if (_pDots[i].x >= newDot.x) {
          didAdd = true;
          _pDots.splice(i, 0, newDot);
          _selectedIndex = i;
          break;
        }
      }

      if (!didAdd) {
        // add at end
        _pDots.push(newDot);
        didChange();
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

    _pDots.splice(_selectedIndex, 1);

    if (_pDots.length === 0) {
      _selectedIndex = null;
    } else if (_selectedIndex !== 0) {
      _selectedIndex--;
    }

    draw();
    didChange();
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
    set onChange(onChangeCallback: (() => void) | undefined) {
      _onChange = onChangeCallback;
    },
    set onAdding(onAddCallback: ((isAdding: boolean) => void) | undefined) {
      _onIsAdding = onAddCallback;
    },
    getUserDots: () => {
      return _pDots.map((d) => asUserDot(d));
    },
    beginAddingDot,
    deleteSelectedDot,
    cancel,
    setSampleCount,
  };
}
