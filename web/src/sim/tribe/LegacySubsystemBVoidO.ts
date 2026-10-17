import { UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct port of class b's `private void o()` (javap offsets 0..104), NOT to be
 * confused with the already-ported `private boolean o()` (LegacySubsystemNPrivateO.ts) —
 * class b overloads `o()` with two different signatures.
 *
 * Real caller candidates are `p()` (offset 1) and the ~1100-instruction
 * `final boolean a(int,int,int,int)` gate (#270, offset ~704, the same giant
 * method already deferred as a callback boundary in LegacySubsystemAn.ts's
 * onLargeGate / LegacyFPairCommand.ts's onFootprintProbe, still unported).
 * CORRECTION (2026-08-22): `p()` (`stepLegacySubsystemP`, `LegacySubsystemP.ts`)
 * was already live-wired via `LegacyRuntimeState.ts`'s `stepSubsystemP()`,
 * but this function was never actually called from there despite
 * `LegacySubsystemP.ts`'s own docblock claiming it was — confirmed via grep,
 * zero real call sites anywhere. Fixed: `stepSubsystemP()` now calls this
 * first, matching `p()`'s own offset 0..3 unconditional call.
 *
 * The bytecode's final real instruction (offset 100) is
 * `state[808 + v] = this.b(dense[101+v], dense[v], dense[3232+v], dense[3131+v])`
 * (`b(IIII):B`, #332).
 *
 * **RETRACTED (2026-09-07)**: that call used to be inlined here as a literal 0,
 * on a chain of reasoning that began "`a(IIII):B` dereferences `d:[[B]` (#154),
 * which has ZERO putfield sites anywhere in class b, so it always throws, so it
 * always returns 0, so `b(IIII):B`'s loop bound is 0, so it always returns 0".
 * The first link is false, in the same way the other fourteen instances of this
 * premise were: the grep covered class `b` only, and `f.g()` allocates
 * `b.d:[[B]` (bytecode/f-javap.txt:1328). Neither `a(IIII):B` nor `b(IIII):B`
 * is a constant, and neither is ported, so `b(IIII):B` is now an optional
 * callback -- an unported callee, not an invented value. See docs/unknowns.md's
 * 2026-09-04 sweep.
 */
export type LegacySubsystemBVoidOInput = {
  readonly state: Int8Array;
  readonly id: number;
  /** Class b's own `boolean[] a` (#69); raw until its other indices are proven. */
  readonly localFlags: boolean[];
  /**
   * `private byte b(int,int,int,int)` (#332), offset 100. Not ported. Called
   * with (dense[101+v], dense[v], dense[3232+v], dense[3131+v]) in that order,
   * per offsets 50..99.
   */
  readonly onScore?: (a: number, b: number, c: number, d: number) => number;
};

export function stepLegacySubsystemBVoidO(input: LegacySubsystemBVoidOInput): void {
  const { state, id } = input;
  if ((state[4848 + id] ?? 0) > 1) state[4848 + id] = 0;
  input.localFlags[2] = true;
  state[808 + id] = input.onScore?.(
    state[UNIT_Y + id] ?? 0,
    state[id] ?? 0,
    state[UNIT_TARGET_Y + id] ?? 0,
    state[UNIT_TARGET_X + id] ?? 0,
  ) ?? 0;
}
