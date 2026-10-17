import { ANIMAL_KIND, ANIMAL_X, ANIMAL_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private void ah()` (constant pool #315),
 * bytecode/b-javap.txt offsets 0..930 (line 41508). `h()`'s own other
 * "tail maintenance" call (with `af()`), for each of 22 scratch slots
 * (`v` 0..21) whenever `dense[9513+v]>0`.
 *
 * The ENTIRE method is gated on `(dense[9557+v]&255)<=7` (offset 0..19) --
 * if not, it's a plain no-op. Past that, it's the SAME sub-pixel
 * walk-cycle animation shape as `E()`/`D()` (`LegacySubsystemEntityAnimOffset.ts`/
 * `LegacySubsystemEntityMoveApply.ts`), just retargeted onto this scratch
 * region's own fields: `w = dense[9491+v]&1` (facing parity), a "period"
 * value from `table(179,dense[9535+v])` playing `E()`'s `l` role, and
 * `dense[9623+v]` (incremented here) playing `E()`'s frame-offset role.
 * Writes `dense[9403/9425+v]` (this region's own sub-pixel offset pair,
 * mirroring `dense[202/303+id]`), and at the exact mid-cycle frame
 * (`dense[9623+v] === Math.trunc((cycleLen+1)/2)`), clears the scratch
 * slot's own `gridC` cell, applies the 8-direction delta
 * (`packedOffsets[1]+dense[9491+v]`) to `dense[9359/9381+v]`, applies the
 * same +22/+16 asymmetric correction `E()` does when a delta is negative
 * on an even cycle length, and re-places the slot in `gridC` -- marked
 * `v+101` (not a bare entity id) so it's distinguishable from real
 * entities (1..100) occupying the same grid.
 */
export type LegacySubsystemAhInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly slot: number;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

export function stepLegacySubsystemAh(input: LegacySubsystemAhInput): void {
  const { state, packedBytes, packedOffsets, gridC, slot: v } = input;

  if (((state[9557 + v] ?? 0) & 0xff) > 7) return;

  const w = (state[9491 + v] ?? 0) & 1;
  state[9623 + v] = (state[9623 + v] ?? 0) + 1;

  const period = table(packedBytes, packedOffsets, 179, state[ANIMAL_KIND + v] ?? 0);
  const cycleLen = table(packedBytes, packedOffsets, 15, w * 9 + period);
  const counter = state[9623 + v] ?? 0;
  const xDelta = table(packedBytes, packedOffsets, 1, state[9491 + v] ?? 0);
  const yDelta = table(packedBytes, packedOffsets, 1, 8 + (state[9491 + v] ?? 0));
  const base = table(packedBytes, packedOffsets, 12 + w * 2, period);

  const subX = (cycleLen + counter * xDelta) % cycleLen;
  state[9403 + v] = table(packedBytes, packedOffsets, 5 + w, base + subX);

  const subY = (cycleLen + counter * yDelta) % cycleLen;
  state[9425 + v] = table(packedBytes, packedOffsets, 7 + w, base + subY);

  if (counter === Math.trunc((cycleLen + 1) / 2)) {
    const row0 = gridC[state[ANIMAL_Y + v] ?? 0];
    if (row0) row0[state[ANIMAL_X + v] ?? 0] = 0;

    state[ANIMAL_X + v] = (state[ANIMAL_X + v] ?? 0) + xDelta;
    state[ANIMAL_Y + v] = (state[ANIMAL_Y + v] ?? 0) + yDelta;

    if ((cycleLen & 1) === 0 && xDelta < 0) state[9403 + v] = (state[9403 + v] ?? 0) + 22;
    if ((cycleLen & 1) === 0 && yDelta < 0) state[9425 + v] = (state[9425 + v] ?? 0) + 16;

    const row1 = gridC[state[ANIMAL_Y + v] ?? 0];
    if (row1) row1[state[ANIMAL_X + v] ?? 0] = v + 101;
  }
}
