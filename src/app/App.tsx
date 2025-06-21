import { HelpPanel } from "@components/HelpPanel";
import { useRouter } from "@router/useRouter";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Banner } from "./Banner";
import { isKeyboardHandler } from "@util";
import { NoteList } from "@components/note";
import { PreviewProvider } from "./PreviewProvider";
import { Analytics } from "@vercel/analytics/react";

export function App() {
  const { Page } = useRouter();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHelpRendered, setIsHelpRendered] = useState(false);

  const handleWillCloseHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const handleDidCloseHelp = useCallback(() => {
    setIsHelpRendered(false);
  }, []);

  useEffect(() => {
    function toggleHelp(e: KeyboardEvent) {
      switch (e.key) {
        case "?":
          if (isKeyboardHandler(e.target)) return;

          setIsHelpOpen((prevOpen) => {
            if (prevOpen === true) {
              return false;
            } else {
              setIsHelpRendered(true);
              return true;
            }
          });
          break;

        case "Escape":
          setIsHelpOpen(false);
          break;
      }
    }

    document.body.addEventListener("keydown", toggleHelp);

    return () => {
      document.body.removeEventListener("keydown", toggleHelp);
    };
  }, []);

  return (
    <div className="flex-col min-h-screen stack">
      <Banner />
      <NoteList />
      <Suspense fallback={"..."}>
        <PreviewProvider>
          <Page />
        </PreviewProvider>
      </Suspense>
      <Analytics />
      {isHelpRendered && <HelpPanel open={isHelpOpen} willClose={handleWillCloseHelp} didClose={handleDidCloseHelp} />}
    </div>
  );
}
