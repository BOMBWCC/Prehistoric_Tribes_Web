import { BLD_KIND } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";
export type LegacyZCommandConsumerState = {
  readonly r: Int8Array;
  readonly as: number;
  readonly ad: number;
  readonly q: number;
  readonly e: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly jTables: Int8Array[];
  readonly d: Int32Array;
  aF: number;
  readonly aI: number;
  readonly aJ: number;
  readonly aK: number;
};

export type LegacyZCommandConsumerCallbacks = {
  readonly onSprite?: (asset: number, x: number, y: number) => void;
  readonly onText?: (x: number, y: number, style: number, text: string, mode: number) => void;
  readonly onDefaultSprite?: (asset: number, x: number, y: number) => void;
};

/**
 * Direct mirror of private f.j(int), javap offsets 0..544; rendering is exposed as raw callbacks.
 *
 * BUG FIX (2026-09-14): all four table-138 reads in both loops are
 * `bipush 10; iload i; iadd; bipush 26; imul; iadd; iload_2; iadd; baload`
 * (offsets 102..113, 230..241, 301..312, 417..428) -- `(10 + i) * 26 + v`,
 * rows 10/11/12 at column v. The port had `10 + i * 26 + v`. Table 138 is
 * 26 columns wide; KEmulator shows the Store (v = r[as] = 6) costing
 * "25 / 20", which is exactly table138[266] and table138[292], with row 12
 * zero and therefore skipped.
 */
export function consumeLegacyZCommand(state: LegacyZCommandConsumerState, command: number, callbacks: LegacyZCommandConsumerCallbacks = {}): void {
  const row3 = state.jTables[3];
  const commandValue = row3?.[command] ?? 0;
  const offset138 = state.packedOffsets[T_BUILDING] ?? 0;

  if (command - 1 === 1118) {
    let value = state.r[state.as] ?? 0;
    if (state.ad !== 6) value = value === 16 ? (state.e[BLD_KIND + state.q] ?? 0) : value - 6 + 20;
    const width = state.packedBytes[offset138 + 468 + value] ?? 0;
    let used = 0;
    for (let index = 0; index < 3; index += 1) {
      if ((state.packedBytes[offset138 + (10 + index) * 26 + value] ?? 0) === 0) continue;
      const step = state.packedBytes[(state.packedOffsets[283] ?? 0) + 2] ?? 0;
      const x = state.aK - Math.trunc(step * (width - 1) / 2) + (step + 2) * used;
      used += 1;
      callbacks.onSprite?.(627 + index, state.aJ - 7, x);
      callbacks.onText?.(state.aJ + 19, x, ((row3?.[command] ?? 0) & 0xff) >> 6, String(state.packedBytes[offset138 + (10 + index) * 26 + value] ?? 0), 0);
    }
    return;
  }

  if (command - 1 === 1107) {
    const value = (state.r[state.as] ?? 0) + 12;
    let used = 0;
    for (let index = 0; index < 3; index += 1) {
      if ((state.packedBytes[offset138 + (10 + index) * 26 + value] ?? 0) === 0) continue;
      const height = state.packedBytes[offset138 + 468 + value] ?? 0;
      const x = state.aJ - Math.trunc(34 * (height - 1) / 2) + 30 * used;
      used += 1;
      callbacks.onSprite?.(627 + index, x - 6, state.aK);
      callbacks.onText?.(x + 15, state.aK, ((row3?.[command] ?? 0) & 0xff) >> 6, String(state.packedBytes[offset138 + (10 + index) * 26 + value] ?? 0), 0);
    }
    state.d[8] = 0;
    if ((state.e[BLD_KIND + state.q] ?? 0) === 6 && (state.r[state.as] ?? 0) !== 1) state.d[8] = -20;
    return;
  }

  if (command - 1 === 1073) state.aF = Math.trunc(state.aF / 21);
  callbacks.onDefaultSprite?.(state.aI + state.aF, state.aJ, state.aK);
}
