import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

/** The original's image packs (../original/, not part of the game since 2026-10-29) at /original/,
 *  for the dev server only: the tools that measure or export the original's art load them
 *  (__prehistoricDebugBootWithoutSplash({ originals: true })); a build never contains them. */
const originalArt = (): Plugin => ({
  name: "original-art",
  apply: "serve",
  configureServer(server) {
    const root = path.resolve(__dirname, "../original");
    server.middlewares.use("/original", (req, res, next) => {
      const file = path.resolve(root, `.${decodeURIComponent((req.url ?? "").split("?")[0]!)}`);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { next(); return; }
      res.setHeader("Content-Type", "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
  },
});

export default defineConfig({
  // Relative URLs, so the build also runs from a sub-path (GitHub Pages: /<repo>/).
  base: "./",
  // The Chinese text is read straight from ../docs/translation-zh-CN.json (its single source), so the
  // dev server may serve files from the repository root.
  // A fixed port on the local network (user 2026-10-29): the phone opens http://<LAN address>:5173;
  // a port in use is an error, not another port.
  server: { fs: { allow: [".."] }, port: 5173, strictPort: true, host: true },
  plugins: [originalArt()],
});
