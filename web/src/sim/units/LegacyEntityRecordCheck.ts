import { stepLegacySubsystemEntityMoveGate } from "../tribe/LegacySubsystemEntityMoveGate";
import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, UNIT_RECORD, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";

/**
 * Raw port of `private boolean c(int)` (#359), bytecode/b-javap.txt line
 * 15301, offsets 0..395. Called by b.e() (`LegacyEntityESelection.ts`) with
 * the unit's record when the unit stands on its work cell.
 *
 *  - 0..13: `if (!d(rec)) { Q(); return false; }` -- `d(int)` is
 *    `LegacySubsystemEntityMoveGate.ts`.
 *  - 16..99: `s = 8627 == 0 ? t138[(9115-1)*26 + type] : t138[494 + type]`.
 *  - 103..262: `s -= 1` when `(t138[156+type] > -1 || 8627 != 0)`, the
 *    owner `8810` is > 0 and not this unit, and the owner still stands on
 *    its own cell or belongs to another record.
 *  - 266..374: a type-51 unit returns true only for an owner of type 57
 *    with `1313 >= 1`, `8932 == 1` and `9237 == 0`.
 *  - 376..395: `return s > 8932`.
 *
 * `s:B` (#218) is read and written only here, so it is a local.
 * CORRECTED 2026-09-14: this used a separate d(int) copy
 * (LegacyEntityRecordProbeGate.ts, deleted) that read the threshold from
 * `packedOffsets[182]`, inverted its `>=`, and compared `t41[2929]` with
 * `t41[record type]`; the column-6 read, the decrement condition and the
 * type-51 fall-through were wrong too, and Q() was never called.
 */
export type LegacyEntityRecordCheckInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  readonly record: number;
  /** b.b[row][column] lookup used by the owner-cell comparison. */
  readonly readCell: (row: number, column: number) => number;
  /** b.m:B (#202), read by d(int) after its a(int,int,boolean) call. */
  readonly readM: () => number;
  /** a(int,int,boolean) (#273). */
  readonly onEntityTransform?: (x: number, y: number, flag: boolean) => void;
  /** b.Q() (#253). */
  readonly onQ: () => void;
};

export function checkLegacyEntityRecord(input: LegacyEntityRecordCheckInput): boolean {
  const { state, packedBytes, packedOffsets, entityId: id, record } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;

  if (!stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, record, id, input.readM, {
    onEntityTransform: input.onEntityTransform,
  })) {
    input.onQ();
    return false;
  }

  const type = state[BLD_KIND + record] ?? 0;
  const building = (state[BLD_WORK + record] ?? 0) !== 0;
  let s = building
    ? table(T_BUILDING, 494 + type)
    : table(T_BUILDING, ((state[BLD_LEVEL + record] ?? 0) - 1) * 26 + type);

  const owner = state[BLD_OWNER + record] ?? 0;
  if ((table(T_BUILDING, 156 + type) > -1 || building) && owner > 0 && owner !== id &&
      (input.readCell(state[UNIT_Y + owner] ?? 0, state[owner] ?? 0) === owner ||
       (state[UNIT_RECORD + owner] ?? 0) !== record)) {
    s = (s - 1) << 24 >> 24;
  }

  if ((state[UNIT_TYPE + id] ?? 0) === 51) {
    return owner >= 1 &&
      (state[UNIT_TYPE + owner] ?? 0) === 57 &&
      (state[UNIT_TIMER + owner] ?? 0) >= 1 &&
      (state[BLD_WORKERS + record] ?? 0) === 1 &&
      (state[BLD_PLANNED_KIND + record] ?? 0) === 0;
  }
  return s > (state[BLD_WORKERS + record] ?? 0);
}
