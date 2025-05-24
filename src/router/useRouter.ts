import { ComponentType, createContext, lazy, useContext } from "react";
import { LazyComponentType } from "./RouterProvider";

export interface SetRouteFn {
  (route: string, args?: Record<string, unknown>): void;
}

export interface RouterContextType {
  /** Current route string. */
  route: string;

  /**
   * Programmatically set the route. Normally this is handled by anchors that change the URL hash, but this can be
   * manually set too. This does NOT change the URL, just the React route and current page.
   */
  setRoute: SetRouteFn;

  args: Record<string, unknown>;

  /**
   * Changes to the timeline page. This is a special case since the timeline page is the default page. This will change
   * the URL to the base URL (without a hash) and set the route to the timeline page.
   */
  gotoTimeline: (args?: Record<string, unknown>) => void;

  /**
   * The current page for the current route. This is a component that can be rendered as the main page on the app
   * template. If the route matches nothing, this is a 404 page.
   */
  Page: ComponentType;

  /**
   * Preloads a route from the server. For this to work, the components the route points to should be a lazy component
   * created with `.lazyWithPreload`.
   *
   * @param route A /route to preload.
   */
  preloadRoute: (route: string) => void;
}

export const RouterContext = createContext<RouterContextType | undefined>(undefined);

/** @returns The APi to read and write the current route, including the main "page" at the current route. */
export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error("wrap in RouterProvider");
  return context;
}

/** A dynamic import function. */
type ImportFn<T> = () => Promise<{ default: T }>;

/**
 * @param factory The function to import the component. A wrapper around a dynamic import call.
 * @returns Lazy component with function (on the Component definition) to preload it.
 */
export function lazyWithPreload<P extends object, T extends ComponentType<P>>(factory: ImportFn<T>) {
  const Component = lazy(factory);
  (Component as unknown as LazyComponentType).preload = factory;
  return Component;
}
