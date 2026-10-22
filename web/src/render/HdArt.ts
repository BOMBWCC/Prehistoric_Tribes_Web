import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { Graphics } from "../platform/Graphics";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";

/**
 * The HD art (phase 3, docs/hd-art-handoff.md; user 2026-10-21: HD only, no switch). The map is
 * drawn by the original's own calls into a k-times larger image (WideView.renderWideView); while
 * that draw runs (`active`), some of those calls put an HD picture where the original's pixels
 * would go instead of drawing them:
 *
 * - drawSprite: a villager part by piece index (its trimmed rectangle), a terrain sheet's region
 *   from the upscaled sheet;
 * - a map marker: a building (by kind and level) or map object (resource 1000 + n) as one whole
 *   picture where the original's ground and upper layers land (measured once by drawing them into
 *   a scratch canvas), drawn with its upper layers -- the original's calls still run, into nothing;
 * - an animal (by kind, dense 9557 animation, 9579 frame) and a sub-record (by its n-th distinct
 *   frame): the original drawn into a scratch canvas first to find where it would land.
 *
 * Only that draw changes; its game state is put back afterwards like every wide-view draw, so the
 * original's 1x frame, the game logic and the RNG are untouched (the oracle checks it). Pictures
 * load on first use; until then the original is drawn. Every picture is placed by the original's
 * own bounds, so its size only sets the sharpness (the pixel-size pass may change it).
 */

type Manifest = {
  parts: number[];
  variants: Record<string, number[]>;
  terrain: number[];
  objects: number[];
  buildings: string[];
  animals: string[];
  effects: string[];
};
type Bounds = { x: number; y: number; width: number; height: number };

const BASE = "hd/";
/** The terrain sheet whose upscale sets the drawing scale (the ground). */
const REFERENCE_SHEET = 8;

let manifest: Manifest | null = null;
const has = { parts: new Set<number>(), variants: new Map<number, Set<number>>(), terrain: new Set<number>(), objects: new Set<number>(), buildings: new Set<string>(), animals: new Set<string>(), effects: new Set<string>() };
const images = new Map<string, HTMLImageElement>();

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

export const hdArt = {
  /** Set by renderWideView for the length of its draw. */
  active: false,
  /** The wide view's graphics while active (markers, animals and sub-records draw on it). */
  target: null as Graphics | null,
  runtime: null as LegacyRuntimeState | null,
  /** Map objects / buildings already drawn in this pass (one upper-layer call each, but safe). */
  drawn: new Set<string>(),

  /** renderWideView: start / end of its draw onto `target`. */
  begin(runtime: LegacyRuntimeState, target: Graphics): void {
    this.active = true;
    this.runtime = runtime;
    this.target = target;
    this.ground = renderer(runtime, target, GROUND_SHEETS);
    this.drawn.clear();
    this.measuring.clear();
  },
  end(): void {
    for (const m of this.measuring.values()) {
      if (m.upper || trims.has(m.boundsKey)) continue;
      const relative = measured(m);
      if (!relative) continue;
      trims.set(m.boundsKey, relative);
      groundOnly.add(m.boundsKey);
    }
    this.active = false;
    this.target = null;
    this.measuring.clear();
  },

  async load(): Promise<void> {
    try {
      const response = await fetch(`${BASE}manifest.json`);
      if (!response.ok) return;
      manifest = await response.json() as Manifest;
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
    picture(`terrain/${REFERENCE_SHEET}.png`);
  },

  /** How many times larger the wide view is drawn: the reference sheet's upscale (1 until known). */
  scale(runtime: LegacyRuntimeState): number {
    if (!has.terrain.has(REFERENCE_SHEET)) return 1;
    const hd = picture(`terrain/${REFERENCE_SHEET}.png`);
    const original = runtime.imageGroups[0]?.get(REFERENCE_SHEET)?.image;
    return hd && original ? Math.max(1, Math.round(hd.naturalWidth / original.width)) : 1;
  },

  /**
   * drawSprite's picture piece `index` of `sheet` (pi9 variant when `variant`), its rectangle
   * (sx, sy, width, height) of `image` going to (x, y). Returns false to let the original draw.
   */
  drawPiece(graphics: Graphics, index: number, sheet: number, variant: boolean, image: { element: CanvasImageSource; width: number; height: number }, sx: number, sy: number, width: number, height: number, x: number, y: number): boolean {
    const set = variant ? has.variants.get(sheet) : has.parts;
    if (set?.has(index)) {
      const hd = picture(variant ? `parts-v${sheet}/${index}.png` : `parts/${index}.png`);
      const trim = hd && pieceTrim(image, sx, sy, width, height);
      if (!hd || !trim) return false;
      graphics.drawScaled(hd, x + trim.x, y + trim.y, trim.width, trim.height);
      return true;
    }
    if (!variant && has.terrain.has(sheet)) {
      const hd = picture(`terrain/${sheet}.png`);
      if (!hd) return false;
      const k = hd.naturalWidth / image.width;
      graphics.drawRegionScaled(hd, sx * k, sy * k, width * k, height * k, x, y, width, height);
      return true;
    }
    return false;
  },

  /**
   * A map marker (drawMapMarker) about to be drawn: a building record `building` (> 0) of `kind`
   * at `level`, or map object resource `resource` (its id is 1000 + it); (x, y) is the origin its
   * layers are drawn from, `look` the original's own level / look value. Returns the renderer the
   * original's pieces should go to instead of the map (a scratch canvas that measures where they
   * land the first time, a discarded one afterwards), whether the original should also draw them
   * (a ground call while that is still being measured), and what to do once they are drawn; null
   * when there is no HD picture.
   */
  planMarker(building: number, kind: number, level: number, resource: number, look: number, x: number, y: number, upper: boolean): { packed: LegacyPackedSpriteRenderer; original: boolean; before: () => void; after: () => void } | null {
    const runtime = this.runtime;
    const target = this.target;
    if (!runtime || !target) return null;
    const key = building > 0 ? buildingKey(kind, level) : has.objects.has(1000 + resource) ? `o${1000 + resource}` : null;
    if (!key) return null;
    const hd = picture(key.startsWith("o") ? `objects/${key.slice(1)}.png` : `buildings/${key}.png`);
    if (!hd) return null;
    const id = building > 0 ? `b${building}` : `${resource}@${x},${y}`;
    const boundsKey = `${key}:${resource}:${look}`;
    const known = trims.get(boundsKey);
    const draw = (bounds: Bounds) => {
      if (this.drawn.has(id)) return;
      this.drawn.add(id);
      target.drawScaled(hd, x + bounds.x, y + bounds.y, bounds.width, bounds.height);
    };
    // The ground cells still draw the original's ground-sheet pieces (sheets 4 and 8: the ground
    // itself) under the picture, which carries the rest (docs/hd-art-handoff.md 2.7): where it is
    // transparent the ground shows, never the black behind the map. Flat pieces (ground tiles,
    // water edges) only ever get the ground call, so their picture goes on there.
    // Drawn before the original's calls, so what they still draw on the map (fire, smoke: the
    // sub-records, which have HD pictures of their own) stays on top.
    if (known) return { packed: discard(runtime), original: !upper, before: () => { if (upper || groundOnly.has(boundsKey)) draw(known); }, after: () => {} };
    // The first time: the original's pieces are measured; end() learns whether an upper call came.
    let measure = this.measuring.get(id);
    if (!measure) {
      const size = 400, ox = 150, oy = 260;
      const { context } = scratch(size);
      const graphics = new Graphics(context);
      graphics.translate(ox - x, oy - y);
      measure = { context, size, ox, oy, packed: renderer(runtime, graphics), boundsKey, upper: false };
      this.measuring.set(id, measure);
    }
    const m = measure;
    if (upper) m.upper = true;
    return {
      packed: m.packed,
      original: !upper,
      before: () => {},
      after: () => {
        if (!upper) return;
        const relative = measured(m);
        if (!relative) return;
        trims.set(boundsKey, relative);
        draw(relative);
      },
    };
  },
  /** Markers being measured in this pass, by building / position. */
  measuring: new Map<string, Measure>(),
  /** Draws only a marker's ground-sheet pieces onto the wide view (begin()). */
  ground: null as LegacyPackedSpriteRenderer | null,

  /**
   * f.a(IIIIB) for animal slot `slot` at (x, y) (the 108 call): when its current frame (kind,
   * dense 9557 animation, 9579 frame) has an HD picture, the graphics its sprite layers should go
   * to (a scratch canvas) and what to do after them -- put the picture where they landed.
   */
  planAnimal(runtime: LegacyRuntimeState, slot: number, x: number, y: number): { graphics: Graphics; after: () => void } | null {
    const target = this.target;
    if (!target) return null;
    const e = runtime.denseState;
    const key = `${e[9535 + slot] ?? 0}-${(e[9557 + slot] ?? 0) & 255}-${e[9579 + slot] ?? 0}`;
    const hd = has.animals.has(key) ? picture(`animals/${key}.png`) : null;
    if (!hd) return null;
    const size = 160, ox = 64, oy = 96;
    const { context } = scratch(size);
    const graphics = new Graphics(context);
    graphics.translate(ox - x, oy - y);
    return {
      graphics,
      after: () => {
        const cached = trims.get(`a${key}`);
        const bounds = cached ?? (() => {
          const b = trimOf(context, size, size);
          const relative = b && { x: b.x - ox, y: b.y - oy, width: b.width, height: b.height };
          trims.set(`a${key}`, relative);
          return relative;
        })();
        if (bounds) target.drawScaled(hd, x + bounds.x, y + bounds.y, bounds.width, bounds.height);
      },
    };
  },

  /** Sub-record `record` at phase `phase` drawn at (x, y). Returns false to let the original draw. */
  drawEffect(runtime: LegacyRuntimeState, record: number, x: number, y: number, phase: number): boolean {
    if (!this.target) return false;
    const frame = effectFrame(runtime, record, phase);
    if (!frame) return false;
    const hd = picture(`effects/${record}-${frame.index}.png`);
    if (!hd) return false;
    this.target.drawScaled(hd, x + frame.bounds.x, y + frame.bounds.y, frame.bounds.width, frame.bounds.height);
    return true;
  },
};

/** The building picture for `kind` at `level`: the highest level drawn at or below it (store and
 *  nursery have one look; level 3 falls back to 2), sites 12..19 by "just placed" / building. */
function buildingKey(kind: number, level: number): string | null {
  if (kind >= 12) {
    const key = `${kind}-${level > 0 ? 1 : 0}`;
    return has.buildings.has(key) ? key : null;
  }
  for (let l = Math.max(1, level); l >= 1; l -= 1) if (has.buildings.has(`${kind}-${l}`)) return `${kind}-${l}`;
  return null;
}

// ---- where the original's pixels land ----

type Measure = { context: CanvasRenderingContext2D; size: number; ox: number; oy: number; packed: LegacyPackedSpriteRenderer; boundsKey: string; upper: boolean };
/** Map markers whose picture has only ground pieces (no upper-layer call). */
const groundOnly = new Set<string>();

function measured(m: Measure): Bounds | null {
  const bounds = trimOf(m.context, m.size, m.size);
  return bounds && { x: bounds.x - m.ox, y: bounds.y - m.oy, width: bounds.width, height: bounds.height };
}

const trims = new Map<string, Bounds | null>();

/** Trimmed bounds of the drawn pixels on `canvas` (null if none). */
function trimOf(context: CanvasRenderingContext2D, width: number, height: number): Bounds | null {
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function renderer(runtime: LegacyRuntimeState, graphics: Graphics, onlySheets?: ReadonlySet<number>): LegacyPackedSpriteRenderer {
  const data = runtime.packedData!;
  return new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: data.byteTables, imageGroups: runtime.imageGroups, graphics, onlySheets });
}

/** The ground sheets (4 grass / water edges, 8 ground): the only pieces of a marker's ground
 *  layer still drawn under its HD picture, which carries everything else (roots, shrubs, shadows). */
const GROUND_SHEETS: ReadonlySet<number> = new Set([4, 8]);

/** A renderer whose pixels go nowhere: the original still makes its calls, in order. */
let discarded: LegacyPackedSpriteRenderer | null = null;
function discard(runtime: LegacyRuntimeState): LegacyPackedSpriteRenderer {
  discarded ??= renderer(runtime, new Graphics(scratch(1).context));
  return discarded;
}

function scratch(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

/** The opaque part of a piece's rectangle, relative to its corner. */
function pieceTrim(image: { element: CanvasImageSource; width: number; height: number }, sx: number, sy: number, width: number, height: number): Bounds | null {
  const key = `${image.width}x${image.height}:${sx},${sy},${width},${height}`;
  if (trims.has(key)) return trims.get(key)!;
  const { context } = scratch(Math.max(width, height, 1));
  context.drawImage(image.element, sx, sy, width, height, 0, 0, width, height);
  const bounds = trimOf(context, Math.max(width, 1), Math.max(height, 1));
  trims.set(key, bounds);
  return bounds;
}


/** Sub-record frames as export-art.mjs numbered them: the distinct pictures of phases 0..7 in
 *  order; `phase` maps to the one it draws. */
const effectFrames = new Map<number, { url: string; bounds: Bounds }[]>();
const effectPhases = new Map<string, { index: number; bounds: Bounds } | null>();

function effectPicture(runtime: LegacyRuntimeState, record: number, phase: number): { url: string; bounds: Bounds } | null {
  const size = 96, origin = 32;
  const { canvas, context } = scratch(size);
  const data = runtime.packedData!;
  const packed = new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: data.byteTables, imageGroups: runtime.imageGroups, graphics: new Graphics(context) });
  const wasActive = hdArt.active;
  hdArt.active = false;
  try {
    runtime.stepZSubrecordDraw(record, origin, origin, phase, { onSpriteRecord: (r, x, y) => packed.drawComposite(r, x, y) });
  } catch {
    return null;
  } finally {
    hdArt.active = wasActive;
  }
  const bounds = trimOf(context, size, size);
  if (!bounds) return null;
  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  out.getContext("2d")!.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  return { url: out.toDataURL(), bounds: { x: bounds.x - origin, y: bounds.y - origin, width: bounds.width, height: bounds.height } };
}

function effectFrame(runtime: LegacyRuntimeState, record: number, phase: number): { index: number; bounds: Bounds } | null {
  if (!has.effects.has(`${record}-0`)) return null;
  const key = `${record}:${phase}`;
  if (effectPhases.has(key)) return effectPhases.get(key)!;
  let frames = effectFrames.get(record);
  if (!frames) {
    frames = [];
    for (let p = 0; p < 8; p += 1) {
      const pic = effectPicture(runtime, record, p);
      if (pic && !frames.some((f) => f.url === pic.url)) frames.push(pic);
    }
    effectFrames.set(record, frames);
  }
  const pic = effectPicture(runtime, record, phase);
  const index = pic ? frames.findIndex((f) => f.url === pic.url) : -1;
  const result = pic && index >= 0 && has.effects.has(`${record}-${index}`) ? { index, bounds: pic.bounds } : null;
  effectPhases.set(key, result);
  return result;
}
