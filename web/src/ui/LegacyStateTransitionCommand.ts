/** Raw port of final f.b(int), including its S/T/U state-transition calls. */
export type LegacyStateTransitionCommandInput = {
  readonly state: {
    ai: number;
    ak: number;
    aj: number;
    /**
     * `o:I` (#348) -- offset 56's `o = 0`. FIXED (2026-08-31): was
     * conflated with `o:B`(#349) into a single `o` field (the 2026-08-25
     * "FOUND, NOT FIXED" note). Split now that this method's tail is
     * reachable from f.ao()'s Q===18||17 branch.
     */
    oInt: number;
    /** `o:B` (#349) -- offsets 70..95: `o = byte(table154[q] + ak)`, the cutscene picture. */
    oByte: number;
    /**
     * `v:B` (#376) -- NOT written by this method. Present only because the
     * same shared state bag is passed to `S()`/`U()`, which do write it
     * (`S()` offset 183 sets 0, `U()` offset 717 sets 1). `main.ts` reads
     * this one to choose `stepFrameDispatch()` vs `stepCameraScroll()`.
     */
    v: number;
    /**
     * `v:I` (#375) -- offset 67's `v = 71 + ak`. FIXED (2026-08-31): this
     * write previously landed on `v` above and was propagated to
     * `game.loopMode` by the caller. That is a DIFFERENT real field: direct
     * bytecode read confirms `final void b(int)` offset 62..67 targets
     * #375 while `S()`/`U()` target #376. The mix-up meant (a) `game.loopMode`
     * got `71+ak` (non-zero), which would have stopped `main.ts` from
     * calling `stepFrameDispatch()` at all, and (b) `v:I` -- the selector
     * `f.ar()`/`f.ao()` dispatch on as `vInt` -- never received its real
     * value. Latent until now because this whole tail was unreachable.
     */
    vInt: number;
    q: number;
    aT: number;
    aS: number;
    aR: number;
    al: number;
    am: number;
    an: number;
    I: number;
    K: number;
    Q: number;
    H: boolean;
    p: Int8Array;
  };
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onReset?: () => void;
  readonly onS?: () => void;
  readonly onT?: () => void;
  readonly onU?: () => void;
  readonly onRecordAction?: (first: number, second: number) => void;
};

function byte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function tableByte(input: LegacyStateTransitionCommandInput, table: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[table] ?? 0) + index] ?? 0;
}

export function stepLegacyStateTransitionCommand(
  input: LegacyStateTransitionCommandInput,
  value: number,
): void {
  const { state } = input;
  input.onReset?.();
  if (value >= 0) {
    state.ai = byte(value);
    input.onS?.();
    input.onT?.();
  } else if (state.ak === state.aj - 1) {
    input.onU?.();
    return;
  } else {
    state.ak = byte(state.ak + 1);
  }

  state.oInt = 0;
  state.vInt = 71 + state.ak;
  // Offsets 70..95: a[a_s[154] + q] + ak. CORRECTED 2026-09-30: indexed
  // q + ak as well, so the intro's third page showed picture 5, not 2.
  state.oByte = byte(tableByte(input, 154, state.q) + state.ak);
  state.aS = tableByte(input, 311, 229 + input.state.aT + state.ak);
  state.aR = tableByte(input, 155, 84 + state.aS) < 0 ? -1 : 0;
  state.al = tableByte(input, 311, input.state.aT + state.ak);
  state.am = state.p[state.al] ?? 0;
  state.an = tableByte(input, 311, 458 + input.state.aT + state.ak);

  if (state.an > 100) input.onRecordAction?.(state.an, -2);
  else if (state.an === 99) {
    state.am = state.p[0] ?? 0;
    input.onRecordAction?.(state.am, -2);
  } else if (state.an > 0) {
    input.onRecordAction?.(state.p[state.an] ?? 0, -2);
  } else if (state.an === -100) {
    if (state.ai === 51) {
      state.I = 8;
      state.K = 67;
    }
    input.onRecordAction?.(-100, -2);
  } else if (state.an < 0) {
    input.onRecordAction?.(state.an, -3);
    if (state.ai === 36 || state.ai === 38) {
      state.I = byte(state.I + 4);
      state.K = byte(state.K - 1);
    }
  }
  state.H = true;
}
