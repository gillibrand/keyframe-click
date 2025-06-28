import clsx from "clsx";
import { PropsWithChildren, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props extends PropsWithChildren {
  target: HTMLElement | null;
  delayMs?: number;
}

const HeightMargin = 2;
const FromEdge = 18;

export function Tooltip({ children, target }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  void target;

  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!target || !tooltipRef.current) return;
    setIsVisible(false);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = targetRect.top - tooltipRect.height - HeightMargin + window.scrollY;
    if (top < window.scrollY) {
      top = targetRect.top + targetRect.height + HeightMargin + window.scrollY;
    }

    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2 + window.scrollX;
    const right = left + tooltipRect.width;
    const rightDiff = right - window.innerWidth + FromEdge;

    if (rightDiff > 0) {
      left -= rightDiff;
    }

    tooltipRef.current.style.top = `${top}px`;
    tooltipRef.current.style.left = `${left}px`;

    const id = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      cancelAnimationFrame(id);
    };
  }, [target, children]);

  return createPortal(
    // XXX: Tooltips are tricky with a11y. Just hide them for now so they aren't announced. We're
    // using other aria-labelling for now. Should probably reconsider this later.
    <div
      className={clsx(
        "text-neo-white z-tooltip pointer-events-none absolute top-0 left-0 rounded-sm bg-black p-1.5 text-xs leading-none whitespace-nowrap select-none",
        "transition-[opacity,translate] delay-500",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0"
      )}
      ref={tooltipRef}
      aria-hidden="true"
    >
      {children}
    </div>,
    document.body
  );
}
