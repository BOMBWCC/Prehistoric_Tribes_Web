import { UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_THOUGHT, UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
/**
 * `private boolean k()` (#396), bytecode/b-javap.txt line 24336, offsets
 * 0..732: i()Z's tail asks it, once a unit's work is done (f:Z), whether the
 * unit handles the finish itself; `false` lets i()Z run I().
 *
 *  - 0..105, type <= 9: 6565 == 9 and type 0/3 -> type ^= 1 (a raw store);
 *    a:Z = b:Z = true; p()Z -> true.
 *  - 106..146, type 26/27: f(true).   148..187, types 94..97: ao().
 *  - 188..229, type 50: 7979 &= 191; L().
 *  - 230..265, type 111: 3636 = 0; o() (result popped).
 *  - 267..293, type 109: d(v, 0).     294..326, type 110: 3535 = 15.
 *  - 327..361, type 107: c((byte) 4444).   362..393, type 79: 3333 = -1.
 *  - 394..580, type <= 4, gridC[3232][3131] == 4747 and
 *    dense[b[t31[type]] + 4444] == 0: a(t31[type], 3131, 3232, (byte) 4444).
 *  - 581..621, `t27[type] & 8` (carriers 19..27, type 60): n() -> true. This
 *    is where a carrier that was picked as a partner joins its couple (n()
 *    runs o() first).
 *  - 622..669, type 60: a(v, 12); b(true) -> true; else a(v, 60).
 *  - 670..731, 1414 < 11, type 17 and a(10): a(v, 73); g(1); true.
 *
 * The type is re-read at every test, as the bytecode does.
 */
export type LegacyEntityKPredicateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132). */
  readonly saveOffsets: Int16Array;
  /** b.b:[[B (#129). */
  readonly gridC: readonly Int8Array[];
  readonly id: number;
  /** b.a:Z (#73) and b.b:Z (#137). */
  readonly flags: { a: boolean; b: boolean };
  /** p()Z (#409). */
  readonly onP: () => boolean;
  /** f(boolean) (#382). */
  readonly onF: (flag: boolean) => void;
  /** ao() (#322). */
  readonly onAo: () => void;
  /** L() (#248). */
  readonly onL: () => void;
  /** o()Z (#406). */
  readonly onO: () => boolean;
  /** d(int,int) (#367). */
  readonly onD: (id: number, argument: number) => void;
  /** c(byte) (#363). */
  readonly onCByte: (record: number) => void;
  /** a(int,int,int,byte) (#283). */
  readonly onVacate: (kind: number, x: number, y: number, record: number) => void;
  /** n()Z (#402). */
  readonly onNeeds: () => boolean;
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** b(boolean)Z (#339). */
  readonly onBBoolean: (flag: boolean) => boolean;
  /** a(int)Z (#288). */
  readonly onNearestBuilding: (kind: number) => boolean;
  /** g(int) (#384). */
  readonly onGroupMode: (argument: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityKPredicate(input: LegacyEntityKPredicateInput): boolean {
  const { state, id } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const type = () => state[UNIT_TYPE + id] ?? 0;

  if (type() <= 9) {
    if ((state[UNIT_HELD_ITEM + id] ?? 0) === 9 && (type() === 0 || type() === 3)) state[UNIT_TYPE + id] = toByte(type() ^ 1);
    input.flags.b = true;
    input.flags.a = true;
    if (input.onP()) return true;
  }

  if (type() === 26 || type() === 27) input.onF(true);
  if (type() >= 94 && type() <= 97) input.onAo();
  if (type() === 50) {
    state[UNIT_FLAGS + id] = toByte((state[UNIT_FLAGS + id] ?? 0) & 191);
    input.onL();
  }
  if (type() === 111) {
    state[UNIT_CARRY_AMOUNT + id] = 0;
    input.onO();
  }
  if (type() === 109) input.onD(id, 0);
  if (type() === 110) state[UNIT_CARRY_KIND + id] = 15;
  if (type() === 107) input.onCByte(state[UNIT_RECORD + id] ?? 0);
  if (type() === 79) state[UNIT_THOUGHT + id] = -1;

  if (type() <= 4 &&
      (input.gridC[state[UNIT_TARGET_Y + id] ?? 0]?.[state[UNIT_TARGET_X + id] ?? 0] ?? 0) === (state[UNIT_WORK_TARGET + id] ?? 0) &&
      (state[(input.saveOffsets[table(31, type())] ?? 0) + (state[UNIT_RECORD + id] ?? 0)] ?? 0) === 0) {
    input.onVacate(table(31, type()), state[UNIT_TARGET_X + id] ?? 0, state[UNIT_TARGET_Y + id] ?? 0, state[UNIT_RECORD + id] ?? 0);
  }

  if ((table(27, type()) & 8) !== 0 && input.onNeeds()) return true;

  if (type() === 60) {
    input.onChangeType(id, 12);
    if (input.onBBoolean(true)) return true;
    input.onChangeType(id, 60);
  }

  if ((state[UNIT_AGE + id] ?? 0) < 11 && type() === 17 && input.onNearestBuilding(10)) {
    input.onChangeType(id, 73);
    input.onGroupMode(1);
    return true;
  }
  return false;
}
