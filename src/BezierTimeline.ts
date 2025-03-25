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

export interface BezierTimeline {
  destroy: () => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  updateSelectedPoint: (p: UserDot) => void;
}

export interface BezierTimelineProps {
  canvas: HTMLCanvasElement;
  userDots: UserDot[];
  onChange?: (p: UserDot | null) => void;
  snapToGrid?: boolean;
}

function createBezierTimeline({ canvas, userDots, onChange, snapToGrid = true }: BezierTimelineProps): BezierTimeline {
  const ScaleX = 9;
  const ScaleY = 2;

  const OffsetX = 0;
  const OffsetY = 400;

  const physDots = userDots.map((p) => asPhysDot(p));
  const ctx = canvas.getContext("2d")!;

  let selectedIndex: number | null = null;
  let dragging: Dragging | null = null;

  function cloneSelectedDot(): PhysDot | null {
    // XXX: shallow clone. Good enough for React to notice
    return selectedIndex === null ? null : { ...physDots[selectedIndex] };
  }

  function didChange() {
    if (!onChange) return;
    const clone = cloneSelectedDot();
    onChange(clone === null ? null : asUserDot(clone));
  }

  function setSelectedIndex(index: number | null) {
    if (index === selectedIndex) return;

    selectedIndex = index;
    draw();
    didChange();
  }

  function onDblClick(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;

    for (let i = 0; i < physDots.length; i++) {
      const p = physDots[i];
      if (nearPt(p, x, y)) {
        togglePt(p);
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
        for (let i = 0; i < physDots.length; i++) {
          const p = physDots[i];

          if (nearPt(p, x, y)) {
            togglePt(p);
            newSelected = i;
            // TODO: this can cause two draws. May need to buffer
            draw();
            return;
          }
        }
      } else {
        for (let i = 0; i < physDots.length; i++) {
          const p = physDots[i];
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
      }
    } finally {
      setSelectedIndex(newSelected);
    }

    if (dragging) startDrag(x, y);
  }

  function asPhysPoint(user: Point): Point {
    return { x: user.x * ScaleX + OffsetX, y: user.y * ScaleY * -1 + OffsetY };
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
    return { ...pd, x: (pd.x - OffsetX) / ScaleX, y: ((pd.y - OffsetY) / ScaleY) * -1, space: "user" };
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

  function moveKeyPoint(p: BaseDot, toX: number, toY: number) {
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

  function drawSamples() {
    console.info(">>> drawSamples");
    if (physDots.length < 2) return;

    // const remainingDots = physDots.slice();

    const samples: Point[] = [];
    for (let x = 0; x < 100; x += 5) {
      const px = asPhysX(x);
      const py = findYForX(px, physDots);
      if (py !== undefined) {
        const sample = { x: px, y: py };
        samples.push(sample);
        willDraw(ctx, () => {
          ctx.strokeStyle = Red;
          // ctx.fillStyle = "transparent";
          dash(sample, ctx);
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(px, OffsetY);
          ctx.lineTo(px, py);
          ctx.stroke();
        });
      }
    }

    ctx.beginPath();
    ctx.moveTo(0, OffsetY);
    console.info(">>> samples", samples);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      ctx.lineTo(s.x, s.y);
    }
    ctx.lineTo(canvas.width, OffsetY);
    ctx.lineTo(0, OffsetY);
    ctx.fillStyle = "rgba(255 0 0 / .075)";

    // ctx.closePath();
    ctx.fill();
    // console.info(">>> sample", x, asUserY(y));

    // if (remainingDots.length < 2) return;

    // const sampleX = asPhysX(x);
    // // console.info(">>> sampleX", sampleX);

    // function onNextSegment() {
    //   const left = remainingDots[0];
    //   const right = remainingDots[1];
    //   // console.info(">>> left.x", left.x);
    //   // console.info(">>> right.x", right.x);
    //   return sampleX >= left.x && sampleX <= right.x;
    // }

    // while (!onNextSegment()) {
    //   remainingDots.shift();
    //   if (remainingDots.length < 2) return;
    // }

    // console.info(">>> got ALL");
  }

  function draw() {
    console.info(">>> draw");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // draw curve
    ctx.strokeStyle = Black;
    const origin = physDots[0];
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);

    for (let i = 1; i < physDots.length; i++) {
      const pp = physDots[i - 1];
      const p = physDots[i];

      const cp1 = pp.type === "sharp" ? pp : pp.h2;
      const cp2 = p.type === "sharp" ? p : p.h1;
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
    }
    ctx.stroke();

    drawSamples();

    // draw the key points and their handles
    for (let i = 0; i < physDots.length; i++) {
      const p = physDots[i];

      if (p.type === "round" && i === selectedIndex) {
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

          if (p.type === "round") {
            ctx.fillStyle = Gray;
            diamond(p.h1, ctx);
            diamond(p.h2, ctx);
          }
        });
      }

      ctx.fillStyle = White;
      ctx.strokeStyle = Black;
      if (selectedIndex === i) {
        bullsEye(p, ctx);
      } else {
        circle(p, ctx);
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // if (selected === null) return;

    // const amount = e.shiftKey ? 10 : 1;

    const p = selectedIndex === null ? null : physDots[selectedIndex];

    switch (e.key) {
      case "c": {
        if (selectedIndex === null) return;
        const p = physDots[selectedIndex];
        togglePt(p);
        break;
      }

      case ".":
        if (selectedIndex === null) {
          selectedIndex = 0;
        } else if (selectedIndex < physDots.length - 1) {
          selectedIndex++;
        }
        break;

      case ",":
        if (selectedIndex === null) {
          selectedIndex = physDots.length - 1;
        } else if (selectedIndex > 0) {
          selectedIndex--;
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
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("dblclick", onDblClick);
  // canvas.addEventListener("click", onClick);

  function destroy() {
    canvas.addEventListener("dblclick", onDblClick);
    canvas.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("mousedown", onMouseDown);
  }

  function updateSelectedPoint(p: UserDot) {
    if (selectedIndex === null) return;
    physDots[selectedIndex] = asPhysDot(p);
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
    updateSelectedPoint,
    setSnapToGrid,
  } as BezierTimeline;
}

export { createBezierTimeline };
