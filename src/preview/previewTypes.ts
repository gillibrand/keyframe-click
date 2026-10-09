/** Enums for all preview graphics. */
export const AllGraphics = ["ball", "astro", "heart", "text"] as const;
export type Graphic = (typeof AllGraphics)[number];

/** Max length of the custom text for the "text" preview graphic. */
export const MaxPreviewTextLength = 42;
