import { round2dp } from "@util";
import { ColorName } from "@util/Colors";

export interface CssInfo {
  label: string;
  fn: (n: number) => string;
  color: ColorName;
}

const typedKeys = <K extends string>(object: Record<K, CssInfo>) => object;

const CssInfos = typedKeys({
  scale: {
    label: "Scale",
    fn: (s) => {
      return `scale: ${round2dp(s) / 100}`;
    },
    color: "green",
  },

  scaleX: {
    label: "Scale X",
    fn: (s) => {
      return `scale: ${round2dp(s) / 100} 1`;
    },
    color: "fuchsia",
  },

  scaleY: {
    label: "Scale Y",
    fn: (s) => {
      return `scale: 1 ${round2dp(s) / 100}`;
    },
    color: "blue",
  },

  translateX: {
    label: "Translate X",
    fn: (x) => {
      return `translate: ${round2dp(x)}% 0;`;
    },
    color: "orange",
  },

  translateY: {
    label: "Translate Y",
    fn: (y) => {
      return `translate: 0 ${round2dp(y)}%;`;
    },
    color: "cyan",
  },

  opacity: {
    label: "Opacity",
    fn: (n) => {
      return `opacity: ${round2dp(n / 100)};`;
    },
    color: "emerald",
  },

  rotate: {
    label: "Rotate",
    fn: (n) => {
      return `rotate: ${round2dp(n / 100)}turn;`;
    },
    color: "yellow",
  },
} as const);

export type CssProp = keyof typeof CssInfos;
export { CssInfos };
