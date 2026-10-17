import { BLD_KIND, UNIT_SELECTION } from "../core/DenseLayout";
export type LegacyEntitySelectionReleaseInput = {
  readonly groups: Int8Array[]; readonly dense: Int8Array;
  readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array;
  readonly id: number; readonly F: number; readonly w: number;
  readonly onModeReset?: () => void; readonly onFReset?: () => void;
};

/** Exact final void e(int) five-group scan, shift, and dense-state clear. */
export function releaseLegacyEntitySelection(input: LegacyEntitySelectionReleaseInput): boolean {
  for (let group = 0; group < 5; group += 1) {
    const table = group < 4 ? input.packedBytes[input.packedOffsets[125] + group] : 4;
    const rows = input.groups[table];
    if (!rows) continue;
    for (let index = 0; index < 50; index += 1) {
      if (rows[index] !== input.id) continue;
      for (let shift = index; shift < 50; shift += 1) rows[shift] = shift < 49 ? rows[shift + 1] : 0;
      if (rows[0] === 0 && input.F === (input.dense[UNIT_SELECTION + input.id] ?? 0)) {
        if (input.w === 1) input.onModeReset?.();
        input.onFReset?.();
      }
      input.dense[UNIT_SELECTION + input.id] = 0;
      return true;
    }
  }
  return false;
}

export type LegacyEntityFinalizeInput = {
  readonly id: number; readonly k: number; readonly w: number; readonly l: number; readonly q: number;
  readonly dense: Int8Array; readonly onSelectionReset?: () => void;
};

/**
 * Exact final void f(int) (bytecode/f-javap.txt offsets 0..79). `l:B` (#337)
 * is only ever zeroed in the `w===1` branch (offset 26..28) -- the
 * `w===2 && e[8749+q]===6` branch and the no-match fallthrough both leave
 * it untouched, and `k!==id` returns immediately without touching k/w/l at
 * all. Fixed 2026-08-18: this previously zeroed `l` on every return path
 * (including k!==id), clobbering `game.selectedId` whenever this ran outside the
 * w===1 case -- caught while re-verifying this port against the full
 * bytecode as part of tracing f.a(byte)'s dependency chain.
 */
export function finalizeLegacyEntitySelection(input: LegacyEntityFinalizeInput): { k: number; w: number; l: number } {
  if (input.k !== input.id) return { k: input.k, w: input.w, l: input.l };
  let w = input.w;
  let l = input.l;
  if (w === 1 || (w === 2 && (input.dense[BLD_KIND + input.q] ?? 0) === 6)) {
    if (w === 1) l = 0;
    w = 0;
    input.onSelectionReset?.();
  }
  return { k: 0, w, l };
}
