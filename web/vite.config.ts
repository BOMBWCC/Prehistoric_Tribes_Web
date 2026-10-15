import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs, so the build also runs from a sub-path (GitHub Pages: /<repo>/).
  base: "./",
  // The Chinese text is read straight from ../docs/translation-zh-CN.json (its single source), so the
  // dev server may serve files from the repository root.
  server: { fs: { allow: [".."] } },
});
