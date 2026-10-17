import { UNIT_HELD_ITEM } from "../core/DenseLayout";
import { T_ITEM_CLASS } from "../core/DataTables";
/**
 * Raw port of private f.i(int), bytecode/f-javap.txt offsets 0..282.
 * Called from f.u()'s epilogue (LegacyGameplayCellLoop.ts's onSecondaryCell)
 * whenever the secondary grid `g:[[B]` is nonzero for the current cell,
 * passing that value as the argument here.
 *
 * A `do { ... } while (e[6060+id] != 0)` loop where `id` is REPLACED each
 * iteration (except the first) by `e[6060+id]` -- i.e. `e[6060+id]` acts as
 * a "next" pointer, so the caller's initial value is the head of a linked
 * chain of entity ids stacked on one map cell, walked here to completion.
 * For each id in the chain whose `e[6565+id]` "kind" value is 1, 2, or 5, a
 * packed-sprite primitive draw fires (record `292 + ...`, via the same
 * private `a(int,int,int)` used throughout this codebase as
 * `onPackedPrimitive`); ids with any other kind are silently skipped (still
 * visited for the chain traversal, just no draw).
 *
 * The whole loop body is wrapped in a bytecode try/catch(Exception) that
 * swallows any exception and returns -- not modeled here, since JS
 * out-of-bounds array reads return `undefined` rather than throwing,
 * already handled throughout this codebase via `?? 0` fallbacks.
 */

export type LegacySecondaryCellChainState = {
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /**
   * f.h:[[B] (#308) -- `new byte[13][101]`, distinct from f.h:I (#311)'s
   * hCounter despite the shared letter. **CORRECTED (2026-09-07)**: the
   * 2026-08-22 "provably always zero, no bastore site exists anywhere"
   * claim only grepped class f's own bytecode for #308. Class b writes the
   * SAME runtime field via its `a:Lf;` back-reference (#60), under its own
   * different constant-pool index (#185) -- `private void a(byte,byte,int,
   * int)` (`LegacyEntityActionScoreGate.ts`), which this session restored
   * from a retracted "always throws" premise. See that file's own docblock
   * for the write derivation; `LegacyRuntimeState.ts`'s `secondaryCellHTable`
   * field comment has the same correction.
   */
  readonly hTable: readonly Int8Array[];
  /**
   * f.i:[[B] (#315) -- `new byte[13][101]`, distinct from both private i()
   * methods despite the shared letter. Same correction as `hTable` above --
   * also written by `LegacyEntityActionScoreGate.ts` (b's #190).
   */
  readonly iTable: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacySecondaryCellChainCallbacks = {
  /** private void a(int,int,int) (#439) / LegacyPackedSpriteRenderer's private b(III), called directly. */
  readonly onPackedPrimitive?: (record: number, x: number, y: number) => void;
};

export function stepLegacySecondaryCellChain(
  headId: number,
  state: LegacySecondaryCellChainState,
  callbacks: LegacySecondaryCellChainCallbacks = {},
): void {
  let id = headId;
  let first = true;

  do {
    if (!first) id = state.dense[6060 + id] ?? 0;
    first = false;

    const local4 = state.dense[7676 + id] ?? 0;
    // Column-based (I:B, *22) -> X.
    const localX = ((state.dense[5252 + id] ?? 0) - state.originColumn) * 22 + 11 + (state.dense[5454 + id] ?? 0);
    const hIndex = state.dense[5858 + id] ?? 0;
    // Row-based (K:B, *16) -> Y.
    const localY =
      ((state.dense[5353 + id] ?? 0) - state.originRow) * 16 + 8 + (state.dense[5555 + id] ?? 0) -
      (state.hTable[hIndex]?.[id] ?? 0) - 10;

    const kind = state.dense[UNIT_HELD_ITEM + id] ?? 0;
    if (kind === 1 || kind === 2 || kind === 5) {
      const a2 = state.packedOffsets[190 + (state.packedBytes[state.packedOffsets[T_ITEM_CLASS] + kind] ?? 0)] ?? 0;
      const a4 = state.packedBytes[state.packedOffsets[193] + 6 + kind] ?? 0;
      const v5 = state.iTable[hIndex]?.[id] ?? 0;
      const a6 = a2 + local4 * a4 + v5;
      const record = 292 + (state.packedBytes[a6] ?? 0) + (state.packedBytes[state.packedOffsets[193] + kind] ?? 0);
      callbacks.onPackedPrimitive?.(record, localX, localY);
    }
  } while ((state.dense[6060 + id] ?? 0) !== 0);
}
