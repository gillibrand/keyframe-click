import { PageIndicator } from "@components/PageIndicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function usePageIndicator() {
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const [checked, setChecked] = useState<boolean>(false);

  const handleTogglePage = useCallback((checked: boolean) => {
    const scrollParent = scrollParentRef.current;
    if (!scrollParent || !page1Ref.current || !page2Ref.current) return;
    setChecked(checked);

    const visiblePane = checked ? page2Ref.current : page1Ref.current;
    visiblePane.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  useEffect(function initScrollObserver() {
    const scrollParent = scrollParentRef.current;
    const page1 = page1Ref.current;
    const page2 = page2Ref.current;
    if (!scrollParent || !page1 || !page2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === page1) {
              setChecked(false);
              return;
            }

            if (entry.target === page2) {
              setChecked(true);
              return;
            }
          }
        });
      },
      {
        root: scrollParent,
        threshold: 0.5,
      }
    );

    observer.observe(page1);
    observer.observe(page2);

    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const pageIndicator = <PageIndicator checked={checked} onChange={handleTogglePage} />;

    return {
      pageIndicator,
      scrollParentRef,
      page1Ref,
      page2Ref,
    } as const;
  }, [handleTogglePage, checked]);
}
