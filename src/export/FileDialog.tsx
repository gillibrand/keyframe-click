import { Hint } from "@components/Hint";
import { Callback } from "@util";
import { useRef, useState } from "react";
import { Dialog, DialogApi, DialogBody } from "./Dialog";
import "./FileDialog.css";

interface Props {
  /** Button that opened the dialog to place it near. */
  near?: HTMLElement;
  onClose?: Callback;
  onSave: (filename: string) => void;
  onNew: () => void;
  initialFilename: string;
}

/** A Save and file management dialog. */
export function FileDialog({ near, onClose, onSave, onNew, initialFilename }: Props) {
  const [filename, setFilename] = useState(initialFilename);

  function saveOnSubmit() {
    const name = filename.trim();
    if (!name) {
      if (nameInput.current) {
        nameInput.current.classList.remove("shake-no");
        void nameInput.current.offsetHeight;
        nameInput.current.classList.add("shake-no");
      }
      return false;
    }

    onSave(name);
    return true;
  }

  function cancel() {
    dialogApi.current?.animateClose();
  }

  async function handleOpenLibrary() {
    await dialogApi.current?.animateClose();
    window.location.href = "#/library";
  }

  const dialogApi = useRef<DialogApi>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <Dialog
        label="Manage animations"
        hideLabel
        open={true}
        id="todo"
        near={near}
        onClose={onClose}
        onSubmit={saveOnSubmit}
        ref={dialogApi}
      >
        <DialogBody>
          <label className="stacked-label" style={{ minWidth: "25ch" }}>
            <span>Timeline name</span>
            <input
              type="text"
              className="textbox"
              data-autofocus={true}
              placeholder="Untitled"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              spellCheck={false}
              ref={nameInput}
            />
            {initialFilename && <Hint>Auto-saved </Hint>}{" "}
          </label>
        </DialogBody>

        <DialogBody>
          <div className="flex gap-4 items-stretch">
            <button className="button is-secondary grow flex-1" type="button" onClick={cancel}>
              Cancel
            </button>
            <button
              className="button grow flex-1"
              //   disabled={!filename}
              title={!filename ? "Add a name to save this animation" : undefined}
            >
              Save
            </button>
          </div>
        </DialogBody>

        <hr />

        <DialogBody>
          <div className="stack flex-col pb-4">
            <button type="button" className="button is-secondary" onClick={handleOpenLibrary}>
              Open Library
            </button>
            <button type="button" className="button is-danger" onClick={onNew}>
              New animation
            </button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  );
}
