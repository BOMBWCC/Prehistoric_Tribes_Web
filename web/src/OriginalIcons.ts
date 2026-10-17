import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { Graphics } from "./platform/Graphics";
import { LegacyPackedSpriteRenderer } from "./render/LegacyPackedSpriteRenderer";

/**
 * The original's small pictures (its d(IIII) "sub-records", the ones the command bar draws:
 * 10 build, 11 form up, 12 call to arms, 13 villagers, 14 / 15 their cancel forms, 40 the "!" of a
 * blocked placement, 41 / 42 the arrows ...) as image URLs for the web UI, drawn once with the
 * original's own drawing code and trimmed to their pixels. Phase 3; not in the original.
 */

export type OriginalIcon = { url: string; width: number; height: number };

const cache = new Map<string, OriginalIcon | null>();

export function originalIcon(runtime: LegacyRuntimeState, subrecord: number): OriginalIcon | null {
  return trimmedIcon(runtime, `s${subrecord}`, (packed) => runtime.stepZSubrecordDraw(subrecord, 16, 16, 0, {
    onSpriteRecord: (record, x, y) => packed.drawComposite(record, x, y),
  }));
}

/** The picture of a bar item 0..8 (weapons, then traps): composite 659 + code, as the bars draw it. */
export function originalItemIcon(runtime: LegacyRuntimeState, code: number): OriginalIcon | null {
  return trimmedIcon(runtime, `i${code}`, (packed) => packed.drawComposite(659 + code, 16, 16));
}

function trimmedIcon(runtime: LegacyRuntimeState, key: string, draw: (packed: LegacyPackedSpriteRenderer) => void): OriginalIcon | null {
  if (cache.has(key)) return cache.get(key)!;
  const data = runtime.packedData;
  if (!data || !runtime.imageGroups[0]) return null;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingEnabled = false;
  draw(new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: runtime.imageGroups,
    graphics: new Graphics(context),
  }));
  // Trim to the drawn pixels.
  const pixels = context.getImageData(0, 0, size, size).data;
  let left = size, top = size, right = -1, bottom = -1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (pixels[(y * size + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) { cache.set(key, null); return null; }
  const width = right - left + 1;
  const height = bottom - top + 1;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  out.getContext("2d")?.drawImage(canvas, left, top, width, height, 0, 0, width, height);
  const icon = { url: out.toDataURL(), width, height };
  cache.set(key, icon);
  return icon;
}
