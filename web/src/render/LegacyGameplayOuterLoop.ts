import {
  stepLegacyGameplayCell,
  type LegacyGameplayCellLoopViewport,
  type LegacyGameplayCellLoopState,
  type LegacyGameplayCellLoopCallbacks,
} from "./LegacyGameplayCellLoop";

/**
 * The outer loop f.u()'s own body runs, bytecode/f-javap.txt offsets
 * 20..2140 (`LegacyGameplayCellLoop.ts` ports the per-cell BODY at each
 * `(ah, ai)`; this file supplies the loop shape driving it, plus one small
 * piece never ported before now: the once-per-row end-of-line draw at
 * offsets 2067..2124).
 *
 * Exact bounds, confirmed directly from the raw bytecode (not assumed from
 * any file header's prose summary):
 *
 * ```
 * ai = -1;
 * while (ai < P + 3) {                    // P = viewport.rows
 *   row = ai + K;                          // K = viewport.originRow
 *   if (row < mapHeight) {
 *     ah = O;                              // O = viewport.columns (offset 55..64: (O-1)+1)
 *     while (ah >= -1) {
 *       stepLegacyGameplayCell(ah, ai, ...);  // bounds-checks row/column itself
 *       ah -= 1 + ahDecrement;             // ahDecrement from the positive
 *                                          // branch's "left neighbor" merge
 *                                          // (bytecode offsets 343..450 --
 *                                          // that branch mutates the SAME
 *                                          // shared `ah:I` field the outer
 *                                          // loop itself decrements, so its
 *                                          // effect and the loop's own
 *                                          // decrement stack)
 *     }
 *     // offsets 2067..2124, once per row, AFTER the inner loop completes:
 *     if ((L:Z || N:Z) && (q[1] - K === ai)) {
 *       d(105, (q[0] - I) * 22, rowPixelBase, phase);  // f.d(IIII), LegacyZSubrecordDraw
 *     }
 *   }
 *   // else: row >= mapHeight -- the ENTIRE inner loop is skipped (bytecode
 *   // goto 2127 directly), not merely each cell bounds-checking itself out.
 *   rowPixelBase += 16;                    // -> ai*16 for the NEXT iteration; see
 *                                          // gameplay-paint-cluster.md's "f.u()'s
 *                                          // local2 correction" (2026-08-14)
 *   ai += 1;
 * }
 * ```
 *
 * This module genuinely imports `LegacyGameplayCellLoop.ts` (real
 * cross-file import, breaking the standalone-vm-transpile convention by
 * necessity, same reasoning as `LegacyGameplayCellBodyDispatch.ts`) rather
 * than duplicating its ~60-line per-cell body inline, which would risk
 * silent drift if that file ever changes. Tested by
 * `verify-gameplay-outer-loop.mjs`, a genuine integration test using the
 * same shared-vm-context-with-require-shim technique as
 * `verify-gameplay-cell-body-dispatch.mjs`.
 */

export type LegacyGameplayOuterLoopViewport = LegacyGameplayCellLoopViewport;

export type LegacyGameplayOuterLoopState = LegacyGameplayCellLoopState & {
  /** f.L:Z (#73). */
  readonly lFlag: boolean;
  /** f.N:Z (#81). */
  readonly nFlag: boolean;
  /** f.q:[B] (#354), a 2-element array read as `q[0]`/`q[1]`. */
  readonly rowEndMarker: Int8Array;
  /**
   * f.f:I (#294) -- confirmed via direct bytecode read of `u()`'s own
   * row-end draw calls (offset 2118/2178/2203), i.e. `game.animPhase`.
   * Distinct from the negative-entity branch's own `phase` (genuinely
   * `e:I`/#284/`game.animStep`, a separate field despite the
   * letter-adjacent naming) -- see LegacyGameplayNegativeEntityBranch.ts.
   */
  readonly phase: number;
};

export type LegacyGameplayOuterLoopCallbacks = LegacyGameplayCellLoopCallbacks & {
  /** private void d(int,int,int,int) / LegacyZSubrecordDraw, the offset-2067..2124 end-of-row draw. */
  readonly onRowEndDraw?: (record: number, x: number, y: number, phase: number) => void;
};

export function stepLegacyGameplayOuterLoop(
  viewport: LegacyGameplayOuterLoopViewport,
  state: LegacyGameplayOuterLoopState,
  callbacks: LegacyGameplayOuterLoopCallbacks = {},
): void {
  let rowPixelBase = -16;
  for (let ai = -1; ai < viewport.rows + 3; ai += 1) {
    const row = ai + viewport.originRow;
    if (row < viewport.mapHeight) {
      let ah = viewport.columns;
      while (ah >= -1) {
        const result = stepLegacyGameplayCell(ah, ai, viewport, state, callbacks);
        ah -= 1 + result.ahDecrement;
      }

      if (
        (state.lFlag || state.nFlag) &&
        (state.rowEndMarker[1] ?? 0) - viewport.originRow === ai
      ) {
        callbacks.onRowEndDraw?.(
          105,
          ((state.rowEndMarker[0] ?? 0) - viewport.originColumn) * 22,
          rowPixelBase,
          state.phase,
        );
      }
    }
    rowPixelBase += 16;
  }
}
