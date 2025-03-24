import { useCallback, useMemo, useRef, useState } from "react";
import "./App.css";
import { KeyPoint, Point, sharpPoint } from "./point";
import { createSplineGraph, SplineGraph } from "./SplineGraph";
import { throttle } from "./util";

const userPoints: KeyPoint[] = [
  sharpPoint(0, 0),
  { x: 25, y: 50, h1: { x: 15, y: 50 }, h2: { x: 35, y: 50 }, type: "round" },
  sharpPoint(50, 200),
  sharpPoint(75, 50),
  sharpPoint(100, 0),
];

function roundHundredths(p: Point): Point {
  return {
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
  };
}

function clean(p: KeyPoint): Point {
  return roundHundredths(p);
}

function App() {
  const graphRef = useRef<SplineGraph>();
  const [selectedPoint, setSelectedPoint] = useState<KeyPoint | null>(null);
  const [snapToGrid, setSnapToGridRaw] = useState(true);

  const setSelectedPointSoon = useMemo(() => throttle(setSelectedPoint, 100), []);

  const setCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = undefined;
      }

      graphRef.current = canvas ? createSplineGraph({ canvas, userPoints, onChange: setSelectedPointSoon }) : undefined;
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
      <p>{selectedPoint && <div>{JSON.stringify(clean(selectedPoint))}</div>}</p>
    </>
  );
}

export default App;
