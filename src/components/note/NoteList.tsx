import { dropIn, dropOut, useChildAnimator } from "@util/useChildAnimator";
import { memo, useContext } from "react";
import { _NoteContext, NoteProps } from "./_NoteContext";

function Note({ message }: NoteProps) {
  return (
    <li className="Note ">
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
  const context = useContext(_NoteContext);
  if (!context) throw new Error("not wrapped in NoteProvider");

  const { parentRef } = useChildAnimator<HTMLUListElement>("both", {
    animateIn: dropIn,
    animateOut: dropOut,
  });

  return (
    <ul className="NoteList [ flex flex-col items-center ] stack-small" ref={parentRef}>
      {context.notes.map((note) => (
        <Note key={note.id} {...note}></Note>
      ))}
    </ul>
  );
});
