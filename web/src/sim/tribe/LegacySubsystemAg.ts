import { ANIMAL_DEST_X, ANIMAL_DEST_Y, ANIMAL_HIT_BY, ANIMAL_KIND, ANIMAL_TARGET, ANIMAL_X, ANIMAL_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private void ag()` (constant pool #314),
 * bytecode/b-javap.txt offsets 0..918 (`grep -n "private void ag();"` ->
 * line 40986). `af()`'s own tail call (`LegacySubsystemAf.ts`, `onAg`),
 * operating on the same 22-slot `dense[9xxx+v]` scratch region.
 *
 * **CORRECTION (2026-09-07)**: the task framing that handed off this site
 * described "the field" for all four 2026-09-04 RETRACTED-PREMISE sites as
 * `b.b:[S]`(#132)/saveOffsets. That is wrong for THIS file specifically --
 * this method never reads `b:[S]` at all. Its own RETRACTED-PREMISE marker
 * was always about a DIFFERENT field, `b:[[[B]`(#134, class b's own 3D
 * byte array, NOT the already-confirmed-null `a:[[[B]`#70) -- confirmed by
 * direct read of the marker and the surrounding docblock (both predate
 * this handoff). Re-verified here: `b:[[[B]`(#134) has zero `putfield`
 * sites inside class b itself, but IS allocated cross-class by
 * `f.g()` (`f-javap.txt:1254`, offset 457, `putfield #239 // Field
 * b.b:[[[B`, `new byte[2][22][5]`, confirmed the SAME field via class b's
 * own single `byte[][][] b;` declaration) -- exactly the "class e/f.g()
 * owns allocation" pattern this session's 2026-09-04 sweep found 11 other
 * instances of. This port already has the allocation modeled (unused
 * until now) as `LegacySubsystemArrays.b`.
 *
 * Gated on `dense[9711+v] < dense[9689+v]` (re-evaluated AFTER a real
 * update to both fields, not the same read twice), reaches offset 365 --
 * NOT a crash. Full derivation of that branch (offset 365..757, replacing
 * the previous crash stub):
 *
 *  - Reads a candidate cell's column/row from the (previously never-read)
 *    `b:[[[B]`(#134) cube at `[0][v][dense[9711+v]]`/`[1][v][dense[9711+v]]`
 *    (`candidateCells` param below) and looks it up in `gridC`
 *    (`b:[[B]`#129, class b's own constructor-aliased copy of `f.c:[[B]`,
 *    the SAME `gridC` used throughout this project -- CONFIRMED via
 *    `final void a(f)`'s own `putfield #129 // Field b:[[B` from
 *    `getfield #140 // Field f.c:[[B`, a THIRD field alias distinct from
 *    both `b:[[[B]`#134 above and the already-known `b:[S]`#132/saveOffsets
 *    alias -- three different "b"-named fields in this one method, a live
 *    instance of the twin-field trap this investigation was warned about).
 *  - If that gridC cell is already occupied (nonzero): resets
 *    `dense[9689+v]=dense[9711+v]=0`, re-runs the throttle reset
 *    (`dense[9557+v]=10+dense[9535+v]; dense[9579+v]=0`), and returns.
 *  - If free: derives an 8-direction code from the delta between the
 *    candidate cell and the entity's own position
 *    (`dense[9359+v]`/`dense[9381+v]`) via a 3x3 flattened lookup
 *    (`packedOffsets[4] + (colDelta+1)*3 + (rowDelta+1)`, assuming the
 *    delta is one of the 9 combinations of {-1,0,1} -- guaranteed by the
 *    candidate list's own producer, not re-checked here), stores that
 *    code into `dense[9491+v]`, enters the WALKING animation
 *    (`dense[9557+v] = 2 + dense[9535+v]`, offset 607..635 -- the only
 *    write in the class that brings `9557` to <= 7, which is `ah()`'s own
 *    entry condition), provisionally
 *    claims the new gridC cell (`= -128`, via the SAME
 *    `packedOffsets[1]`/8-direction delta table `LegacySubsystemAh.ts`
 *    already reads), advances the candidate cursor
 *    (`dense[9711+v] += 1`), and resets `dense[9447+v]`.
 *
 * Earlier real structure (unchanged from before this correction):
 *  1. `Math.trunc(z.value/10) - (dense[9601+v]!==0?1:0) <= 0`: a
 *     self-contained tail (never reaches the branch above) that resets
 *     `dense[9579+v]`, conditionally calls `ai()`
 *     (`LegacySubsystemAi.ts`), advances or clears `dense[9447+v]`, and
 *     recomputes `dense[9491+v] = z.value % 10` (note: the SAME dense slot
 *     the branch above uses for a direction code -- two different
 *     meanings at two different times, not a conflict since the two paths
 *     are mutually exclusive within one call).
 *  2. Otherwise: gated on `dense[9711+v] >= dense[9689+v]` (the first
 *     read), a real block resets `dense[9689/9711+v]` to `0`, calls the
 *     unresolved `a(int,int,int,int,int,int):byte` (#268, `onFinishBucketAssign`
 *     -- likely itself a guaranteed throw via a DIFFERENT permanently-null
 *     3D field, `e:[[[B]`#161, not derived here per this investigation's
 *     "leave downstream helpers as callbacks" scope) storing its result
 *     back into `dense[9689+v]`, and conditionally calls the unresolved
 *     `e(boolean)`(#376, `onAnimReset`, `false`) when that result is `0`
 *     and `subsystemBLocalFlags[2]` is set. A throttle-reset
 *     (`dense[9557+v]=10+dense[9535+v]`, `dense[9579+v]=0`) then runs
 *     unless `(dense[9557+v]&255)<=7 && dense[9711+v]<dense[9689+v]`.
 *
 * **Wiring bug found and fixed alongside this correction**: the `onAg`
 * call site in `LegacyRuntimeState.ts` passed `zValue:
 * this.denseState[234] ?? 0` -- reading dense-array position 234, which
 * has nothing to do with this method's actual `z:I`(#234) argument. `z:I`
 * is class b's own scalar `int` field (`int z;`, b-javap.txt line 136,
 * NOT part of the `dense`/`f.e:[B` array), already modeled as
 * `LegacyGameState.subsystemEntityZ` (see that field's own docblock).
 * Fixed to read `this.game.subsystemEntityZ`.
 */
export type LegacySubsystemAgInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly localFlags: readonly boolean[];
  readonly gridC: readonly Int8Array[];
  /** b's own b:[[[B] (#134), f.g()-allocated `new byte[2][22][5]` -- LegacySubsystemArrays.b. [0]=column list, [1]=row list, per-slot (22), up to 5 queued candidates. */
  readonly candidateCells: readonly (readonly Int8Array[])[];
  readonly slot: number;
  readonly frame: number;
  readonly zValue: number;
  /** private void ai() -- LegacySubsystemAi.ts. */
  readonly onAi: () => void;
  /** private byte a(int,int,int,int,int,int) (#268) -- confirmed real call, not derived (likely itself a guaranteed throw via e:[[[B]#161, a separate permanently-null field). */
  readonly onFinishBucketAssign?: (a1: number, a2: number, a3: number, a4: number, a5: number, a6: number) => number;
  /** private void e(boolean) (#376) -- same unresolved method af() also leaves as onAnimReset. */
  readonly onAnimReset?: (flag: boolean) => void;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

export function stepLegacySubsystemAg(input: LegacySubsystemAgInput): void {
  const { state, packedBytes, packedOffsets, gridC, candidateCells, slot: v } = input;

  const gate1 = Math.trunc(input.zValue / 10) - ((state[ANIMAL_TARGET + v] ?? 0) !== 0 ? 1 : 0);

  if (gate1 <= 0) {
    if (!(((state[9557 + v] ?? 0) & 0xff) > 7)) {
      state[9579 + v] = 0;
    }
    if ((state[9579 + v] ?? 0) !== 0) return;

    if ((state[ANIMAL_HIT_BY + v] ?? 0) === 0) {
      input.onAi();
    }
    if ((state[ANIMAL_TARGET + v] ?? 0) === 0 && (state[ANIMAL_HIT_BY + v] ?? 0) < 19) {
      state[ANIMAL_HIT_BY + v] = (state[ANIMAL_HIT_BY + v] ?? 0) + 1;
      return;
    }
    state[ANIMAL_HIT_BY + v] = 0;
    state[9491 + v] = input.zValue % 10;
    return;
  }

  if ((state[9711 + v] ?? 0) >= (state[9689 + v] ?? 0)) {
    const period = table(packedBytes, packedOffsets, 179, state[ANIMAL_KIND + v] ?? 0);
    // Same JS/Java `%`-by-zero divergence noted in LegacySubsystemAf.ts.
    const reachAssign = (period !== 0 && input.frame % period === 0) || (state[ANIMAL_TARGET + v] ?? 0) !== 0;
    if (reachAssign) {
      state[9689 + v] = 0;
      state[9711 + v] = 0;
      const result = input.onFinishBucketAssign?.(
        state[ANIMAL_Y + v] ?? 0,
        state[ANIMAL_X + v] ?? 0,
        state[ANIMAL_DEST_Y + v] ?? 0,
        state[ANIMAL_DEST_X + v] ?? 0,
        0,
        101,
      ) ?? 0;
      state[9689 + v] = result;
      if (result === 0 && input.localFlags[2]) {
        input.onAnimReset?.(false);
      }
    }

    const doReset = (((state[9557 + v] ?? 0) & 0xff) > 7) || ((state[9711 + v] ?? 0) >= (state[9689 + v] ?? 0));
    if (doReset) {
      state[9557 + v] = 10 + (state[ANIMAL_KIND + v] ?? 0);
      state[9579 + v] = 0;
    }
  }

  if ((state[9711 + v] ?? 0) < (state[9689 + v] ?? 0)) {
    const cursor = state[9711 + v] ?? 0;
    const candCol = candidateCells[0]?.[v]?.[cursor] ?? 0;
    const candRow = candidateCells[1]?.[v]?.[cursor] ?? 0;

    if ((gridC[candRow]?.[candCol] ?? 0) !== 0) {
      // Candidate cell already occupied: bail, resetting both the
      // bucket cursor/limit and the throttle (offset 424..496).
      state[9689 + v] = 0;
      state[9711 + v] = 0;
      state[9557 + v] = 10 + (state[ANIMAL_KIND + v] ?? 0);
      state[9579 + v] = 0;
      return;
    }

    // Candidate cell is free (offset 497..757): derive an 8-direction
    // code from the delta between the candidate cell and the entity's
    // own position, provisionally claim the cell (-128), and advance
    // the cursor.
    const originCol = state[ANIMAL_X + v] ?? 0;
    const originRow = state[ANIMAL_Y + v] ?? 0;
    const dirIndex = (candCol - originCol + 1) * 3 + (candRow - originRow + 1);
    const dirCode = table(packedBytes, packedOffsets, 4, dirIndex);
    state[9491 + v] = dirCode;

    // BUG FIX (2026-09-22): offset 619 is `iconst_2`, not `bipush 10` -- this
    // write is `2 + kind`, the WALKING animation, not the `10 + kind` idle
    // reset the two bail-out branches above use. It is the only write in the
    // whole class that puts `9557` at or below 7, and `ah()` (the method that
    // actually steps the animal across the grid) returns immediately unless
    // `(9557 & 255) <= 7`. With `10 + kind` here nothing ever entered the
    // walking state, so animals picked destinations and never moved.
    state[9557 + v] = 2 + (state[ANIMAL_KIND + v] ?? 0);

    const newRow = originRow + table(packedBytes, packedOffsets, 1, 8 + dirCode);
    const newCol = originCol + table(packedBytes, packedOffsets, 1, dirCode);
    const row = gridC[newRow];
    if (row) row[newCol] = -128;

    state[9711 + v] = (state[9711 + v] ?? 0) + 1;
    state[ANIMAL_HIT_BY + v] = 0;
  }
}
