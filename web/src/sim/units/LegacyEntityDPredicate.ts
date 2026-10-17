import { UNIT_HP, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Exact `private boolean d()` (#369), bytecode/b-javap.txt line 11707,
 * offsets 0..427. Its only call site is `private void v()`'s offset 327
 * (`LegacyEntityCoreUpdate.ts`'s `onD` seam).
 *
 * WIRING FIX (2026-09-17): that seam used to call `LegacyEntityFGuard.ts`,
 * a second, partial port of `private boolean f()` (#381) -- whose real and
 * only call site is `i(int)`'s offset 1, already served by the complete
 * `LegacyEntityWorkDeposit.ts`. `d()` itself had no implementation anywhere
 * in this port (`#369` had zero hits), so two things never ran in live
 * play: the `7777` order-marker reset below, and the whole combat damage
 * resolution. Without the reset, `b()`'s auto-return-to-work branch
 * (`LegacySubsystemBDecision.ts`, which requires `7777 == 0`) could never
 * fire again for any villager that had ever been given an order, so
 * gatherers stopped for good after their first meal or nap -- measured as
 * a resource pool frozen for 3500+ ticks with four idle gatherers all
 * reading `7777 == 3`.
 *
 *  - 0..45: mode `-107`/`-106` -> `i(z)` (#391), true.
 *  - 46..116: mode `-95` -> target becomes `dense[8384]`/`dense[8445]`
 *    (bare absolute offsets: record 1's x/y, the tribe's own camp), then
 *    `g(3)` (#384) and `p()` (#408), true.
 *  - 117..211: when `z/10 <= B` and the type is neither 85 nor 80, a
 *    `6161 == 1` move order is cleared and `7777` is reset to 0.
 *  - 212..425: modes 106..108 are a landed hit: `dmg = t106[mode-106]`
 *    comes off both `1919` and `c.f[v]`, then `P()` (#252), `1313 = 0`,
 *    `4545 = 0`, and a unit at or below 0 HP is vacated through
 *    `a(19, x, y, v)` (#283). True.
 *  - 426..427: false.
 */
export type LegacyEntityDPredicateInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  /** b.z:I (#234) -- game.subsystemEntityZ. */
  readonly z: number;
  /** b.B:I (#8) -- the same per-entity value `entityBValue` derives. */
  readonly b: number;
  /** c.f:[B (#171) -- the hit-point mirror `a(int,int)` (#294) also writes. */
  readonly cBytes: Int8Array;
  readonly readPacked: (row: number, index: number) => number;
  /** i(int) (#391) -- LegacyEntityIUpdate. */
  readonly onI: (argument: number) => void;
  /** g(int) (#384). */
  readonly onG: (argument: number) => void;
  /** p() (#408). */
  readonly onPStep: () => void;
  /** P() (#252). */
  readonly onP: () => void;
  /** a(int,int,int,byte) (#283), the shared vacate helper. */
  readonly onVacate: (kind: number, x: number, y: number, id: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityDPredicate(input: LegacyEntityDPredicateInput): boolean {
  const { state, entityId: id } = input;
  const mode = () => state[UNIT_MODE + id] ?? 0;

  // Offsets 0..45.
  if (mode() === -107 || mode() === -106) {
    input.onI(input.z);
    return true;
  }

  // Offsets 46..116.
  if (mode() === -95) {
    state[UNIT_TARGET_X + id] = state[8384] ?? 0;
    state[UNIT_TARGET_Y + id] = state[8445] ?? 0;
    input.onG(3);
    input.onPStep();
    return true;
  }

  // Offsets 117..211. `idiv` truncates toward zero.
  const type = state[UNIT_TYPE + id] ?? 0;
  if (Math.trunc(input.z / 10) <= input.b && type !== 85 && type !== 80) {
    if ((state[UNIT_ORDER + id] ?? 0) === 1) state[UNIT_ORDER + id] = 0;
    state[7777 + id] = 0;
  }

  // Offsets 212..425.
  const hitMode = mode();
  if (hitMode >= 106 && hitMode <= 108) {
    const damage = input.readPacked(106, hitMode - 106);
    state[UNIT_HP + id] = toByte((state[UNIT_HP + id] ?? 0) - damage);
    input.cBytes[id] = toByte((input.cBytes[id] ?? 0) - damage);
    input.onP();
    state[UNIT_TIMER + id] = 0;
    state[UNIT_NEXT_WORKER + id] = 0;
    if ((state[UNIT_HP + id] ?? 0) <= 0) {
      input.onVacate(19, state[id] ?? 0, state[UNIT_Y + id] ?? 0, id);
    }
    return true;
  }

  return false;
}
