import { NoteProvider } from "@components/note";
import "@style/colors.css";
import "@style/controls.css";
import "@style/global.css";
import "@style/layout.css";
import "@style/util.css";
import "@util/focusVisible";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppFrame } from "@app/AppFrame";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NoteProvider>
      <AppFrame />
    </NoteProvider>
  </StrictMode>
);
