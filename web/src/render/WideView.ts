import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { Graphics } from "../platform/Graphics";
import { hdArt } from "./HdArt";
import { LegacyOffscreenImage } from "./LegacyOffscreenTargets";
import { drawFrameCommandPrimitive, drawImageHelper, renderMap, stepCameraFrame, stepGameplayOuterLoop, stepLegacyC2 } from "./RenderRuntime";

/**
 * The larger view (phase 3, user 2026-10-17; not in the original). The game itself keeps its 11 x 18
 * tile camera; after each paint this draws a bigger window of the map -- terrain, units, fog, the
 * cursor -- with the original's own drawing code (f.o(), f.u(), c(int,int), f.w()'s box frame and cursor corners) into an
 * image of its own, by moving the camera and view size for the length of the draw.
 *
 * Those draws also write game state (marker decay, the footprint bitmap, scratch fields, the
 * cursor's helper fields), so everything mutable on the runtime is copied before the draw and put
 * back after it; `npm run oracle` checks that the game state stays frame-identical to the original.
 */

/** Runtime fields that are never written while drawing the map: resources, images, audio. */
const SKIP_FIELDS = [
  "renderTargets", "offscreenTargets", "imageGroups", "resourceTables", "audioTable", "midiResource",
  "midiPlayer", "progressStore", "maResource", "languageResources", "languageTables", "zhStrings",
  "zhPainter", "packedBytes", "packedOffsets", "packedData", "saveOffsets", "sectionOffsets", "activeMap",
] as const;

type Saved = { target: object; copy: unknown };

function isDrawingObject(value: object): boolean {
  return value instanceof Graphics
    || (typeof HTMLElement !== "undefined" && value instanceof HTMLElement)
    || (typeof CanvasRenderingContext2D !== "undefined" && value instanceof CanvasRenderingContext2D)
    || (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap);
}

/** Own data properties only: accessors (liveView) read and write fields saved elsewhere. */
function dataProperties(target: object): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if ("value" in descriptor && descriptor.enumerable) copy[key] = descriptor.value;
  }
  return copy;
}

/** Copies every array, typed array and object reachable from `root` (in place, so shared references survive). */
function snapshot(root: LegacyRuntimeState): Saved[] {
  const saved: Saved[] = [];
  const seen = new Set<object>();
  for (const name of SKIP_FIELDS) {
    const value = (root as unknown as Record<string, unknown>)[name];
    if (value && typeof value === "object") seen.add(value);
  }
  const stack: object[] = [root];
  while (stack.length > 0) {
    const target = stack.pop()!;
    if (seen.has(target) || isDrawingObject(target)) continue;
    seen.add(target);
    if (ArrayBuffer.isView(target)) {
      saved.push({ target, copy: (target as unknown as Int8Array).slice() });
      continue;
    }
    const copy: unknown = Array.isArray(target) ? target.slice() : dataProperties(target);
    saved.push({ target, copy });
    for (const value of Object.values(copy as object)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return saved;
}

function restore(saved: readonly Saved[]): void {
  for (const { target, copy } of saved) {
    if (ArrayBuffer.isView(target)) {
      (target as unknown as Int8Array).set(copy as Int8Array);
    } else if (Array.isArray(target)) {
      const values = copy as unknown[];
      target.length = values.length;
      for (let i = 0; i < values.length; i += 1) target[i] = values[i];
    } else {
      const values = copy as Record<string, unknown>;
      const record = target as Record<string, unknown>;
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(record))) {
        if ("value" in descriptor && descriptor.enumerable && !(key in values)) delete record[key];
      }
      Object.assign(record, values);
    }
  }
}

export type WideWindow = {
  /** Top-left tile of the window (may be off the map; those cells stay black). */
  readonly column: number;
  readonly row: number;
  readonly columns: number;
  readonly rows: number;
};

let image: LegacyOffscreenImage | null = null;

/** The HUD slot of the top resource bar (record 2, f.paint() draws it at the top). */
export const TOP_BAR_SLOT = 0;

/**
 * Draws `window` of the map and returns the image: tile (column, row) of the window is at
 * (11 + 22 * c, 8 + 16 * r), the same 11 / 8 margin as the original's offscreen.
 */
export function renderWideView(rt: LegacyRuntimeState, window: WideWindow, touchCursor = false): LegacyOffscreenImage | null {
  const targets = rt.offscreenTargets;
  if (!targets || !rt.activeMap || !rt.packedData) return null;
  const width = window.columns * 22 + 22;
  const height = window.rows * 16 + 16;
  const scale = hdArt.scale(rt);
  if (!image || image.width !== width || image.height !== height || image.scale !== scale) {
    image = new LegacyOffscreenImage(width, height, scale);
    image.graphics.shown = true;
  }
  image.graphics.setColor(0);
  image.graphics.fillRect(0, 0, width, height);

  const g = rt.game;
  // The map's offscreen is Graphics[c[1]] (f.m()'s N:B, and the fog fill's target).
  const slot = Math.max(0, Math.min(3, g.frameImageSlots[1] ?? 0)) as 0 | 1 | 2 | 3;
  const saved = snapshot(rt);
  const original = targets.graphics[slot];
  try {
    // The cursor is kept relative to the camera; keep its tile on the map.
    g.cursorColumn += g.cameraColumn - window.column;
    g.cursorRow += g.cameraRow - window.row;
    g.cameraColumn = window.column;
    g.cameraRow = window.row;
    g.viewColumns = window.columns;
    g.viewRows = window.rows;
    g.targetSlot = slot;
    targets.graphics[slot] = image.graphics;
    if (scale > 1) hdArt.begin(rt, image.graphics);
    // f.m()'s order: w() -- the box-select frame and the cursor corners --, the units and fog
    // (u()), then c(int,int).
    renderMap(rt, { fromColumn: 0, toColumn: window.columns, fromRow: 0, toRow: window.rows }, slot, null);
    stepCameraFrame(rt, image.graphics);
    stepGameplayOuterLoop(rt, image.graphics);
    stepLegacyC2(rt, g.cursorColumn * 22, g.cursorRow * 16, touchCursor);
  } finally {
    hdArt.end();
    targets.graphics[slot] = original;
    restore(saved);
  }
  return image;
}

/**
 * A building of `kind` as the placement preview draws it (c(int,int)'s a(1000 + kind + 1, 2)),
 * trimmed to its pixels, for the build list (Hud.ts). State copied before and restored after.
 */
export function renderBuildingPicture(rt: LegacyRuntimeState, kind: number): HTMLCanvasElement | null {
  return renderPicture(rt, 160, () => drawImageHelper(rt, 1000 + kind + 1, 2, 40, 70));
}

/** A villager's portrait as the original's bars draw it (f.a(IIIII), as in drawLegacy1010). */
export function renderPortrait(rt: LegacyRuntimeState, id: number): HTMLCanvasElement | null {
  return renderPicture(rt, 64, () => rt.stepEntityAction(id, 32, 40, -8, 29));
}

/** What the selected-unit panel (frame command 4) draws for villager `id` -- its composites and
 *  numbers (runtime.villagerPanel's form) --, drawn privately as if `id` alone were selected, the
 *  game state put back after it: one of several selected villagers in the HD panel (Hud.ts). */
export function villagerPanelOf(rt: LegacyRuntimeState, id: number): LegacyRuntimeState["villagerPanel"] {
  let cells: LegacyRuntimeState["villagerPanel"] = [];
  renderPicture(rt, 1, () => {
    rt.game.selectedId = id;
    rt.game.am = id;
    // The panel on, every row marked as changed: they all draw, not only the changed ones.
    rt.game.frameFlags[4] = true;
    rt.game.selectionFlags[4] = true;
    rt.game.zlKBytes.fill(1);
    drawFrameCommandPrimitive(rt, 4, 0, 264);
    cells = [...rt.villagerPanelDraft];
  });
  return cells;
}

/** Runs one of the original's draws into a private image of `size` x `size` (the game state put
 *  back after it), trimmed to the drawn pixels. */
export function renderPicture(rt: LegacyRuntimeState, size: number, draw: () => void): HTMLCanvasElement | null {
  const targets = rt.offscreenTargets;
  if (!targets || !rt.packedData) return null;
  const picture = new LegacyOffscreenImage(size, size);
  const saved = snapshot(rt);
  const originals = [...targets.graphics];
  try {
    for (let i = 0; i < 4; i += 1) targets.graphics[i as 0 | 1 | 2 | 3] = picture.graphics;
    draw();
  } finally {
    originals.forEach((graphics, i) => { targets.graphics[i as 0 | 1 | 2 | 3] = graphics; });
    restore(saved);
  }
  const context = picture.element.getContext("2d");
  if (!context) return null;
  const pixels = context.getImageData(0, 0, size, size).data;
  let left = size, top = size, right = -1, bottom = -1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (pixels[(y * size + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")?.drawImage(picture.element, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
