export type LegacyZLState = {
  readonly d: Int16Array;
  readonly k: Int8Array;
  readonly flags: boolean[];
  readonly bFlags: boolean[];
  /** f.c:[Z (#255) -- persisted 9-flag snapshot; see stepLegacyZL's docblock. */
  readonly cSnapshot: boolean[];
  readonly q: number;
  w: number;
  x: number;
  Y: number;
  s: number;
  P: boolean;
  M: boolean;
  O: boolean;
};

export type LegacyZLCallbacks = {
  readonly onFourFlagReset?: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
  readonly onNineFlagReset?: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, h: boolean, i: boolean) => void;
  readonly onEntityMode?: (id: number, value: boolean) => void;
  readonly onAh?: () => void;
};

/**
 * Direct mirror of private f.l(int), javap offsets 0..376.
 *
 * 2026-08-18: re-verified against full bytecode while wiring `X()`'s own
 * `l(-1)` call sites and found a real bug in the original port: the
 * `value===-1` branch (the final `else` below) was rebuilding its 9-flag
 * snapshot from LIVE `state.flags` using the skip-index-3 pattern that
 * actually belongs to the OTHER (`value>-1`, `Y>5`) branch. The real
 * bytecode instead reads back `state.cSnapshot` (f.c:[Z #255) -- a
 * PERSISTED snapshot taken unconditionally at the top of the `value>-1`
 * branch (offsets 42..135, before the `Y<=5` check even runs) using the
 * skip-3 pattern, then read back with consecutive indices 0..8 (no skip)
 * here. Fixed both: the `value>-1` branch now writes `cSnapshot`, and the
 * `value===-1` branch reads it instead of `state.flags`.
 */
export function stepLegacyZL(state: LegacyZLState, value: number, callbacks: LegacyZLCallbacks = {}): void {
  state.Y = value;
  if (state.Y > -1) {
    state.d[4] = 33 + state.Y;
    state.k[4] = 1;
    state.x = state.w;
    state.cSnapshot[0] = state.flags[0] ?? false;
    state.cSnapshot[1] = state.flags[1] ?? false;
    state.cSnapshot[2] = state.flags[2] ?? false;
    state.cSnapshot[3] = state.flags[4] ?? false;
    state.cSnapshot[4] = state.flags[5] ?? false;
    state.cSnapshot[5] = state.flags[6] ?? false;
    state.cSnapshot[6] = state.flags[7] ?? false;
    state.cSnapshot[7] = state.flags[8] ?? false;
    state.cSnapshot[8] = state.flags[9] ?? false;
    if (state.Y <= 5) callbacks.onFourFlagReset?.(true, false, true, false);
    else callbacks.onNineFlagReset?.(state.flags[0] ?? false, false, true, state.flags[4] ?? false, state.flags[5] ?? false, state.flags[6] ?? false, state.flags[7] ?? false, state.flags[8] ?? false, state.flags[9] ?? false);
    state.w = state.Y >= 3 ? 4 : 3;
    state.bFlags[2] = true;
  } else if (state.Y === -2) {
    callbacks.onEntityMode?.(state.q, true);
    state.d[4] = 0;
  } else {
    state.w = state.x;
    callbacks.onNineFlagReset?.(
      state.cSnapshot[0] ?? false, state.cSnapshot[1] ?? false, state.cSnapshot[2] ?? false,
      state.cSnapshot[3] ?? false, state.cSnapshot[4] ?? false, state.cSnapshot[5] ?? false,
      state.cSnapshot[6] ?? false, state.cSnapshot[7] ?? false, state.cSnapshot[8] ?? false,
    );
    state.d[4] = 0;
    if (state.s === 100) callbacks.onAh?.();
    else state.P = true;
    state.M = false;
    state.O = false;
  }
  state.s = 0;
}
