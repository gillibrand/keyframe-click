import { PropsWithChildren, useMemo, useState } from "react";
import { PreviewApi, PreviewContext } from "./usePreviewApi";

export function PreviewProvider({ children }: PropsWithChildren) {
  const [isRepeat, setIsRepeat] = useState(false);

  const value: PreviewApi = useMemo(
    () => ({
      isRepeat,
      setIsRepeat,
    }),
    [isRepeat]
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}
