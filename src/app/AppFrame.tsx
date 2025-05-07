import { Banner } from "./Banner";
import { App } from "./App";

export function AppFrame() {
  return (
    <div className="flex-col min-h-screen ptb-4 stack">
      <Banner />
      <App />
    </div>
  );
}
