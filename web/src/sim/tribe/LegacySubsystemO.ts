import { BLD_OWNER, BLD_X, BLD_Y, UNIT_HOME_X, UNIT_HOME_Y, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void O()` (#251), bytecode/b-javap.txt line 28208, offsets
 * 0..929. N()'s fallback for a unit on its own cell that is not a
 * gatherer/soldier/courier type: pick where it goes next.
 *
 *  - 0..121, types 69/80/84/85: target = own cell.
 *  - 122..463, types 94..97: slot `aO` of f.b[u][0] holding 4040 (an
 *    exhausted scan reads index 30 and throws). f.b[u][2][aO] < 0 -> ap().
 *    Type 97: target = (f.b[u][2][aO], f.b[u][3][aO]), g(2). Otherwise the
 *    unit follows unit `t = f.b[u][2][aO]`: target = t's cell, 4747 = 4444 = t.
 *  - 464..717, type 27: for each work order `aN` whose record f.a[u][aN][11]
 *    is owned by this unit, the f.f entry for that record with
 *    f.f[1] == f.a[u][aN][10] + 14 gives the target, then g(2). The first
 *    owned order ends the method either way.
 *  - 718..898, `t27[type] & 64`: target = the record 3434's corner for
 *    type 65, else 6262/6363; g(2).
 *  - 899..929: a(6) -- the nearest store, e.g. for a carrier -- ? g(2) :
 *    4444 = -6.
 *
 * CORRECTED 2026-09-15: this replaces three partial ports that fell through
 * from the bit-64 branch into a(6), never called g(2) for type 97 or after
 * the bit-64 branch, and kept scanning type 27's orders past the first
 * owned one.
 */
export type LegacySubsystemOInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.b:[[[B (#139) -- game.xSlotTable, [team][5][30]. */
  readonly xSlots: readonly (readonly Int8Array[])[];
  /** f.a:[[[B (#74) -- mainArrays.aByte3, [team][10][12]. */
  readonly orders: readonly (readonly Int8Array[])[];
  /** f.f:[[B (#173) -- mainArrays.f4, [4][30]. */
  readonly fRows: readonly Int8Array[];
  /** ap() (#323). */
  readonly onAp: () => void;
  /** final boolean a(int) (#288). */
  readonly onA: (kind: number) => boolean;
  /** g(int) (#384). */
  readonly onG: (argument: number) => void;
};

export function stepLegacySubsystemO(input: LegacySubsystemOInput): void {
  const { state, id: v, team: u } = input;
  const type = state[UNIT_TYPE + v] ?? 0;

  if (type === 69 || type === 80 || type === 84 || type === 85) {
    state[UNIT_TARGET_X + v] = state[v] ?? 0;
    state[UNIT_TARGET_Y + v] = state[UNIT_Y + v] ?? 0;
    return;
  }

  if (type >= 94 && type <= 97) {
    const slots = input.xSlots[u]!;
    let aO = 0;
    while (aO < 30 && (slots[0]![aO] ?? 0) !== (state[4040 + v] ?? 0)) aO += 1;
    if (aO >= 30) throw new RangeError("ArrayIndexOutOfBounds f.b[u][2][30]");
    const follow = slots[2]![aO] ?? 0;
    if (follow < 0) {
      input.onAp();
      return;
    }
    if (type !== 97) {
      state[UNIT_TARGET_X + v] = state[follow] ?? 0;
      state[UNIT_TARGET_Y + v] = state[UNIT_Y + follow] ?? 0;
      state[UNIT_WORK_TARGET + v] = follow;
      state[UNIT_RECORD + v] = follow;
      return;
    }
    state[UNIT_TARGET_X + v] = follow;
    state[UNIT_TARGET_Y + v] = slots[3]![aO] ?? 0;
    input.onG(2);
    return;
  }

  if (type === 27) {
    const orders = input.orders[u]!;
    for (let aN = 0; aN < 10; aN += 1) {
      const record = orders[aN]![11] ?? 0;
      if (record <= 0 || v !== (state[BLD_OWNER + record] ?? 0)) continue;
      for (let aO = 0; aO < 30; aO += 1) {
        if ((input.fRows[0]![aO] ?? 0) === record && (input.fRows[1]![aO] ?? 0) === (orders[aN]![10] ?? 0) + 14) {
          state[UNIT_TARGET_X + v] = input.fRows[2]![aO] ?? 0;
          state[UNIT_TARGET_Y + v] = input.fRows[3]![aO] ?? 0;
          input.onG(2);
          return;
        }
      }
      return;
    }
    return;
  }

  if (((input.packedBytes[(input.packedOffsets[27] ?? 0) + type] ?? 0) & 64) > 0) {
    if (type === 65) {
      const record = state[3434 + v] ?? 0;
      state[UNIT_TARGET_X + v] = state[BLD_X + record] ?? 0;
      state[UNIT_TARGET_Y + v] = state[BLD_Y + record] ?? 0;
    } else {
      state[UNIT_TARGET_X + v] = state[UNIT_HOME_X + v] ?? 0;
      state[UNIT_TARGET_Y + v] = state[UNIT_HOME_Y + v] ?? 0;
    }
    input.onG(2);
    return;
  }

  if (input.onA(6)) input.onG(2);
  else state[UNIT_RECORD + v] = -6;
}
