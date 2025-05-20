import { isEl } from "@util";
import { useEffect, useRef } from "react";

export function wipeInWidth(node: HTMLElement) {
  return node.animate(
    {
      width: ["0", `${node.offsetWidth}px`],
      opacity: [0, 1],
    },
    {
      duration: 200,
      easing: "ease-in-out",
    }
  ).finished;
}

export function wipeOutWidth(node: HTMLElement) {
  return node.animate(
    {
      width: [`${node.offsetWidth}px`, "0"],
      opacity: [1, 0],
    },
    {
      duration: 200,
      easing: "ease-in-out",
      fill: "forwards",
    }
  ).finished;
}

export async function wipeInHeight(node: HTMLElement) {
  const oldOverflow = node.style.overflow;
  node.style.overflow = "hidden";

  try {
    return await node.animate(
      {
        height: ["0", `${node.offsetHeight}px`],
      },
      {
        duration: 200,
        easing: "ease-in-out",
      }
    ).finished;
  } finally {
    node.style.overflow = oldOverflow;
  }
}

export async function wipeOutHeight(node: HTMLElement) {
  const oldOverflow = node.style.overflow;
  node.style.overflow = "hidden";
  try {
    return await node.animate(
      {
        height: [`${node.offsetHeight}px`, "0"],
      },
      {
        duration: 200,
        easing: "ease-in-out",
        fill: "forwards",
      }
    ).finished;
  } finally {
    node.style.overflow = oldOverflow;
  }
}

export function dropIn(node: HTMLElement) {
  // This takes up flow space immediately, so it only useful when adding the the end of list.
  return node.animate(
    {
      translate: ["0 -50%", "0 0"],
      opacity: [0, 1],
    },
    {
      duration: 100,
      easing: "ease-in-out",
    }
  ).finished;
}

export function dropOut(node: HTMLElement) {
  // We can't just translate the node since that won't close up space it takes it until it's removed
  // from the from DOM. So we translate the first child while also animating the height of the
  // (outer) node. That makes is close up the space while translating away and looks nice. This only works
  // if overflow is visible on the node that that while it shrink
  node.firstElementChild?.animate(
    {
      translate: ["0 0", "0 -50%"],
      opacity: [1, 0],
    },
    {
      duration: 100,
      easing: "ease-in-out",
    }
  );

  return node.animate(
    {
      height: [`${node.offsetHeight}px`, "0"],
    },
    {
      duration: 100,
      easing: "ease-in-out",
      fill: "forwards",
    }
  ).finished;
}

/**
 * Callback from `MutationObserver` when the parent is changed. Runs the relevant animations.
 *
 * @param changes DOM changes.
 * @param type Type of change to handle.
 * @param animateIn Function to animate element on add.
 * @param animateOut Function to animate element on remove.
 */
async function animateChanges(
  changes: MutationRecord[],
  type: string,
  animateIn: AnimateFn = wipeInWidth,
  animateOut: AnimateFn = wipeOutWidth
) {
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (change.type !== "childList") continue;

    if (type === "add" || type === "both") {
      for (let j = 0; j < change.addedNodes.length; j++) {
        const node = change.addedNodes[j];
        if (!isEl(node) || node.dataset["noAnimate"]) continue;
        animateIn(node);
      }
    }

    if (type === "remove" || type === "both") {
      for (let j = 0; j < change.removedNodes.length; j++) {
        const node = change.removedNodes[j];
        if (!isEl(node) || node.dataset["noAnimate"]) continue;

        node.querySelectorAll("input").forEach((input) => {
          // Adding this in when checked can steal the "checked" value from something else.
          input.checked = false;
          // avoid ID collisions. It's possible this can break CSS that's targeting an ID, but
          // that's not likely.
          input.removeAttribute("id");
        });

        // Exclude this from animating when adding back in before removing. Feels a little hacky,
        // but it's really just marking something as "seen" to avoid working with it again.
        node.dataset["noAnimate"] = String(true);

        if (change.nextSibling) {
          change.nextSibling.parentElement?.insertBefore(node, change.nextSibling);
        } else {
          change.target.appendChild(node);
        }
        await animateOut(node);
        node.parentElement?.removeChild(node);
      }
    }
  }
}

type AnimateFn = (el: HTMLElement) => Promise<unknown>;

type ChangeType = "add" | "remove" | "both";

type Options = {
  animateIn?: AnimateFn;
  animateOut?: AnimateFn;
};

/**
 * Hook to make it easy to animate elements that are added or removed from the DOM. This will observe all new elements
 * added and/or removed from a parent and will run an animation on them. Simply connect the returned ref to the parent
 * container to observe.
 *
 * For "remove" animations, the node is temporarily added in to the DOM outside of the control of React, animated, and
 * then removed. So while the animation the v-dom and real dom will be out of sync. For fast animations this should
 * never cause a problem. If React reconciles the parent during the animation, the element and animation can be removed
 * early.
 *
 * @param type To animate changes on add, remove, or both.
 * @param options Optional functions to use for actual animation or the elements. They should animate in a way that
 *   match the type and return a Promise to know when the animation is complete.
 * @returns A ref to the parent container that will have elements added and removed. This **must** be connected to that
 *   parent element with a `ref` attribute.
 */
export function useChildAnimator<T extends HTMLElement>(type: ChangeType, options?: Options) {
  const parentRef = useRef<T>(null);

  useEffect(
    function observeChanges() {
      if (!parentRef.current) return;

      const mo = new MutationObserver((changes) =>
        animateChanges(changes, type, options?.animateIn, options?.animateOut)
      );

      const parentEl = parentRef.current;
      mo.observe(parentEl, {
        childList: true,
      });

      return () => mo.disconnect();
    },
    [options?.animateIn, options?.animateOut, type]
  );

  return {
    parentRef,
  };
}
