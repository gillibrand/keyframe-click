import { cx } from "@util/cx";
import { PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

interface Props extends PropsWithChildren {
  target: HTMLElement | null;
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

  useEffect(() => {}, []);

  return createPortal(
    // XXX: Tooltip are tricky with a11y. Just hide them from now so they aren't announced. We're
    // using other aria-labelling for now. Should probably reconsider this later.
    <div className={cx("Tooltip", { "is-visible": isVisible })} ref={tooltipRef} aria-hidden="true">
      {children}
    </div>,
    document.body
  );
}
