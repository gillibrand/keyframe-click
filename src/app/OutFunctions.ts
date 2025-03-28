interface NamedFn {
  label: string;
  fn: (n: number) => string;
}

const typedKeys = <K extends string>(object: Record<K, NamedFn>) => object;

const OutFunctions = typedKeys({
  scale: {
    label: "Scale",
    fn: (s) => {
      return `scale: ${Math.round(s) / 100}`;
    },
  },

  scaleX: {
    label: "Scale X",
    fn: (s) => {
      return `scale: ${Math.round(s) / 100} 1`;
    },
  },

  scaleY: {
    label: "Scale Y",
    fn: (s) => {
      return `scale: 1 ${Math.round(s) / 100}`;
    },
  },

  translateX: {
    label: "Translate X",
    fn: (x) => {
      return `translate: ${x}% 0;`;
    },
  },

  translateY: {
    label: "Translate Y",
    fn: (y) => {
      return `translate: 0 ${y}%;`;
    },
  },

  opacity: {
    label: "Opacity",
    fn: (n) => {
      return `opacity: ${n / 100};`;
    },
  },

  rotate: {
    label: "Rotate",
    fn: (n) => {
      return `rotate: ${n / 100}turn;`;
    },
  },
} as const);

export type OutProperty = keyof typeof OutFunctions;
export { OutFunctions };
