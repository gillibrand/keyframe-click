/** Enums for all preview graphics. */
export const AllGraphics = ["ball", "astro", "heart"] as const;
export type Graphic = (typeof AllGraphics)[number];
