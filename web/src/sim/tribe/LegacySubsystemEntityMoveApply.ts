import { stepLegacySubsystemEntityAnimOffset } from "./LegacySubsystemEntityAnimOffset";
import { UNIT_DIRECTION, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_TIMER, UNIT_Y } from "../../core/DenseLayout";

/**
 * Direct translation of `private void D()` (constant pool #240),
 * bytecode/b-javap.txt offsets 0..738 (line 17758). Real movement-animation
 * application -- no confirmed-null field involved. Calls `E()`
 * unconditionally first (gets back the same `w`/`L` scratch `E()` computed),
 * then:
 *  - offset 4..49: if the "mid-cycle" test matches AND `dense[4848+id]!==120`,
 *    clears the current grid cell, applies a saved-position restore on
 *    `dense[4545+id] <= -111`; then `if (dense[4545+id] >= 111) { negate it;
 *    dense[1313+id] = 0; }` (offsets 175..223 -- `if_icmplt 224` at 189
 *    skips BOTH writes); then `if (dense[1313+id] === -1) { F(); return; }`
 *    (224..245). F() (#242, `LegacySubsystemEntityMoveCancel.ts`) is how a
 *    unit arriving at its order target (b.e() writes 1313 = -1) joins the
 *    target record's worker list.
 *    RETRACTED (2026-09-14): this port used to do the 1313 write outside
 *    the `>= 111` branch and, from that, declared F() "100% UNREACHABLE" --
 *    so a villager sent to a construction site never became a builder.
 *    Past the check, applies the 8-direction delta table (`packedOffsets[1]+dense[606+id]`
 *    for dx, `+8` for dy) to `dense[0+id]`/`dense[101+id]` and re-places
 *    the entity in `gridC`.
 *  - offset 366..738 (only when `dense[4848+id]===120`): a second sub-pixel
 *    correction pass on `dense[202+id]`/`dense[303+id]` using the same
 *    packed-table shape as `E()`'s own tail.
 *
 * Real callers: `u()` (`LegacySubsystemEntityUpdateTail.ts`) and `a(byte):V`
 * -- the latter is confirmed unreachable dead code (see
 * `LegacySubsystemEntityPathStep.ts`'s docblock), so `u()` is the only live
 * caller.
 */
export type LegacySubsystemEntityMoveApplyInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly id: number;
  readonly onF: () => void;
};

export function stepLegacySubsystemEntityMoveApply(input: LegacySubsystemEntityMoveApplyInput): void {
  const { state, packedBytes, packedOffsets, gridC, id } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;

  const { w, l } = stepLegacySubsystemEntityAnimOffset(state, packedBytes, packedOffsets, id);
  const cycleLen = table(15, w * 9 + l);
  const midCycle = ((state[1111 + id] ?? 0) & 15) === (cycleLen + 1) >> 1;

  if (midCycle && (state[4848 + id] ?? 0) !== 120) {
    const row = gridC[state[UNIT_Y + id] ?? 0];
    if (row) row[state[id] ?? 0] = 0;

    const saved = state[UNIT_NEXT_WORKER + id] ?? 0;
    if (saved <= -111) {
      const row2 = gridC[state[UNIT_Y + id] ?? 0];
      if (row2) row2[state[id] ?? 0] = saved;
      state[UNIT_NEXT_WORKER + id] = 0;
    }
    if ((state[UNIT_NEXT_WORKER + id] ?? 0) >= 111) {
      state[UNIT_NEXT_WORKER + id] = -(state[UNIT_NEXT_WORKER + id] ?? 0);
      state[UNIT_TIMER + id] = 0;
    }

    if ((state[UNIT_TIMER + id] ?? 0) === -1) {
      input.onF();
      return;
    }

    state[id] = (state[id] ?? 0) + table(1, state[UNIT_DIRECTION + id] ?? 0);
    state[UNIT_Y + id] = (state[UNIT_Y + id] ?? 0) + table(1, 8 + (state[UNIT_DIRECTION + id] ?? 0));
    const row3 = gridC[state[UNIT_Y + id] ?? 0];
    if (row3) row3[state[id] ?? 0] = id;
  }

  if ((state[4848 + id] ?? 0) !== 120) return;

  const beforeMidCycle = ((state[1111 + id] ?? 0) & 15) < (cycleLen + 1) >> 1;
  if (beforeMidCycle) {
    const xDelta = table(1, state[UNIT_DIRECTION + id] ?? 0);
    state[UNIT_OFFSET_X + id] = (state[UNIT_OFFSET_X + id] ?? 0) - xDelta * 22;
    const yDelta = table(1, 8 + (state[UNIT_DIRECTION + id] ?? 0));
    state[UNIT_OFFSET_Y + id] = (state[UNIT_OFFSET_Y + id] ?? 0) - yDelta * 16;
  }

  const frameLow = (state[1111 + id] ?? 0) & 15;
  state[UNIT_OFFSET_X + id] = (state[UNIT_OFFSET_X + id] ?? 0)
    + table(9 + w, table(12 + w * 2, l) + frameLow) * table(2, state[UNIT_DIRECTION + id] ?? 0);
  state[UNIT_OFFSET_Y + id] = (state[UNIT_OFFSET_Y + id] ?? 0)
    + table(11 + w * 2, table(12 + w * 2, l) + frameLow) * table(2, 8 + (state[UNIT_DIRECTION + id] ?? 0));
}
