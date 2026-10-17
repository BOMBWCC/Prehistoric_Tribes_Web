import { RES_KIND, UNIT_DIRECTION, UNIT_FLAGS, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y } from "../core/DenseLayout";
/**
 * Raw port of f.u()'s positive-entity-id branch, bytecode/f-javap.txt
 * offsets 225..522 (part of the larger 225..1791 body, see
 * reverse-engineering/gameplay-paint-cluster.md). Entered when the caller
 * has already confirmed `occupancyClass===0` and `gridCValue` (the entity
 * id) is in `[1,100]`.
 *
 * All paths through this branch end with `goto 1791` (the shared cell
 * epilogue in `LegacyGameplayCellLoop.ts`) -- this function always returns
 * normally, callers should proceed to the epilogue afterward regardless of
 * what happened here.
 *
 * One real side effect on the caller's loop state: bytecode offsets
 * 343..450 (the "left neighbor" check) can decrement the loop's own `ah`
 * field before re-issuing a marker draw at the new column -- reported back
 * via the returned `ahDecrement` count (0 or 1) rather than mutated
 * directly, since this module has no loop of its own.
 */

export type LegacyPositiveEntityBranchState = {
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.c:[[B] -- gridC, the same map grid tracked elsewhere. */
  readonly gridC: readonly Int8Array[];
  /** f.s:Z (#365). */
  readonly sFlag: boolean;
  /** f.ao:B (#212). */
  readonly ao: number;
  /** f.O:B (#83). */
  readonly columns: number;
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.g:[[B] (#300) -- gridG, the same secondary grid LegacyGameplayCellLoop tracks. */
  readonly gridG: Int8Array[];
};

export type LegacyPositiveEntityBranchCallbacks = {
  /** private void a(int,byte) with arg2=1 -- same boundary as LegacyGameplayCellLoop's onMapMarkerArg1. */
  readonly onMapMarkerArg1?: (value: number) => void;
  /**
   * private void a(int,int,int,int,byte) (constant pool #443, 4 ints + a
   * byte). Not ported/confirmed anywhere else in this codebase yet.
   */
  readonly onEntityAction?: (id: number, x: number, y: number, arg4: number, arg5: number) => void;
};

export type LegacyPositiveEntityBranchResult = {
  /** 1 if the left-neighbor check decremented the caller's `ah`, else 0. */
  readonly ahDecrement: number;
};

// Local copies of two of LegacyEntityClassifiers.ts's classifiers (#553,
// #554), duplicated rather than imported so this module stays a
// standalone, transpile-safe file like the rest of this codebase's ports;
// see LegacyEntityClassifiers.ts for the canonical, independently-tested
// versions and their bytecode provenance.
function classifyLegacyMarkerId(value: number): number {
  if (value <= -111 && value >= -116) return 0;
  if (value <= -117 && value >= -122) return 1;
  if (value === -123) return 3;
  return 2;
}
function isLegacyMarkerIdInRangeMinus110to61(value: number): boolean {
  return value <= -61 && value >= -110;
}
function classifyLegacyPositiveEntity(value: number): number {
  if (value >= 1 && value <= 50) return 0;
  if (value >= 51 && value <= 100) return 1;
  return 2;
}

export function stepLegacyPositiveEntityBranch(
  id: number,
  columnPixelX: number,
  row: number,
  column: number,
  ai: number,
  ah: number,
  /** bytecode local2, confirmed `ai * 16` (see LegacyGameplayCellLoop.ts's header). */
  rowPixelBase: number,
  state: LegacyPositiveEntityBranchState,
  callbacks: LegacyPositiveEntityBranchCallbacks = {},
): LegacyPositiveEntityBranchResult {
  // Offset 243..256: static '#'-equivalent early skip.
  if (state.sFlag && state.ao === 9) return { ahDecrement: 0 };

  // Offset 259..291: two re-reads of the same classifier on the same value.
  const markerValue = state.dense[UNIT_NEXT_WORKER + id] ?? 0;
  if (classifyLegacyMarkerId(markerValue) !== 2) {
    callbacks.onMapMarkerArg1?.(markerValue);
  }
  if (classifyLegacyMarkerId(markerValue) !== 2) {
    if ((state.dense[UNIT_MODE + id] ?? 0) > 14) return { ahDecrement: 0 };
  }

  // Offset 327..452: left-neighbor check, can consume an extra column.
  let ahDecrement = 0;
  if (ai >= 0 && ah - 1 >= 0) {
    const leftNeighbor = state.gridC[row]?.[column - 1] ?? 0;
    const tableVal = state.dense[RES_KIND - leftNeighbor - 61] ?? 0;
    if (tableVal === 5 && isLegacyMarkerIdInRangeMinus110to61(leftNeighbor)) {
      if (ah < state.columns && state.gridG[ai]) state.gridG[ai][ah] = 0;
      ahDecrement = 1;
      const newAh = ah - 1;
      const newColumn = newAh + state.originColumn;
      callbacks.onMapMarkerArg1?.(state.gridC[row]?.[newColumn] ?? 0);
    }
  }

  // Offset 453..475: only gates when id is in the classifier's upper half (51..100).
  if (classifyLegacyPositiveEntity(id) !== 0) {
    if (((state.dense[UNIT_FLAGS + id] ?? 0) & 2) !== 0) return { ahDecrement };
  }

  // Offset 477..522.
  callbacks.onEntityAction?.(
    id,
    columnPixelX + (state.dense[UNIT_OFFSET_X + id] ?? 0),
    rowPixelBase + (state.dense[UNIT_OFFSET_Y + id] ?? 0),
    state.dense[UNIT_DIRECTION + id] ?? 0,
    29,
  );

  return { ahDecrement };
}
