import { isDevMode, round2dp } from "@util";
import { ColorName } from "@util/Colors";

type OutputFn = (n: number) => string;

/**
 * Originally all props were written out on their on, but that doesn't work for paired props like translate-x and
 * translate-y. Those pairs are handled separately now, so we just stub out a warning if they are used on their own.
 * It's a bug if we hit this.
 */
const NullPairFn: OutputFn = () => {
  const error = "Outputting a paired property (like translate-x, translate-y) on its own. It must done as a pair.";
  if (isDevMode) {
    throw error;
  } else {
    console.error(error);
  }
  return "";
};

export interface CssInfo {
  label: string;
  fn: OutputFn;
  color: ColorName;
  supportsPx: boolean;
}

const typedKeys = <K extends string>(object: Record<K, CssInfo>) => object;

const CssInfos = typedKeys({
  scale: {
    label: "Scale",
    fn: (s) => {
      return `${round2dp(s / 100)}`;
    },
    color: "red",
    supportsPx: false,
  },

  scaleX: {
    label: "Scale X",
    fn: NullPairFn,
    color: "red",
    supportsPx: false,
  },

  scaleY: {
    label: "Scale Y",
    fn: NullPairFn,
    color: "orange",
    supportsPx: false,
  },

  translateX: {
    label: "Translate X",
    fn: NullPairFn,
    color: "NeoBlue",
    supportsPx: true,
  },

  translateY: {
    label: "Translate Y",
    fn: NullPairFn,
    color: "sky",
    supportsPx: true,
  },

  opacity: {
    label: "Opacity",
    fn: (n) => {
      return `${round2dp(n / 100)}`;
    },
    color: "green",
    supportsPx: false,
  },

  rotate: {
    label: "Rotate",
    fn: (n) => {
      return `${round2dp(n / 100)}turn`;
    },
    color: "fuchsia",
    supportsPx: false,
  },
} as const);

export type CssProp = keyof typeof CssInfos;
export { CssInfos };
