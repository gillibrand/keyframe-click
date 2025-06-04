import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import browserslistToEsbuild from "browserslist-to-esbuild";
import browserslist from "browserslist";
import mdx from "@mdx-js/rollup";
import basicSsl from "@vitejs/plugin-basic-ssl";

const esbuildTargets = browserslistToEsbuild(browserslist());

// vite.config.js

// https://vite.dev/config/
export default defineConfig({
  base: "/keyframe-click/",
  build: {
    target: esbuildTargets,
  },
  plugins: [
    svgr(),
    react(),
    mdx(),
    tsconfigPaths(),
    basicSsl({
      name: "test",
    }),
  ],
  resolve: {
    alias: {
      "@components": "/src/components",
      "@util": "/src/util",
      "@preview": "/src/preview",
      "@styles": "/src/styles",
      "@timeline": "/src/timeline",
    },
  },
});
