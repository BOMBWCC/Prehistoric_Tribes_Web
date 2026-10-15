export type LegacyZDispatchState = {
  readonly aI: number;
  readonly aJ: number;
  readonly aK: number;
  aG: number;
  aH: number;
};

export type LegacyZDispatchCallbacks = {
  readonly onComposite?: (index: number, x: number, y: number) => void;
  readonly onCommand?: (command: number) => void;
  readonly onUnportedBranch?: (kind: number, command: number) => void;
};

/** Proven prefix of private f.d(int,int), bytecode offsets 0..48. */
export function dispatchLegacyZ(state: LegacyZDispatchState, kind: number, command: number, callbacks: LegacyZDispatchCallbacks = {}): void {
  if (kind === 0) {
    callbacks.onComposite?.(state.aI, state.aJ, state.aK);
    state.aG = state.aJ;
    state.aH = state.aK;
    return;
  }
  if (kind === 1) {
    callbacks.onCommand?.(command);
    return;
  }
  callbacks.onUnportedBranch?.(kind, command);
}
