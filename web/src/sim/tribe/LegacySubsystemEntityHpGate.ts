import { UNIT_HP, UNIT_MAX_HP, UNIT_ORDER, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private boolean s()` (constant pool #415),
 * bytecode/b-javap.txt offsets 0..151 (line 36744). Real, working logic --
 * no confirmed-null field. Callers: `q()`'s own two gates and `r()`'s tail
 * (`LegacySubsystemEntityRegen.ts`/`LegacySubsystemEntityRRoll.ts`).
 *
 * `dense[1919+id] > 0` (still alive): no-op, returns `true`.
 * Otherwise (HP <= 0):
 *  - if the entity is self-occupying its own grid cell, calls the shared
 *    "vacate" helper (`private void a(int,int,int,byte)`#283, `onVacate`,
 *    same one `LegacySubsystemEntityRegen.ts`'s own vacate call and the
 *    already-ported dead-entity branch use) and returns `false`.
 *  - otherwise, resets `dense[1919+id]` AND `dense[6767+id]` to `1`
 *    (chained assignment in the original -- both fields set to the same
 *    value), sets `dense[6161+id]=2`, sets bit7 of `dense[8282+id]`, and
 *    returns `true`.
 */
export type LegacySubsystemEntityHpGateInput = {
  readonly state: Int8Array;
  readonly gridC: readonly Int8Array[];
  readonly entityId: number;
  /** private void a(int,int,int,byte) (#283) -- confirmed real call, not derived. */
  readonly onVacate?: (kind: number, x: number, y: number, id: number) => void;
};

export function stepLegacySubsystemEntityHpGate(input: LegacySubsystemEntityHpGateInput): boolean {
  const { state, gridC, entityId: id } = input;

  if ((state[UNIT_HP + id] ?? 0) > 0) return true;

  const row = gridC[state[UNIT_Y + id] ?? 0];
  if (row && (row[state[id] ?? 0] ?? 0) === id) {
    input.onVacate?.(19, state[id] ?? 0, state[UNIT_Y + id] ?? 0, id);
    return false;
  }

  state[UNIT_HP + id] = 1;
  state[UNIT_MAX_HP + id] = 1;
  state[UNIT_ORDER + id] = 2;
  state[8282 + id] = (state[8282 + id] ?? 0) | 128;
  return true;
}
