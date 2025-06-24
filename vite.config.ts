import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import browserslistToEsbuild from "browserslist-to-esbuild";
import browserslist from "browserslist";
import mdx from "@mdx-js/rollup";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";

const esbuildTargets = browserslistToEsbuild(browserslist());

// vite.config.js

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: esbuildTargets,
  },
  plugins: [
    tailwindcss(),
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
