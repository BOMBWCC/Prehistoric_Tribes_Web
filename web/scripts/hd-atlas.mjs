// Packs the small pictures the map draws into a few big ones (BUG-073: 1892 files took a minute to
// load, most of it asking the server about each), and takes the small files away:
//
//   hd/atlas-parts.webp    parts/ and parts-v<n>/ (villagers and single pieces)
//   hd/atlas-effects.webp  effects/ and animals/
//   hd/atlas-objects.webp  objects/ (a WebGL texture of its own: the only one the GPU has to hold whole)
//   hd/atlas.json         { sheets: [names], pictures: { "<old path>": [sheet, x, y, width, height] } }
//
// Left as files because an <img> shows them: buildings/, the action icons in effects/ (Hud.ts). The
// map finds a picture through HdArt.ts's piece(), by its old path.
//
// Each picture's edge pixels go on outward (EDGE), then a gap: scaled on the GPU, a picture never
// picks up its neighbour. Sheets stay within MAX: every phone's WebGL takes 4096.
// Run by make-catalog.mjs, which needs the small files still there (so import-hd.mjs first); on its own:
//
//   node web/scripts/hd-atlas.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { pngToWebp } from "./hd-webp.mjs";

const hd = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public/hd");
const MAX = 4096;
const EDGE = 2;
const GAP = 2;
/** The action icons (Hud.ts actionIcon, RenderRuntime's touchAction): an <img> shows them. */
const ACTION_ICON = /^effects\/(35|41|43|44|45|46|47)-/;
const SHEETS = [
  { name: "atlas-parts", width: 2048, dirs: /^parts(-v\d+)?\// },
  { name: "atlas-effects", width: 2048, dirs: /^(effects|animals)\// },
  { name: "atlas-objects", width: MAX, dirs: /^objects\// },
];

/** Rows, tallest first: at = each picture's corner. */
function pack(list, width) {
  const margin = EDGE * 2 + GAP;
  let x = EDGE, y = EDGE, tallest = 0;
  for (const p of list.sort((a, b) => b.height - a.height || a.path.localeCompare(b.path))) {
    if (x + p.width + EDGE > width) { x = EDGE; y += tallest + margin; tallest = 0; }
    p.x = x;
    p.y = y;
    x += p.width + margin;
    tallest = Math.max(tallest, p.height);
  }
  const height = y + tallest + EDGE;
  if (height > MAX) throw new Error(`atlas ${height} tall, over ${MAX}: give it another sheet`);
  return height;
}

export async function packAtlases() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    const atlas = { sheets: SHEETS.map((s) => `${s.name}.webp`), pictures: {} };
    let packed = 0;
    for (const [index, sheet] of SHEETS.entries()) {
      const list = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(path.join(hd, dir), { withFileTypes: true })) {
          const rel = dir ? `${dir}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(rel);
          else if (rel.endsWith(".webp") && sheet.dirs.test(rel) && !ACTION_ICON.test(rel)) {
            list.push({ path: rel, data: `data:image/webp;base64,${fs.readFileSync(path.join(hd, rel)).toString("base64")}` });
          }
        }
      };
      walk("");
      if (list.length === 0) throw new Error(`nothing for ${sheet.name}: the small files are gone, run import-hd.mjs first`);
      const sizes = await page.evaluate(async (data) => Promise.all(data.map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      })), list.map((p) => p.data));
      list.forEach((p, i) => { [p.width, p.height] = sizes[i]; });
      const height = pack(list, sheet.width);
      const png = await page.evaluate(async ({ width, height, EDGE, list }) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const c = canvas.getContext("2d");
        c.imageSmoothingEnabled = false;
        for (const p of list) {
          const image = new Image();
          image.src = p.data;
          await image.decode();
          const { x, y, width: w, height: h } = p;
          c.drawImage(image, x, y);
          // The edges going on outward, corners too.
          c.drawImage(image, 0, 0, w, 1, x, y - EDGE, w, EDGE);
          c.drawImage(image, 0, h - 1, w, 1, x, y + h, w, EDGE);
          c.drawImage(image, 0, 0, 1, h, x - EDGE, y, EDGE, h);
          c.drawImage(image, w - 1, 0, 1, h, x + w, y, EDGE, h);
          c.drawImage(image, 0, 0, 1, 1, x - EDGE, y - EDGE, EDGE, EDGE);
          c.drawImage(image, w - 1, 0, 1, 1, x + w, y - EDGE, EDGE, EDGE);
          c.drawImage(image, 0, h - 1, 1, 1, x - EDGE, y + h, EDGE, EDGE);
          c.drawImage(image, w - 1, h - 1, 1, 1, x + w, y + h, EDGE, EDGE);
        }
        return canvas.toDataURL("image/png");
      }, { width: sheet.width, height, EDGE, list });
      const file = path.join(hd, `${sheet.name}.png`);
      fs.writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
      await pngToWebp(file);
      for (const p of list) {
        atlas.pictures[p.path] = [index, p.x, p.y, p.width, p.height];
        fs.rmSync(path.join(hd, p.path));
      }
      packed += list.length;
      console.log(`${sheet.name}: ${list.length} pictures, ${sheet.width} x ${height}, ${Math.round(fs.statSync(file.replace(/\.png$/, ".webp")).size / 1024)} KB`);
    }
    for (const dir of fs.readdirSync(hd, { withFileTypes: true })) {
      if (dir.isDirectory() && fs.readdirSync(path.join(hd, dir.name)).length === 0) fs.rmdirSync(path.join(hd, dir.name));
    }
    fs.writeFileSync(path.join(hd, "atlas.json"), JSON.stringify(atlas));
    return packed;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`atlas.json: ${await packAtlases()} pictures`);
