import { ANIMAL_DEST_X, ANIMAL_DEST_Y, ANIMAL_X, ANIMAL_Y } from "../../core/DenseLayout";
/**
 * `private void e(boolean)` (#376), bytecode/b-javap.txt line 42154, offsets
 * 0..565 -- **where an animal picks its next destination**, and the other
 * half of the boar/deer split.
 *
 * Three callers, and the flag is what separates them:
 *  - `a(int,int,byte,int)` (#289, `LegacyAnimalHitReaction.ts`) calls
 *    `e(true)` for an animal whose kind has zero aggression: **the flight**.
 *  - `af()` (offset 470) and `ag()` (offset 242) call `e(false)`: ordinary
 *    roaming inside the animal's home range.
 *
 * With `flag` true the step comes from the 8-direction table `t1` indexed by
 * `E:B` (#15) and is clamped only by the map, so the animal bolts as far as
 * it can. With `flag` false the step is a random -4..+3 on each axis clamped
 * into a box of radius `t203[f.q]` around the spawn point `(t199[w],
 * t200[w])`, so it mills about where it lives.
 *
 * `E:B` is the direction to run: `final boolean a(int,int,int,int)` (#270)
 * computes it at its offsets 191..232 as
 * `((t53[(12 + dy) * 25 + 12 + dx] % 10) + 4) & 7` -- the direction to the
 * cell it is scanning, rotated by 4, i.e. **the opposite way**. That gate's
 * own docblock used to say `E:B` "has no reader anywhere at all"; these two
 * reads are its readers, so the claim is retracted and the gate now records
 * the field instead of discarding it.
 *
 * Offset by offset:
 *  - 0..86: `wander` is false only for the mission-3 corner case (`f.q === 3`,
 *    `9469 === 0`, `20 <= 9359 <= 27`, `9381 <= 6`), in which case both
 *    destinations below collapse onto the animal's current cell.
 *  - 87..100: `dense[9689 + v] = 0`.
 *  - 101..178: `x:I = rand(63)`, `w:I = t201[f.q] + dense[9469 + v]`,
 *    `B:I = t203[f.q]` (the home-range radius).
 *  - 181..333 and 334..491: the two destination writes, `9645` then `9667`.
 *  - 492..564: if the chosen cell is occupied (and `wander`), `a(2, 127, x, y)`
 *    (#270) looks for a free one nearby; the result is discarded.
 */
export type LegacyAnimalRoamScratch = {
  /** b.x:I (#230) -- game.subsystemX. */
  x: number;
  /** b.w:I (#228) -- game.subsystemW. */
  w: number;
  /** b.B:I (#8) -- subsystemArrays.bField8, read later by the route finder d(int). */
  B: number;
};

export type LegacyAnimalRoamInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[[B (#129) -- gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** b.v:I (#225) -- the animal's own slot, 0..21. */
  readonly slot: number;
  /** f.q:B (#211). */
  readonly sceneQ: number;
  /** f.c:S (#145) / f.d:S (#156) -- the map size. */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** b.E:B (#15) -- the direction to run, set by a(int,int,int,int) (#270). */
  readonly E: number;
  readonly scratch: LegacyAnimalRoamScratch;
  /** f.a(int,int) (#269) -- the shared random. */
  readonly random: (mask: number, divisor: number) => number;
  /** final boolean a(int,int,int,int) (#270); the result is discarded. */
  readonly onFreeCellScan: (mode: number, scanLimit: number, x: number, y: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** static int b(int,int,int) (#334). */
function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

export function stepLegacyAnimalRoam(input: LegacyAnimalRoamInput, flag: boolean): void {
  const { state, slot, scratch } = input;
  const table = (row: number, index: number) =>
    input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  // Offsets 0..86.
  const wander = !(
    input.sceneQ === 3 &&
    (state[9469 + slot] ?? 0) === 0 &&
    (state[ANIMAL_X + slot] ?? 0) <= 27 &&
    (state[ANIMAL_X + slot] ?? 0) >= 20 &&
    // Offset 76 `if_icmple 85`: y <= 6 is the stay-put case. CORRECTED
    // 2026-09-27 (was `> 6`, inverting which mission-3 animals stay put).
    (state[ANIMAL_Y + slot] ?? 0) <= 6
  );

  // Offsets 87..178.
  state[9689 + slot] = 0;
  scratch.x = input.random(0xffffff, 63);
  scratch.w = table(201, input.sceneQ) + (state[9469 + slot] ?? 0);
  scratch.B = table(203, input.sceneQ);
  const { x: roll, w, B } = scratch;

  // Offsets 181..333.
  if (!wander) {
    state[ANIMAL_DEST_X + slot] = state[ANIMAL_X + slot] ?? 0;
  } else {
    state[ANIMAL_DEST_X + slot] = toByte(clamp(
      (state[ANIMAL_X + slot] ?? 0) + (flag ? table(1, input.E) : ((roll & 7) - 4)),
      flag ? 0 : table(199, w) - B,
      flag ? input.mapWidth - 1 : table(199, w) + B,
    ));
  }

  // Offsets 334..491.
  if (!wander) {
    state[ANIMAL_DEST_Y + slot] = state[ANIMAL_Y + slot] ?? 0;
  } else {
    state[ANIMAL_DEST_Y + slot] = toByte(clamp(
      (state[ANIMAL_Y + slot] ?? 0) + (flag ? table(1, 8 + input.E) : (((roll >> 3) & 7) - 4)),
      flag ? 0 : table(200, w) - B,
      flag ? input.mapHeight - 1 : table(200, w) + B,
    ));
  }

  // Offsets 492..564.
  const destX = state[ANIMAL_DEST_X + slot] ?? 0;
  const destY = state[ANIMAL_DEST_Y + slot] ?? 0;
  if ((input.gridC[destY]?.[destX] ?? 0) !== 0 && wander) {
    input.onFreeCellScan(2, 127, destX, destY);
  }
}
