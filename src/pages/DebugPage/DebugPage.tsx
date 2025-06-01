import { useNoteApi } from "@components/note/_NoteContext";
import { GlobalLayers } from "@timeline/Layers";

export default function DebugPage() {
  const { sendNote } = useNoteApi();

  function handleCopy() {
    const json = GlobalLayers.asJson();
    const layers = JSON.parse(json);
    console.info(">>> layers", layers);

    navigator.clipboard.writeText(json);
    sendNote("Copied file data");
  }

  return (
    <main>
      <div className="wrapper-small ">
        <button className="button" onClick={handleCopy}>
          Copy Data
        </button>
      </div>
    </main>
  );
}
