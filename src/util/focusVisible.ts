let hadKeyboardEvent = false;

window.addEventListener("keydown", () => {
  hadKeyboardEvent = true;
});

window.addEventListener("mousedown", () => {
  hadKeyboardEvent = false;
});

/**
 * This adds a .focus-visible class to all elements that gain visible focus. This is used my <select> controls to
 * override their default focus ring in Chrome which shows even on mouse input normally.
 */
document.addEventListener("focusin", (e: FocusEvent) => {
  if (hadKeyboardEvent && e.target) {
    (e.target as HTMLElement).classList.add("focus-visible");
  }
});

document.addEventListener("focusout", (e: FocusEvent) => {
  (e.target as HTMLElement).classList.remove("focus-visible");
});

/**
 * Checks if there is visible keyboard focus. This basically means if we interacted with the mouse or keyboard most
 * recently. This is used by the timeline to know if it should show a focus ring or not.
 *
 * @returns True if we have a strong guess that focus should be visible.
 */
export function isFocusVisible() {
  return hadKeyboardEvent;
}
