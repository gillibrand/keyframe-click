import Github from "@images/github-mark.svg?react";
import { useRouter } from "@router/useRouter";
import { isDevMode, stopEvent } from "@util";
import "./Banner.css";

export function Banner() {
  const { route, preloadRoute, gotoTimeline } = useRouter();

  /**
   * @param href The HREF path to return. This should be a #/path to the current router.
   * @param preload If true, will add mouse and focus event to preload the load.
   * @returns A const object of the given HREF, plus the aria attributes to mark this as the current page if it matches
   *   the current route. Spread this into an anchor.
   */
  function href(href: string, preload?: boolean) {
    const normalHref = href.slice(1);
    const isCurrent = route === normalHref;

    const preloadIfNeeded = !preload
      ? undefined
      : () => {
          preloadRoute(normalHref);
        };

    return {
      href,
      "aria-current": isCurrent ? "page" : undefined,
      onMouseEnter: preloadIfNeeded,
      onFocus: preloadIfNeeded,
    } as const;
  }

  /**
   * Goes to the home timeline page. We manually call `setRoute` so that we can make a clean URL without a hash in it.
   * If we just go to path / then a full page reload would happen. This manually changes the URL with `pushState` then
   * sets the home route.
   *
   * @param e Link click event to cancel.
   */
  function handleGotoTimeline(e: React.MouseEvent) {
    stopEvent(e);
    gotoTimeline();
  }

  return (
    <header className="py-4x Banner">
      <div className="wrapper flex gap-8 items-end">
        <h1 className="Banner__title cursor-default desktop-only" onClick={handleGotoTimeline}>
          Keyframe Click
        </h1>

        <nav className="Banner__nav flex gap-4">
          <a className="Banner__link" {...href("#/")} onClick={handleGotoTimeline}>
            Timeline
          </a>
          <a className="Banner__link" {...href("#/demos")}>
            Demos
          </a>
          {/*
          <a className="Banner__link" {...href("#/help")}>
            Help
          </a> 
          */}
          <a className="Banner__link" {...href("#/about", true)}>
            About
          </a>

          {isDevMode && (
            <a className="Banner__link desktop-only" {...href("#/debug", true)}>
              dev
            </a>
          )}
        </nav>

        <div className="ml-auto py-2 text-light flex gap-4 items-center desktop-only">
          <span>
            by <a href="https://gillibrand.github.io/projects/">Jay Gillibrand</a>{" "}
          </span>
          <a href="https://github.com/gillibrand/keyframe-click" title="Available on GitHub">
            <Github className="github" />
          </a>
        </div>
      </div>
    </header>
  );
}
