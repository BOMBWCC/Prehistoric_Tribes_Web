import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { Graphics } from "../platform/Graphics";
import { LegacyOffscreenImage } from "./LegacyOffscreenTargets";
import { drawFrameCommandPrimitive, drawImageHelper } from "./RenderRuntime";

/**
 * The original's drawing code run privately (phase 3; not in the original): the HUD uses it to learn
 * what the original would draw -- a villager's panel, a portrait, a building for the build list --
 * without drawing it on screen. (Until 2026-10-28 it drew the whole larger view of the map each
 * step; until 2026-10-29 the WebGL map's effects and people, now render/MapScene.ts.)
 *
 * Those draws also write game state (marker decay, the footprint bitmap, scratch fields, the
 * cursor's helper fields), so everything mutable on the runtime is copied before the draw and put
 * back after it.
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

/**
 * A building of `kind` as the placement preview draws it (c(int,int)'s a(1000 + kind + 1, 2)),
 * trimmed to its pixels, for the build list (Hud.ts). State copied before and restored after.
 */
export function renderBuildingPicture(rt: LegacyRuntimeState, kind: number): HTMLCanvasElement | null {
  return renderPicture(rt, 160, () => drawImageHelper(rt, 1000 + kind + 1, 2, 40, 70));
}

/** What the selected-unit panel (frame command 4) draws for villager `id` -- its composites and
 *  numbers (runtime.villagerPanelDraft's form) --, as if `id` alone were selected: one of several
 *  selected villagers in the HD panel (Hud.ts). Not drawn anywhere: the original's panel code runs
 *  onto a scratch canvas, and the few fields it writes (its scratch fields, the panel's change
 *  tables, the trace) are put back after it -- not the whole game state (2026-10-29). */
export function villagerPanelOf(rt: LegacyRuntimeState, id: number): LegacyRuntimeState["villagerPanelDraft"] {
  const targets = rt.offscreenTargets;
  if (!targets || !rt.packedData) return [];
  const g = rt.game;
  const primitives = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v === null || typeof v !== "object"));
  const saved = { game: primitives(g), runtime: primitives(rt), dispatch: primitives(rt.frameDispatchState) };
  const arrays = [g.zlDShorts, g.zlKBytes, g.frameFlags, g.selectionFlags].map((a) => [a, a.slice()] as const);
  const calls = rt.frameHelperCalls.length;
  const originals = [...targets.graphics];
  scratch ??= new LegacyOffscreenImage(1, 1);
  let cells: LegacyRuntimeState["villagerPanelDraft"] = [];
  try {
    for (let i = 0; i < 4; i += 1) targets.graphics[i as 0 | 1 | 2 | 3] = scratch.graphics;
    g.selectedId = id;
    g.am = id;
    // The panel on, every row marked as changed: they all draw, not only the changed ones.
    g.frameFlags[4] = true;
    g.selectionFlags[4] = true;
    g.zlKBytes.fill(1);
    drawFrameCommandPrimitive(rt, 4, 0, 264);
    cells = [...rt.villagerPanelDraft];
  } finally {
    originals.forEach((graphics, i) => { targets.graphics[i as 0 | 1 | 2 | 3] = graphics; });
    for (const [array, copy] of arrays) for (let i = 0; i < copy.length; i += 1) (array as unknown[])[i] = (copy as unknown[])[i];
    rt.frameHelperCalls.length = calls;
    rt.geometry.reset();
    Object.assign(g, saved.game);
    Object.assign(rt, saved.runtime);
    Object.assign(rt.frameDispatchState, saved.dispatch);
  }
  return cells;
}
let scratch: LegacyOffscreenImage | null = null;

/** Runs `draw` with the whole game state put back after it (scripts/make-catalog.mjs). */
export function drawPrivately(rt: LegacyRuntimeState, draw: () => void): void {
  const targets = rt.offscreenTargets;
  if (!targets) return;
  const saved = snapshot(rt);
  const originals = [...targets.graphics];
  try {
    draw();
  } finally {
    originals.forEach((graphics, i) => { targets.graphics[i as 0 | 1 | 2 | 3] = graphics; });
    restore(saved);
  }
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
