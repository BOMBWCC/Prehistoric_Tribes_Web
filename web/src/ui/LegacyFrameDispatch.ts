import type { LegacyGameState } from "../core/LegacyGameState";

/** The private method selected by f.F(), retaining original method letters. */
export type LegacyFrameHandler = "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "P" | "Q32" | "NONE";

/**
 * Direct control-flow mirror of f.F().
 *
 * `denseState` is the byte[] read through f.a/f.a (the `/a`-backed state
 * table), so this function intentionally takes the table as a parameter
 * instead of guessing a screen meaning for any numeric Q value.
 */
export function selectLegacyFrameHandler(
  game: Pick<LegacyGameState, "missionFrame" | "screen">,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  stateTableIndex: number,
): LegacyFrameHandler {
  const stateValue = readState(packedBytes, packedOffsets, stateTableIndex, game.screen);
  if (game.missionFrame === -1 && stateValue === 1) return "G";
  if (stateValue === 1) return "H";

  switch (game.screen) {
    case 23: return "I";
    case 15: return "J";
    case 17: return "P";
    case 20: return "K";
    case 18: return "NONE"; // f.F() performs inline side effects here.
    case 19: return "L";
    case 24: return "NONE"; // guarded inline branch.
    case 25: return "M";
    case 27: return "N";
    case 32: return "Q32";
    default: return "NONE";
  }
}

export type LegacyFrameDispatchState = {
  missionFrame: number;
  screen: number;
  H: boolean;
  N: number;
  c1: number;
  flags: boolean[];
};

export type LegacyFrameDispatchInput = {
  readonly state: LegacyFrameDispatchState;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly stateTableIndex: number;
  readonly onHandler?: (handler: Exclude<LegacyFrameHandler, "NONE" | "Q32">) => void;
  readonly onPrimitive?: (index: number, x: number, y: number) => void;
  readonly onL3?: () => void;
};

/** Exact inline branches in f.F(); G/H/I/J/P/K/L/M/N remain callbacks. */
export function stepLegacyFrameDispatch(input: LegacyFrameDispatchInput): void {
  const { state } = input;
  const handler = selectLegacyFrameHandler(state, input.packedBytes, input.packedOffsets, input.stateTableIndex);
  if (handler !== "NONE" && handler !== "Q32") input.onHandler?.(handler);

  if (state.screen === 18) {
    if (state.H) {
      state.H = false;
      state.flags[13] = true;
      state.flags[11] = true;
      input.onPrimitive?.(11, 0, 0);
      input.onPrimitive?.(17, 0, 320);
    }
    input.onPrimitive?.(13, 0, 0);
  } else if (state.screen === 24) {
    // f-javap.txt offset 229's `ifeq 379` skips the ENTIRE block (all three
    // primitive draws) when H is false -- unlike Q===18 above, there is no
    // unconditional trailing draw here. This is the win/lose outcome
    // screen (Q=24); see LegacyFrameStep.ts's stepLegacyFrame (f.j()) for
    // the v:I=56/57 ("you have lost!"/"hurrah! you've won!") trigger.
    if (state.H) {
      state.H = false;
      state.flags[11] = true;
      state.flags[16] = true;
      input.onPrimitive?.(11, 0, 0);
      input.onPrimitive?.(16, 0, 0);
      input.onPrimitive?.(17, 0, 320);
    }
  } else if (state.screen === 32) {
    // f-javap.txt offset 327's `ifeq 379` likewise skips flags[17] and the
    // primitive-17 draw (not just the onL3 image draw) when H is false.
    if (state.H) {
      state.H = false;
      input.onL3?.();
      state.flags[17] = true;
      input.onPrimitive?.(17, 0, 320);
    }
  }
  state.N = state.c1;
}

function readState(table: Int8Array, offsets: Int16Array, tableIndex: number, state: number): number {
  if (!Number.isInteger(tableIndex) || tableIndex < 0 || tableIndex >= offsets.length) return 0;
  const base = offsets[tableIndex];
  const index = base + state;
  if (!Number.isInteger(index) || index < 0 || index >= table.length) return 0;
  return table[index];
}
