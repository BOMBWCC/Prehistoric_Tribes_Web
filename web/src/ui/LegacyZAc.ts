import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_WORK } from "../core/DenseLayout";
export type LegacyZAcState = {
  readonly e: Int8Array;
  readonly f: Int8Array;
  readonly r: Int8Array;
  readonly q: number;
  ar: number;
};

/** Direct mirror of private f.ac(), javap offsets 0..266. */
export function stepLegacyZAc(state: LegacyZAcState): void {
  const mode = state.e[BLD_WORK + state.q] ?? 0;
  const type = state.e[BLD_KIND + state.q] ?? 0;

  if (mode === 2) {
    state.r[state.ar] = 28;
    state.ar += 1;
  } else if (mode !== 1 && type < 12 && (state.e[BLD_LEVEL + state.q] ?? 0) < (state.f[type] ?? 0)) {
    state.r[state.ar] = 16;
    state.ar += 1;
  }

  if (mode === 1) {
    state.r[state.ar] = 27;
    state.ar += 1;
  } else if ((state.e[BLD_HP + state.q] ?? 0) < (state.e[BLD_MAX_HP + state.q] ?? 0) && type < 12) {
    state.r[state.ar] = 26;
    state.ar += 1;
  }

  state.r[state.ar] = 17;
  state.ar += 1;
}
