import { Confirm } from "@components/Confirm/Confirm";
import Play from "@images/play-large.svg?react";
import { useRouter } from "@router/useRouter";
import { GlobalLayers } from "@timeline/Layers";
import { cx } from "@util/cx";
import { PropsWithChildren, useState } from "react";
import { DemoName, loadJsonDemo } from "./demoLoader";
import "./demos.css";
import { Saved } from "./demoTypes";

interface Props extends PropsWithChildren {
  /** Name of the demo. Not too long. Sentence case. Used for header and tooltips. */
  name: string;

  className?: string;

  demoName: DemoName;
}

/** An demo entry on the demo page. A tile with a button. */
export function DemoTile({ name, className, children, demoName }: Props) {
  const { gotoTimeline } = useRouter();
  const [isConfirm, setIsConfirm] = useState(false);

  async function loadDemo() {
    const savedDemo = await loadJsonDemo(demoName);

    // Convert both to json for easy compare. Should probably compare deeper.
    // TODO: compare to all loaded demos
    const currentLayersJson = GlobalLayers.asJson();
    const demoLayersJson = JSON.stringify(savedDemo.layers);

    const isSameLayers = currentLayersJson === demoLayersJson;

    if (!isSameLayers) {
      setIsConfirm(true);
      return;
    }

    gotoDemo(savedDemo);
  }

  async function gotoDemo(demo?: Saved) {
    if (!demo) demo = await loadJsonDemo(demoName);

    GlobalLayers.replaceLayers(JSON.parse(JSON.stringify(demo.layers)));
    gotoTimeline({ playDemo: true });
  }

  return (
    <button
      className={cx("DemoTile tile p-0 overflow-hidden", className)}
      onClick={loadDemo}
      aria-label={`Open demo: ${name}`}
    >
      <div className="flex bg-blue color-white p-4 DemoTile__header items-center justify-between">
        <h2>{name}</h2>
        <Play className="ms-auto" />
      </div>

      <div className="p-4">{children}</div>

      {isConfirm && (
        <Confirm
          label="Open demo?"
          okLabel="Discard timeline"
          open={isConfirm}
          onOk={gotoDemo}
          onClose={() => setIsConfirm(false)}
        >
          <p>
            Opening a demo will overwrite your current timeline. <br /> This cannot be undone.
          </p>
        </Confirm>
      )}
    </button>
  );
}
