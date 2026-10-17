import { ANIMAL_DEST_X, ANIMAL_DEST_Y, ANIMAL_KIND, ANIMAL_TARGET } from "../../core/DenseLayout";
import { T_ANIMAL_AGGRESSION } from "../../core/DataTables";
/**
 * `private void a(int,int,byte,int)` (#289), bytecode/b-javap.txt line
 * 21913, offsets 0..98 -- **how a wounded animal reacts**, and the exact
 * place the original splits "the boar fights back" from "the deer runs".
 *
 * Animals are not ordinary entities. They live in their own 22-slot table
 * (`c(int,int,int,int)` classifies their grid cells 101..122 as `k[0] === 5`),
 * with rows `9359`/`9381` position, `9513` hit points, `9535` kind,
 * `9601` current target, `9645`/`9667` remembered target cell and `9447`
 * "who hit me". `a(IIIIIIII)` (#298, `LegacyEntityStrikeGate.ts`) writes
 * `9447 = 19 + attacker` when it lands a blow on one; `af()` then reads that
 * back, subtracts the 19 and calls this method with the attacker's own cell.
 *
 * The whole method:
 *
 *   if (t181[dense[9535 + v]] > p4 || dense[9601 + v] != 0) {
 *     dense[9645 + v] = (byte) p1;      // remember where it was hit from
 *     dense[9667 + v] = (byte) p2;
 *     dense[9601 + v] = p3;             // ... and turn on that attacker
 *     return;
 *   }
 *   e(true);                            // #376, LegacyAnimalRoam.ts
 *
 * `t181` is the per-kind aggression, three entries for the three animal
 * kinds: **`[5, 100, 0]`**. `af()` passes `p4 = 0`, so kinds 0 and 1 always
 * take the first branch and turn on whoever hit them -- kind 1 hardest
 * (aggression 100, and `t182`, the damage table, is `[2, 4, 0]`) -- while
 * **kind 2 has aggression 0 and damage 0, so it never retaliates** and goes
 * to `e(true)` instead. That is the deer. An animal that already has a
 * target (`9601 != 0`) keeps fighting regardless of its kind, which is why
 * one that has been provoked stays provoked.
 */
export type LegacyAnimalHitReactionInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.v:I (#225) -- the animal's own slot, 0..21. */
  readonly slot: number;
  /** private void e(boolean) (#376) -- LegacyAnimalRoam.ts (wired 2026-09-22). */
  readonly onFlee?: (flag: boolean) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyAnimalHitReaction(
  input: LegacyAnimalHitReactionInput,
  p1: number,
  p2: number,
  p3: number,
  p4: number,
): void {
  const { state, slot } = input;
  const aggression =
    input.packedBytes[(input.packedOffsets[T_ANIMAL_AGGRESSION] ?? 0) + (state[ANIMAL_KIND + slot] ?? 0)] ?? 0;

  // Offsets 0..45.
  if (aggression > p4 || (state[ANIMAL_TARGET + slot] ?? 0) !== 0) {
    // Offsets 48..92.
    state[ANIMAL_DEST_X + slot] = toByte(p1);
    state[ANIMAL_DEST_Y + slot] = toByte(p2);
    state[ANIMAL_TARGET + slot] = p3;
    return;
  }

  // Offsets 93..98.
  input.onFlee?.(true);
}
