import { stepLegacySubsystemEntityMoveGate } from "./LegacySubsystemEntityMoveGate";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import { stepLegacySubsystemEntityTypeSettle } from "./LegacySubsystemEntityTypeSettle";
import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y, UNIT_FLAGS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING, T_TYPE_JOB } from "../../core/DataTables";

/**
 * Direct translation of `private void F()` (constant pool #242),
 * bytecode/b-javap.txt offsets 0..1415 (line 18599). Its only caller is
 * `D()` (`LegacySubsystemEntityMoveApply.ts`), for a unit whose
 * `dense[1313+id]` is -1 -- written by b.e() (`LegacyEntityESelection.ts`)
 * when the unit stands on its order target.
 *
 * RETRACTED (2026-09-14): this file used to call F() "100% UNREACHABLE"
 * because D() zeroed 1313 before the -1 check. That zero write is inside
 * D()'s `4545 >= 111` branch; the port had hoisted it. F() is the live path
 * by which a villager sent to a construction site joins it.
 *
 *  - 0..61: clear 202/303/3030, keep the high nibble of 1111.
 *  - 63..126: `if (6161 <= 1 && t39[type] == 1 && d(record))` -> 324, else
 *    129 (`d(int)` is `LegacySubsystemEntityMoveGate.ts`).
 *  - 129..323, revert to idle: 6161 1 -> 0; 8932 -= 1 unless the unit is
 *    the record's 8810 owner and the record is not an unfinished type-2 one;
 *    1313 = 0; reclaim its grid cell; P(); Q().
 *  - 324..511, join the record: f.h(id); 6161 = 0; target 3131/3232 = own
 *    cell; 1313 = -2; 1818 += 2; G() (work slot, 4646); push onto the
 *    record's worker list (4545 = 8993[rec]; 8993[rec] = id); b(record).
 *  - 515..706: unless `t27[type] & 128`, `a(id, 8627 == 0 ?
 *    t57[t174[rtype] + slot] : t59[t177[rtype] + slot])` -- the unit's new
 *    type (e.g. the builder).
 *  - 710..1148: unless (slot != t138[156+rtype] && (t138[156+rtype] >= 0 ||
 *    rtype == 2 || rtype == 3) && rtype < 12 && 8627 == 0): 6464 =
 *    t16[t17[2] + rtype] when `t42[t41[that]] == 0 && 8627 == 0`; then
 *    6262/6363 = the record's 8383/8444.
 *  - 1149..1245: if `7979 & 4` and (8627 != 0 || rtype != 8): 8871[rec] |= 2.
 *  - 1246..1414: 2929 = 8627 == 0 ? t172[t174[rtype] + slot] :
 *    t175[t177[rtype] + slot].
 *
 * `rtype` is `8749[4444[id]]` and `slot` is `4646[id]`, both re-read at
 * each use exactly as the bytecode does (a() runs in between).
 */
export type LegacySubsystemEntityMoveCancelInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly id: number;
  /** b.m:B (#202), game.subsystemMByte -- read by d(int) after a(int,int,boolean). */
  readonly readM: () => number;
  /** b's own u:I (#222) -- game.bTeam, read by b(byte). */
  readonly uInt: number;
  /** `a(int,byte)` (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** Forwarded into d(int)'s own onEntityTransform -- see LegacySubsystemEntityMoveGate.ts. */
  readonly onEntityTransform?: (arg1: number, arg2: number, flag: boolean) => void;
  /** `f.h(int)` (#390): `f(id); e(id);`. */
  readonly onSelectionRelease: (id: number) => void;
  /** `G()` (#243), `LegacySubsystemEntityTrainingSlot.ts`. */
  readonly onTrainingSlot: (id: number) => void;
};

export function stepLegacySubsystemEntityMoveCancel(input: LegacySubsystemEntityMoveCancelInput): void {
  const { state, packedBytes, packedOffsets, gridC, id } = input;

  state[UNIT_OFFSET_X + id] = 0;
  state[UNIT_OFFSET_Y + id] = 0;
  state[3030 + id] = 0;
  state[1111 + id] = (state[1111 + id] ?? 0) & 240;

  const mode = state[UNIT_ORDER + id] ?? 0;
  const type = state[UNIT_TYPE + id] ?? 0;
  if (mode <= 1 && (packedBytes[(packedOffsets[39] ?? 0) + type] ?? 0) === 1 &&
      stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, state[UNIT_RECORD + id] ?? 0, id, input.readM, {
        onEntityTransform: input.onEntityTransform,
      })) {
    joinRecord(input);
    return;
  }

  if (mode === 1) state[UNIT_ORDER + id] = 0;

  // Offsets 161..266: `8810 != v` jumps straight to the decrement.
  const record = state[UNIT_RECORD + id] ?? 0;
  if ((state[BLD_OWNER + record] ?? 0) !== id ||
      ((state[BLD_KIND + record] ?? 0) === 2 && (state[BLD_WORK + record] ?? 0) === 0)) {
    state[BLD_WORKERS + record] = (state[BLD_WORKERS + record] ?? 0) - 1;
  }

  state[UNIT_TIMER + id] = 0;
  const row = gridC[state[UNIT_Y + id] ?? 0];
  if (row) row[state[id] ?? 0] = id;

  stepLegacySubsystemEntityRevertIdle(state, id);
  stepLegacySubsystemEntityTypeSettle(state, id, input.onChangeType);
}

/** F() offsets 324..1415. */
function joinRecord(input: LegacySubsystemEntityMoveCancelInput): void {
  const { state, packedBytes, packedOffsets, id } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;
  const rec = () => state[UNIT_RECORD + id] ?? 0;
  const rtype = () => state[BLD_KIND + rec()] ?? 0;
  const building = () => (state[BLD_WORK + rec()] ?? 0) !== 0;
  const slot = () => state[UNIT_SLOT + id] ?? 0;

  input.onSelectionRelease(id);
  state[UNIT_ORDER + id] = 0;
  state[UNIT_TARGET_X + id] = state[id] ?? 0;
  state[UNIT_TARGET_Y + id] = state[UNIT_Y + id] ?? 0;
  state[UNIT_TIMER + id] = -2;
  state[1818 + id] = (state[1818 + id] ?? 0) + 2;
  input.onTrainingSlot(id);
  state[UNIT_NEXT_WORKER + id] = state[BLD_WORKER_HEAD + rec()] ?? 0;
  state[BLD_WORKER_HEAD + rec()] = id;
  stepLegacySubsystemRecordWorkerLevel(state, rec(), input.uInt);

  if ((table(27, state[UNIT_TYPE + id] ?? 0) & 128) === 0) {
    input.onChangeType(id, building()
      ? table(59, table(177, rtype()) + slot())
      : table(57, table(174, rtype()) + slot()));
  }

  const column6 = table(T_BUILDING, 156 + rtype());
  const skipTarget = slot() !== column6 &&
    (column6 >= 0 || rtype() === 2 || rtype() === 3) &&
    rtype() < 12 && !building();
  if (!skipTarget) {
    const target = table(16, table(17, 2) + rtype());
    if (table(42, table(T_TYPE_JOB, target)) === 0 && !building()) state[UNIT_JOB_TYPE + id] = target;
    state[UNIT_HOME_X + id] = state[BLD_X + rec()] ?? 0;
    state[UNIT_HOME_Y + id] = state[BLD_Y + rec()] ?? 0;
  }

  if (((state[UNIT_FLAGS + id] ?? 0) & 4) !== 0 && (building() || rtype() !== 8)) {
    state[8871 + rec()] = (state[8871 + rec()] ?? 0) | 2;
  }

  state[UNIT_MODE + id] = building()
    ? table(175, table(177, rtype()) + slot())
    : table(172, table(174, rtype()) + slot());
}

/**
 * `private void b(byte)` (constant pool #341), bytecode/b-javap.txt offsets
 * 0..215 (line 19934). `M:I` (#35) is only ever read here, so it is a local.
 * Callers: F() and x().
 */
export function stepLegacySubsystemRecordWorkerLevel(state: Int8Array, record: number, u: number): void {
  state[8688 + record] = 5;
  if (u !== 0 || (state[BLD_KIND + record] ?? 0) !== 11) return;
  for (let m = state[BLD_WORKER_HEAD + record] ?? 0; m > 0; m = state[UNIT_NEXT_WORKER + m] ?? 0) {
    if ((state[UNIT_VISION + m] ?? 0) + 3 > ((state[8688 + record] ?? 0) & 15)) {
      state[8688 + record] = ((state[8688 + record] ?? 0) & 240) + (state[UNIT_VISION + m] ?? 0) + 3;
    }
    if ((state[UNIT_SCOUT_SKILL + m] ?? 0) > ((state[8688 + record] ?? 0) >> 4)) {
      state[8688 + record] = ((state[8688 + record] ?? 0) & 15) + ((state[UNIT_SCOUT_SKILL + m] ?? 0) << 4);
    }
  }
}
