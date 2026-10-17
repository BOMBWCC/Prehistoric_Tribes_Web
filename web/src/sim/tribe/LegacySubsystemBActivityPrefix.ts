import { UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_SPEED, UNIT_TYPE } from "../../core/DenseLayout";
export type LegacySubsystemBActivityPrefixInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly onOther?: () => void;
  /** Original private m() result; no semantic label is assigned here. */
  readonly onM?: () => boolean;
};

export type LegacySubsystemBActivityPrefixResult = {
  /** false = offsets 72/88/105 `goto 1477`: b() returns false immediately. */
  readonly eligible: boolean;
  /** true = offsets 231..252: m() held, `dense[3636+v] = 0; return true`. */
  readonly handled: boolean;
  /** true = offsets 171/209 `goto 1185`: straight to the tail, skipping 253..1184. */
  readonly toTail: boolean;
};

/**
 * Exact b() offsets 59..253 before its packed type-13 branches.
 *
 * CORRECTED (2026-09-14): the two `goto 1185` exits (offset 171,
 * `5050 < 1010 - 7777`, and offset 209, `(2929 & 255) > 7 && 3030 != 0`)
 * were reported as plain "eligible", so the orchestrator ran the 253..1184
 * body before the tail instead of jumping over it. They now set `toTail`.
 */
export function stepLegacySubsystemBActivityPrefix(
  input: LegacySubsystemBActivityPrefixInput,
): LegacySubsystemBActivityPrefixResult {
  const { state, id } = input;
  if (state[UNIT_OFFSET_X + id] !== 0 || state[UNIT_OFFSET_Y + id] !== 0 || (state[UNIT_ORDER + id] ?? 0) >= 2) {
    return { eligible: false, handled: false, toTail: false };
  }

  if (state[UNIT_TYPE + id] === 109) input.onOther?.();
  if ((state[5050 + id] ?? 0) < (state[UNIT_SPEED + id] ?? 0) - (state[7777 + id] ?? 0)) {
    return { eligible: true, handled: false, toTail: true };
  }
  if (((state[UNIT_MODE + id] ?? 0) & 0xff) > 7 && (state[3030 + id] ?? 0) !== 0) {
    return { eligible: true, handled: false, toTail: true };
  }
  if ((state[UNIT_AGE + id] ?? 0) >= 12 && input.onM?.() === true) {
    state[UNIT_CARRY_AMOUNT + id] = 0;
    return { eligible: true, handled: true, toTail: false };
  }
  return { eligible: true, handled: false, toTail: false };
}
