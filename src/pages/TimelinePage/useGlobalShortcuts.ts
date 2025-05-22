import { Layers } from "@timeline/Layers";
import { Callback, isKeyboardHandler, isMac } from "@util";
import { useEffect } from "react";

interface Props {
  layers: Layers;
  zoomIn: Callback;
  zoomOut: Callback;

  copyNow: Callback | null;
}

export function useGlobalShortcuts({ layers, zoomIn, zoomOut, copyNow }: Props): void {
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent): void {
      if (isKeyboardHandler(e.target)) return;

      switch (e.key) {
        case "[":
          layers.prevLayer();
          break;

        case "]":
          layers.nextLayer();
          break;

        case "=":
        case "w":
          zoomIn();
          break;

        case "-":
        case "s":
          zoomOut();
          break;

        case "c": {
          const isMacCopy = copyNow && isMac && e.key === "c" && e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey;
          const isOtherCopy = copyNow && !isMac && e.key === "c" && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
          if (isMacCopy || isOtherCopy) {
            copyNow();
          }
          break;
        }
        default:
          break;
      }
    }

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [layers, zoomIn, zoomOut, copyNow]);
}
