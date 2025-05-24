import { createContext, useContext } from "react";

/**
 * Mostly preview is self contained or manager through global settings. Repeat is the only exception, so we pull it up
 * to global data so that demos can change it. I don't want it a settings since it should be off on all page loads.
 */
export interface PreviewApi {
  isRepeat: boolean;
  setIsRepeat: (repeat: boolean) => void;
}

export const PreviewContext = createContext<PreviewApi | undefined>(undefined);

export function usePreviewApi() {
  const api = useContext(PreviewContext);
  if (api === undefined) {
    throw new Error("usePreviewApi must be used within a PreviewProvider");
  }
  return api;
}
