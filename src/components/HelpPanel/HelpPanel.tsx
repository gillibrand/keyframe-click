import Close from "@images/close.svg?react";
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
    <dialog className="HelpPanel" ref={dialogRef} onClose={didClose} onTransitionEnd={handleTransitionEnd}>
      <header className="flex items-center gap-4 justify-between">
        <h1>Keyboard shortcuts</h1>
        <button className="close-button" onClick={handleCloseButton}>
          <Close />
        </button>
      </header>

      <dl className="mt-8 row-gap-4 col-gap-8">
        <dt>Previous/next property tab</dt>
        <dd>
          <kbd>[</kbd> / <kbd>]</kbd>
        </dd>

        <dt>Close property tab (when focused)</dt>
        <dd>
          <kbd>Delete</kbd>
        </dd>

        <dt>Select previous/next point</dt>
        <dd>
          <kbd>A</kbd> / <kbd>D</kbd>
          <span className="p-4">or</span>
          <kbd>,</kbd> / <kbd>.</kbd>
        </dd>

        <dt>Move selected point</dt>
        <dd>arrow keys</dd>

        <dt>Move faster</dt>
        <dd>{Option} + arrow keys</dd>

        <dt>Change selected point style</dt>
        <dd>
          <kbd>C</kbd> <span className="p-4">or</span> {Option}-click
        </dd>

        <dt>Add point</dt>
        <dd>
          <kbd>Shift</kbd>-click
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

        <dt>Toggle this help</dt>
        <dd>
          <kbd>?</kbd>
        </dd>
      </dl>
    </dialog>,
    document.body
  );
}
