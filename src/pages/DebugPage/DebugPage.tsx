import { useNoteApi } from "@components/note/_NoteContext";
import { GlobalLayers } from "@timeline/Layers";

export default function DebugPage() {
  const { sendNote } = useNoteApi();

  function handleCopy() {
    const json = GlobalLayers.asJson();
    navigator.clipboard.writeText(json);
    sendNote("Copied file data");
  }

  return (
    <main>
      <div className="wrapper-small stack">
        <h2>Debug page</h2>

        <button className="button" onClick={handleCopy}>
          Copy Data
        </button>
      </div>
    </main>
  );
}
