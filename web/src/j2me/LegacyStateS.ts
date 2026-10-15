/** Raw port of private f.S(), the setup phase before f.T(). */
export type LegacyStateSInput = {
  readonly state: {
    ai: number;
    ak: number;
    Z: number;
    aT: number;
    ao: number;
    aj: number;
    JFlag: boolean;
    v: number;
    Q: number;
    R: number;
    aP: number;
    K: number;
    s: boolean;
    p: Int8Array;
    dFlags: boolean[];
  };
  readonly aFlags: readonly boolean[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onAJ?: () => void;
  readonly onInputReset?: () => void;
  readonly onCSelector?: (value: number) => void;
  readonly onO?: () => void;
  readonly onSelectionSync?: (first: boolean, second: boolean, third: boolean, fourth: boolean) => void;
};

function byte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function tableByte(input: LegacyStateSInput, table: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[table] ?? 0) + index] ?? 0;
}

export function stepLegacyStateS(input: LegacyStateSInput): void {
  const { state } = input;
  input.onAJ?.();
  input.onInputReset?.();
  state.ak = 0;
  state.Z = 0;
  input.onCSelector?.(state.ai);

  state.aT = tableByte(input, 310, state.ai) & 0xff;
  const aoIndex = 229 + state.aT;
  state.ao = tableByte(input, 311, aoIndex);
  if (state.ai === 4 || state.ao === 0) {
    state.ao = 27;
    input.packedBytes[(input.packedOffsets[311] ?? 0) + aoIndex] = 27;
  }
  state.aj = byte((tableByte(input, 310, state.ai + 1) & 0xff) - state.aT);
  state.JFlag = state.ao >= 27;
  state.v = 0;
  state.R = state.Q;
  state.Q = 17;
  state.aP = tableByte(input, 155, 56 + state.ao);
  if (state.aP === 1) input.onO?.();
  if (state.ao !== 9 && !state.JFlag && state.aP !== 1) state.K = byte(state.K - 1);

  const flags = [0, 1, 2, 4, 5, 6, 7, 8, 9];
  for (let index = 0; index < flags.length; index += 1) state.dFlags[index] = input.aFlags[flags[index]] ?? false;
  input.onSelectionSync?.(true, true, false, false);
  state.s = true;

  const local = tableByte(input, 310, 71 + state.ai);
  const current = tableByte(input, 157, local);
  const next = tableByte(input, 157, local + 1);
  // Offsets 403..469: arraycopy(a, a_s[156] + t157[local], p, 0, ...).
  // CORRECTED 2026-09-30: also added `local`, so every scene's cast (who
  // speaks each line) was read from the wrong place.
  const source = (input.packedOffsets[156] ?? 0) + current;
  const length = next - current;
  if (source >= 0 && length > 0) state.p.set(input.packedBytes.subarray(source, source + length), 0);
}
