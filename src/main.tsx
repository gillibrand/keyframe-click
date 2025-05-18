import { App } from "@app/App";
import { NoteProvider } from "@components/note";
import { AboutPage } from "@pages/AboutPage";
import { TimelinePage } from "@pages/TimelinePage";
import { RouterProvider, Routes } from "@router/RouterProvider";
import "@style/colors.css";
import "@style/controls.css";
import "@style/global.css";
import "@style/layout.css";
import "@style/util.css";
import "@util/focusVisible";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const routes: Routes = {
  "/": TimelinePage,
  "/about": AboutPage,
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
