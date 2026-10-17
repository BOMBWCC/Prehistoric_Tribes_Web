import { BLD_PLANNED_KIND, BLD_WORK, BLD_X, BLD_Y, UNIT_ENERGY, UNIT_FLAGS, UNIT_FOOD, UNIT_HAPPINESS, UNIT_HP, UNIT_JOB_TYPE, UNIT_MAX_HP, UNIT_MODE, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
export type LegacySubsystemNDecisionInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly v: number;
  readonly u: number;
  /** b.b:[[B (#129), gridC[row][column]. */
  readonly entityAt?: (row: number, column: number) => number;
  /** private boolean a(int,byte) (#296): go to the nearest building of a kind. */
  readonly onEntityActionSearch?: (kind: number, moveAction: number) => boolean;
  /** a(int,byte) (#275). */
  readonly onRawAction?: (id: number, action: number) => void;
  /** Q() (#253). */
  readonly onQueue?: () => void;
  /** final boolean a(int) (#288), the nearest-building search. */
  readonly onNearestBuilding?: (kind: number) => boolean;
  /** g(int) (#384). */
  readonly onGroupMode?: (argument: number) => void;
  /** final void a(byte,int,int) (#274), called as `(1, v, v)`. */
  readonly onMove?: () => void;
  /** f.a(int,int) (#269). */
  readonly randomRemainder?: (mask: number, divisor: number) => number;
};

function tableByte(bytes: Int8Array, offsets: Int16Array, table: number, index: number): number {
  return bytes[(offsets[table] ?? 0) + index] ?? 0;
}

/**
 * `private boolean n()` offsets 104..936 (bytecode/b-javap.txt line 29609):
 * an idle adult looks after its needs. Building kinds: 4 kitchen, 7 disco,
 * 8 sanctuary; 3434 is the unit's hut.
 *
 *  - 104..167: `t50[type] == 127 || t52[type] == 127` -> false.
 *  - 168..568, tiredness `2121 <= (505 > 5 ? 20 : 50)`: off its own cell ->
 *    type 87 and g(1); otherwise `aJ = rand(3)` and walk home (3434 with
 *    8627 == 0 and 9237 < 2) with g(1), or with `aJ == 1` to the nearest
 *    disco (a(7)) with g(1), or sleep here (target = own cell, type 79, mode
 *    40); then `a(1, v, v)` when it has no hut. True.
 *  - 569..655, hunger `2020 <= threshold` (6464/type not 66): a(4, 0).
 *  - 656..836, happiness `505 <= 30` (not 86): a(7, 2); failing that and
 *    `505 <= 5` with t41[type] != 0: off its own cell type 87 and 6161 = 3
 *    (true), else Q().
 *  - 837..935, hurt `1919 < 6767*2/3` or `7979 & 4` (not 57): a(8, 3).
 *
 * CORRECTED 2026-09-15: the tiredness branch was ported as a second kitchen
 * search, and the heal test as `1919 >= 2/3 && 7979 & 4`. `aJ:I` (#85) is
 * written before it is read here, so it is a local.
 */
export function stepLegacySubsystemNDecision(input: LegacySubsystemNDecisionInput): boolean {
  const { state, packedBytes, packedOffsets, v } = input;
  const type = state[UNIT_TYPE + v] ?? 0;
  const actionSearch = input.onEntityActionSearch ?? (() => false);
  const onOwnCell = () => input.entityAt?.(state[UNIT_Y + v] ?? 0, state[v] ?? 0) === v;

  if (tableByte(packedBytes, packedOffsets, 50, type) === 127 ||
      tableByte(packedBytes, packedOffsets, 52, type) === 127) return false;

  const threshold = () => ((state[UNIT_HAPPINESS + v] ?? 0) > 5 ? 20 : 50);

  if ((state[UNIT_ENERGY + v] ?? 0) <= threshold()) {
    if (!onOwnCell()) {
      input.onRawAction?.(v, 87);
      input.onGroupMode?.(1);
      return true;
    }
    const aJ = input.randomRemainder?.(255, 3) ?? 0;
    const home = state[3434 + v] ?? 0;
    if (home > 0 && (state[BLD_WORK + home] ?? 0) === 0 && (state[BLD_PLANNED_KIND + home] ?? 0) < 2) {
      state[UNIT_TARGET_X + v] = state[BLD_X + home] ?? 0;
      state[UNIT_TARGET_Y + v] = state[BLD_Y + home] ?? 0;
      input.onGroupMode?.(1);
    } else if (aJ === 1 && (input.onNearestBuilding?.(7) ?? false)) {
      input.onGroupMode?.(1);
    } else {
      state[UNIT_TARGET_X + v] = state[v] ?? 0;
      state[UNIT_TARGET_Y + v] = state[UNIT_Y + v] ?? 0;
      input.onRawAction?.(v, 79);
      state[UNIT_MODE + v] = 40;
      state[3030 + v] = 0;
    }
    if ((state[3434 + v] ?? 0) <= 0) input.onMove?.();
    return true;
  }

  if ((state[UNIT_FOOD + v] ?? 0) <= threshold() &&
      (state[UNIT_JOB_TYPE + v] ?? 0) !== 66 && (state[UNIT_TYPE + v] ?? 0) !== 66 &&
      actionSearch(4, 0)) return true;

  if ((state[UNIT_HAPPINESS + v] ?? 0) <= 30 && (state[UNIT_JOB_TYPE + v] ?? 0) !== 86 && (state[UNIT_TYPE + v] ?? 0) !== 86) {
    if (actionSearch(7, 2)) return true;
    if ((state[UNIT_HAPPINESS + v] ?? 0) <= 5 && tableByte(packedBytes, packedOffsets, T_TYPE_JOB, state[UNIT_TYPE + v] ?? 0) !== 0) {
      if (!onOwnCell()) {
        input.onRawAction?.(v, 87);
        state[UNIT_ORDER + v] = 3;
        return true;
      }
      input.onQueue?.();
    }
  }

  if (((state[UNIT_HP + v] ?? 0) < Math.trunc(((state[UNIT_MAX_HP + v] ?? 0) * 2) / 3) || ((state[UNIT_FLAGS + v] ?? 0) & 4) !== 0) &&
      (state[UNIT_JOB_TYPE + v] ?? 0) !== 57 && (state[UNIT_TYPE + v] ?? 0) !== 57 &&
      actionSearch(8, 3)) return true;

  return false;
}
