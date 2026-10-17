import { UNIT_DIRECTION, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_SPEED } from "../../core/DenseLayout";
/**
 * Direct translation of `private void E()` (constant pool #241),
 * bytecode/b-javap.txt offsets 0..643 (line 18211). Real sub-pixel
 * walk-cycle animation logic -- no confirmed-null field involved. Writes
 * `dense[202+id]`/`dense[303+id]` (the same sub-tile pixel-offset fields
 * `D()`'s own tail reads/writes) from a packed-table lookup keyed by a
 * local "facing parity" (`w = dense[606+id]&1`) and a local delta counter
 * (`L = dense[1010+id]-dense[7777+id]`), cycling through the animation
 * frame (`dense[1111+id]`, incremented here). Returns `w`/`L` since `D()`'s
 * own tail (offset 366+) reuses both -- the real bytecode keeps them as
 * instance fields (`w:I`#228, `L:I`#34) set here and read by the caller
 * immediately after.
 *
 * Real (only) caller: `D()` (`LegacySubsystemEntityMoveApply.ts`), offset 0.
 */
export type LegacySubsystemEntityAnimOffsetResult = {
  readonly w: number;
  readonly l: number;
};

export function stepLegacySubsystemEntityAnimOffset(
  state: Int8Array,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  id: number,
): LegacySubsystemEntityAnimOffsetResult {
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;

  const w = (state[UNIT_DIRECTION + id] ?? 0) & 1;
  const l = (state[UNIT_SPEED + id] ?? 0) - (state[7777 + id] ?? 0);
  state[1111 + id] = (state[1111 + id] ?? 0) + 1;

  const cycleLen = table(15, w * 9 + l);
  const frameOffset = (state[1111 + id] ?? 0) & 15;
  const xDelta = table(1, state[UNIT_DIRECTION + id] ?? 0);
  const yDelta = table(1, 8 + (state[UNIT_DIRECTION + id] ?? 0));

  const subX = (cycleLen + frameOffset * xDelta) % cycleLen;
  state[UNIT_OFFSET_X + id] = table(5 + w, table(12 + w * 2, l) + subX);

  const subY = (cycleLen + frameOffset * yDelta) % cycleLen;
  state[UNIT_OFFSET_Y + id] = table(7 + w, table(12 + w * 2, l) + subY);

  if ((state[UNIT_OFFSET_X + id] ?? 0) === 0 && (state[UNIT_OFFSET_Y + id] ?? 0) === 0 && (state[4848 + id] ?? 0) === 120) {
    state[4848 + id] = 1;
  }

  if (frameOffset === (cycleLen + 1) >> 1) {
    if ((cycleLen & 1) === 0 && xDelta < 0) {
      state[UNIT_OFFSET_X + id] = (state[UNIT_OFFSET_X + id] ?? 0) + 22;
    }
    if ((cycleLen & 1) === 0 && yDelta < 0) {
      state[UNIT_OFFSET_Y + id] = (state[UNIT_OFFSET_Y + id] ?? 0) + 16;
    }
  }

  return { w, l };
}
