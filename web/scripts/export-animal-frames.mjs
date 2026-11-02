// Exports the animals' frames as the original draws them, four times larger, for the UI design's
// redraw (design/missing-art/animals/, 2026-10-30):
//
//   node web/scripts/export-animal-frames.mjs
//
// For each animal (0 boar, 1 sabre-tooth, 2 deer), each animation its frames use (found from the data:
// the animations whose layers draw pieces of sheets 22..24), each facing the animation has and each
// frame: <kind>-<anim>-<frame>-f<facing>.png, the facing as the first direction (dense 9491, 0..7)
// that draws it. frames.json lists them, with whether hd/animals/<kind>-<anim>-<frame>.png covers it
// (the HD frames are drawn for the facing direction 0 gives) and whether it is another facing mirrored.
// Reads the original's image packs (../original/packs, through the dev server).
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.resolve(webDir, "../design/missing-art/animals");

const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, strictPort: false, host: "localhost", hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 240, height: 372 } })).newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => typeof window.__prehistoricDebugBootWithoutSplash === "function");
  await page.evaluate(async () => { localStorage.clear(); await window.__prehistoricDebugBootWithoutSplash({ originals: true }); });
  const result = await page.evaluate(async () => {
    const { Graphics } = await import("/src/platform/Graphics.ts");
    const { LegacyPackedSpriteRenderer } = await import("/src/render/LegacyPackedSpriteRenderer.ts");
    const { personOps } = await import("/src/render/MapScene.ts");
    const { drawPrivately } = await import("/src/render/WideView.ts");
    const rt = window.__prehistoricRuntime;
    const b = rt.packedData.shortTables, j = rt.packedData.byteTables, pb = rt.packedBytes, po = rt.packedOffsets;
    const manifest = await (await fetch("/hd/manifest.json")).json();
    const hd = new Set(manifest.animals);
    const K = 4;
    const frames = [];
    const files = {};
    drawPrivately(rt, () => {
      for (let av = 0; av < b[2].length; av += 1) {
        const fpd = j[4][av], base = b[2][av] & 4095, bank = ((b[3][av] >> 14) & 3) << 3;
        // The facing a direction gives (table 99), and which pieces' sheet the animation draws.
        const facings = new Map();
        for (let d = 0; d < 8; d += 1) { const at = pb[po[99] + bank + d]; if (!facings.has(at)) facings.set(at, d); }
        let kind = -1;
        for (const at of facings.keys()) for (let f = 0; f < fpd; f += 1) {
          const au = b[4][base + at * fpd + f];
          for (let k = 0; k < j[15][au]; k += 1) {
            const az = b[8][au] + k, rec = b[7][az];
            if (rec && ((j[14][az] & 0xff) >> 7) === 0) { const sheet = (j[20][rec] & 0xff) & 31; if (sheet >= 22 && sheet <= 24) kind = sheet - 22; }
          }
        }
        if (kind < 0) continue;
        const pictures = new Map();
        for (const [at, direction] of facings) {
          for (let f = 0; f < fpd; f += 1) {
            rt.denseState[9535] = kind; rt.denseState[9557] = av; rt.denseState[9579] = f; rt.denseState[9491] = direction;
            const size = 200, o = 100;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            const graphics = new Graphics(context);
            graphics.translate(o, o);
            let an = -1;
            const packed = new LegacyPackedSpriteRenderer({ shortTables: b, byteTables: j, imageGroups: rt.imageGroups, graphics, get an() { return an; } });
            for (const op of personOps(rt, 0, 0, 0, direction, 108).body) {
              if (op.op === "sprite") { an = op.an; packed.drawSprite(op.index, op.x, op.y); an = -1; }
              else if (op.op === "composite") packed.drawComposite(op.index, op.x, op.y);
            }
            const data = context.getImageData(0, 0, size, size).data;
            let l = size, t = size, r = -1, bt = -1;
            for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (data[(y * size + x) * 4 + 3]) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); bt = Math.max(bt, y); }
            if (r < 0) continue;
            const w = r - l + 1, h = bt - t + 1;
            const big = document.createElement("canvas");
            big.width = w * K; big.height = h * K;
            const bc = big.getContext("2d");
            bc.imageSmoothingEnabled = false;
            bc.drawImage(canvas, l, t, w, h, 0, 0, big.width, big.height);
            // Another facing of the same frame mirrored?
            const plain = context.getImageData(l, t, w, h);
            const key = `${f}`;
            let mirrorOf = null;
            for (const [otherAt, other] of pictures) {
              const p = other.get(key);
              if (!p || p.w !== w || p.h !== h) continue;
              let same = true;
              for (let y = 0; y < h && same; y += 1) for (let x = 0; x < w; x += 1) {
                const a = (y * w + x) * 4, m = (y * w + (w - 1 - x)) * 4;
                if (plain.data[a + 3] !== p.data[m + 3] || plain.data[a] !== p.data[m]) { same = false; break; }
              }
              if (same) { mirrorOf = facings.get(otherAt); break; }
            }
            if (!pictures.has(at)) pictures.set(at, new Map());
            pictures.get(at).set(key, { w, h, data: plain.data });
            const name = `${kind}-${av}-${f}-f${direction}.png`;
            files[name] = big.toDataURL("image/png");
            frames.push({ file: name, kind, animation: av, frame: f, facing: direction, frames: fpd, facings: facings.size,
              hd: direction === facings.get(pb[po[99] + bank + 0]) && hd.has(`${kind}-${av}-${f}`), mirrorOfFacing: mirrorOf, size: [w, h] });
          }
        }
      }
    });
    // One overview per animal: a row per animation and facing, its frames left to right, each
    // marked HD (has a picture), M (another facing mirrored) or a blank corner (to draw).
    const overviews = {};
    for (const kind of [0, 1, 2]) {
      const list = frames.filter((f) => f.kind === kind);
      const rows = [...new Set(list.map((f) => `${f.animation}:${f.facing}`))];
      const cell = 120, label = 110;
      const c = document.createElement("canvas");
      c.width = label + cell * Math.max(...list.map((f) => f.frame + 1));
      c.height = rows.length * (cell + 16);
      const x = c.getContext("2d");
      x.fillStyle = "#3a3f2a"; x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingEnabled = false;
      x.font = "12px sans-serif";
      const pictures = await Promise.all(list.map((f) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve([f, i]); i.src = files[f.file]; })));
      for (const [f, image] of pictures) {
        const row = rows.indexOf(`${f.animation}:${f.facing}`);
        const cx = label + f.frame * cell, cy = row * (cell + 16);
        const k = Math.min(1, (cell - 8) / Math.max(image.width, image.height));
        x.fillStyle = f.hd ? "#7dff6e" : f.mirrorOfFacing !== null ? "#9cc8ff" : "#ffd36e";
        x.fillText(`${f.frame}: ${f.hd ? "HD" : f.mirrorOfFacing !== null ? `M←f${f.mirrorOfFacing}` : "画"}`, cx + 4, cy + 12);
        x.drawImage(image, cx + 4, cy + 18, image.width * k, image.height * k);
        if (f.frame === 0) { x.fillStyle = "#fff"; x.fillText(`动作 ${f.animation} 朝向 f${f.facing}`, 4, cy + cell / 2); }
      }
      overviews[kind] = c.toDataURL("image/png");
    }
    return { frames, files, overviews };
  });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, url] of Object.entries(result.files)) fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(",")[1], "base64"));
  fs.writeFileSync(path.join(outDir, "frames.json"), JSON.stringify(result.frames, null, 1));
  for (const [kind, url] of Object.entries(result.overviews)) fs.writeFileSync(path.join(outDir, `overview-${["boar", "sabretooth", "deer"][kind]}.png`), Buffer.from(url.split(",")[1], "base64"));
  const todo = result.frames.filter((f) => !f.hd && f.mirrorOfFacing === null);
  console.log(`${result.frames.length} frames, ${result.frames.filter((f) => f.hd).length} with HD, ${result.frames.filter((f) => !f.hd && f.mirrorOfFacing !== null).length} mirrors, ${todo.length} to draw`);
} finally {
  await browser.close();
  await server.close();
}
