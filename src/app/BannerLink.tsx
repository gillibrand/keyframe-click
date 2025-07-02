import { useRouter } from "@router/useRouter";
import { stopEvent } from "@util";
import clsx from "clsx";
import { memo, PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  href: string;
  preload?: boolean;
}

export const BannerLink = memo(function BannerLink({ href, preload, children }: Props) {
  const { route, preloadRoute, gotoTimeline } = useRouter();

  const isCurrentRoute = route === href.slice(1);

  /**
   * @param href The HREF path to return. This should be a #/path to the current router.
   * @param preload If true, will add mouse and focus event to preload the load.
   * @returns A const object of the given HREF, plus the aria attributes to mark this as the current
   *   page if it matches the current route. Spread this into an anchor.
   */
  function makeHref() {
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
   * Goes to the home timeline page via the router to ensure a clean URL. We manually call
   * `setRoute` so that we can make a clean URL without a hash in it. If we just go to path / then a
   * full page reload would happen. This manually changes the URL with `pushState` then sets the
   * home route.
   *
   * @param e Link click event to cancel.
   */
  function handleTimelineClick(e: React.MouseEvent) {
    if (href === "#/") {
      stopEvent(e);
      gotoTimeline();
    }
  }

  // This is a little slice of orange to cover the bottom border/shadow of the tab and make it look like part of the page.
  const activeBottomMask =
    "after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:bg-neo-orange after:content-[''] focus-visible:after:hidden";

  return (
    <a
      className={clsx(
        "focus-visible:focus-outline relative mt-2 rounded-t-lg border-2 border-b-0 px-4 py-2 leading-none font-bold ring-white focus-visible:ring-2",
        isCurrentRoute
          ? "bg-neo-orange shadow-hard border-black focus-visible:shadow-none"
          : "border-transparent bg-[#fbd677] hover:bg-[#ffcd4f]",
        isCurrentRoute && activeBottomMask
      )}
      {...makeHref()}
      onClick={handleTimelineClick}
      aria-current={isCurrentRoute}
    >
      {children}
    </a>
  );
});
