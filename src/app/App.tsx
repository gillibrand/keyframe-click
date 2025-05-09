import { Suspense } from "react";
import { useRouter } from "../router/useRouter";
import { Banner } from "./Banner";
import { NoteList } from "@components/note";

export function App() {
  const { Page } = useRouter();

  return (
    <div className="flex-col min-h-screen stack-large">
      <Banner />
      <NoteList />

      <Suspense fallback={"..."}>
        <Page />
      </Suspense>
    </div>
  );
}
