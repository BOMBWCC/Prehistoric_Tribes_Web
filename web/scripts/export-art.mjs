// Exports the original game's art as separate PNGs, sorted by kind, with an overview page:
//
//   npm --prefix web run export-art            -> art-export/ next to web/ (not committed)
//
// Every picture comes from the original's own resources: the image packs' PNGs as stored, and the
// elements the game assembles from them (sub-records, items, building pictures, map objects,
// composites, pieces) drawn by the port's original drawing code onto a clear canvas and trimmed.
// Reference material for the redraw (phase 3); the art belongs to the original game's owners.
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.resolve(webDir, "..", "art-export");

// Names of the bar codes / sub-records the port knows (docs/touch-mouse-design.md, step 9).
const SUBRECORD_NAMES = {
  1: "arrow-left", 2: "arrow-right", 3: "arrows-up-down", 4: "arrow-up", 5: "arrow-down",
  6: "corner-top-left", 7: "corner-top-right", 8: "corner-bottom-left", 9: "corner-bottom-right",
  10: "build", 11: "form-up", 12: "call-to-arms", 13: "villagers", 14: "dismiss", 15: "back-to-work",
  16: "upgrade", 17: "demolish", 18: "get-out", 19: "healing", 20: "defence", 21: "love-potion",
  22: "disease", 23: "info-all", 24: "info-selected", 25: "info-none", 26: "repair",
  27: "cancel-upgrade", 28: "cancel-repair", 29: "unload", 32: "hand", 33: "hand", 34: "hand-attack",
  35: "move-arrows", 36: "attack-arrows", 37: "hand", 38: "hand", 39: "hand-attack",
  40: "cannot-place", 41: "arrow-green-down", 42: "arrow-blue-up", 43: "food", 44: "wood",
  45: "stone", 46: "bones", 47: "meat",
};
const ITEM_NAMES = ["club", "stone", "spear", "stone-axe", "bone-mace", "tomahawk", "net-trap", "spring-trap", "pit-trap"];
// What each pi0 sheet holds (looked at 2026-10-19), for the folder names.
const SHEET_NAMES = [
  "ui-icons", "building-parts", "faces", "faces-small", "grass-water-edges", "villager-bodies",
  "rocks-cliffs", "trees-plants", "ground", "hair", "carried-items", "stones", "ui-frames",
  "fog-shadows", "limbs", "limbs-small", "clouds", "mountains", "logo", "wood-bones-rocks", "hats",
  "sparkles", "boar", "sabretooth", "deer", "font-letters", "font-digits",
];
const BUILDING_NAMES = ["armoury", "gym", "hut", "chiefs-hut", "kitchen", "range", "store", "disco", "sanctuary", "pia-center", "nursery", "tower"];

const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 240, height: 372 } })).newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => typeof window.__prehistoricDebugBootWithoutSplash === "function");
  await page.evaluate(async () => { localStorage.clear(); await window.__prehistoricDebugBootWithoutSplash(); });

  const art = await page.evaluate(async ({ SUBRECORD_NAMES }) => {
    const { Graphics } = await import("/src/platform/Graphics.ts");
    const { LegacyPackedSpriteRenderer } = await import("/src/render/LegacyPackedSpriteRenderer.ts");
    const { renderPicture, renderBuildingPicture } = await import("/src/render/WideView.ts");
    const { drawImageHelper } = await import("/src/render/RenderRuntime.ts");
    const rt = window.__prehistoricRuntime;
    const data = rt.packedData;
    const j = data.byteTables;
    const b = data.shortTables;

    /** Draws onto a clear size x size canvas and returns the drawn pixels, trimmed. */
    const trimmed = (size, draw) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      const graphics = new Graphics(context);
      const packed = new LegacyPackedSpriteRenderer({ shortTables: b, byteTables: j, imageGroups: rt.imageGroups, graphics });
      try { draw(packed, graphics); } catch { return null; }
      return trim(canvas);
    };
    const trim = (canvas) => {
      const { width, height } = canvas;
      const pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] === 0) continue;
          if (x < left) left = x; if (x > right) right = x;
          if (y < top) top = y; if (y > bottom) bottom = y;
        }
      }
      if (right < 0) return null;
      const out = document.createElement("canvas");
      out.width = right - left + 1;
      out.height = bottom - top + 1;
      out.getContext("2d").drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
      return { url: out.toDataURL(), width: out.width, height: out.height };
    };
    const asUrl = (bytes) => { let s = ""; for (const v of bytes) s += String.fromCharCode(v); return `data:image/png;base64,${btoa(s)}`; };

    // The image packs as stored: pi0 (group 0, the sprite sheets), pi9 (group 1, hair and colour
    // variants), pi8 (group 2, the large pictures).
    const packs = rt.imageGroups.map((pack) => (pack ? pack.all().map((r) => ({ index: r.index, url: asUrl(r.bytes), width: r.image.width, height: r.image.height })) : []));

    // Sub-records (f.d(IIII)): the command bar's and the cursor's pictures; animated ones keep
    // every distinct frame of phases 0..7.
    const subrecords = [];
    for (let id = 0; id < 160; id += 1) {
      const frames = [];
      for (let phase = 0; phase < 8; phase += 1) {
        const picture = trimmed(96, (packed) => rt.stepZSubrecordDraw(id, 32, 32, phase, { onSpriteRecord: (record, x, y) => packed.drawComposite(record, x, y) }));
        if (picture && !frames.some((f) => f.url === picture.url)) frames.push(picture);
      }
      if (frames.length) subrecords.push({ id, name: SUBRECORD_NAMES[id] ?? "", frames });
    }

    // Bar items 0..8 (weapons, traps): composite 659 + code.
    const items = Array.from({ length: 9 }, (_, code) => trimmed(64, (packed) => packed.drawComposite(659 + code, 16, 16)));

    // Building pictures as the build cards and the placing ghost show them.
    const buildings = Array.from({ length: 12 }, (_, kind) => {
      const canvas = renderBuildingPicture(rt, kind);
      return canvas ? { url: canvas.toDataURL(), width: canvas.width, height: canvas.height } : null;
    });

    // Map objects and scenes: every resource of f.a(int,byte) (resourceId 1000 + n, table b[0]),
    // drawn with the original's own helper (buildings at each stage, the title scenery ...).
    const scenes = [];
    for (let n = 0; n < (b[0]?.length ?? 0); n += 1) {
      const canvas = renderPicture(rt, 400, () => drawImageHelper(rt, 1000 + n, 2, 150, 250));
      if (canvas) scenes.push({ id: 1000 + n, url: canvas.toDataURL(), width: canvas.width, height: canvas.height });
    }

    // Composites (f.a(III), b[9] / b[10]): each record drawn whole; filed under the sheet most of
    // its pieces come from.
    const sheetOf = (index, counts, depth = 0) => {
      if (depth > 8) return;
      const base = (b[9][index] ?? 0) & 0x1fff;
      const entries = (j[16][index] ?? 0) & 63;
      for (let c = base; c < base + entries; c += 1) {
        const entry = b[10][c] ?? 0;
        const piece = entry & 0x1fff;
        if (entry & 0x2000) sheetOf(piece, counts, depth + 1);
        else if (piece) { const type = (j[20][piece] ?? 0) & 31; counts[type] = (counts[type] ?? 0) + 1; }
      }
    };
    const composites = [];
    for (let index = 0; index < b[9].length; index += 1) {
      const picture = trimmed(512, (packed) => packed.drawComposite(index, 220, 220));
      if (!picture) continue;
      const counts = {};
      sheetOf(index, counts);
      const sheet = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "vector";
      composites.push({ index, sheet: sheet >= 27 ? "vector" : sheet, ...picture });
    }

    // Pieces (j[20..24]): one rectangle of one sheet each; types 27..30 are lines / boxes / fills.
    const pieces = [];
    for (let index = 1; index < j[20].length; index += 1) {
      const type = (j[20][index] ?? 0) & 31;
      if (type >= 27) continue;
      const picture = trimmed(160, (packed) => packed.drawSprite(index, 0, 0));
      if (picture) pieces.push({ index, sheet: type, ...picture });
    }
    return { packs, subrecords, items, buildings, scenes, composites, pieces };
  }, { SUBRECORD_NAMES });

  // ---- files ----
  fs.rmSync(outDir, { recursive: true, force: true });
  const write = (rel, url) => {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
    return rel;
  };
  const pad = (n, w) => String(n).padStart(w, "0");
  const sections = [];
  const section = (title, note, entries) => sections.push({ title, note, entries: entries.filter(Boolean) });

  const screens = ["l0", "l1", "l2", "l3"].map((name) => {
    const rel = `1-screens/${name}.png`;
    fs.mkdirSync(path.join(outDir, "1-screens"), { recursive: true });
    fs.copyFileSync(path.join(webDir, "public/assets", `${name}.png`), path.join(outDir, rel));
    return { file: rel, label: name };
  });
  const large = art.packs[2].map((p) => ({ file: write(`1-screens/pi8-${pad(p.index, 2)}.png`, p.url), label: `pi8 #${p.index} ${p.width}x${p.height}` }));
  section("1. Screens and large pictures", "l0..l3: logos, cover, menu background; pi8: the large pictures (build cards, story).", [...screens, ...large]);
  section("2. Sprite sheets", "pi0: the sheets every piece is cut from; pi9: hair and colour variants.", [
    ...art.packs[0].map((p) => ({ file: write(`2-sheets/pi0-sheet${pad(p.index, 2)}-${SHEET_NAMES[p.index]}.png`, p.url), label: `sheet ${p.index} ${SHEET_NAMES[p.index]} ${p.width}x${p.height}` })),
    ...art.packs[1].map((p) => ({ file: write(`2-sheets/pi9-variant${pad(p.index, 2)}.png`, p.url), label: `pi9 #${p.index} ${p.width}x${p.height}` })),
  ]);
  section("3. Command and cursor icons (sub-records)", "The bar's and cursor's pictures, by sub-record number; animated ones have one file per frame.",
    art.subrecords.flatMap((s) => s.frames.map((f, k) => ({
      file: write(`3-icons/sub-${pad(s.id, 3)}${s.name ? `-${s.name}` : ""}${s.frames.length > 1 ? `-f${k}` : ""}.png`, f.url),
      label: `${s.id} ${s.name}${s.frames.length > 1 ? ` f${k}` : ""} ${f.width}x${f.height}`,
    }))));
  section("4. Weapons and traps", "Bar items 0..8 (composite 659 + code).",
    art.items.map((p, code) => p && { file: write(`4-items/item-${code}-${ITEM_NAMES[code]}.png`, p.url), label: `${code} ${ITEM_NAMES[code]} ${p.width}x${p.height}` }));
  section("5. Building pictures", "As the build cards and the placing ghost show them (resource 1000 + kind + 1).",
    art.buildings.map((p, kind) => p && { file: write(`5-buildings/building-${pad(kind, 2)}-${BUILDING_NAMES[kind]}.png`, p.url), label: `${kind} ${BUILDING_NAMES[kind]} ${p.width}x${p.height}` }));
  section("6. Map objects and scenes", "Every f.a(int,byte) resource (1000 + n): buildings at each stage, trees, the title scenery ...",
    art.scenes.map((p) => ({ file: write(`6-objects/res-${p.id}.png`, p.url), label: `${p.id} ${p.width}x${p.height}` })));
  const bySheet = (list, folder, prefix) => {
    const sheets = [...new Set(list.map((p) => p.sheet))].sort((x, y) => (x === "vector") - (y === "vector") || x - y);
    for (const sheet of sheets) {
      const name = sheet === "vector" ? "vector" : `sheet${pad(sheet, 2)}-${SHEET_NAMES[sheet]}`;
      const entries = list.filter((p) => p.sheet === sheet).map((p) => ({ file: write(`${folder}/${name}/${prefix}-${pad(p.index, 4)}.png`, p.url), label: `${p.index} ${p.width}x${p.height}` }));
      section(`${folder.replace(/^\d-/, "")} -- ${name}`, `${entries.length} pictures; ${prefix === "comp" ? "most of their pieces come from" : "cut from"} ${name === "vector" ? "lines and fills" : `pi0 sheet ${sheet}`}.`, entries);
    }
  };
  bySheet(art.composites, "7-composites", "comp");
  bySheet(art.pieces, "8-pieces", "piece");

  // ---- overview page ----
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Original Art Export</title><style>
:root{--bg:#f4efe2;--ink:#2b1d0e;--muted:#6b5a3e;--card:#fffaf0;--line:#d8cba8}
@media (prefers-color-scheme: dark){:root{--bg:#1c1812;--ink:#efe6d2;--muted:#b3a483;--card:#2a241b;--line:#4a3f2e}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 2px;border-bottom:1px solid var(--line);padding-bottom:4px}
p{margin:2px 0 10px;color:var(--muted)}nav a{color:inherit;margin-right:10px;font-size:13px}
.grid{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;padding:6px;background:var(--card);border:1px solid var(--line);border-radius:6px;display:flex;flex-direction:column;align-items:center;gap:4px;max-width:100%}
img{image-rendering:pixelated;max-width:100%;background:repeating-conic-gradient(#0000 0 25%,#8881 0 50%) 0 0/12px 12px}
figcaption{font:11px/1.2 ui-monospace,monospace;color:var(--muted);text-align:center}
</style></head><body><h1>Prehistoric Tribes — original art</h1>
<p>${sections.reduce((n, s) => n + s.entries.length, 0)} files exported by web/scripts/export-art.mjs. Pictures are shown at 2x; the files are 1x.</p>
<nav>${sections.map((s, i) => `<a href="#s${i}">${escape(s.title)}</a>`).join("")}</nav>
${sections.map((s, i) => `<h2 id="s${i}">${escape(s.title)}</h2><p>${escape(s.note)}</p><div class="grid">${s.entries.map((e) => `<figure><img src="${e.file}" loading="lazy" onload="this.width=this.naturalWidth*2"><figcaption>${escape(e.label)}</figcaption></figure>`).join("")}</div>`).join("\n")}
</body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`${sections.reduce((n, s) => n + s.entries.length, 0)} files in ${sections.length} groups -> ${outDir}`);
} finally {
  await browser.close();
  await server.close();
}
