import { CloseButton } from "@components/CloseButton";
import { Callback, isMac } from "@util";
import { useIsMountedState } from "@util/hooks";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  willClose: Callback;
  didClose: Callback;
}

const Option = isMac ? <kbd>Option</kbd> : <kbd>Alt</kbd>;
const CmdC = isMac ? (
  <>
    <span className="align-middle text-lg">⌘</span> C
  </>
) : (
  "Ctrl+C"
);

export function HelpPanel({ open, didClose, willClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function handleTransitionEnd() {
    // do native close after the animation. Needed for proper close events
    if (!open) dialogRef.current?.close();
  }

  useEffect(() => {
    // Need a native open for event firing. Don't close here since that should wait until the animation is done.
    if (open) dialogRef.current?.show();
  }, [open]);

  const isMounted = useIsMountedState();

  return createPortal(
    // This is just to center the dialog
    <dialog
      className={clsx(
        "dialog-centered dark-area z-dialog pointer-events-auto max-h-dvh space-y-4 overflow-auto",
        "rounded-xl bg-black p-3 text-white",
        // Will animate in/out on open/close. Must start with closed classes until mounted to animate on first show
        isMounted && open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        "transition-all duration-100"
      )}
      ref={dialogRef}
      onClose={() => {
        didClose();
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-bold">Keyboard shortcuts</h1>
        <CloseButton onClick={willClose} />
      </header>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm [&>dt]:text-right">
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
    // <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center">
    // </div>,
    document.body
  );
}
