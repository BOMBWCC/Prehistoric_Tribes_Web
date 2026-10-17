import { UNIT_CARRY_AMOUNT, UNIT_RECORD, UNIT_TYPE } from "../../core/DenseLayout";
export type LegacySubsystemBActionSelectorInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly onN?: () => void;
  readonly onAn?: () => void;
};

/** Exact b() offsets 533..614 dispatch between an() and n(). */
export function selectLegacySubsystemBAction(input: LegacySubsystemBActionSelectorInput): void {
  const { state, id } = input;
  if ((state[UNIT_RECORD + id] ?? 0) !== -1) {
    input.onN?.();
    return;
  }
  const type = state[UNIT_TYPE + id] ?? 0;
  if (type >= 10 && type <= 16 && (state[UNIT_CARRY_AMOUNT + id] ?? 0) > 0) input.onAn?.();
  else input.onN?.();
}
