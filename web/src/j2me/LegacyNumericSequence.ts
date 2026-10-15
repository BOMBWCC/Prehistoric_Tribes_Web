/** Raw state used by f.m(int); field meanings remain unresolved. */
export type LegacyNumericSequenceState = {
  readonly i: Int32Array;
  readonly j: Int32Array;
  readonly aShort0: Int16Array;
  ae: boolean;
  af: boolean;
  ag: boolean;
  u: number;
  q: number;
};

/** Direct port of f.m(int), including its six-slot sequence and side effects. */
export function acceptLegacyNumericValue(state: LegacyNumericSequenceState, value: number): void {
  if (value === state.j[0]) {
    state.i.fill(0);
    state.i[0] = state.j[0];
    return;
  }
  if (state.i[0] !== state.j[0]) return;

  for (let index = 0; index < 6; index += 1) {
    if (state.i[index] === 0) {
      state.i[index] = value;
      break;
    }
  }
  state.ae = true;
  for (let index = 0; index < 5; index += 1) {
    if (state.i[index] !== state.j[index]) {
      state.ae = false;
      break;
    }
  }
  if (state.ae && state.i[5] !== 0) {
    switch (state.i[5]) {
      case 49: state.af = true; break;
      case 51: state.ag = true; break;
      case 55:
        for (const index of [0, 1, 2, 3, 4]) state.aShort0[index] += 100;
        for (const index of [5, 8, 10]) state.aShort0[index] += 3;
        break;
      case 57:
        state.u = 1;
        if (state.q === 0) state.q += 1;
        break;
      default:
        break;
    }
    state.i[0] = 0;
  }
}
