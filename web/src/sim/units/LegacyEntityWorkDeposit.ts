import { BLD_KIND, BLD_OWNER, BLD_WORK, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_JOB_TYPE, UNIT_MODE, UNIT_ORDER, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * Exact `private boolean f()` (#381), bytecode/b-javap.txt line 13687,
 * offsets 0..872 -- the first call of `i(int)` (`LegacyEntityIUpdate.ts`);
 * `true` ends `i(int)` for this tick. The five `getClass()/pop` pairs are
 * inlined `static final` constants of class f (50, 51, 1).
 *
 *  - 0..55: type 78 in modes 113..116 -> true.
 *  - 57..90: not a joined worker (`4646 < 0` or `1313 != -2`) -> 855.
 *  - 91..232: `f.d(rec)`; a type-51 unit makes the record owner `C` type 55
 *    when `C` is joined (`1313 >= 0`, `4646 >= 0`), otherwise it gives up
 *    (`6161 = 3`, type 87).
 *  - 233..472: `t42[t41[6464]] != t42[t41[2828]]` with a positive class for
 *    2828 -> mode -109, `1313 = 8627 != 0 ? 50 : (8749 == 7 ? 51 : 1)`, true.
 *  - 473..854, a full load delivered by the record owner (`8810 == v`,
 *    `3636 == 9`, record a site or built): a site (`8749 >= 12`) advances
 *    `f[1][i]` where `f[0][i] == rec`; a built small record negates
 *    `g[2][i]` where `g[0][i] == rec`. Carry 3535/3636 cleared, `1313 = 8627
 *    != 0 ? 50 : 1`, mode -102, true.
 *  - 855..872: `x:I = f.a(0xFFFFFF, 100)`, false.
 *
 * `v:B` (#226) is the index scratch and is written before it is read, so it
 * is a local. CORRECTED 2026-09-14: this was a stub that only did the 855 path.
 */
export type LegacyEntityWorkDepositInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  /** b.f:[[B (#168), 2 x 10. */
  readonly fRows: Int8Array[];
  /** b.g:[[B (#176), 3 x 20. */
  readonly gRows: Int8Array[];
  /** b.C:I (#10). */
  readonly scratch: { C: number };
  /** f.d(int) (#370). */
  readonly onRecordCompletion: (record: number) => void;
  /** offset 855: `x:I = f.a(0xFFFFFF, 100)`. */
  readonly onReroll: () => void;
};

function rowAt(rows: Int8Array[], row: number, index: number): { get(): number; set(value: number): void } {
  const array = rows[row];
  if (!array || index < 0 || index >= array.length) throw new RangeError(`ArrayIndexOutOfBounds [${row}][${index}]`);
  return { get: () => array[index]!, set: (value) => { array[index] = value; } };
}

export function stepLegacyEntityWorkDeposit(input: LegacyEntityWorkDepositInput): boolean {
  const { state, entityId: v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const workClass = (type: number) => table(42, table(T_TYPE_JOB, type));
  const rec = () => state[UNIT_RECORD + v] ?? 0;

  const mode = state[UNIT_MODE + v] ?? 0;
  if ((state[UNIT_TYPE + v] ?? 0) === 78 && mode >= 113 && mode <= 116) return true;

  if ((state[UNIT_SLOT + v] ?? 0) >= 0 && (state[UNIT_TIMER + v] ?? 0) === -2) {
    input.onRecordCompletion(rec());

    if ((state[UNIT_TYPE + v] ?? 0) === 51) {
      input.scratch.C = state[BLD_OWNER + rec()] ?? 0;
      const c = input.scratch.C;
      if ((state[UNIT_TIMER + c] ?? 0) >= 0 && (state[UNIT_SLOT + c] ?? 0) >= 0) {
        state[UNIT_TYPE + c] = 55;
      } else {
        state[UNIT_ORDER + v] = 3;
        state[UNIT_TYPE + v] = 87;
      }
    }

    const ownClass = workClass(state[UNIT_TYPE + v] ?? 0);
    if (workClass(state[UNIT_JOB_TYPE + v] ?? 0) !== ownClass && ownClass > 0) {
      state[UNIT_MODE + v] = -109;
      state[UNIT_TIMER + v] = (state[BLD_WORK + rec()] ?? 0) !== 0 ? 50 : ((state[BLD_KIND + rec()] ?? 0) === 7 ? 51 : 1);
      return true;
    }

    const recordType = state[BLD_KIND + rec()] ?? 0;
    if ((state[BLD_OWNER + rec()] ?? 0) === v &&
        (recordType >= 12 || (state[BLD_WORK + rec()] ?? 0) !== 0) &&
        (state[UNIT_CARRY_AMOUNT + v] ?? 0) === 9) {
      if (recordType >= 12) {
        let slot = 0;
        while (slot < 10 && rowAt(input.fRows, 0, slot).get() !== rec()) slot += 1;
        rowAt(input.fRows, 1, slot).set(rowAt(input.fRows, 1, slot).get() + 1);
      } else {
        let slot = 0;
        while (slot < 20 && rowAt(input.gRows, 0, slot).get() !== rec()) slot += 1;
        rowAt(input.gRows, 2, slot).set(-rowAt(input.gRows, 2, slot).get());
      }
      state[UNIT_CARRY_AMOUNT + v] = 0;
      state[UNIT_CARRY_KIND + v] = 0;
      state[UNIT_TIMER + v] = (state[BLD_WORK + rec()] ?? 0) !== 0 ? 50 : 1;
      state[UNIT_MODE + v] = -102;
      return true;
    }
  }

  input.onReroll();
  return false;
}
