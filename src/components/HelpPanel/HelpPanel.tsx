import { CloseButton } from "@components/CloseButton";
import { Callback, isMac } from "@util";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./HelpPanel.css";

interface Props {
  open: boolean;
  willClose: Callback;
  didClose: Callback;
}

const Option = isMac ? <kbd>Option</kbd> : <kbd>Alt</kbd>;
const CmdC = isMac ? (
  <>
    <span className="key">⌘</span> C
  </>
) : (
  "Ctrl+C"
);

export function HelpPanel({ open, didClose, willClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let id = -1;
    if (open) {
      dialog.show();

      id = requestAnimationFrame(() => {
        dialog.classList.add("is-open");
      });
    } else {
      dialog.classList.remove("is-open");
    }

    return () => {
      cancelAnimationFrame(id);
    };
  }, [open]);

  function handleCloseButton() {
    const dialog = dialogRef.current;
    if (!dialog) return;

    willClose();

    // dialog.classList.remove("is-open");
  }

  function handleTransitionEnd() {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.classList.contains("is-open")) {
      dialog.close();
    }
  }

  return createPortal(
    <dialog className="HelpPanel stack" ref={dialogRef} onClose={didClose} onTransitionEnd={handleTransitionEnd}>
      <header className="flex items-center gap-4 justify-between">
        <h1>Keyboard shortcuts</h1>
        <CloseButton onClick={handleCloseButton} />
      </header>

      <dl className="row-gap-4 col-gap-8">
        <dt>Add point</dt>
        <dd>
          <kbd>N</kbd> <span className="p-4">or</span> <kbd>Shift</kbd>-click
        </dd>

        <dt>Select previous/next point</dt>
        <dd>
          <kbd>A</kbd> / <kbd>D</kbd>
        </dd>

        <dt>Move selected point</dt>
        <dd>arrow keys</dd>

        <dt>Move faster</dt>
        <dd>{Option}-arrow keys</dd>

        <dt>Move to value 0 / 100</dt>
        <dd>
          <kbd>0</kbd> / <kbd>1</kbd>
        </dd>

        <dt>Change selected point style </dt>
        <dd>
          <kbd>C</kbd> <span className="p-4">or</span> {Option}-click
        </dd>

        <dt>Delete selected point</dt>
        <dd>
          <kbd>Backspace</kbd>
        </dd>

        <dt className="mt-8">Previous/next property tab</dt>
        <dd className="mt-8">
          <kbd>[</kbd> / <kbd>]</kbd>
        </dd>

        <dt>Play preview</dt>
        <dd>
          <kbd>Space bar</kbd>
        </dd>

        <dt>Zoom out/in </dt>
        <dd>
          <kbd>S</kbd> / <kbd>W</kbd>
          <span className="p-4">or</span>
          <kbd>-</kbd> / <kbd>=</kbd>
        </dd>

        <dt>Copy keyframes</dt>
        <dd>
          <kbd>{CmdC}</kbd>
        </dd>

        <dt>Close focused property tab</dt>
        <dd>
          <kbd>Backspace</kbd>
        </dd>

        <dt>Toggle this help</dt>
        <dd>
          <kbd>?</kbd>
        </dd>
      </dl>
    </dialog>,
    document.body
  );
}
