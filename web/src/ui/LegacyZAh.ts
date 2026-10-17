/**
 * BUG FIX (2026-08-22, before first wiring): the original derivation
 * collapsed two distinct constant-pool fields -- `F:B`(#50, the
 * `k===0` guard's byte compare) and `F:Z`(#49, unconditionally cleared
 * in the tail) -- into a single `F` property, so the tail write
 * (`state.F = -1`) was clobbering the wrong field's *type* (a byte
 * sentinel value written into what should be a boolean). Split into
 * `fByte`/`entityFocusFlag`, matching `FByte`/`entityFocusFlag` in
 * `LegacyGameState.ts`. Also renamed the vague `onInputReset` callback
 * to `onI` since bytecode offset 105 (`invokespecial #610, Method
 * i:()V`) is specifically `resetLegacyZI`, not a generic reset.
 */
export type LegacyZAhState = {
  K: boolean;
  P: boolean;
  w: number;
  k: number;
  fByte: number;
  l: number;
  q: number;
  entityFocusFlag: boolean;
  V: boolean;
};

export type LegacyZAhCallbacks = {
  readonly onL?: (value: number) => void;
  readonly onSelectionReset?: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
  readonly onI?: () => void;
};

/** Direct mirror of private f.ah(), javap offsets 0..114. */
export function stepLegacyZAh(state: LegacyZAhState, callbacks: LegacyZAhCallbacks = {}): void {
  if (state.K) return;
  state.P = false;
  if (state.w === 4) {
    callbacks.onL?.(-1);
    return;
  }
  if (state.k !== 0) {
    state.w = 1;
    state.l = state.k;
    callbacks.onSelectionReset?.(false, true, false, true);
  } else if (state.fByte !== -1) {
    state.w = 1;
    callbacks.onSelectionReset?.(true, true, false, false);
  } else {
    state.w = 0;
    callbacks.onSelectionReset?.(true, true, false, false);
  }
  state.q = 0;
  state.entityFocusFlag = false;
  callbacks.onI?.();
  state.V = false;
}
