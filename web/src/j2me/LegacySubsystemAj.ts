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
  if (state[9883 + index] !== 0) return;
  const type = state[9833 + index];
  if (type === 7) {
    state[9833 + index] = 0;
    input.onCellUpdate?.(state[9733 + index], state[9783 + index], 1, 1);
  }
  if (type === 6) {
    state[9833 + index] = 7;
    const base = (input.bShorts[110] ?? 0) + 7;
    state[9883 + index] = input.bBytes[base] ?? 0;
    input.onCellUpdate?.(state[9733 + index], state[9783 + index], 1, 1);
  }
  input.onAm?.();
}
