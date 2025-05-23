import "./DemoPage.css";
import { DemoTile } from "./DemoTile";

export function DemoPage() {
  function openFloatingInSpace() {
    console.info("TODO: open demo");
  }

  return (
    <main>
      <div className="wrapper-small stack">
        <DemoTile name="Floating in space" onClick={openFloatingInSpace}>
          <p>Slowly bob up and down in a loop.</p>
        </DemoTile>

        <DemoTile name="Spin down" onClick={openFloatingInSpace}>
          <p>Rotate and disappear into a drain or black hole.</p>
        </DemoTile>
      </div>
    </main>
  );
}
