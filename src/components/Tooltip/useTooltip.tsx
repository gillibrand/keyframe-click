import { useCallback, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

export function useTooltip<T extends HTMLElement>(message: string | undefined) {
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

  const tooltip = isShow ? <Tooltip target={targetRef.current}>{message}</Tooltip> : null;

  return {
    tooltip,
    ref: targetRef,
    onMouseEnter: showSoon,
    onFocus: showSoon,
    onMouseLeave: hide,
    onBlur: hide,
  } as const;
}
