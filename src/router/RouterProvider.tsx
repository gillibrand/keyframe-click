import { ComponentType, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RouterContext } from "./useRouter";

export type Routes = Record<string, ComponentType>;

interface Props extends PropsWithChildren {
  routes: Routes;
}

/**
 * The router context to to wrap the app in. This is a hash path based router for a true single page app. Because of how
 * this is hosted it's not practical or easy to use true paths since refreshing them would lead to 404s. A fuller server
 * side could just return the same app for all paths, but that's not possible on Github pages.
 */
export function RouterProvider({ routes, children }: Props) {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || "/");

  const Page = useMemo(() => {
    return routes[route] ?? NotFoundPage;
  }, [route, routes]);

  useEffect(() => {
    function updateRoute() {
      const newRoute = window.location.hash.slice(1) || "/";
      setRoute(newRoute);
    }

    updateRoute();

    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [routes]);

  const value = useMemo(
    () => ({
      route,
      setRoute,
      Page,
    }),
    [route, Page]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
