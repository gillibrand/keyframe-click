import { Black, bullsEye, circle, diamond, Gray, LightGray, White, willDraw } from "./drawing";
import { diffPt, KeyPoint, nearPt, Point, toggleType } from "./point";

interface SplineGraph {
  // render: () => void;
  destroy: () => void;
  canvas: HTMLCanvasElement;
  setSnapToGrid: (snapToGrid: boolean) => void;
}

type HandlePair = {
  handle: Point;
  otherHandle: Point;
};

type Dragging =
  | {
      point: KeyPoint;
    }
  | ({ point: KeyPoint } & HandlePair);

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

interface CreateSplineGraphProps {
  canvas: HTMLCanvasElement;
  userPoints: KeyPoint[];
  onChange?: (p: KeyPoint | null) => void;
  snapToGrid?: boolean;
}

function createSplineGraph({ canvas, userPoints, onChange, snapToGrid = true }: CreateSplineGraphProps): SplineGraph {
  const ScaleX = 9;
  const ScaleY = 2;

  const OffsetX = 0;
  const OffsetY = 400;

  // points = points.slice(); // shallow copy
  const points = userPoints.map((p) => asPhysKeypoint(p));
  const ctx = canvas.getContext("2d")!;
  // ctx.scale(2, 2);

  let selected: number | null = null;
  let dragging: Dragging | null = null;

  function cloneSelectedPoint(): KeyPoint | null {
    return selected === null ? null : { ...points[selected] };
  }

  function didChange() {
    if (!onChange) return;
    const clone = cloneSelectedPoint();
    onChange(clone === null ? null : asUserKeypoint(clone));
  }

  function setSelectedIndex(index: number | null) {
    if (index === selected) return;
    selected = index;
    draw();
    didChange();
  }

  function onDblClick(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (nearPt(p, x, y)) {
        toggleType(p);
        draw();
        didChange();
        return;
      }
    }
  }

  function onMouseDown(e: MouseEvent) {
    dragging = null;
    const x = e.offsetX;
    const y = e.offsetY;

    const isConvertClick = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    let newSelected: number | null = null;

    try {
      if (isConvertClick) {
        for (let i = 0; i < points.length; i++) {
          const p = points[i];

          if (nearPt(p, x, y)) {
            toggleType(p);
            newSelected = i;
            draw();
            return;
          }
        }

        newSelected = null;
        return;
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (nearPt(p, x, y)) {
          newSelected = i;
          dragging = { point: p };
          break;
        }

        if (p.type === "round") {
          if (nearPt(p.h1, x, y)) {
            newSelected = i;
            dragging = { point: p, handle: p.h1, otherHandle: p.h2 };
          } else if (nearPt(p.h2, x, y)) {
            newSelected = i;
            dragging = { point: p, handle: p.h2, otherHandle: p.h1 };
          }
        }
      }
    } finally {
      setSelectedIndex(newSelected);
    }

    if (dragging) startDrag(x, y);
  }

  function asPhysPoint(user: Point): Point {
    return { x: user.x * ScaleX + OffsetX, y: user.y * ScaleY * -1 + OffsetY };
  }

  function asPhysKeypoint(user: KeyPoint): KeyPoint {
    return {
      type: user.type,
      x: user.x * ScaleX + OffsetX,
      y: user.y * ScaleY * -1 + OffsetY,
      h1: asPhysPoint(user.h1),
      h2: asPhysPoint(user.h2),
    };
  }

  function asUserKeypoint(real: KeyPoint): KeyPoint {
    return { ...real, x: (real.x - OffsetX) / ScaleX, y: ((real.y - OffsetY) / ScaleY) * -1 };
  }

  let isPastThreshold: (e: MouseEvent) => boolean = () => false;

  function onMouseMove(e: MouseEvent) {
    if (!isPastThreshold(e)) return;

    if (!dragging || e.buttons === 0) {
      endDrag();
      return;
    }

    if ("handle" in dragging) {
      moveHandle(dragging, e.offsetX, e.offsetY);
    } else {
      moveKeyPoint(dragging.point, e.offsetX, e.offsetY);
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

  function moveKeyPoint(p: KeyPoint, toX: number, toY: number) {
    const origin = { ...p };

    if (snapToGrid) {
      const toUserX = Math.round(asUserX(toX));
      const toUserY = Math.round(asUserY(toY));

      const fromUserX = Math.round(asUserX(p.x));
      const fromUserY = Math.round(asUserY(p.y));

      // bail if no real change
      if (toUserX === fromUserX && toUserY === fromUserY) return;
      toX = asPhysX(toUserX);
      toY = asPhysY(toUserY);
      // if (p.x === toX && p.y === toY) return;
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
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
  }

  function endDrag() {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    dragging = null;
  }

  function drawGrid() {
    ctx.strokeStyle = LightGray;
    ctx.lineWidth = 1;

    for (let x = 0; x < 100 * ScaleX; x += 10 * ScaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < 300; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y * ScaleY);

      if (y === 100) {
        ctx.strokeStyle = Gray;
        ctx.setLineDash([5, 2]);
      } else if (y === 200) {
        ctx.strokeStyle = Gray;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = LightGray;
        ctx.setLineDash([]);
      }

      ctx.lineTo(canvas.width, y * ScaleY);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // draw curve
    ctx.strokeStyle = Black;
    const origin = points[0];
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);

    for (let i = 1; i < points.length; i++) {
      const pp = points[i - 1];
      const p = points[i];

      const cp1 = pp.type === "sharp" ? pp : pp.h2;
      const cp2 = p.type === "sharp" ? p : p.h1;
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
    }
    ctx.stroke();

    // draw the key points and their handles
    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      if (p.type === "round") {
        const h1 = p.h1;
        const h2 = p.h2;

        willDraw(ctx, () => {
          ctx.strokeStyle = Gray;
          ctx.setLineDash([5, 2]);

          for (const h of [h1, h2]) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(h.x, h.y);
            ctx.stroke();
          }
        });
      }

      ctx.fillStyle = White;
      ctx.strokeStyle = Black;
      if (selected === i) {
        bullsEye(p, ctx);
      } else {
        circle(p, ctx);
      }

      if (p.type === "round") {
        ctx.fillStyle = Gray;
        diamond(p.h1, ctx);
        diamond(p.h2, ctx);
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    console.info(">>> e.key", e.key);
    // if (selected === null) return;

    // const amount = e.shiftKey ? 10 : 1;

    switch (e.key) {
      case "c": {
        if (selected === null) return;
        const p = points[selected];
        toggleType(p);
        break;
      }

      case ".":
        if (selected === null) {
          selected = 0;
        } else if (selected < points.length - 1) {
          selected++;
        }
        break;

      case ",":
        if (selected === null) {
          selected = points.length - 1;
        } else if (selected > 0) {
          selected--;
        }
        break;
      // case "ArrowUp":
      //   p.y -= amount;
      //   break;
      // case "ArrowDown":
      //   p.y += amount;
      //   break;
      // case "ArrowLeft":
      //   p.x -= amount;
      //   break;
      // case "ArrowRight":
      //   p.x += amount;
      //   break;
      default:
        // bail without redrawing
        return;
    }

    draw();
    didChange();
  }

  // Always listen for mouse down
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("dblclick", onDblClick);
  // canvas.addEventListener("click", onClick);

  function destroy() {
    canvas.addEventListener("dblclick", onDblClick);
    canvas.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("mousedown", onMouseDown);
  }

  function updateSelected(p: KeyPoint) {
    if (selected === null) return;
    points[selected] = p;
    draw();
  }

  function setSnapToGrid(newSnapToGrid: boolean) {
    snapToGrid = newSnapToGrid;
  }

  // initial
  draw();

  return {
    // render,
    destroy,
    updateSelected,
    canvas,
    setSnapToGrid,
  } as SplineGraph;
}

export { createSplineGraph };
export type { SplineGraph };
