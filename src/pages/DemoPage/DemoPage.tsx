import { useRouter } from "@router/useRouter";
import "./DemoPage.css";
import { DemoTile } from "./DemoTile";

import { GlobalLayers, RealLayer } from "@timeline/Layers";

import floatingJson from "./demos/floating.json?raw";
import courseClearJson from "./demos/course-clear.json?raw";
import blackHoleJson from "./demos/black-hole.json?raw";
import newTimelineJson from "./demos/new-timeline.json?raw";

export function DemoPage() {
  const { gotoTimeline } = useRouter();

  function openFloatingInSpace() {
    GlobalLayers.replaceLayers(JSON.parse(floatingJson) as RealLayer[]);
    gotoTimeline({ playDemo: true });
  }

  function openCourseClear() {
    gotoTimeline({ playDemo: true });
    GlobalLayers.replaceLayers(JSON.parse(courseClearJson) as RealLayer[]);
  }

  function openBlackHole() {
    gotoTimeline({ playDemo: true });
    GlobalLayers.replaceLayers(JSON.parse(blackHoleJson) as RealLayer[]);
  }

  function newTimeline() {
    gotoTimeline({ playDemo: true });
    GlobalLayers.replaceLayers(JSON.parse(newTimelineJson) as RealLayer[]);
  }

  return (
    <main>
      <div className="wrapper-small stack">
        <DemoTile name="Floating in space" onClick={openFloatingInSpace}>
          <p>Slowly bob up and down in a loop.</p>
        </DemoTile>

        <DemoTile name="Up and over" onClick={openCourseClear}>
          <p>Pull up an element into view briefly, then slide it away. For an attention </p>
        </DemoTile>

        <DemoTile name="Black hole" onClick={openBlackHole}>
          <p>Spin and shrink into oblivion. A dramatic way to delete an element.</p>
        </DemoTile>

        <DemoTile name="Start over" onClick={newTimeline} className="mt-16">
          <p>A basic timeline to start from.</p>
        </DemoTile>
      </div>
    </main>
  );
}
