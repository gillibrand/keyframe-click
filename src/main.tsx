import { App } from "@app/App";
import { NoteProvider } from "@components/note";
import { AboutPage } from "@pages/AboutPage";
import { DemoPage } from "@pages/DemoPage";
import { TimelinePage } from "@pages/TimelinePage";
import { RouterProvider, Routes } from "@router/RouterProvider";
import { lazyWithPreload } from "@router/useRouter";
import "@style/colors.css";
import "@style/controls.css";
import "@style/global.css";
import "@style/layout.css";
import "@style/util.css";
import { isDevMode } from "@util";
import "@util/focusVisible";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const routes: Routes = {
  "/": TimelinePage,
  "/about": AboutPage,
  "/demos": DemoPage,
} as const;

if (isDevMode) {
  routes["/debug"] = lazyWithPreload(() => import("@pages/DebugPage/DebugPage"));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider routes={routes}>
      <NoteProvider>
        <App />
      </NoteProvider>
    </RouterProvider>
  </StrictMode>
);
