import AboutDoc from "./AboutDoc.mdx";
import CreatedBy from "./CreatedBy.mdx";

export default function AboutPage() {
  return (
    <main className="large-page grow flex-col">
      <div className="wrapper-small grow flex-col">
        <div className="grow flex-col tile mb-stack">
          <div className="grow">
            <AboutDoc />
          </div>

          <div className="text-centers">
            <CreatedBy />
          </div>
        </div>
      </div>
    </main>
  );
}
