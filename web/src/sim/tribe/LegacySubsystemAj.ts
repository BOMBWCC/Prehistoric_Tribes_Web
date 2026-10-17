import { RES_AMOUNT, RES_KIND, RES_X, RES_Y } from "../../core/DenseLayout";
export type LegacySubsystemAjInput = {
  readonly state: Int8Array;
  readonly bBytes: Int8Array;
  readonly bShorts: Int16Array;
  readonly index: number;
  readonly onCellUpdate?: (x: number, y: number, mode: number, flag: number) => void;
  readonly onAm?: () => void;
};

/** Confirmed field-update prefix of b.aj(); map ownership stays a callback. */
export function stepLegacySubsystemAj(input: LegacySubsystemAjInput): void {
  const { state, index } = input;
  if (state[RES_AMOUNT + index] !== 0) return;
  const type = state[RES_KIND + index];
  if (type === 7) {
    state[RES_KIND + index] = 0;
    input.onCellUpdate?.(state[RES_X + index], state[RES_Y + index], 1, 1);
  }
  if (type === 6) {
    state[RES_KIND + index] = 7;
    const base = (input.bShorts[110] ?? 0) + 7;
    state[RES_AMOUNT + index] = input.bBytes[base] ?? 0;
    input.onCellUpdate?.(state[RES_X + index], state[RES_Y + index], 1, 1);
  }
  input.onAm?.();
}
