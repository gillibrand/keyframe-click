import { PropsWithChildren, ReactNode, useCallback, useMemo, useState } from "react";
import { NoteApiValue, NoteProps, NoteApiContext, NotesContext } from "./_NoteContext";

const MaxNotes = 3;

/** Context provider to support global notifications. Wrap around the app level. */
export function NoteProvider({ children }: PropsWithChildren) {
  const [notes, setNotes] = useState<NoteProps[]>([]);

  /**
   * Removes a visible note.
   *
   * @param deadId ID of note to remove.
   */
  const dismissNote = useCallback((deadId: string) => {
    setNotes((old) => {
      return old.filter((note) => note.id !== deadId);
    });
  }, []);

  /** Adds a visible note. Schedules it to be removed soon. */
  const sendNote = useCallback(
    (message: ReactNode, timeoutMs: number = 3000) => {
      const id = crypto.randomUUID();

      setNotes((old) => {
        if (old.length >= MaxNotes) {
          old = old.slice(1);
        }

        setTimeout(() => {
          dismissNote(id);
        }, timeoutMs);

        return old?.concat({
          message,
          id: id,
        });
      });

      return id;
    },
    [dismissNote]
  );

  const api: NoteApiValue = useMemo(() => {
    return {
      sendNote,
      dismissNote,
    };
  }, [sendNote, dismissNote]);

  return (
    <NotesContext.Provider value={notes}>
      <NoteApiContext.Provider value={api}>{children}</NoteApiContext.Provider>
    </NotesContext.Provider>
  );
}
