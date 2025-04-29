import { useContext } from "react";
import "./note.css";
import { _NoteContext, SendNoteFn } from "./_NoteContext";

/**
 * Returns an API function that is used to send global notification banners. Must be used within a `<NoteProvider/>`.
 *
 * @returns Function that takes any string to show as a notification.
 */
export function useSendNote(): SendNoteFn {
  const context = useContext(_NoteContext);
  if (!context) throw new Error("not wrapped in NoteProvider");

  return context.sendNote;
}
