import { PropsWithChildren, useState } from "react";
import { NoteProps, _NoteContext } from "./_NoteContext";

export function NoteProvider({ children }: PropsWithChildren) {
  const [notes, setNotes] = useState<NoteProps[]>([]);

  function deleteNote(deadId: string) {
    setNotes((old) => {
      return old.filter((note) => note.id !== deadId);
    });
  }

  /**
   * Sends a global notification message that is shown briefly.
   *
   * @param message Any string to show as a notification.
   */
  function sendNote(message: string) {
    setNotes((old) => {
      const id = crypto.randomUUID();

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
