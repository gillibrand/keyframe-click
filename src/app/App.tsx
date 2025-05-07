import { Banner } from "./Banner";
import { TimelinePage } from "./TimelinePage";

export function App() {
  return (
    <div className="flex-col min-h-screen ptb-4 stack">
      <Banner />
      <TimelinePage />
    </div>
  );
}
