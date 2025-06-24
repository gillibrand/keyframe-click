import AboutDoc from "./AboutDoc.mdx";
import CreatedBy from "./CreatedBy.mdx";

export function AboutPage() {
  return (
    <main className=" grow flex flex-col">
      <div className="wrapper-small grow flex flex-col j-prose">
        <div className="grow flex flex-col tile stack mb-stack">
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
