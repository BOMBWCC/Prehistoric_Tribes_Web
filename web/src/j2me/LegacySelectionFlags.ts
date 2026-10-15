/** Raw state used by private f.a(boolean,boolean,boolean,boolean). */
export type LegacySelectionFlagsState = {
  readonly aFlags: boolean[];
  readonly bFlags: boolean[];
  readonly uBytes: Int8Array;
  readonly dBytes: Int8Array;
  /** `a[a_s[195] + ad]`, the HUD record of slot ad. */
  readonly recordOf: (ad: number) => number;
  /** f.c:[I] (#264), the HUD records' source y in their Image. */
  readonly cInts: Int32Array;
  /** f.b:[I] (#241), the HUD records' heights. */
  readonly bInts: Int32Array;
  bb: number;
  ax: number;
  ag: number;
  ad: number;
  ba: number;
  /** P:B (#87). */
  P: number;
  /** A:I (#35). */
  AInt: number;
  /** C:Z (#41). */
  CFlag: boolean;
  /** K:B (#68), A:B (#34), A:Z (#36), d:S (#266). */
  K: number;
  A: number;
  AFlag: boolean;
  dSize: number;
};

/**
 * Exact bytecode prefix of f.a(ZZZZ), through the P/A/c viewport writes.
 * The later rendering-table tail is intentionally left as a separate seam.
 */
export function stepLegacySelectionFlags(
  state: LegacySelectionFlagsState,
  first: boolean,
  second: boolean,
  third: boolean,
  fourth: boolean,
  fifth = false,
  sixth = false,
  seventh = false,
  eighth = false,
  ninth = false,
): void {
  state.bFlags[0] = state.aFlags[0] = first;
  state.bFlags[1] = state.aFlags[1] = second;
  state.bFlags[2] = state.aFlags[2] = third;
  state.bFlags[4] = state.aFlags[4] = fourth;
  state.bFlags[5] = state.aFlags[5] = fifth;
  state.bFlags[6] = state.aFlags[6] = sixth;
  state.bFlags[7] = state.aFlags[7] = seventh;
  state.bFlags[8] = state.aFlags[8] = eighth;
  state.bFlags[9] = state.aFlags[9] = ninth;
  state.bFlags[17] = state.aFlags[17] = true;

  if (second) {
    if (state.uBytes[0] === 0) {
      state.bFlags[1] = state.aFlags[1] = true;
      state.bFlags[9] = state.aFlags[9] = false;
    } else {
      state.bFlags[9] = state.aFlags[9] = true;
      state.bFlags[1] = state.aFlags[1] = false;
    }
  }

  const oldBb = state.bb;
  if (state.aFlags[4]) {
    state.bb = 48;
    state.ax = state.dBytes[3] ?? 0;
  } else {
    state.bb = 22;
    state.ax = state.dBytes[2] ?? 0;
  }

  // Offsets 291..476: a taller HUD scrolls the camera one row down, and a
  // second row plus a full redraw (A:Z) if there is room; a shorter one the
  // reverse. CORRECTED 2026-10-01: these move A:B (#34), not ax:B; the
  // second step is a single `if`, not a loop; and the flag is A:Z, not C:Z.
  if (oldBb < state.bb && state.ag === 0 && state.K < state.dSize - 1) {
    state.ag = 1;
    state.K = toByte(state.K + 1);
    state.A = toByte(state.A - 1);
    if (state.K < state.dSize - 1) {
      state.K = toByte(state.K + 1);
      state.A = toByte(state.A - 1);
      state.AFlag = true;
    }
  } else if (oldBb > state.bb && !fourth && state.ag === 0 && state.K > 0) {
    state.ag = -1;
    state.K = toByte(state.K - 1);
    state.A = toByte(state.A + 1);
    if (state.K > 0) {
      state.K = toByte(state.K - 1);
      state.A = toByte(state.A + 1);
      state.AFlag = true;
    }
  }

  if (state.aFlags[1]) state.ad = 1;
  else if (state.aFlags[2]) state.ad = 2;
  else if (state.aFlags[5]) state.ad = 5;
  else if (state.aFlags[6]) state.ad = 6;
  else if (state.aFlags[9]) state.ad = 9;

  const record = state.recordOf(state.ad);
  // Offsets 565..591: ba = b:[I][record] (a height, not the record index).
  state.ba = state.bInts[record] ?? 0;
  const oldP = state.P;
  state.P = Math.trunc((319 - state.bb - state.ba + (state.dBytes[2] ?? 0)) / 16) + 1;
  if (state.P > oldP) state.CFlag = true;
  state.AInt = state.P * 16 + 16;
  state.cInts[2] = state.AInt;
  state.cInts[3] = state.AInt;
  const viewportRight = state.AInt + state.bb;
  state.cInts[4] = viewportRight;
  state.cInts[5] = viewportRight;
  state.cInts[7] = viewportRight;
  state.cInts[10] = viewportRight;
  // Offsets 721..778: c[11] = c[record] + b[record].
  state.cInts[11] = (state.cInts[record] ?? 0) + (state.bInts[record] ?? 0);
}

function toByte(value: number): number {
  return ((value & 0xff) ^ 0x80) - 0x80;
}
