import { useCallback, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

/**
 * Creates a tooltip to show around another element.
 *
 * @param message Message to show in tooltip. If missing, the tooltip is not enabled.
 * @param delayMs Optional delay before showing the tooltip on hover. Normally not needed, but sets the delay to 0 on
 *   the demo page buttons.
 * @returns Object with the tooltip element the parent must render. All other props should be captured in a rest param
 *   and then spread into the element that will show the tooltip on hover and focus.
 */
export function useTooltip<T extends HTMLElement>(message: string | undefined, delayMs?: number) {
  const targetRef = useRef<T>(null);

  const [isVisible, setIsVisible] = useState(false);

  const showSoon = useCallback(() => {
    if (!targetRef.current) return;
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const isShow = isVisible && message;

  const tooltip = isShow ? (
    <Tooltip target={targetRef.current} delayMs={delayMs}>
      {message}
    </Tooltip>
  ) : null;

  return {
    tooltip,
    ref: targetRef,
    onMouseEnter: showSoon,
    onFocus: showSoon,
    onMouseLeave: hide,
    onBlur: hide,
  } as const;
}
