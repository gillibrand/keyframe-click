import { ComponentType, PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { NotFoundPage } from "@pages/NotFoundPage";
import { RouterContext, SetRouteFn } from "./useRouter";

export type LazyComponentType = ComponentType & {
  preload?: () => void;
};

export type Routes = Record<string, LazyComponentType>;

interface Props extends PropsWithChildren {
  routes: Routes;
}

const EmptyArgs: Record<string, unknown> = {};

/**
 * The router context to to wrap the app in. This is a hash path based router for a true single page app. Because of how
 * this is hosted it's not practical or easy to use true paths since refreshing them would lead to 404s. A fuller server
 * side could just return the same app for all paths, but that's not possible on Github pages.
 */
export function RouterProvider({ routes, children }: Props) {
  const [route, setRouteRaw] = useState(() => window.location.hash.slice(1) || "/");

  const [args, setArgs] = useState<Record<string, unknown>>(EmptyArgs);

  const Page = useMemo(() => {
    return routes[route] ?? NotFoundPage;
  }, [route, routes]);

  useEffect(() => {
    function updateRoute() {
      const newRoute = window.location.hash.slice(1) || "/";
      setRouteRaw(newRoute);
      setArgs(EmptyArgs);
    }

    updateRoute();

    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [routes]);

  const preloadRoute = useCallback(
    (route: string) => {
      const Page = routes[route];
      if (Page && Page.preload) Page.preload();
    },
    [routes]
  );

  /**
   * Goes to the home timeline page. We manually call `setRoute` so that we can make a clean URL without a hash in it.
   * If we just go to path / then a full page reload would happen. This manually changes the URL with `pushState` then
   * sets the home route.
   *
   * @param e Link click event to cancel.
   */
  const gotoTimeline = useCallback(
    (newArgs?: Record<string, unknown>) => {
      if (route === "/") return;

      history.pushState({ hash: "#/" }, "", import.meta.env.BASE_URL);
      setRouteRaw("/");
      setArgs(newArgs ?? EmptyArgs);
    },
    [route]
  );

  const setRoute: SetRouteFn = useCallback((route, args) => {
    setRouteRaw(route);
    setArgs(args ?? {});
  }, []);

  const value = useMemo(
    () => ({
      route,
      args,
      setRoute,
      preloadRoute,
      gotoTimeline,
      Page,
    }),
    [route, Page, preloadRoute, gotoTimeline, args, setRoute]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
