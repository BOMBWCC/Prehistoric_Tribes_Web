/**
 * Raw port of f.u()'s tail branch, bytecode/f-javap.txt offsets 1584..1791
 * (part of the larger 225..1791 body -- see
 * reverse-engineering/gameplay-paint-cluster.md). Reached when `id` is
 * outside both `[1,100]` (the positive-entity branch's range) and
 * `[-60,-1]` (LegacyGameplayNegativeEntityBranch's range), or via early
 * exits from that branch's own first three gates (offsets 528/535/555) --
 * in every path that reaches here, `occupancyClass` (local3) still holds
 * its *original* value, never reassigned by the negative branch's
 * section-1 switch.
 *
 * Re-derived directly from the raw bytecode (offsets 1584..1791) rather
 * than from an earlier summary of this branch, which had the first gate's
 * polarity backwards. The three sections are NOT a clean if/elseif chain
 * on occupancyClass -- each is its own gate with its own "goto 1791"
 * (epilogue) exit, and control can fall from one section into the next:
 *
 *  - offset 1584: `if (occupancyClass >= 1) goto 1652` -- i.e. the
 *    entity-action block below only runs when occupancyClass < 1 (in
 *    practice, ===0); occupancyClass>=1 skips straight past it.
 *  - offset 1652: `if (occupancyClass >= 2) goto 1684` -- the marker
 *    block only runs when occupancyClass < 2, and is reachable from BOTH
 *    the occupancyClass>=1 fallthrough above AND the occupancyClass<1
 *    path when the entity-id-range check at 1594 failed.
 *  - offset 1684: `if (occupancyClass !== 0) goto 1791` -- the final
 *    h-counter/sprite-draw/packed-primitive section only runs when
 *    occupancyClass is exactly 0.
 *
 * Net effect: occupancyClass>=2 never does anything in this tail (both
 * gates immediately route it to the epilogue) -- confirmed by reading the
 * bytecode directly rather than assumed, and kept as literally-translated
 * dead-looking code per this project's "never prune without proof" rule.
 */

export type LegacyNegativeEntityBranchTailState = {
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.b:[[B] (#242) -- gridB, the terrain/tile grid (distinct from gridC). */
  readonly gridB: readonly Int8Array[];
  /** f.h:I (#311) -- confirmed distinct from H:I (#58) by constant-pool index. */
  readonly hCounter: number;
  /** local1, `= ah*22`, the current cell's pixel column (from the caller). */
  readonly columnPixelX: number;
  /** local7 in f.u()'s bytecode -- the current cell's row (gridB row index). */
  readonly row: number;
  /** local8 in f.u()'s bytecode -- the current cell's column (gridB column index). */
  readonly column: number;
  /** f.ai:I (#199), the outer loop's row-scan index. */
  readonly ai: number;
  /** f.ah:I (#197), the outer loop's column-scan index. */
  readonly ah: number;
  /** bytecode local2, confirmed `ai * 16` (see LegacyGameplayCellLoop.ts's header correction). */
  readonly rowPixelBase: number;
};

export type LegacyNegativeEntityBranchTailCallbacks = {
  /** private void a(int,int,int,int,byte) (#443), same target the positive branch calls. */
  readonly onEntityAction?: (idx6: number, x: number, y: number, frame: number, record: number) => void;
  /** private void a(int,byte) with arg2=1. */
  readonly onMapMarkerArg1?: (value: number) => void;
  /** private void d(int,int,int,int) / LegacyZSubrecordDraw. */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
  /** private void a(int,int,int) (#439) / LegacyPackedSpriteRenderer, called directly. */
  readonly onPackedPrimitive?: (type: number, x: number, y: number) => void;
};

export function stepLegacyNegativeEntityBranchTail(
  id: number,
  occupancyClass: number,
  state: LegacyNegativeEntityBranchTailState,
  callbacks: LegacyNegativeEntityBranchTailCallbacks = {},
): void {
  // Offsets 1584..1651.
  if (occupancyClass < 1 && isLegacyEntityIdInRange101to122Local(id)) {
    const idx6 = id - 101;
    callbacks.onEntityAction?.(
      idx6,
      state.columnPixelX + (state.dense[9403 + idx6] ?? 0),
      state.rowPixelBase + (state.dense[9425 + idx6] ?? 0),
      state.dense[9491 + idx6] ?? 0,
      108,
    );
    return;
  }

  // Offsets 1652..1683.
  if (
    occupancyClass < 2 &&
    (isLegacyMarkerIdInRangeMinus110to61Local(id) || classifyLegacyMarkerIdLocal(id) === 3)
  ) {
    callbacks.onMapMarkerArg1?.(id);
    return;
  }

  // Offsets 1684..1791.
  if (occupancyClass !== 0) return;
  if (id > -114) return;
  if (id <= -117) return;

  // id in {-116, -115, -114}.
  if (state.hCounter >= 94 + state.ah && state.hCounter <= 100 + state.ah) {
    callbacks.onSpriteDraw?.(75, state.columnPixelX, state.rowPixelBase, state.hCounter - (100 + state.ah) + 6);
    return;
  }
  if ((state.hCounter + state.ah + state.ai) % 10 < 5) {
    callbacks.onPackedPrimitive?.(
      (state.gridB[state.row]?.[state.column] ?? 0) & 0xff,
      state.columnPixelX,
      state.rowPixelBase,
    );
  }
}

// Local duplicates of LegacyEntityClassifiers.ts's #532/#553/#554 so this
// module stays import-free like the rest of this codebase's ports; see
// that file for the canonical, independently-tested versions.
function isLegacyEntityIdInRange101to122Local(value: number): boolean {
  return value >= 101 && value <= 122;
}

function isLegacyMarkerIdInRangeMinus110to61Local(value: number): boolean {
  return value <= -61 && value >= -110;
}

function classifyLegacyMarkerIdLocal(value: number): number {
  if (value <= -111 && value >= -116) return 0;
  if (value <= -117 && value >= -122) return 1;
  if (value === -123) return 3;
  return 2;
}
