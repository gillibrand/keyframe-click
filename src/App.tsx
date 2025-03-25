import { useCallback, useMemo, useRef, useState } from "react";
import "./App.css";
import { BaseDot, UserDot, Point, createSharp, createRound } from "./point";
import { createBezierTimeline, BezierTimeline } from "./BezierTimeline";
import { throttle } from "./util";

const userDots: UserDot[] = [
  createSharp(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round", space: "user" },
  createRound(50, 10),
  createSharp(75, 50),
  createSharp(100, 0),
];

function roundHundredths(p: Point): Point {
  return {
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
  };
}

function clean(p: BaseDot): Point {
  return roundHundredths(p);
}

function App() {
  const graphRef = useRef<BezierTimeline>();
  const [selectedPoint, setSelectedPoint] = useState<BaseDot | null>(null);
  const [snapToGrid, setSnapToGridRaw] = useState(true);

  const setSelectedPointSoon = useMemo(() => throttle(setSelectedPoint, 100), []);

  const setCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      console.info(">>> setCanvas");
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = undefined;
      }

      graphRef.current = canvas
        ? createBezierTimeline({ canvas, userDots, onChange: setSelectedPointSoon })
        : undefined;
    },
    [setSelectedPointSoon]
  );

  function setSnapToGrid(snapToGrid: boolean) {
    setSnapToGridRaw(snapToGrid);
    if (graphRef.current) {
      graphRef.current.setSnapToGrid(snapToGrid);
    }
  }

  return (
    <>
      {/* 100 x 300 logical | 100% x (200% over 100%) */}
      <canvas height={600} width={900} id="canvas" ref={setCanvas} tabIndex={0} />
      <p>
        <label>
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} /> Snap to grid
        </label>
      </p>
      <p>{selectedPoint && JSON.stringify(clean(selectedPoint))}</p>
    </>
  );
}

export default App;
