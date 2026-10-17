import { UNIT_AGE, UNIT_GENDER } from "../core/DenseLayout";
/** Direct stateful scan of private f.p(); a()/b() remain explicit callbacks. */
export type LegacyProjectionPInput = {
  readonly aq: number; readonly ar: number; readonly as: number; readonly au: number; readonly kind: number;
  readonly dense: Int8Array; readonly shortTables: readonly Int16Array[]; readonly byteTables: readonly Int8Array[];
  readonly allowA: (state: LegacyProjectionPState) => boolean;
  readonly allowB: (state: LegacyProjectionPState) => boolean;
  readonly onB: (index: number, x: number, y: number) => void;
  readonly onA: (index: number, x: number, y: number) => void;
};

export type LegacyProjectionPState = {
  ao: number; ap: number; ax: number; ay: number; az: number; an: number;
};

export function runLegacyProjectionP(input: LegacyProjectionPInput): LegacyProjectionPState {
  const state: LegacyProjectionPState = { ao: -1, ap: -1, ax: 0, ay: 0, az: -1, an: -1 };
  const base = input.shortTables[8]?.[input.au] ?? 0;
  const count = (input.byteTables[15]?.[input.au] ?? 0) & 0xff;
  for (let cursor = 0; cursor < count; cursor += 1) {
    state.az = base + cursor;
    if ((input.shortTables[7]?.[state.az] ?? 0) === 0) continue;
    state.ax = 0;
    state.ay = (input.byteTables[14]?.[state.az] ?? 0) & 15;
    if (input.kind === 29) {
      if (!input.allowA(state)) continue;
      if ((input.dense[UNIT_AGE + input.aq] ?? 0) >= 12) {
        if (input.aq >= 51) state.an = 4;
        if (!input.allowB(state)) continue;
      }
      if (state.ay === 7 && (input.dense[UNIT_GENDER + input.aq] ?? 0) !== 0) continue;
      if (state.ay === 0) {
        state.ap = state.az;
        if (input.aq >= 51) state.ax = 1;
      } else if (state.ay === 9) {
        state.ao = state.az;
        state.ax = (input.dense[5151 + input.aq] ?? 0) & 1;
      } else if (state.ay === 5) continue;
    } else if (state.ay === 0) {
      state.ap = state.az;
      state.ao = state.az;
    }
    const x = (input.shortTables[7]?.[state.az] ?? 0) + input.ar + (input.byteTables[12]?.[state.az] ?? 0);
    const y = input.as + (input.byteTables[13]?.[state.az] ?? 0);
    if (((input.byteTables[14]?.[state.az] ?? 0) & 0xff) >> 7 === 0) input.onB(input.shortTables[7]?.[state.az] ?? 0, x, y);
    else input.onA(input.shortTables[7]?.[state.az] ?? 0, x, y);
    state.an = -1;
  }
  return state;
}
