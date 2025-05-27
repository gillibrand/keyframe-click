import { cx } from "@util/cx";
import { PropsWithChildren } from "react";
import "./demos.css";
import Play from "@images/play-large.svg?react";
import { useRouter } from "@router/useRouter";
import { GlobalLayers, RealLayer } from "@timeline/Layers";

interface Props extends PropsWithChildren {
  /** Name of the demo. Not too long. Sentence case. Used for header and tooltips. */
  name: string;

  // onClick: React.MouseEventHandler;

  className?: string;

  demoJson: string;
}

/** An demo entry on the demo page. A tile with a button. */
export function DemoTile({ name, className, children, demoJson }: Props) {
  const { gotoTimeline } = useRouter();

  function gotoDemo() {
    GlobalLayers.replaceLayers(JSON.parse(demoJson) as RealLayer[]);
    gotoTimeline({ playDemo: true });
  }

  return (
    <button
      className={cx("DemoTile tile p-0 overflow-hidden", className)}
      onClick={gotoDemo}
      aria-label={`Open demo: ${name}`}
    >
      <div className="flex bg-blue color-white p-4 DemoTile__header items-center justify-between">
        <h2>{name}</h2>
        <Play className="ms-auto" />
      </div>

      <div className="p-4">{children}</div>
    </button>
  );
}
