import { ColorName } from "@util/Colors";

interface NamedFn {
  label: string;
  fn: (n: number) => string;
  color: ColorName;
}

const typedKeys = <K extends string>(object: Record<K, NamedFn>) => object;

const OutFunctions = typedKeys({
  scale: {
    label: "Scale",
    fn: (s) => {
      return `scale: ${Math.round(s) / 100}`;
    },
    color: "green",
  },

  scaleX: {
    label: "Scale X",
    fn: (s) => {
      return `scale: ${Math.round(s) / 100} 1`;
    },
    color: "fuchsia",
  },

  scaleY: {
    label: "Scale Y",
    fn: (s) => {
      return `scale: 1 ${Math.round(s) / 100}`;
    },
    color: "blue",
  },

  translateX: {
    label: "Translate X",
    fn: (x) => {
      return `translate: ${x}% 0;`;
    },
    color: "orange",
  },

  translateY: {
    label: "Translate Y",
    fn: (y) => {
      return `translate: 0 ${y}%;`;
    },
    color: "cyan",
  },

  opacity: {
    label: "Opacity",
    fn: (n) => {
      return `opacity: ${n / 100};`;
    },
    color: "emerald",
  },

  rotate: {
    label: "Rotate",
    fn: (n) => {
      return `rotate: ${n / 100}turn;`;
    },
    color: "yellow",
  },
} as const);

export type OutProperty = keyof typeof OutFunctions;
export { OutFunctions };
