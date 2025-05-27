import "./demos.css";
import { DemoTile } from "./DemoTile";

import blackHoleJson from "./demos/black-hole.json?raw";
import courseClearJson from "./demos/course-clear.json?raw";
import floatingJson from "./demos/floating.json?raw";
import newTimelineJson from "./demos/new-timeline.json?raw";

export function DemoPage() {
  return (
    <main>
      <div className="wrapper-small stack mb-stack">
        {/* <h2>Demos</h2> */}
        {/* <p className="color-black">Get inspired or started quickly.</p> */}

        <DemoTile name="Floating in space" demoJson={floatingJson}>
          <p>Slowly bob up and down in a loop.</p>
        </DemoTile>

        <DemoTile name="Up then over" demoJson={courseClearJson}>
          <p>Pull up an element into view briefly, then slide it away. For an attention </p>
        </DemoTile>

        <DemoTile name="Black hole" demoJson={blackHoleJson}>
          <p>Spin and shrink into oblivion. A dramatic way to delete an element.</p>
        </DemoTile>

        <DemoTile name="Start over" demoJson={newTimelineJson} className="mt-16">
          <p>A basic timeline to start from.</p>
        </DemoTile>
      </div>
    </main>
  );
}
