import { DemoTile } from "./DemoTile";

export function DemoPage() {
  return (
    <main>
      <div className="wrapper-small mb-4 space-y-6">
        <DemoTile name="Black hole" demoName={"BlackHole"}>
          <p> Spin and shrink a deleted element into oblivion.</p>
        </DemoTile>

        <DemoTile name="Bounce in" demoName={"Bounce"}>
          <p>Drop down and bounce to a stop.</p>
        </DemoTile>

        <DemoTile name="Floating in space" demoName={"Floating"}>
          <p>Slowly bob up and down in place.</p>
        </DemoTile>

        <DemoTile name="Heartbeat " demoName={"Heartbeat"}>
          <p>Lub-dub. Lub-dub.</p>
        </DemoTile>

        <DemoTile name="Home run" demoName={"HomeRun"}>
          <p>Smash an element into the distance.</p>
        </DemoTile>

        <DemoTile name="Success message" demoName={"CourseClear"}>
          <p>Show a brief status message, then slide it away.</p>
        </DemoTile>

        <DemoTile name="Start over" demoName={"NewTimeline"} className="mt-16">
          <p>A basic timeline to start from.</p>
        </DemoTile>
      </div>
    </main>
  );
}
