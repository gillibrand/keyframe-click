import { App } from "@app/App";
import { NoteProvider } from "@components/note";
import { TimelinePage } from "@pages/TimelinePage";
import "@style/colors.css";
import "@style/controls.css";
import "@style/global.css";
import "@style/layout.css";
import "@style/util.css";
import "@util/focusVisible";
import { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, Routes } from "@router/RouterProvider";

const routes: Routes = {
  "/": TimelinePage,
  "/about": lazy(() => import("@pages/AboutPage")),
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider routes={routes}>
      <NoteProvider>
        <App />
      </NoteProvider>
    </RouterProvider>
  </StrictMode>
);
