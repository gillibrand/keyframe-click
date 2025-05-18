import { Suspense } from "react";
import { useRouter } from "../router/useRouter";
import { Banner } from "./Banner";

export function App() {
  const { Page } = useRouter();

  return (
    <div className="flex-col min-h-screen stack">
      <Banner />
      <Suspense fallback={"..."}>
        <Page />
      </Suspense>
    </div>
  );
}
