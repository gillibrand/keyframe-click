import { dropIn, dropOut, useChildAnimator } from "@util/useChildAnimator";
import { memo } from "react";
import { NoteProps, useNoteApi, useNotes } from "./_NoteContext";
import clsx from "clsx";
// import "./note.css";

function Note({ message, id }: NoteProps) {
  const { dismissNote } = useNoteApi();

  function handleDelete() {
    dismissNote(id);
  }

  return (
    // Outer wrapper for animating height without margin worries
    <li onClick={handleDelete} data-component="Note">
      <div
        className={clsx(
          "border-neo bg-neo-teal shadow-hard rounded-md",
          "mb-4 max-w-md min-w-44 px-4 py-2",
          "pointer-events-auto cursor-default"
        )}
      >
        {message}
      </div>
    </li>
  );
}

/**
 * The area to show notifications in. This is absolutely positioned at the top center of its offset
 * parent. This must be included somewhere to see notifications. It can be on multiple pages if
 * needed--they will all show the same notification messages if they are visible.
 */
export const NoteList = memo(function NoteList() {
  const notes = useNotes();

  const { parentRef } = useChildAnimator<HTMLUListElement>("both", {
    animateIn: dropIn,
    animateOut: dropOut,
  });

  return (
    <ul
      className="z-toast pointer-events-none fixed top-0 flex w-full flex-col items-center"
      ref={parentRef}
      aria-live="polite"
      role="status"
      data-component="NoteList"
    >
      {notes.map((note) => (
        <Note key={note.id} {...note}></Note>
      ))}
    </ul>
  );
});
