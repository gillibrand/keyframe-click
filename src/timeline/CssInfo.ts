import { isDevMode } from "@util";
import { ColorName } from "@util/Colors";

type OutputFn = (n: number) => string;

/**
 * Originally all props were written out on their on, but that doesn't work for paired props like translate-x and
 * translate-y. Those pairs are handled separately now, so we just stub out a warning if they are used on their own.
 * It's a bug if we hit this.
 */
const NullPairFn: OutputFn = () => {
  const error = "Outputting a paired property (like translate-x, translate-y) on its own. It must done as a pair.";
  if (isDevMode()) {
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
}

const typedKeys = <K extends string>(object: Record<K, CssInfo>) => object;

const CssInfos = typedKeys({
  scale: {
    label: "Scale",
    fn: (s) => {
      return `scale: ${Math.round(s) / 100};`;
    },
    color: "red",
  },

  scaleX: {
    label: "Scale X",
    fn: NullPairFn,
    color: "red",
  },

  scaleY: {
    label: "Scale Y",
    fn: NullPairFn,
    color: "orange",
  },

  translateX: {
    label: "Translate X",
    fn: NullPairFn,
    color: "blue",
  },

  translateY: {
    label: "Translate Y",
    fn: NullPairFn,
    color: "sky",
  },

  opacity: {
    label: "Opacity",
    fn: (n) => {
      return `opacity: ${n / 100};`;
    },
    color: "green",
  },

  rotate: {
    label: "Rotate",
    fn: (n) => {
      return `rotate: ${n / 100}turn;`;
    },
    color: "fuchsia",
  },
} as const);

export type CssProp = keyof typeof CssInfos;
export { CssInfos };
