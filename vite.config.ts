import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svgr(), react(), tsconfigPaths()],
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
