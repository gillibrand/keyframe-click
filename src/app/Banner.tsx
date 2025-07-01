import Github from "@images/github-mark.svg?react";
import { isDevMode } from "@util";
import { BannerLink } from "./BannerLink";

export function Banner() {
  return (
    <header className="border-b-2 border-black bg-white sm:text-sm">
      <div className="wrapper-wide flex items-end gap-8">
        <h1 className="hidden-at-small cursor-default text-2xl font-bold text-nowrap">
          Keyframe Click
        </h1>

        <nav className="flex gap-4">
          <BannerLink href="#/">Timeline</BannerLink>
          <BannerLink href="#/demos">Demos</BannerLink>
          <BannerLink href="#/about">About</BannerLink>

          {isDevMode && <BannerLink href="#/debug">dev</BannerLink>}
        </nav>

        <div className="text-light hidden-at-small ml-auto flex items-center gap-4 py-2">
          <span>
            by{" "}
            <a
              href="https://gillibrand.github.io/projects/"
              className="focus:focus-outline underline decoration-2"
            >
              Jay Gillibrand
            </a>
          </span>
          <a href="https://github.com/gillibrand/keyframe-click" title="Available on GitHub">
            <Github className="github" />
          </a>
        </div>
      </div>
    </header>
  );
}
