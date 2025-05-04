import { Callback } from "@util";
import { createContext, ReactNode, useContext } from "react";

export interface NoteProps {
  message: ReactNode;
  id: string;
  onClick?: Callback;
}

// export type SendNoteFn = ;
export type DismissNoteFn = (id: string) => void;

export interface NoteApiValue {
  /**
   * Sends a global notification message that is shown briefly.
   *
   * @param message Any string to show as a notification.
   * @param timeoutMs Optional duration in milliseconds to show the note. Defaults to a few seconds, which is usually
   *   right.
   */
  sendNote: (message: ReactNode, timeoutMs?: number) => string;

  /**
   * Removes a visible note. This can be used to remove it early on click. Normally they timeout after a few seconds on
   * their own.
   *
   * @param id ID to remove.
   */
  dismissNote: DismissNoteFn;
}

export const NoteApiContext = createContext<NoteApiValue | null>(null);
export const NotesContext = createContext<NoteProps[]>([]);

/** @returns The API to send and dismiss notes. */
export function useNoteApi() {
  const api = useContext(NoteApiContext);
  if (!api) throw new Error("not wrapped in NoteProvider");
  return api;
}

/** @returns The current set of notes. Only need internally by the `NoteList`. */
export function useNotes() {
  return useContext(NotesContext);
}
