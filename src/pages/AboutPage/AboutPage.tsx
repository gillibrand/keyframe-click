import AboutDoc from "./AboutDoc.mdx";
import CreatedBy from "./CreatedBy.mdx";

export function AboutPage() {
  return (
    <main className="grow flex-col">
      <div className="wrapper-small grow flex-col">
        <div className="grow flex-col tile stack mb-stack">
          <div className="grow stack">
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
