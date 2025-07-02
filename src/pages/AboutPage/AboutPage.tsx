import AboutDoc from "./AboutDoc.mdx";
import CreatedBy from "./CreatedBy.mdx";

export function AboutPage() {
  return (
    <main className="flex grow flex-col">
      <div className="wrapper j-prose flex grow flex-col">
        <div className="tile stack flex grow flex-col">
          <div className="grow space-y-4">
            <AboutDoc />
          </div>

          <div className="text-center">
            <CreatedBy />
          </div>
        </div>
      </div>
    </main>
  );
}
