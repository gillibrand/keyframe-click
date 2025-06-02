import { Confirm } from "@components/Confirm/Confirm";
import Play from "@images/play-large.svg?react";
import { useRouter } from "@router/useRouter";
import { GlobalLayers } from "@timeline/Layers";
import { cx } from "@util/cx";
import { PropsWithChildren, useState } from "react";
import { DemoName, isJsonDemo, loadJsonDemo } from "./demoLoader";
import "./demos.css";
import { SavedDemo } from "./demoTypes";
import { useSetting } from "@app/useSettings";
import { useNoteApi } from "@components/note";
import { usePreviewApi } from "@app/usePreviewApi";

interface Props extends PropsWithChildren {
  /** Name of the demo. Not too long. Sentence case. Used for header and tooltips. */
  name: string;

  className?: string;

  demoName: DemoName;

  emoji?: string;
}

/** An demo entry on the demo page. A tile with a button. */
export function DemoTile({ name, className, children, demoName }: Props) {
  const { sendNote } = useNoteApi();

  const { gotoTimeline } = useRouter();
  const [isConfirm, setIsConfirm] = useState(false);

  async function loadDemo() {
    try {
      const savedDemo = await loadJsonDemo(demoName);

      // Convert to JSON for easy compare. Not that efficient though.
      const currentLayersJson = GlobalLayers.asJson();
      const isSameLayers = isJsonDemo(currentLayersJson);

      if (!isSameLayers) {
        setIsConfirm(true);
        return;
      }

      gotoDemo(savedDemo);
    } catch (e) {
      console.error("Failed to load demo file", e);
      window.alert(
        `The "${name}" demo is missing. This web page might be out-of-date.\n\nReload this page and try again.`
      );
    }
  }

  const { setIsRepeat } = usePreviewApi();
  const [, setPreviewGraphic] = useSetting("previewGraphic", "astro");
  const [, setPreviewDurationTime] = useSetting("previewDurationTime", 1);
  const [, setPreviewDurationUnit] = useSetting("previewDurationUnit", "ms");

  async function gotoDemo(demo?: SavedDemo) {
    if (!demo) demo = await loadJsonDemo(demoName);

    if (demo.previewGraphic) {
      setPreviewGraphic(demo.previewGraphic);
    }

    if (demo.previewDurationTime && demo.previewDurationUnit) {
      setPreviewDurationTime(demo.previewDurationTime);
      setPreviewDurationUnit(demo.previewDurationUnit);
    }

    setIsRepeat(demo.repeat === true);

    sendNote(`Opened "${name}"`, 4000);

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
          okLabel="Replace timeline with demo"
          open={isConfirm}
          onOk={gotoDemo}
          onClose={() => setIsConfirm(false)}
        >
          <p>
            Opening a demo will replace your current timeline. <br /> You cannot undo this.
          </p>
        </Confirm>
      )}
    </button>
  );
}
