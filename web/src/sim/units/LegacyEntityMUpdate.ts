import { UNIT_SAVED_TYPE, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * Exact `private void M()` (#249), bytecode/b-javap.txt line 27625, offsets
 * 0..155. Callers: i(int) (offset 140, an idle villager with `x` 3..4) and
 * a(int,boolean,int).
 *
 *   3939[v] = 2828[v];
 *   a(v, 83);                                    // #275, the type change
 *   R:I = t169[3939[v]];
 *   1313[v] = (byte)(t168[R] + f.a(0xFFFFFF, t168[R + 2] - t168[R] + 1));
 *
 * CORRECTED 2026-09-14: offset 33 is `invokespecial #275 a:(IB)V` (b's own
 * type change), not f.a(int,byte) (#277, the xSlotTable writer) that this
 * port used to call.
 */
export type LegacyEntityMUpdateInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.R:I (#49). */
  readonly raw: { R: number };
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** f.a(int,int) (#269). */
  readonly randomRemainder: (mask: number, divisor: number) => number;
};

export function stepLegacyEntityMUpdate(input: LegacyEntityMUpdateInput): void {
  const { state, entityId: v, raw } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  state[UNIT_SAVED_TYPE + v] = state[UNIT_TYPE + v] ?? 0;
  input.onChangeType(v, 83);
  raw.R = table(169, state[UNIT_SAVED_TYPE + v] ?? 0);
  const low = table(168, raw.R);
  state[UNIT_TIMER + v] = low + input.randomRemainder(0xffffff, table(168, raw.R + 2) - low + 1);
}
