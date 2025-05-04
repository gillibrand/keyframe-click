import { dropIn, dropOut, useChildAnimator } from "@util/useChildAnimator";
import { memo } from "react";
import { NoteProps, useNoteApi, useNotes } from "./_NoteContext";
import "./note.css";

function Note({ message, id }: NoteProps) {
  const { dismissNote } = useNoteApi();

  function handleDelete() {
    dismissNote(id);
  }

  return (
    <li className="Note" onClick={handleDelete}>
      <div>{message}</div>
    </li>
  );
}

/**
 * The area to show notifications in. This is absolutely positioned at the top center of its offset parent. This must be
 * included somewhere to see notifications. It can be on multiple pages if needed--they will all show the same
 * notification messages if they are visible.
 */
export const NoteList = memo(function NoteList() {
  const notes = useNotes();

  const { parentRef } = useChildAnimator<HTMLUListElement>("both", {
    animateIn: dropIn,
    animateOut: dropOut,
  });

  return (
    <ul className="NoteList [ flex flex-col items-center ] stack" ref={parentRef}>
      {notes.map((note) => (
        <Note key={note.id} {...note}></Note>
      ))}
    </ul>
  );
});
