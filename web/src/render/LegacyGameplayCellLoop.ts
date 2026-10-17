/**
 * Partial raw port of private f.u() (bytecode/f-javap.txt offsets 8854..10058,
 * ~1200 instructions total -- see reverse-engineering/gameplay-paint-cluster.md
 * for the full survey). This file covers the OUTER SHAPE only:
 *
 *  - the nested visible-window loop (offsets 20..2140: outer `ai` over rows,
 *    inner `ah` over columns, decrementing -- note this is a DIFFERENT scan
 *    order from f.o()/LegacyMapRenderer's increasing row/column loop)
 *  - the local4===0 fast-skip path (offset 178..183)
 *  - the local3<2 map-marker dispatch (offset 186..225), which is a *second*,
 *    separate call site into the same private `f.a(int,byte)` method already
 *    ported as drawMapMarker in LegacyRuntimeState.ts -- with arg2=1 (wired in the
 *    runtime as onMapMarkerArg1 via prepareLegacyMapMarkerDispatch)
 *  - the shared per-cell epilogue (offsets 1791..2054): a secondary grid
 *    `g:[[B]` check+reset (calls private `i(int)`, LegacySecondaryCellChain, when the
 *    cell is nonzero) followed by a dispatch on `local3` (the occupancy
 *    class from `f.a(int,int)` / LegacyOccupancyClass) that turned out to be
 *    **the fog-of-war renderer**: class 1 draws packed-primitive record 12,
 *    class 2 either fills the tile solid black (when all 4 neighbors are
 *    also class 2) or draws a smaller inset packed-primitive record 11 --
 *    exactly the scalloped black boundary seen in the live KEmulator
 *    screenshot. Both records route through the already-ported private
 *    `b(int,int,int)` (bytecode offsets 7942..8375, confirmed by matching
 *    line number against the documented `LegacyPackedSpriteRenderer` range).
 *
 * NOT covered: offsets 225..1791, the ~1550-instruction entity/terrain-detail
 * body that calls extensively into the `b` (entity subsystem) class. Exposed
 * here as a single `onUnhandledCellBody` callback so the loop shape and the
 * fog-of-war piece are usable/testable now without guessing at that body.
 * That body is now itself fully ported (see the three files listed in the
 * correction note below) and unified into one router,
 * `dispatchLegacyGameplayCellBody` (`LegacyGameplayCellBodyDispatch.ts`).
 * This file deliberately does NOT import it directly (that would break this
 * file's own standalone-vm-transpile test) -- the real outer loop driver
 * bridges the two with a per-cell closure instead. CORRECTION (2026-08-25):
 * this WAS pending when written but is now done -- `LegacyRuntimeState.ts`'s
 * `onUnhandledCellBody` (see its own docblock, "wired (second pass, same
 * day)") calls `dispatchLegacyGameplayCellBody` exactly this way, with
 * `ai`/`ah` sourced from the driver's own loop scope.
 *
 * **Correction (2026-08-13, revised)**: this file used to treat `local2`
 * ("row pixel Y") as an unresolved per-cell value produced by the (then
 * unported) 225..1791 body. A first pass concluded it was a whole-method
 * CONSTANT (`-16`), based on a grep of every `istore_2` in `u()` finding
 * exactly one write. That grep methodology had a real gap: it missed
 * `iinc`, which does not go through `istore`. A follow-up grep for both
 * `istore_2` AND `iinc          2,` found a SECOND site: bytecode offset
 * 2124, `iinc 2, 16`, at the very end of every OUTER-loop (row) iteration,
 * right before `ai` itself increments. Tracing the exact sequencing (local2
 * starts at -16 when `ai=-1`, the loop's first iteration; each iteration's
 * `iinc` fires AFTER that iteration's inner loop completes, then `ai`
 * increments) gives the exact closed form **`local2 = ai * 16`** -- not a
 * constant at all, but the current OUTER-loop index (not the origin-
 * adjusted `row = ai+K`) scaled by tile height. Confirmed by two
 * independent derivations (direct offset arithmetic, and the general
 * closed-form check across several `ai` values) before touching any code.
 *
 * This means every already-shipped formula in
 * `LegacyGameplayPositiveEntityBranch.ts`, `LegacyGameplayNegativeEntityBranch.ts`,
 * `LegacyGameplayNegativeEntityBranchTail.ts`, and this file's own epilogue
 * that hardcoded a literal `-16` was WRONG for any row other than the
 * loop's first (`ai=-1`) -- all four were fixed together in the same pass
 * as this correction, threading a real `rowPixelBase = ai * 16` value
 * through `onUnhandledCellBody` and the dispatcher instead. This file
 * itself computes it directly from its own `ai` parameter, no callback
 * needed.
 */

export type LegacyGameplayCellLoopViewport = {
  /** f.O:B (#83) -- viewport column count. */
  readonly columns: number;
  /** f.P:B (#87) -- viewport row count. */
  readonly rows: number;
  /** f.I:B (#60) -- viewport column origin. */
  readonly originColumn: number;
  /** f.K:B (#68) -- viewport row origin. */
  readonly originRow: number;
  /** f.c:S (#254) -- map width in tiles. */
  readonly mapWidth: number;
  /** f.d:S (#266) -- map height in tiles. */
  readonly mapHeight: number;
  /**
   * f.A:B (#34) -- compared against the OUTER (row) loop variable `ai` for
   * the Z-byte write (bytecode offsets 2027..2053). Despite the name, this
   * is not confirmed to be a "camera column" -- kept as the raw field.
   */
  readonly zWriteAiTarget: number;
  /** f.y:B (#387) -- compared against the INNER (column) loop variable `ah`. */
  readonly zWriteAhTarget: number;
};

export type LegacyGameplayCellLoopState = {
  /** f.s:Z (#365). */
  sFlag: boolean;
  /** f.J:Z (#66). */
  jFlag: boolean;
  /** f.Z:B (#121) -- output only, written when the camera-center cell is visited. */
  zByte: number;
  /** f.c:[[B -- gridC, the same map grid tracked elsewhere. */
  readonly gridC: readonly Int8Array[];
  /** f.b:[[B -- gridB, the same map grid tracked elsewhere. */
  readonly gridB: readonly Int8Array[];
  /** f.g:[[B (#300) -- a distinct secondary per-cell byte grid, not yet
   *  aliased to anything else in this codebase. */
  readonly gridG: Int8Array[];
};

export type LegacyGameplayCellLoopCallbacks = {
  /** f.a(int,int) / LegacyOccupancyClass.legacyOccupancyClass. */
  readonly classifyOccupancy?: (x: number, y: number) => number;
  /**
   * private void a(int,byte) with arg2=1 -- f.o() calls the same method with arg2=0. It reads the
   * loop fields ah:I/ai:I for the cell, passed here.
   */
  readonly onMapMarkerArg1?: (value: number, ah: number, ai: number) => void;
  /**
   * private void i(int) -- fires when gridG[ai][ah] > 0, before it's
   * cleared. Fully ported as stepLegacySecondaryCellChain
   * (LegacySecondaryCellChain.ts); not imported directly here to keep this
   * file's own standalone-vm-transpile test working, same reasoning as
   * LegacyGameplayCellBodyDispatch.ts's split from this file.
   */
  readonly onSecondaryCell?: (value: number) => void;
  /**
   * private void b(int,int,int) -- the already-ported packed sprite/primitive
   * renderer (LegacyPackedSpriteRenderer), called directly here bypassing
   * the public f.a(III) wrapper. `type` 12 is the class-1 fog draw; `type`
   * 11 is the class-2 edge-softened fog draw.
   */
  readonly onPackedPrimitive?: (type: number, x: number, y: number) => void;
  /** private static void a(Graphics,IIII) fillRect -- the class-2 fully-hidden case. */
  readonly onFillHiddenTile?: (x: number, y: number) => void;
  /**
   * offsets 225..1791. Called once per cell whenever local4 !== 0 and the
   * local3<2 marker dispatch didn't apply. Dispatches to
   * stepLegacyPositiveEntityBranch / stepLegacyNegativeEntityBranch(+Tail)
   * by gridCValue's sign/range (see LegacyGameplayCellBodyDispatch.ts for
   * the actual routing). May report `ahDecrement` (1 when the positive
   * branch's "left neighbor" check consumed the next loop column, per
   * bytecode offsets 343..450) for the outer loop driver to apply.
   * `rowPixelBase` is bytecode local2 (`ai * 16`, confirmed via the
   * offset-2124 `iinc` -- see this file's header correction), the Y base
   * every entity-branch draw formula in that unported body needs.
   */
  readonly onUnhandledCellBody?: (
    columnTile: number,
    rowTile: number,
    columnPixelX: number,
    occupancyClass: number,
    gridCValue: number,
    gridBValue: number,
    rowPixelBase: number,
  ) => { ahDecrement: number; occupancyClass?: number } | undefined;
};

export type LegacyGameplayCellLoopResult = {
  /** False when the original bytecode would `goto 2054` immediately (bounds-check skip). */
  readonly handled: boolean;
  /**
   * 1 when `onUnhandledCellBody` reported the positive-entity branch's
   * "left neighbor" consumption (bytecode offsets 343..450) -- the outer
   * loop driver should decrement its own `ah` by this amount before the
   * next iteration. Always 0 otherwise.
   */
  readonly ahDecrement: number;
};

/**
 * One iteration of f.u()'s inner loop body for a single (column, row) tile,
 * bytecode offsets 33..2054 (excluding the 225..1791 body, see file header).
 */
export function stepLegacyGameplayCell(
  ah: number,
  ai: number,
  viewport: LegacyGameplayCellLoopViewport,
  state: LegacyGameplayCellLoopState,
  callbacks: LegacyGameplayCellLoopCallbacks = {},
): LegacyGameplayCellLoopResult {
  const row = ai + viewport.originRow;
  const column = ah + viewport.originColumn;
  if (row < 0 || row >= viewport.mapHeight || column < 0 || column >= viewport.mapWidth) {
    return { handled: false, ahDecrement: 0 };
  }

  const columnPixelX = ah * 22;
  let occupancyClass = callbacks.classifyOccupancy?.(column, row) ?? 0;
  if (state.sFlag && !state.jFlag) occupancyClass = 0;

  const gridCValue = state.gridC[row]?.[column] ?? 0;
  const gridBValue = (state.gridB[row]?.[column] ?? 0) & 0xff;

  let ahDecrement = 0;
  if (gridCValue !== 0) {
    if (
      occupancyClass < 2 &&
      ((gridBValue >= 180 && gridBValue <= 231) || gridBValue === 243)
    ) {
      callbacks.onMapMarkerArg1?.(gridBValue, ah, ai);
    } else {
      const result = callbacks.onUnhandledCellBody?.(
        column,
        row,
        columnPixelX,
        occupancyClass,
        gridCValue,
        gridBValue,
        ai * 16,
      );
      ahDecrement = result?.ahDecrement ?? 0;
      // A building cell re-derives local3 from its record (offsets 634..682).
      if (result?.occupancyClass !== undefined) occupancyClass = result.occupancyClass;
    }
  }

  // Epilogue, bytecode offsets 1791..1865: the i(int) call AND the g[][]
  // reset are BOTH gated by the same guard chain (ah in [0,columns), ai>=0,
  // g[ai][ah]>0) -- if any condition fails, bytecode jumps straight past
  // both (goto 1866), so the reset is not unconditional.
  if (
    ah >= 0 &&
    ah < viewport.columns &&
    ai >= 0 &&
    (state.gridG[ai]?.[ah] ?? 0) > 0
  ) {
    callbacks.onSecondaryCell?.(state.gridG[ai][ah]);
    state.gridG[ai][ah] = 0;
  }

  // f.u()'s local2 -- confirmed `ai * 16`, not a constant (see file header).
  const y = ai * 16;
  if (occupancyClass === 1) {
    callbacks.onPackedPrimitive?.(12, columnPixelX - 2, y - 4);
  } else if (occupancyClass === 2) {
    const isInteriorHidden =
      column !== 0 &&
      column !== viewport.mapWidth - 1 &&
      row !== 0 &&
      row !== viewport.mapHeight - 1 &&
      (callbacks.classifyOccupancy?.(column - 1, row) ?? 0) === 2 &&
      (callbacks.classifyOccupancy?.(column + 1, row) ?? 0) === 2 &&
      (callbacks.classifyOccupancy?.(column, row - 1) ?? 0) === 2 &&
      (callbacks.classifyOccupancy?.(column, row + 1) ?? 0) === 2;
    if (isInteriorHidden) {
      callbacks.onFillHiddenTile?.(columnPixelX, y);
    } else {
      callbacks.onPackedPrimitive?.(11, columnPixelX - 3, y - 2);
    }
  }

  if (ai === viewport.zWriteAiTarget && ah === viewport.zWriteAhTarget) {
    state.zByte = occupancyClass;
  }

  return { handled: true, ahDecrement };
}
