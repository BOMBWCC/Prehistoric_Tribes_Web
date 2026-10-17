import { BLD_KIND, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE } from "../core/DenseLayout";
/**
 * Direct translation of `private void ag()` (bytecode/f-javap.txt offsets
 * 0..334, line 23027) -- `af()`'s own tail dispatcher, reached from several
 * `r[as]` ranges. Marks the current cell (or every cell owned by `F:B`,
 * class `b`'s "action group" byte) with a target position and an action
 * code derived from `r[as]`, then falls through to the shared `l:B=k:B`
 * tail every `af()` branch performs.
 */
export type LegacyZAgState = {
  dense: Int8Array;
  qCounter: number;
  r: Int8Array;
  as: number;
  kByte: number;
  yByte: number;
  IByte: number;
  AByte: number;
  KByte: number;
  FByte: number;
  aByte2d: readonly Int8Array[];
  wByte: number;
  cSInt: number;
  frameLayoutL: number;
};

export type LegacyZAgCallbacks = {
  readonly onSelectionReset?: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
  readonly onL?: (value: number) => void;
};

export function stepLegacyZAg(state: LegacyZAgState, callbacks: LegacyZAgCallbacks = {}): void {
  if ((state.dense[BLD_KIND + state.qCounter] ?? 0) !== 6) return;

  let action = 3;
  if ((state.r[state.as] ?? 0) === 29) action = 2;

  if (state.kByte > 0) {
    const id = state.kByte;
    state.dense[UNIT_TARGET_X + id] = state.yByte + state.IByte;
    state.dense[UNIT_TARGET_Y + id] = state.AByte + state.KByte;
    state.dense[UNIT_TYPE + id] = 44 + (state.r[state.as] ?? 0);
    state.dense[UNIT_ORDER + id] = action;
    callbacks.onSelectionReset?.(false, true, false, true);
    state.wByte = 1;
  } else if (state.FByte !== -1) {
    // TERMINATES BY VALUE, not by exception (verified 2026-09-03,
    // bytecode/f-javap.txt offset 153..289, `ag()`): `cursor` (local var 2)
    // is a genuine int, incremented by a plain `iinc` with no byte
    // truncation, and the loop condition is the raw `a[F][cursor] <= 0`
    // baload -- this row is expected to be a real 0/negative-terminated
    // id list, and Java finds that terminator by value before `cursor`
    // could ever walk past the row's real length. `ag()` has no bytecode
    // try/catch of its own, so a row that were ever NOT properly
    // terminated would make real Java throw ArrayIndexOutOfBoundsException
    // uncaught. This port's `?? 0` fallback for an out-of-bounds read
    // evaluates `0 > 0` as false, i.e. it also stops the loop -- matching
    // real Java for every properly-terminated row, and merely exiting
    // quietly instead of throwing for the same malformed-row case Java
    // itself doesn't defend against either. Not the composeLegacyC/
    // LegacyZAa-au class of "?? 0 keeps the condition permanently true"
    // hang -- this loop can never spin, only possibly stop one index off
    // from where uncaught real Java would have crashed.
    const row = state.aByte2d[state.FByte];
    let cursor = 0;
    while (row && (row[cursor] ?? 0) > 0) {
      const id = row[cursor] ?? 0;
      state.dense[UNIT_TARGET_X + id] = state.yByte + state.IByte;
      state.dense[UNIT_TARGET_Y + id] = state.AByte + state.KByte;
      state.dense[UNIT_TYPE + id] = 44 + (state.r[state.as] ?? 0);
      state.dense[UNIT_ORDER + id] = action;
      cursor += 1;
    }
    callbacks.onSelectionReset?.(true, true, false, false);
    state.wByte = 1;
  } else {
    callbacks.onL?.(1);
    state.cSInt = -(state.r[state.as] ?? 0) - 1;
  }

  state.frameLayoutL = state.kByte;
}
