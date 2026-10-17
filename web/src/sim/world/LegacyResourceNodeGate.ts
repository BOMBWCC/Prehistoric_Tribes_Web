import { UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
/**
 * `private boolean c(byte)` (#360), bytecode/b-javap.txt line 21972, offsets
 * 0..290: "can unit `v` harvest the resource node in this cell?". Its only
 * caller is `b(boolean)` (`LegacySubsystemBBoolean.ts`), which scans the 50
 * resource-node slots and asks this about each candidate before picking one.
 *
 * The node bookkeeping lives in four 50-entry tables at the very end of the
 * dense bank (length 9983), all indexed by slot = `-cell - 61`:
 *   9733 + slot  node x            9783 + slot  node y
 *   9833 + slot  node kind         9883 + slot  remaining amount
 *   9933 + slot  regrow counter
 * The method itself indexes them the way the bytecode does, off the negative
 * cell value: `9772 - cell` is the kind, `9822 - cell` the amount, and
 * `9872 - cell` the regrow counter.
 *
 *  - 0..108: when `cell === dense[4747+v]` (the unit's own current target),
 *    every type except 10/12/13/15/16 answers `true` straight away.
 *  - 110..154: the unit's type must be 10..16 and the cell must be a node
 *    (`-110 <= cell <= -61`), else `false`.
 *  - 158..195: `mapped = t16[t17[3] + kind]` -- the unit type this node's
 *    kind wants.
 *  - 197..254: a type-12/16 unit at a type-12/16 node answers `true` as soon
 *    as the node still has `9822 - cell > 0` left.
 *  - 258..267: otherwise an exhausted node whose regrow counter has not run
 *    (`9872 - cell <= 0`) answers `false` -- this is what stops a villager
 *    from working an empty berry bush.
 *  - 270..290: finally the node's mapped type must equal the unit's own.
 */
export type LegacyResourceNodeGateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  /** b.a:[S (#66) -- the packed-table offset row this method reads 16/17 from. */
  readonly tableOffsets: Int16Array;
  /** b.v:I (#225), the unit being asked about. */
  readonly v: number;
};

function tableByte(input: LegacyResourceNodeGateInput, row: number, index: number): number {
  return input.packedBytes[(input.tableOffsets[row] ?? 0) + index] ?? 0;
}

export function checkLegacyResourceNodeGate(input: LegacyResourceNodeGateInput, cell: number): boolean {
  const { state, v } = input;

  // Offsets 0..108.
  if (cell === (state[UNIT_WORK_TARGET + v] ?? 0)) {
    const own = state[UNIT_TYPE + v] ?? 0;
    if (own !== 10 && own !== 15 && own !== 12 && own !== 16 && own !== 13) return true;
  }

  // Offsets 110..154.
  const type = state[UNIT_TYPE + v] ?? 0;
  if (type < 10 || type > 16) return false;
  if (cell > -61 || cell < -110) return false;

  // Offsets 158..195: t16[t17[3] + kind].
  const kind = state[9772 - cell] ?? 0;
  const mapped = tableByte(input, 16, tableByte(input, 17, 3) + kind);

  // Offsets 197..254.
  if ((type === 12 || type === 16) && (mapped === 12 || mapped === 16)) {
    if ((state[9822 - cell] ?? 0) > 0) return true;
  }

  // Offsets 258..267: an exhausted node that has not regrown yet.
  if ((state[9872 - cell] ?? 0) <= 0) return false;

  // Offsets 270..290.
  return mapped === (state[UNIT_TYPE + v] ?? 0);
}
