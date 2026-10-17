import { UNIT_AGE, UNIT_DIRECTION } from "../core/DenseLayout";
/** Exact state preparation at the entry of private f.a(IIIIB). */
export type LegacyProjectionDrawPreparationInput = {
  readonly aq: number; readonly ar: number; readonly as: number; readonly at: number; readonly kind: number;
  readonly stateX: boolean; readonly stateV: number; readonly aQ: number;
  readonly dense: Int8Array; readonly aBytes: Int8Array; readonly aShorts: Int16Array;
  readonly shortTables: readonly Int16Array[]; readonly byteTables: readonly Int8Array[];
  readonly onP: (state: LegacyProjectionDrawPreparationState) => void;
  readonly onQ: (state: LegacyProjectionDrawPreparationState) => void;
};

export type LegacyProjectionDrawPreparationState = {
  aq: number; ar: number; as: number; at: number; au: number; av: number; aw: number; kind: number;
  stateX: boolean;
};

export function prepareLegacyProjectionDraw(input: LegacyProjectionDrawPreparationInput): LegacyProjectionDrawPreparationState {
  const state: LegacyProjectionDrawPreparationState = {
    aq: input.aq, ar: input.ar, as: input.as, at: input.at, au: 0, av: 0, aw: 0,
    kind: input.kind, stateX: input.stateX,
  };
  state.av = (input.dense[(input.aShorts[117] ?? 0) + state.aq] ?? 0) & 0xff;
  if (state.at >= 0) {
    const family = ((((input.shortTables[3]?.[state.av] ?? 0) & 0xffff) >> 14) & 3) << 3;
    state.at = input.aBytes[(input.aShorts[99] ?? 0) + family + state.at] ?? 0;
    const entry = ((input.shortTables[2]?.[state.av] ?? 0) & 4095)
      + state.at + (input.byteTables[4]?.[state.av] ?? 0) * (input.dense[(input.aShorts[117] ?? 0) + 1 + state.aq] ?? 0);
    state.au = input.shortTables[4]?.[entry] ?? 0;
    state.ar += input.byteTables[7]?.[entry] ?? 0;
    state.as += (input.byteTables[8]?.[entry] ?? 0) + input.aQ;
    if (state.stateX) {
      if (state.av !== 124) {
        state.au += 48;
        state.av = 1;
      }
      state.stateX = false;
    }
    if (state.av >= 141 && state.av <= 144) {
      state.ar += 22 * (input.aBytes[(input.aShorts[1] ?? 0) + (input.dense[UNIT_DIRECTION + state.aq] ?? 0)] ?? 0);
    }
  } else {
    state.av = -state.at;
    if ((input.dense[UNIT_AGE + state.aq] ?? 0) < 12) {
      state.av = 14;
      state.as -= 6;
    }
    state.au = input.shortTables[4]?.[((input.shortTables[2]?.[state.av] ?? 0) & 4095) + 2] ?? 0;
  }
  state.aw = ((((input.shortTables[2]?.[state.av] ?? 0) & 0xffff) & 61440) >> 14);
  if (input.stateV !== 0) input.onQ(state); else input.onP(state);
  return state;
}
