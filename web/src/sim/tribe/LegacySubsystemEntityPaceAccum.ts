import { stepLegacySubsystemEntityPaceReset, type LegacySubsystemEntityPaceResetInput } from "./LegacySubsystemEntityPaceReset";

/**
 * Direct translation of `private void R()` (constant pool #254),
 * bytecode/b-javap.txt offsets 0..310 (line 33294). Real, self-contained
 * accumulator logic -- no confirmed-null field, no calls other than `S()`.
 * While `dense[5858+id] < dense[5959+id]`, accumulates a fractional
 * position (`dense[5454+id]`/`dense[5555+id]` += `dense[5656+id]`/
 * `dense[5757+id]`), carries whole units into `dense[5252+id]`/
 * `dense[5353+id]` (a 22/16-wide fixed-point carry, matching the
 * `E()`/`D()` sub-pixel tile geometry), then increments `dense[5858+id]`
 * and, once it exceeds `dense[5959+id]`, calls `S()`
 * (`LegacySubsystemEntityPaceReset.ts`).
 */
export type LegacySubsystemEntityPaceAccumInput = LegacySubsystemEntityPaceResetInput;

export function stepLegacySubsystemEntityPaceAccum(input: LegacySubsystemEntityPaceAccumInput): void {
  const { state, id } = input;

  if ((state[5858 + id] ?? 0) < (state[5959 + id] ?? 0)) {
    state[5454 + id] = (state[5454 + id] ?? 0) + (state[5656 + id] ?? 0);
    state[5555 + id] = (state[5555 + id] ?? 0) + (state[5757 + id] ?? 0);

    const carryX = Math.trunc(((state[5454 + id] ?? 0) + 11 + 66) / 22) - 3;
    state[5252 + id] = (state[5252 + id] ?? 0) + carryX;
    state[5454 + id] = (state[5454 + id] ?? 0) - carryX * 22;

    const carryY = Math.trunc(((state[5555 + id] ?? 0) + 8 + 48) / 16) - 3;
    state[5353 + id] = (state[5353 + id] ?? 0) + carryY;
    state[5555 + id] = (state[5555 + id] ?? 0) - carryY * 16;
  }

  state[5858 + id] = (state[5858 + id] ?? 0) + 1;
  if ((state[5858 + id] ?? 0) > (state[5959 + id] ?? 0)) {
    stepLegacySubsystemEntityPaceReset(input);
  }
}
