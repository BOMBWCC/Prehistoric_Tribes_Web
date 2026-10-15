export type LegacyZAiState = {
  readonly flags: boolean[];
  readonly bFlags: boolean[];
  readonly r: Int8Array;
  readonly ad: number;
  readonly as: number;
  readonly ar: number;
  readonly aX: number;
  readonly aW: number;
  readonly q: number;
  l: number;
  T: boolean;
  U: boolean;
};

export type LegacyZAiCallbacks = {
  readonly onNineFlagReset?: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, h: boolean, i: boolean) => void;
  readonly onFourFlagReset?: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
};

/** Direct mirror of private f.ai(), javap offsets 0..299. */
export function stepLegacyZAi(state: LegacyZAiState, callbacks: LegacyZAiCallbacks = {}): void {
  state.bFlags[2] = true;
  if (state.ad === 6) {
    state.T = state.as > 0;
    state.U = state.as < state.ar - 1;
  } else {
    state.T = state.aX > 0;
    state.U = state.aX + state.aW < state.ar;
  }

  const value = state.r[state.as] ?? 0;
  if (value < 0) {
    state.l = -value;
    callbacks.onNineFlagReset?.(false, false, state.flags[2] ?? false, true, state.flags[5] ?? false, false, false, false, false);
  } else if (state.flags[4]) {
    state.l = 0;
    callbacks.onFourFlagReset?.(true, false, true, false);
  }

  state.flags[8] = false;
  state.flags[7] = false;

  // Offsets 190..256: `if (ad == 6) goto 240; if (6 <= r[as] <= 8) goto 240;
  // if (r[as] != 16) goto 257; 240: a[8] = b[8] = true; return;`.
  // BUG FIX (2026-09-14): the port had `if (ad === 6) return;` -- but the
  // `if_icmpeq 240` at offset 195 jumps INTO the a[8]/b[8] block, it does not
  // return. Slot 8 is the Build submenu's detail panel (cost float, icon,
  // description): f.m() scans a[] and draws every set slot, and the jdb trace
  // on the real JAR shows c() firing aD = 0, 6, 8, 17 each frame in the Build
  // submenu, while the port only ever set 0, 6, 17.
  if (state.ad === 6 || (value >= 6 && value <= 8) || value === 16) {
    state.flags[8] = true;
    state.bFlags[8] = true;
    return;
  }
  if (value >= 0 && value < 6) {
    state.flags[7] = true;
    state.bFlags[7] = true;
  }
}
