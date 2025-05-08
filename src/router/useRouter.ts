import { ComponentType, createContext, Dispatch, SetStateAction, useContext } from "react";

export interface RouterContextType {
  /** Current route string. */
  route: string;

  /**
   * Programmatically set the route. Normally this is handled by anchors that change the URL hash, but this can be
   * manually set too. This does NOT change the URL, just the React route and current page.
   */
  setRoute: Dispatch<SetStateAction<string>>;

  /**
   * The current page for the current route. This is a component that can be rendered as the main page on the app
   * template. If the route matches nothing, this is a 404 page.
   */
  Page: ComponentType;
}

export const RouterContext = createContext<RouterContextType | undefined>(undefined);

/** @returns The APi to read and write the current route, including the main "page" at the current route. */
export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error("wrap in RouterProvider");
  return context;
}
