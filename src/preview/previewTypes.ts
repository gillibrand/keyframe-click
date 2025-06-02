/** Enums for all preview graphics. */
export const AllGraphics = ["ball", "astro", "heart", "text"] as const;
export type Graphic = (typeof AllGraphics)[number];
