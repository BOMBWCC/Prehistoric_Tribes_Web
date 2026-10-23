// Copies the finished HD art from design/ (not committed) into web/public/hd/, renamed to the keys
// the renderer looks them up by (render/HdArt.ts), and writes hd/manifest.json listing them:
//
//   node web/scripts/import-hd.mjs           (again after the art changes, e.g. the pixel-size pass)
//
//   parts/<piece>.png         villager parts and other single pieces (terrain/pieces), by drawSprite
//                             piece index (j[20..24])
//   parts-v<n>/<piece>.png    the same parts recoloured for pi9 variant n (drawSprite's an remap)
//   terrain/<sheet>.png       whole pi0 sheets, upscaled
//   objects/<id>.png          map objects, resource 1000 + n (shortTables[0][n])
//   buildings/<kind>-<lv>.png buildings 0..11 by level; sites 12..19 as <kind>-0 (just placed) / -1
//   animals/<k>-<anim>-<frame>.png   animal kind, dense 9557, dense 9579
//   effects/<sub>-<frame>.png sub-records, frame = n-th distinct picture of phases 0..7
//   ui/<name>.png             the round-3 UI (design/hud, design/panels; command buttons as cmd-*)
//   menu/...                  the round-4 start-up and menus (design/menu/processed; bg-* as .jpg)
//   story/story-<nn>.jpg      story pictures, pi8 entry nn; story/faces/face-<composite>.png dialogue faces
// See docs/hd-art-handoff.md.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const design = path.join(root, "design");
const out = path.join(root, "web/public/hd");
const BUILDINGS = { armoury: 0, gym: 1, hut: 2, "chiefs-hut": 3, kitchen: 4, range: 5, store: 6, disco: 7, sanctuary: 8, pia: 9, nursery: 10, tower: 11 };

fs.rmSync(out, { recursive: true, force: true });
const manifest = { parts: [], variants: {}, terrain: [], objects: [], buildings: [], animals: [], effects: [] };
const copy = (from, rel) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.copyFileSync(from, path.join(out, rel));
};
const list = (dir) => fs.readdirSync(path.join(design, dir)).filter((f) => f.endsWith(".png"));

for (const f of list("villagers/hd")) {
  const piece = Number(/-f(\d+)\.png$/.exec(f)[1]);
  copy(path.join(design, "villagers/hd", f), `parts/${piece}.png`);
  manifest.parts.push(piece);
}
// Other single pieces drawn by drawSprite, e.g. the plants inside terrain tiles (sheet 7):
// design/terrain/pieces/<anything ending in the piece index>.png.
if (fs.existsSync(path.join(design, "terrain/pieces"))) {
  for (const f of list("terrain/pieces")) {
    const piece = Number(/(\d+)\.png$/.exec(f)[1]);
    copy(path.join(design, "terrain/pieces", f), `parts/${piece}.png`);
    manifest.parts.push(piece);
  }
}
for (const v of fs.readdirSync(path.join(design, "villagers/hd-variants"))) {
  const n = Number(v.slice(1));
  manifest.variants[n] = [];
  for (const f of list(`villagers/hd-variants/${v}`)) {
    const piece = Number(/-f(\d+)\.png$/.exec(f)[1]);
    copy(path.join(design, "villagers/hd-variants", v, f), `parts-v${n}/${piece}.png`);
    manifest.variants[n].push(piece);
  }
}
for (const f of list("terrain").filter((f) => f.endsWith("-x4.png"))) {
  const sheet = Number(/^sheet(\d+)/.exec(f)[1]);
  copy(path.join(design, "terrain", f), `terrain/${sheet}.png`);
  manifest.terrain.push(sheet);
}
for (const f of list("map/objects/processed")) {
  const id = Number(/^obj-(\d+)\.png$/.exec(f)[1]);
  copy(path.join(design, "map/objects/processed", f), `objects/${id}.png`);
  manifest.objects.push(id);
}
for (const f of list("map/processed")) {
  const site = /^map-site(\d+)-(\d)\.png$/.exec(f);
  const building = /^map-(.+)-(\d)\.png$/.exec(f);
  const key = site ? `${site[1]}-${site[2]}` : building && BUILDINGS[building[1]] !== undefined ? `${BUILDINGS[building[1]]}-${building[2]}` : null;
  if (!key) { console.log(`skipped ${f}`); continue; }
  copy(path.join(design, "map/processed", f), `buildings/${key}.png`);
  manifest.buildings.push(key);
}
for (const f of list("map/animals/hd")) {
  const m = /^k(\d+)-a(\d+)-f(\d+)\.png$/.exec(f);
  const key = `${Number(m[1])}-${Number(m[2])}-${Number(m[3])}`;
  copy(path.join(design, "map/animals/hd", f), `animals/${key}.png`);
  manifest.animals.push(key);
}
for (const f of list("effects/processed")) {
  const m = /^sub-(\d{3})(?:-[a-z-]+?)?(?:-f(\d+))?\.png$/.exec(f);
  if (!m) { console.log(`skipped ${f}`); continue; }
  const key = `${Number(m[1])}-${Number(m[2] ?? 0)}`;
  copy(path.join(design, "effects/processed", f), `effects/${key}.png`);
  manifest.effects.push(key);
}
// The round-3 UI's pictures (top bar, menus, panels, command buttons), by their own names.
for (const dir of ["hud/processed", "panels/processed", "hud/cmd/processed"]) {
  if (!fs.existsSync(path.join(design, dir))) continue;
  for (const f of list(dir)) copy(path.join(design, dir, f), `ui/${dir.startsWith("hud/cmd") ? "cmd-" : ""}${f}`);
}
// The round-4 start-up and menus (design/menu/processed, folders kept); the opaque backgrounds as JPEG.
const menu = path.join(design, "menu/processed");
// The map cards are the small WebP (design/menu/processed/maps/*.webp); the same-named PNGs are the sources.
for (const f of fs.readdirSync(menu, { recursive: true }).filter((f) => (f.endsWith(".png") && !f.startsWith("maps/")) || f.endsWith(".webp"))) {
  if (!/^bg-/.test(f)) { copy(path.join(menu, f), `menu/${f}`); continue; }
  execFileSync("magick", [path.join(menu, f), "-quality", "85", path.join(out, "menu", f.replace(/\.png$/, ".jpg"))]);
}
// The round-4 story pictures (pi8 n as story-<nn>) and dialogue faces (composite 720 + n as face-<c>).
for (const [dir, to] of [["story/processed", "story"], ["story/faces/processed", "story/faces"]]) {
  for (const f of fs.readdirSync(path.join(design, dir)).filter((f) => /^(story-\d+\.jpg|face-\d+\.png)$/.test(f))) copy(path.join(design, dir, f), `${to}/${f}`);
}
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest));
const count = Object.values(manifest).reduce((n, v) => n + (Array.isArray(v) ? v.length : Object.values(v).reduce((m, w) => m + w.length, 0)), 0);
console.log(`${count} files -> ${out}`);
