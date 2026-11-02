import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { Graphics } from "../platform/Graphics";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { stepZSubrecordDraw } from "./RenderRuntime";

/**
 * The HD art (phase 3, docs/hd-art-handoff.md; user 2026-10-21: HD only, no switch). The WebGL map
 * (render/PixiMap.ts) draws the original's calls (a chunk's ground, a person's parts, an effect's
 * frame) into its pictures with this on (`active`); while it is, some of those calls put an HD
 * picture where the original's pixels would go instead of drawing them:
 *
 * - drawSprite: a villager part by piece index, a terrain sheet's region from the upscaled sheet;
 * - an effect (a sub-record frame) and an animal's frame: one whole picture.
 *
 * Buildings and map objects are whole pictures placed by the map itself (markerPicture). Every
 * picture goes where the original's pixels went: those places were measured once from the original
 * (scripts/make-catalog.mjs) and are read from hd/catalog.json (modernization step 3, the catalog),
 * so nothing is measured while playing. A picture's size only sets the sharpness. Pictures load on
 * first use; until then the original is drawn.
 */

type Manifest = {
  parts: number[];
  variants: Record<string, number[]>;
  terrain: number[];
  objects: number[];
  buildings: string[];
  animals: string[];
  effects: string[];
  /** Resource points drawn whole: "<object>-look<n>" (berry bushes by look), "stone-<n>". */
  resources: string[];
  /** The HUD's pictures (hd/ui/), by file name. */
  ui: string[];
};
type Bounds = { x: number; y: number; width: number; height: number };
type Box = [number, number, number, number];
/** hd/catalog.json (scripts/make-catalog.mjs): where each existing HD picture goes, measured once
 *  from the original, relative to the call that draws it. */
type Catalog = {
  /** Buildings (by picture key) and map objects (by markerKey's boundsKey), relative to the
   *  marker's origin. */
  markers: Record<string, Box>;
  /** Animal frames by "<kind>-<anim>-<frame>", relative to the animal's (x, y), facing right;
   *  "<key>:left" where the same frame facing left lands. */
  animals: Record<string, Box>;
  /** Effects by sub-record, then by the frame a phase picks (its composites, stepZSubrecordDraw at
   *  0, 0, as JSON): the HD frame's number and its box relative to the sub-record's (x, y). */
  effects: Record<string, Record<string, [number, number, number, number, number]>>;
  /** Pieces by index (with an HD part or in `pieces`): the opaque part of the piece's rectangle,
   *  relative to its corner. */
  parts: Record<string, Box>;
  /** Pieces without an HD part, in hd/pieces.png (the original four times larger): their box there. */
  pieces: Record<string, Box>;
  /** The ground's composites in hd/ground.png ("t<tile>", "b<record>" a marker's ground piece under
   *  its picture, "f<record>" one of a marker without a picture): the box there (HD pixels) and the
   *  offset of its corner from the composite's drawing (x, y), in game pixels; null: draws nothing. */
  ground: Record<string, [number, number, number, number, number, number] | null>;
  /** How many times larger the HD pictures are than the original's. */
  scale: number;
};
const box = (b: Box | undefined): Bounds | null => b ? { x: b[0], y: b[1], width: b[2], height: b[3] } : null;

const BASE = "hd/";

let manifest: Manifest | null = null;
let catalog: Catalog = { markers: {}, animals: {}, effects: {}, parts: {}, pieces: {}, ground: {}, scale: 1 };
const has = { parts: new Set<number>(), variants: new Map<number, Set<number>>(), terrain: new Set<number>(), objects: new Set<number>(), buildings: new Set<string>(), animals: new Set<string>(), effects: new Set<string>(), resources: new Set<string>() };
const images = new Map<string, HTMLImageElement>();
/** shadeTile's colour, made on first use. */
let shade: HTMLCanvasElement | null = null;
/** The HUD's pictures, loaded and decoded at start-up and kept, so a panel opened later shows its
 *  icons at once instead of one by one (BUG-023). */
const uiPictures: HTMLImageElement[] = [];

/** The picture at `path`, or null while it loads (it is requested on the first call). */
function picture(path: string): HTMLImageElement | null {
  let image = images.get(path);
  if (!image) {
    image = new Image();
    image.src = BASE + path;
    images.set(path, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** picture(), noting in hdArt.incomplete when it is not there yet. */
function loaded(path: string): HTMLImageElement | null {
  const image = picture(path);
  if (!image) hdArt.incomplete = true;
  return image;
}

let loading: Promise<void> | null = null;

/** hd/manifest.json: which HD pictures exist, hd/catalog.json: where they go; the HUD's pictures
 *  start loading. */
async function loadManifest(): Promise<void> {
  try {
    const [m, c] = await Promise.all([fetch(`${BASE}manifest.json`), fetch(`${BASE}catalog.json`)]);
    if (!m.ok) return;
    manifest = await m.json() as Manifest;
    // Missing only before scripts/make-catalog.mjs has made it (the dev server then answers with its
    // page, not an error: BUG-034): nothing HD is placed, the manifest still counts.
    catalog = await c.json().catch(() => catalog) as Catalog;
  } catch {
    return;
  }
  manifest.parts.forEach((p) => has.parts.add(p));
  for (const [n, list] of Object.entries(manifest.variants)) has.variants.set(Number(n), new Set(list));
  manifest.terrain.forEach((s) => has.terrain.add(s));
  manifest.objects.forEach((o) => has.objects.add(o));
  manifest.buildings.forEach((b) => has.buildings.add(b));
  manifest.animals.forEach((a) => has.animals.add(a));
  manifest.effects.forEach((e) => has.effects.add(e));
  manifest.resources.forEach((r) => has.resources.add(r));
  for (const name of manifest.ui) {
    const image = new Image();
    image.src = `${BASE}ui/${name}`;
    image.decode().catch(() => { /* shown by the <img> later, as before */ });
    uiPictures.push(image);
  }
}

export const hdArt = {
  /** Set by begin() / end(): HD pictures replace the original's pixels. */
  active: false,
  /** The graphics drawn onto while active. */
  target: null as Graphics | null,
  runtime: null as LegacyRuntimeState | null,
  /** Draws only a marker's ground-sheet pieces (the WebGL map's ground under a marker's picture). */
  ground: null as LegacyPackedSpriteRenderer | null,

  /** Start / end of a draw onto `target` with the HD art on. */
  begin(runtime: LegacyRuntimeState, target: Graphics): void {
    this.active = true;
    this.incomplete = false;
    this.runtime = runtime;
    this.target = target;
    this.ground = renderer(runtime, target, GROUND_SHEETS);
  },
  end(): void {
    this.active = false;
    this.target = null;
  },

  /** scripts/make-catalog.mjs: what it has measured so far, used while it draws the atlases (so a
   *  first run, with no catalog yet, draws them as a later run would: BUG-034). */
  useCatalog(measured: Partial<Catalog>): void {
    catalog = { ...catalog, ...measured };
  },

  /** Loads the manifest and the catalog (once; later calls wait for the same load). */
  load(): Promise<void> {
    loading ??= loadManifest();
    return loading;
  },

  /** hd/ground.png and hd/pieces.png loaded (the WebGL map draws each ground chunk once). */
  async loadGround(): Promise<void> {
    await this.load();
    // The load event, not decode(): decode() can hang in a hidden page.
    await Promise.all(["ground.png", "pieces.png"].map((path) => {
      picture(path);
      const image = images.get(path)!;
      return image.complete ? undefined : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve()); image.addEventListener("error", () => resolve()); });
    }));
  },

  /** Ground composite `key` (Catalog.ground) in hd/ground.png: the picture and its box, or null. */
  groundPiece(key: string): { image: HTMLImageElement; box: [number, number, number, number, number, number] } | null {
    const box = catalog.ground[key];
    const image = picture("ground.png");
    return box && image ? { image, box } : null;
  },

  /** How many times larger HD pictures are than the original (the catalog's). */
  scale(): number {
    return catalog.scale;
  },

  /**
   * drawSprite's picture piece `index` of `sheet` (pi9 variant when `variant`), its rectangle
   * (sx, sy, width, height) of the original's sheet going to (x, y): its HD part, or its place in
   * hd/pieces.png (the original four times larger, until redrawn), or the region of the upscaled
   * terrain sheet. Returns false when there is none (or it is still loading: `incomplete`).
   */
  drawPiece(graphics: Graphics, index: number, sheet: number, variant: boolean, sx: number, sy: number, width: number, height: number, x: number, y: number): boolean {
    const trim = box(catalog.parts[index]);
    if ((variant ? has.variants.get(sheet) : has.parts)?.has(index)) {
      const hd = loaded(variant ? `parts-v${sheet}/${index}.png` : `parts/${index}.png`);
      if (!hd || !trim) return false;
      graphics.drawScaled(hd, x + trim.x, y + trim.y, trim.width, trim.height);
      return true;
    }
    const piece = !variant ? catalog.pieces[index] : undefined;
    if (piece && trim) {
      const atlas = loaded("pieces.png");
      if (!atlas) return false;
      graphics.drawRegionScaled(atlas, piece[0], piece[1], piece[2], piece[3], x + trim.x, y + trim.y, trim.width, trim.height);
      return true;
    }
    if (!variant && has.terrain.has(sheet)) {
      const hd = loaded(`terrain/${sheet}.png`);
      if (!hd) return false;
      const k = catalog.scale;
      graphics.drawRegionScaled(hd, sx * k, sy * k, width * k, height * k, x, y, width, height);
      return true;
    }
    return false;
  },

  /** Set by begin(): an HD picture needed since then was still loading (PixiMap keeps no picture
   *  drawn without it). */
  incomplete: false,

  /**
   * The WebGL map's objects (render/PixiMap.ts): the HD picture a map marker shows and where,
   * relative to the marker's origin (from the catalog; null bounds: not in it). Null: no HD picture.
   */
  markerPicture(building: number, kind: number, level: number, resource: number, look: number): { path: string; image: HTMLImageElement | null; bounds: Bounds | null } | null {
    const marker = markerKey(building, kind, level, resource, look);
    if (!marker) return null;
    const bounds = marker.looked ? { x: 11, y: 8, width: 22, height: 16 } : box(catalog.markers[marker.boundsKey]);
    return { path: BASE + marker.path, image: picture(marker.path), bounds };
  },

  /** The HUD's picture hd/ui/`name`.png, or null while it loads. */
  uiPicture(name: string): HTMLImageElement | null {
    return picture(`ui/${name}.png`);
  },

  /** Animal slot `slot`'s current frame (kind, dense 9557 animation, 9579 frame) drawn whole at
   *  (x, y), where the original's layers would land. Returns false to let the original draw. */
  drawAnimal(runtime: LegacyRuntimeState, slot: number, x: number, y: number): boolean {
    const e = runtime.denseState;
    const key = `${e[9535 + slot] ?? 0}-${(e[9557 + slot] ?? 0) & 255}-${e[9579 + slot] ?? 0}`;
    // The HD frames face right; directions 3..6 face left (table 99, every animal animation): the
    // same frame mirrored, where the original's left-facing frame lands (BUG-032).
    const direction = e[9491 + slot] ?? 0;
    const left = direction >= 3 && direction <= 6;
    const bounds = box(catalog.animals[left ? `${key}:left` : key]);
    const hd = this.target && has.animals.has(key) && bounds ? loaded(`animals/${key}.png`) : null;
    if (!hd || !bounds) return false;
    if (left) this.target!.drawScaledMirrored(hd, x + bounds.x, y + bounds.y, bounds.width, bounds.height);
    else this.target!.drawScaled(hd, x + bounds.x, y + bounds.y, bounds.width, bounds.height);
    return true;
  },

  /**
   * f.o()'s composite for map tile `tile` at (x, y): a gatherable stone tile (63..75 on grass,
   * 115..127 on earth; more rocks to fewer) draws its ground pieces and then one picture of light,
   * shining stone (2026-10-27: the original's rock pieces look like the scenery's, which stays as
   * it is). Returns false to let the original draw.
   */
  drawStoneTile(tile: number, x: number, y: number): boolean {
    const step = tile >= 63 && tile <= 75 ? tile - 63 : tile >= 115 && tile <= 127 ? tile - 115 : -1;
    if (step < 0 || !this.target || !this.ground) return false;
    const n = step <= 3 ? 1 : step <= 6 ? 2 : step <= 9 ? 3 : 4;
    const hd = has.resources.has(`stone-${n}`) ? picture(`objects/stone-${n}.png`) : null;
    if (!hd) return false;
    this.ground.drawComposite(tile, x, y);
    this.target.drawScaled(hd, x + 11, y + 8, 22, 16);
    return true;
  },

  /**
   * f.u()'s fog for an explored tile out of sight (class 1, the 1-pixel dither of piece 12 -- grey at
   * the original's size, a few faint dotted lines in HD): a translucent dark layer over the tile
   * whose corner is (x, y) instead (user, 2026-10-27: the grey went missing).
   */
  shadeTile(x: number, y: number): boolean {
    if (!this.target) return false;
    if (!shade) {
      shade = document.createElement("canvas");
      shade.width = shade.height = 2;
      const context = shade.getContext("2d")!;
      context.fillStyle = "rgba(0, 0, 0, 0.45)";
      context.fillRect(0, 0, 2, 2);
    }
    this.target.drawScaled(shade, x, y, 22, 16);
    return true;
  },

  /** Sub-record `record` at phase `phase` drawn at (x, y). Returns false to let the original draw. */
  drawEffect(runtime: LegacyRuntimeState, record: number, x: number, y: number, phase: number): boolean {
    if (!this.target) return false;
    const frames = catalog.effects[record];
    if (!frames) return false;
    const composites: number[] = [];
    stepZSubrecordDraw(runtime, record, 0, 0, phase, { onSpriteRecord: (r, cx, cy) => composites.push(r, cx, cy) });
    const frame = frames[JSON.stringify(composites)];
    const hd = frame && loaded(`effects/${record}-${frame[0]}.png`);
    if (!frame || !hd) return false;
    this.target.drawScaled(hd, x + frame[1], y + frame[2], frame[3], frame[4]);
    return true;
  },
};

/** The building picture for `kind` at `level`: the highest level drawn at or below it (store and
 *  nursery have one look; level 3 falls back to 2), sites 12..19 by "just placed" / building.
 *  A map marker's HD picture (hd/`path`) and the key its bounds are kept under in the catalog: a
 *  building by kind and level, a map object (resource 1000 + n), a berry bush by its look (RES_LOOK
 *  0..3, bare to full; 2026-10-27: one picture with the berries in it, filling the bush's tile). */
export function markerKey(building: number, kind: number, level: number, resource: number, look: number): { path: string; boundsKey: string; looked: boolean } | null {
  const looked = building === 0 && has.resources.has(`${1000 + resource}-look${look}`);
  const key = building > 0 ? buildingKey(kind, level) : looked ? `o${1000 + resource}-look${look}` : has.objects.has(1000 + resource) ? `o${1000 + resource}` : null;
  if (!key) return null;
  return { path: key.startsWith("o") ? `objects/${key.slice(1)}.png` : `buildings/${key}.png`, boundsKey: building > 0 ? key : `${key}:${resource}:${look}`, looked };
}

function buildingKey(kind: number, level: number): string | null {
  if (kind >= 12) {
    const key = `${kind}-${level > 0 ? 1 : 0}`;
    return has.buildings.has(key) ? key : null;
  }
  for (let l = Math.max(1, level); l >= 1; l -= 1) if (has.buildings.has(`${kind}-${l}`)) return `${kind}-${l}`;
  return null;
}

function renderer(runtime: LegacyRuntimeState, graphics: Graphics, onlySheets?: ReadonlySet<number>): LegacyPackedSpriteRenderer {
  const data = runtime.packedData!;
  return new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: data.byteTables, imageGroups: runtime.imageGroups, graphics, onlySheets });
}

/** The ground sheets (4 grass / water edges, 8 ground): the only pieces of a marker's ground
 *  layer still drawn under its HD picture, which carries everything else (roots, shrubs, shadows). */
const GROUND_SHEETS: ReadonlySet<number> = new Set([4, 8]);
