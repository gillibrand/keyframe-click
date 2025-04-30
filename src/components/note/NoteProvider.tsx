import { PropsWithChildren, useState } from "react";
import { NoteProps, _NoteContext } from "./_NoteContext";

const MaxNotes = 3;

/** Context provider to support global notifications. Wrap around the app level. */
export function NoteProvider({ children }: PropsWithChildren) {
  const [notes, setNotes] = useState<NoteProps[]>([]);

  /**
   * Removes a visible note.
   *
   * @param deadId ID of note to remove.
   */
  function deleteNote(deadId: string) {
    setNotes((old) => {
      return old.filter((note) => note.id !== deadId);
    });
  }

  /** Adds a visible note. Schedules it to be removed soon. */
  function sendNote(message: string) {
    setNotes((old) => {
      const id = crypto.randomUUID();

      if (old.length >= MaxNotes) {
        old = old.slice(1);
      }

      setTimeout(() => {
        deleteNote(id);
      }, 3000);

      return old?.concat({
        message,
        id: id,
      });
    });
  }

  const value = {
    sendNote,
    notes,
  };

  return <_NoteContext.Provider value={value}>{children}</_NoteContext.Provider>;
}
