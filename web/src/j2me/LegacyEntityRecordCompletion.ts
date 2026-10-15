export type LegacyEntityRecordCompletionState = {
  w: number;
  q: number;
  P: boolean;
};

/** Direct mirror of final void f.d(int), not the RMS d(int) overload. */
export function completeLegacyEntityRecord(
  state: LegacyEntityRecordCompletionState,
  record: number,
): void {
  if (state.w === 2 && record === state.q) state.P = true;
}
