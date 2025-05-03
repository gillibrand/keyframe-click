import { Callback } from "@util";
import { createContext, ReactNode, useContext } from "react";

export interface NoteProps {
  message: ReactNode;
  id: string;
  onClick?: Callback;
}

export type SendNoteFn = (message: ReactNode) => void;

export interface NoteContextValue {
  /**
   * Sends a global notification message that is shown briefly.
   *
   * @param message Any string to show as a notification.
   */
  sendNote: SendNoteFn;

  /**
   * Removes a visible note. This can be used to remove it early on click. Normally they timeout after a few seconds on
   * their own.
   *
   * @param id ID to remove.
   */
  dismissNote: (id: string) => void;

  /** The currently visible notes. */
  notes: NoteProps[];
}

/** The private context for notes. */
export const _NoteContext = createContext<NoteContextValue | null>(null);

export function useNoteContext() {
  const context = useContext(_NoteContext);
  if (!context) throw new Error("not wrapped in NoteProvider");
  return context;
}
