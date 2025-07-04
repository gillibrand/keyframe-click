import { usePreviewApi } from "@app/usePreviewApi";
import { useSetting } from "@app/useSettings";
import { Confirm } from "@components/Confirm/Confirm";
import { useNoteApi } from "@components/note";
import Play from "@images/play-large.svg?react";
import { useRouter } from "@router/useRouter";
import { GlobalLayers } from "@timeline/Layers";
import clsx from "clsx";
import { PropsWithChildren, useCallback, useState } from "react";
import { DemoName, isJsonDemo, loadJsonDemo } from "./demoLoader";
import { SavedDemo } from "./demoTypes";
import { useHoverSoon } from "@util/hooks";

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
  const [, setPreviewDurationUnit] = useSetting("previewDurationUnit", "s");
  const [, setMaxY] = useSetting("maxY", 110);

  async function gotoDemo(demo?: SavedDemo) {
    if (!demo) demo = await loadJsonDemo(demoName);

    if (demo.previewGraphic) {
      setPreviewGraphic(demo.previewGraphic);
    }

    if (demo.previewDurationTime && demo.previewDurationUnit) {
      setPreviewDurationTime(demo.previewDurationTime);
      setPreviewDurationUnit(demo.previewDurationUnit);
    }

    if (demo.maxY) {
      setMaxY(demo.maxY);
    }

    setIsRepeat(demo.repeat === true);

    sendNote(`Opened "${name}"`, 4000);

    GlobalLayers.replaceLayers(JSON.parse(JSON.stringify(demo.layers)));
    gotoTimeline({ playDemo: true });
  }

  /**
   * Preloads the JSON for a demo file on hover to reduce the delay after the click (mostly seen in
   * Firefox). There is still a window if the load is very slow where the user can click and not see
   * anything for a while. It's like following a normal link on a web page though. Could add a
   * debounced loading message if I see this more, but seems more than fast enough with preload.
   */
  const preload = useCallback(
    function preload() {
      loadJsonDemo(demoName);
    },
    [demoName]
  );

  const { ...hoverProps } = useHoverSoon(preload, 300);

  return (
    <button
      className={clsx(
        "bg-neo-white shadow-hard group block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-black p-0 text-start",
        "focus-visible:focus-outline ring-white focus-visible:ring-2",
        className
      )}
      onClick={loadDemo}
      aria-label={`Open demo: ${name}`}
      {...hoverProps}
    >
      <div className="bg-neo-blue flex items-center justify-between px-3 py-2 text-white group-hover:brightness-110">
        <h2 className="text-lg font-bold sm:text-xl">{name}</h2>
        <Play className="transition-transform group-hover:translate-x-1" />
      </div>

      <div className="bg-neo-white px-3 py-2">{children}</div>

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
