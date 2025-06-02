import "./demos.css";
import { DemoTile } from "./DemoTile";

export function DemoPage() {
  return (
    <main>
      <div className="wrapper-small stack mb-stack">
        {/* <h2>Demos</h2> */}
        {/* <p className="color-black">Get inspired or started quickly.</p> */}

        <DemoTile name="Bounce in" emoji="⚽️" demoName={"Bounce"}>
          <p>Drop down and bounce to a stop.</p>
        </DemoTile>

        <DemoTile name="Floating in space" emoji="🧑‍🚀" demoName={"Floating"}>
          <p>Slowly bob up and down in place.</p>
        </DemoTile>

        <DemoTile name="Spring in, slide out" emoji="🐇" demoName={"CourseClear"}>
          <p>Briefly draw attention to an element, then slide it away.</p>
        </DemoTile>

        <DemoTile name="Black hole" emoji="🕳️" demoName={"BlackHole"}>
          <p> Spin and shrink a deleted element into oblivion.</p>
        </DemoTile>

        <DemoTile name="Heartbeat " emoji="❤️" demoName={"Heartbeat"}>
          <p>Lub-dub. Lub-dub.</p>
        </DemoTile>

        <DemoTile name="Home run" demoName={"HomeRun"}>
          <p>Smash an element into the distance.</p>
        </DemoTile>

        <DemoTile name="Start over" demoName={"NewTimeline"} className="mt-16">
          <p>A basic timeline to start from.</p>
        </DemoTile>
      </div>
    </main>
  );
}
