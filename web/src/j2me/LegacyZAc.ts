export type LegacyZAcState = {
  readonly e: Int8Array;
  readonly f: Int8Array;
  readonly r: Int8Array;
  readonly q: number;
  ar: number;
};

/** Direct mirror of private f.ac(), javap offsets 0..266. */
export function stepLegacyZAc(state: LegacyZAcState): void {
  const mode = state.e[8627 + state.q] ?? 0;
  const type = state.e[8749 + state.q] ?? 0;

  if (mode === 2) {
    state.r[state.ar] = 28;
    state.ar += 1;
  } else if (mode !== 1 && type < 12 && (state.e[9115 + state.q] ?? 0) < (state.f[type] ?? 0)) {
    state.r[state.ar] = 16;
    state.ar += 1;
  }

  if (mode === 1) {
    state.r[state.ar] = 27;
    state.ar += 1;
  } else if ((state.e[8505 + state.q] ?? 0) < (state.e[8566 + state.q] ?? 0) && type < 12) {
    state.r[state.ar] = 26;
    state.ar += 1;
  }

  state.r[state.ar] = 17;
  state.ar += 1;
}
