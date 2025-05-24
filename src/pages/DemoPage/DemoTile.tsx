import { useTooltip } from "@components/Tooltip";
import { cx } from "@util/cx";
import { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  /** Name of the demo. Not too long. Sentence case. Used for header and tooltips. */
  name: string;

  /** Callback when the demo button is clicked. */
  onClick: React.MouseEventHandler;

  className?: string;
}

/** An demo entry on the demo page. A tile with a button. */
export function DemoTile({ name, onClick, className, children }: Props) {
  const { tooltip, ...tooltipProps } = useTooltip<HTMLButtonElement>(`${name}`, 0);

  return (
    <div className={cx("tile stack DemoPage__tile-button", className)}>
      {tooltip}
      <div className="flex">
        <h2>{name}</h2>
        <button className="button is-demo ml-auto" {...tooltipProps} onClick={onClick}>
          Open <span className="sr-only">{name} demo</span>
        </button>
      </div>

      {children}
    </div>
  );
}
