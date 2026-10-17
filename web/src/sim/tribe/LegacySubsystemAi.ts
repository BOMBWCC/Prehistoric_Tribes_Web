import { ANIMAL_KIND, ANIMAL_TARGET } from "../../core/DenseLayout";
/**
 * Direct translation of `private void ai()` (constant pool #316),
 * bytecode/b-javap.txt offsets 0..157 (line 42066). Real logic -- no
 * confirmed-null field. Real callers: `ag()`'s own `dense[9447+v]===0`
 * branch (`LegacySubsystemAg.ts`).
 *
 * Picks the next animation "period" for this scratch slot:
 * `dense[9601+v]===0` (no active target) rolls a random offset
 * (`randomRemainder(16777215,100)`) and looks it up in a packed table
 * (row 184, banded by `/50*3`, offset by `dense[9535+v]`); otherwise
 * (`dense[9601+v]!==0`) just sets it to `37+dense[9535+v]` (the SAME
 * literal `af()` itself checks for its own queue-trigger gate). Finally,
 * when the current scene is `q===4` and `dense[9469+v]===2`, bumps it to
 * `3`.
 */
export type LegacySubsystemAiInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly slot: number;
  readonly sceneQ: number;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** b.x:I (#230): offset 29 stores the roll in the field, not a local (oracle 2026-10-08). */
  readonly x: { value: number };
};

export function stepLegacySubsystemAi(input: LegacySubsystemAiInput): void {
  const { state, packedBytes, packedOffsets, slot: v } = input;

  if ((state[ANIMAL_TARGET + v] ?? 0) === 0) {
    input.x.value = input.randomRemainder(16777215, 100);
    state[9557 + v] = packedBytes[
      (packedOffsets[184] ?? 0) + Math.trunc(input.x.value / 50) * 3 + (state[ANIMAL_KIND + v] ?? 0)
    ] ?? 0;
  } else {
    state[9557 + v] = 37 + (state[ANIMAL_KIND + v] ?? 0);
  }

  if (input.sceneQ === 4 && (state[9469 + v] ?? 0) === 2) {
    state[9469 + v] = 3;
  }
}
