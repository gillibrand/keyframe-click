import "./demos.css";
import { DemoTile } from "./DemoTile";

export function DemoPage() {
  return (
    <main>
      <div className="wrapper-small stack mb-stack">
        {/* <h2>Demos</h2> */}
        {/* <p className="color-black">Get inspired or started quickly.</p> */}

        <DemoTile name="Bounce in" emoji="⚽️" demoName={"Bounce"}>
          <p>An element fades and and bounces to a stop.</p>
        </DemoTile>

        <DemoTile name="Floating in space" emoji="🧑‍🚀" demoName={"Floating"}>
          <p>Slowly bob up and down. Works well repeating over and over to subtly draw attention.</p>
        </DemoTile>

        <DemoTile name="Spring in, slide out" emoji="🐇" demoName={"CourseClear"}>
          <p>Pull up an element into view briefly, then slide it away. For an attention grabbing success message.</p>
        </DemoTile>

        <DemoTile name="Black hole" emoji="🕳️" demoName={"BlackHole"}>
          <p> Spin and shrink into oblivion. A dramatic way to delete an element.</p>
        </DemoTile>

        <DemoTile name="Heartbeat " emoji="❤️" demoName={"Heartbeat"}>
          <p>A beating heart. Works well on repeat.</p>
        </DemoTile>

        <DemoTile name="Start over" demoName={"NewTimeline"} className="mt-16">
          <p>A basic timeline to start from.</p>
        </DemoTile>
      </div>
    </main>
  );
}
