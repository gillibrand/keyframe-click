import { createContext } from "react";

export interface NoteProps {
  message: string;
  id: string;
}

export type SendNoteFn = (message: string) => void;

export interface NoteContextValue {
  sendNote: SendNoteFn;
  notes: NoteProps[];
}

export const _NoteContext = createContext<NoteContextValue | null>(null);
