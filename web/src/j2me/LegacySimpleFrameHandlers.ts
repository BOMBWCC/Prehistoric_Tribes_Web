import type { LegacyFrameHandler } from "./LegacyFrameDispatch";

export type LegacySimpleFrameState = {
  /** f.Q:B (#90), read by H(). */
  Q: number;
  H: boolean;
  I: boolean;
  J: boolean;
  ab: boolean;
  x: number;
  vInt: number;
  m: number;
  aP: number;
  cFlag: boolean;
  AFlag: boolean;
  flags: boolean[];
  k: Int8Array;
};

export type LegacySimpleFrameCallbacks = {
  readonly onPrimitive?: (index: number, x: number, y: number) => void;
  readonly onN?: () => void;
  readonly onU?: () => void;
  readonly onO?: () => void;
  readonly onC?: () => void;
  readonly onInputReset?: () => void;
};

/**
 * Exact state/primitive portions of f.H(), f.I(), f.J(), f.K(), f.L(), f.N(),
 * and f.P(). Rendering helpers and unresolved resource-table consumers stay as
 * callbacks so no screen meaning is invented here.
 */
export function stepLegacySimpleFrameHandler(
  handler: Extract<LegacyFrameHandler, "H" | "I" | "J" | "K" | "L" | "N" | "P">,
  state: LegacySimpleFrameState,
  callbacks: LegacySimpleFrameCallbacks = {},
): void {
  switch (handler) {
    case "H":
      // f.H(), bytecode/f-javap.txt line 16103: F() runs it for any Q with
      // t153[Q] == 1 once c != -1 -- e.g. Q 11, the in-game pause menu.
      // Added 2026-10-01: it had no port, so that menu drew nothing.
      if (state.H) {
        state.H = false;
        callbacks.onO?.();
        if (state.Q === 10 || state.Q === 11 || state.Q === 12 || state.Q === 13) {
          state.k[53] = -1;
          state.k[54] = 1;
        } else if (state.Q === 16 || state.Q === 21 || state.Q === 22) {
          state.k[53] = 1;
          state.k[54] = -1;
        }
        state.k[52] = -1;
        state.flags[10] = true;
      }
      callbacks.onPrimitive?.(10, 25, 64);
      callbacks.onPrimitive?.(17, 0, 320);
      return;
    case "I":
      if (state.H) {
        state.H = false;
        state.flags[11] = true;
        state.vInt = 69;
        state.k[55] = 1;
        callbacks.onPrimitive?.(11, 0, 0);
        state.k[55] = -1;
      }
      return;
    case "J":
      if (state.H) {
        state.H = false;
        state.flags[11] = true;
        state.flags[15] = true;
        callbacks.onPrimitive?.(11, 0, 0);
        callbacks.onPrimitive?.(17, 0, 320);
      }
      callbacks.onPrimitive?.(15, 0, 0);
      return;
    case "K":
      if (state.H) {
        state.H = false;
        state.AFlag = true;
        callbacks.onN?.();
        callbacks.onU?.();
        callbacks.onO?.();
        state.flags[12] = true;
      }
      callbacks.onPrimitive?.(12, 0, 0);
      callbacks.onPrimitive?.(17, 0, 320);
      return;
    case "L":
      if (state.H) {
        state.H = false;
        state.flags[11] = true;
        callbacks.onPrimitive?.(11, 0, 0);
        state.flags[14] = true;
        callbacks.onC?.();
      }
      callbacks.onPrimitive?.(14, 120, 160);
      state.flags[17] = true;
      callbacks.onPrimitive?.(17, 0, 320);
      return;
    case "N":
      if (state.ab) {
        state.ab = false;
        state.x = state.vInt;
        state.vInt = 61;
        state.flags[11] = true;
        state.k[55] = 1;
        callbacks.onPrimitive?.(11, 0, 0);
        state.k[55] = -1;
        callbacks.onPrimitive?.(17, 0, 320);
      }
      return;
    case "P":
      stepLegacyP(state, callbacks);
      return;
  }
}

function stepLegacyP(state: LegacySimpleFrameState, callbacks: LegacySimpleFrameCallbacks): void {
  if (state.aP > 0 && !state.J) {
    state.aP += 4;
    state.cFlag = true;
    if (state.aP - 4 > 160) {
      state.aP = -state.aP;
      state.cFlag = false;
      callbacks.onInputReset?.();
      return;
    }
  }

  if (state.H && !state.J) {
    state.flags[12] = true;
  }
}
