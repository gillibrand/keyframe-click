import { Black, bullsEye, circle, dash, diamond, Gray, LightGray, Red, White, willDraw } from "./drawing";
import { BaseDot, diffPt, findYForX, nearPt, PhysDot, Point, togglePt, UserDot } from "./point";

type HandlePair = {
  handle: Point;
  otherHandle: Point;
};

type Dragging =
  | {
      point: BaseDot;
    }
  | ({ point: BaseDot } & HandlePair);

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

interface BezierTimeline {
  destroy: () => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  updateSelectedPoint: (p: UserDot) => void;
  getSamples(): Point[];
  getSelectedDot(): UserDot | null;
  set onChange(onChangeCallback: (() => void) | undefined);
  getUserDots(): UserDot[];
}

export type { BezierTimeline };

export interface BezierTimelineProps {
  canvas: HTMLCanvasElement;
  userDots: UserDot[];
  onChange?: () => void;
  snapToGrid?: boolean;
}

/**
 * Wraps an existing canvas element with logic to draw a timeline.
 * @returns Controller to interact with the graph.
 */
function createBezierTimeline({
  canvas: _canvas,
  userDots,
  onChange: _onChange,
  snapToGrid: _snapToGrid = true,
}: BezierTimelineProps): BezierTimeline {
  const ScaleX = 9;
  const ScaleY = 2;

  const OffsetX = 0;
  const OffsetY = 400;

  const _c = _canvas.getContext("2d")!;

  const _pDots = userDots.map((p) => asPhysDot(p));
  const _pSamples: Point[] = [];

  let _selectedIndex: number | null = null;
  let _dragging: Dragging | null = null;

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

  function onMouseMove(e: MouseEvent) {
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

  function moveHandle({ handle, otherHandle }: HandlePair, toX: number, toY: number) {
    const origin = { ...handle };

    // move handle
    handle.x = toX;
    handle.y = toY;

    // move other handle
    const diffPoint = diffPt(handle, origin);
    otherHandle.x -= diffPoint.x;
    otherHandle.y -= diffPoint.y;

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

  function onMouseUp() {
    endDrag();
  }

  function startDrag(x: number, y: number) {
    isPastThreshold = createThreshold({ x, y }, 2);
    _canvas.addEventListener("mousemove", onMouseMove);
    _canvas.addEventListener("mouseup", onMouseUp);
  }

  function endDrag() {
    _canvas.removeEventListener("mousemove", onMouseMove);
    _canvas.removeEventListener("mouseup", onMouseUp);
    _dragging = null;
  }

  function drawGrid() {
    _c.strokeStyle = LightGray;
    _c.lineWidth = 1;

    for (let x = 0; x < 100 * ScaleX; x += 10 * ScaleX) {
      _c.beginPath();
      _c.moveTo(x, 0);
      _c.lineTo(x, _canvas.height);
      _c.stroke();
    }

    for (let y = 0; y < 300; y += 10) {
      _c.beginPath();
      _c.moveTo(0, y * ScaleY);

      if (y === 100) {
        _c.strokeStyle = Gray;
        _c.setLineDash([5, 2]);
      } else if (y === 200) {
        _c.strokeStyle = Gray;
        _c.setLineDash([]);
      } else {
        _c.strokeStyle = LightGray;
        _c.setLineDash([]);
      }

      _c.lineTo(_canvas.width, y * ScaleY);
      _c.stroke();
    }
  }

  function drawSamples() {
    _pSamples.length = 0;
    if (_pDots.length < 2) return;

    let dotIndex = 1;

    let da = _pDots[dotIndex - 1];
    let db = _pDots[dotIndex];

    const inc = 100 / 9;

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
      const [x1, y1] = da.type === "sharp" ? [da.x, da.y] : [da.h2.x, da.h2.y];
      const [x2, y2] = db.type === "sharp" ? [db.x, db.y] : [db.h1.x, db.h1.y];
      const [x3, y3] = [db.x, db.y];

      const py = findYForX(px, x0, y0, x1, y1, x2, y2, x3, y3);

      if (py !== null) {
        const sample = { x: px, y: py };
        _pSamples.push(sample);

        // draw the guide lines
        willDraw(_c, () => {
          _c.strokeStyle = Red;
          dash(sample, _c);
          _c.setLineDash([5, 5]);
          _c.beginPath();
          _c.moveTo(px, OffsetY);
          _c.lineTo(px, py);
          _c.stroke();
        });
      }
    }

    // Fill the sample area
    _c.beginPath();
    _c.moveTo(0, OffsetY);
    for (let i = 0; i < _pSamples.length; i++) {
      const s = _pSamples[i];
      _c.lineTo(s.x, s.y);
    }
    _c.lineTo(_canvas.width, OffsetY);
    _c.lineTo(0, OffsetY);
    _c.fillStyle = "rgba(255 0 0 / .075)";
    _c.fill();
  }

  function draw() {
    _c.clearRect(0, 0, _canvas.width, _canvas.height);

    drawGrid();

    // draw curve
    _c.strokeStyle = Black;
    const origin = _pDots[0];
    _c.beginPath();
    _c.moveTo(origin.x, origin.y);

    for (let i = 1; i < _pDots.length; i++) {
      const pp = _pDots[i - 1];
      const p = _pDots[i];

      const cp1 = pp.type === "sharp" ? pp : pp.h2;
      const cp2 = p.type === "sharp" ? p : p.h1;
      _c.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
    }
    _c.stroke();

    drawSamples();

    // draw the key points and their handles
    for (let i = 0; i < _pDots.length; i++) {
      const p = _pDots[i];

      if (p.type === "round" && i === _selectedIndex) {
        const h1 = p.h1;
        const h2 = p.h2;

        willDraw(_c, () => {
          _c.strokeStyle = Gray;
          _c.setLineDash([5, 2]);

          for (const h of [h1, h2]) {
            _c.beginPath();
            _c.moveTo(p.x, p.y);
            _c.lineTo(h.x, h.y);
            _c.stroke();
          }

          if (p.type === "round") {
            _c.fillStyle = Gray;
            diamond(p.h1, _c);
            diamond(p.h2, _c);
          }
        });
      }

      _c.fillStyle = White;
      _c.strokeStyle = Black;
      if (_selectedIndex === i) {
        bullsEye(p, _c);
      } else {
        circle(p, _c);
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // if (selected === null) return;

    // const amount = e.shiftKey ? 10 : 1;

    const p = _selectedIndex === null ? null : _pDots[_selectedIndex];

    switch (e.key) {
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

        break;
      case "ArrowDown":
        if (p) moveKeyPoint(p, p.x, p.y + ScaleY);
        break;
      case "ArrowLeft":
        if (p) moveKeyPoint(p, p.x - ScaleX, p.y);
        break;
      case "ArrowRight":
        if (p) moveKeyPoint(p, p.x + ScaleX, p.y);
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
  }

  function updateSelectedPoint(p: UserDot) {
    if (_selectedIndex === null) return;
    _pDots[_selectedIndex] = asPhysDot(p);
    draw();
  }

  function setSnapToGrid(snapToGrid: boolean) {
    _snapToGrid = snapToGrid;
  }

  function getSamples() {
    if (_pSamples.length === 0) {
      draw();
    }

    return _pSamples.map((s) => asUserPoint(s));
  }

  // initial
  draw();

  return {
    destroy,
    updateSelectedPoint,
    setSnapToGrid,
    getSamples,
    getSelectedDot,
    set onChange(onChangeCallback: (() => void) | undefined) {
      _onChange = onChangeCallback;
    },
    getUserDots: () => {
      return _pDots.map((d) => asUserDot(d));
    },
  };
}

export { createBezierTimeline };
