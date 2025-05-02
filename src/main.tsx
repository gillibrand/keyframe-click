import "@style/global.css";
import "@style/util.css";
import "@style/colors.css";
import "@style/controls.css";
import "@style/layout.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { NoteProvider } from "@components/note";
import "@util/focusVisible";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NoteProvider>
      <App />
    </NoteProvider>
  </StrictMode>
);
