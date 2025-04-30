import { createContext } from "react";

export interface NoteProps {
  message: string;
  id: string;
}

export type SendNoteFn = (message: string) => void;

export interface NoteContextValue {
  /**
   * Sends a global notification message that is shown briefly.
   *
   * @param message Any string to show as a notification.
   */
  sendNote: SendNoteFn;

  /** The currently visible notes. */
  notes: NoteProps[];
}

/** The private context for notes. */
export const _NoteContext = createContext<NoteContextValue | null>(null);
