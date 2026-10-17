import { UNIT_HELD_ITEM, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * Direct translation of `private void S()` (constant pool #255),
 * bytecode/b-javap.txt offsets 0..264 (line 33486). Real logic -- no
 * confirmed-null field. Resets `dense[5959+id]=0`, classifies the entity's
 * type into a small dispatch value (`packedBytes[packedOffsets[79]+type]`
 * for type<=9, else 1/2/5/0 for types 92/93/106/other), then unconditionally
 * calls `private boolean a(int,int,int,int,int,int,int,int)` (constant pool
 * #298, offset 34401, 869 bytecode lines) with 8 computed args -- its
 * boolean result is discarded (`pop`) by the real bytecode, and its own body
 * is far outside the scope of this "e() tail" investigation, so it is kept
 * as an explicit callback (`onQueueAction`) rather than derived.
 *
 * Real (only) caller: `R()` (`LegacySubsystemEntityPaceAccum.ts`), offset 306.
 */
export type LegacySubsystemEntityPaceResetInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  readonly team: number;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** private boolean a(int,int,int,int,int,int,int,int) (#298) -- not derived, see docblock. */
  readonly onQueueAction?: (
    a1: number, a2: number, a3: number, a4: number,
    a5: number, a6: number, a7: number, a8: number,
  ) => void;
};

export function stepLegacySubsystemEntityPaceReset(input: LegacySubsystemEntityPaceResetInput): void {
  const { state, packedBytes, packedOffsets, id, team } = input;

  state[5959 + id] = 0;

  const type = state[UNIT_TYPE + id] ?? 0;
  let kind: number;
  if (type <= 9) kind = packedBytes[(packedOffsets[79] ?? 0) + type] ?? 0;
  else if (type === 92) kind = 1;
  else if (type === 93) kind = 2;
  else if (type === 106) kind = 5;
  else kind = 0;

  const record = state[UNIT_RECORD + id] ?? 0;
  const roleTerm = Math.trunc((state[UNIT_RANGED_SKILL + id] ?? 0) / 3)
    + (packedBytes[(packedOffsets[102] ?? 0) + (state[UNIT_HELD_ITEM + id] ?? 0)] ?? 0);
  const noise = input.randomRemainder(65535, 11 - (state[7878 + id] ?? 0)) + (state[7878 + id] ?? 0);
  const arg7 = Math.trunc((roleTerm * noise) / 10);

  input.onQueueAction?.(state[5252 + id] ?? 0, state[5353 + id] ?? 0, team, kind, record, 0, arg7, 1);
}
