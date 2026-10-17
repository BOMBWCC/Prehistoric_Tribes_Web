import { UNIT_AGE, UNIT_HP } from "../core/DenseLayout";
export type LegacyZAdState = {
  readonly F: boolean;
  readonly qByte: number;
  readonly N: boolean;
  readonly L: boolean;
  readonly K: boolean;
  readonly e: Int8Array;
  readonly r: Int8Array;
  ar: number;
  /** aq:B (#215) -- the icon offset read at offset 143. */
  aq: number;
  /** aq:I (#216) -- a DIFFERENT field, the unit loop of offsets 164..341 (game.projectionAq). */
  aqInt: number;
};

export type LegacyZAdCallbacks = {
  readonly onNineFlagReset?: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, h: boolean, i: boolean) => void;
};

/**
 * Direct mirror of private f.ad(), javap offsets 0..357.
 * CORRECTED 2026-10-12 (oracle run 10, frame 27774): the unit loops count with
 * aq:I (#216), not aq:B (#215), so picking a chief no longer leaves aq:B at 51.
 */
export function stepLegacyZAd(state: LegacyZAdState, callbacks: LegacyZAdCallbacks = {}): void {
  if (!state.F) {
    if (state.qByte !== 3) {
      state.r[state.ar] = 10;
      state.ar += 1;
    }
    state.r[state.ar] = state.N ? 15 : 12;
    state.ar += 1;
    if (!state.N) {
      state.r[state.ar] = state.L ? 14 : 11;
      state.ar += 1;
    }
    state.r[state.ar] = 13;
    state.ar += 1;
    state.r[state.ar] = state.aq + 23;
    state.ar += 1;
    return;
  }

  state.aqInt = 1;
  while (state.aqInt <= 50) {
    if (state.e[UNIT_HP + state.aqInt] > 0 && state.e[UNIT_AGE + state.aqInt] >= 12) {
      state.r[state.ar] = -state.aqInt;
      state.ar += 1;
    }
    state.aqInt += 1;
  }
  if (!state.K) {
    state.aqInt = 1;
    while (state.aqInt <= 50) {
      if (state.e[UNIT_HP + state.aqInt] > 0 && state.e[UNIT_AGE + state.aqInt] < 12) {
        state.r[state.ar] = -state.aqInt;
        state.ar += 1;
      }
      state.aqInt += 1;
    }
  }
  callbacks.onNineFlagReset?.(false, false, false, true, true, false, false, false, false);
}
