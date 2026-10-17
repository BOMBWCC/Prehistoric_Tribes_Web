/** Raw state used by f.G(); unresolved image helpers stay explicit callbacks. */
export type LegacyGFrameState = {
  H: boolean;
  Q: number;
  U: number;
  V: number;
  N: number;
  c1: number;
  k: Int8Array;
  flags: boolean[];
  /** f.S:I (#98) -- the projection origin, set right before each a(IB) call. */
  S: number;
  /** f.T:I (#101). */
  T: number;
};

export type LegacyGFrameInput = {
  readonly state: LegacyGFrameState;
  readonly onSurfaceClear?: (target: number) => void;
  readonly onSurfaceCopy?: (target: number, source: number) => void;
  readonly onSurfaceHeader?: (target: number) => void;
  readonly onTargetChanged?: (target: number) => void;
  /** Mirrors the proven private a(int,int,int) / a(int,byte) calls. */
  readonly onDrawHelper?: (resourceId: number, x: number, y: number) => void;
  /** Mirrors f.a(byte,int,int), distinct from ordinary draw helpers. */
  readonly onFrameCommand?: (command: number, x: number, y: number) => void;
  readonly onImageHelper?: (resourceId: number, mode: number) => void;
  readonly onPrimitive?: (index: number, x: number, y: number) => void;
  /** f.G()'s four transient geometry slots and exact f.a(mask,divisor) RNG. */
  readonly geometry?: Int32Array[];
  readonly randomRemainder?: (mask: number, divisor: number) => number;
};

/**
 * Direct control-flow mirror of the state-bearing portion of f.G().
 *
 * The bytecode proves the flags and helper arguments below. The helper bodies
 * are intentionally callbacks until their image-slot and c.a(...) contracts
 * are ported from bytecode.
 */
export function stepLegacyGFrame(input: LegacyGFrameInput): void {
  const { state } = input;
  if (state.H) {
    state.H = false;
    state.N = state.c1;
    input.onSurfaceClear?.(state.N);
    // Offsets 120..137: S:I = 0, T:I = 248, then a(1118, 2). The origin is set
    // here, not derived inside the helper -- see LegacyImageHelperInvocation's
    // 2026-09-09 note. 248 puts this pass in the green ground band the clear
    // above painted at y 232..296.
    state.S = 0;
    state.T = 248;
    input.onImageHelper?.(1118, 2);

    if (
      state.Q === state.U || state.Q === 3 || state.Q === 12 || state.Q === 13 ||
      state.Q === 2 || state.Q === state.V || state.Q === 9 || state.Q === 14
    ) {
      state.k[53] = -1;
      state.k[54] = 1;
    } else if (state.Q === 16 || state.Q === 21 || state.Q === 22) {
      state.k[53] = 1;
      state.k[54] = -1;
    }
  }

  state.k[52] = -1;
  // BUG FIX (2026-09-09): the four-cloud loop used to run HERE, before the
  // target switch and the copy. G()'s own order (offsets 276..527) is:
  //   276..283  k[52] = -1
  //   284..288  N:B = M:B          -- the target switch
  //   291..315  Graphics[N].drawImage(Image[c[1]], 0, 328, 36)
  //   318..353  setColor(9422847); a(Graphics[N], 0, 0, a:[I][N], 80)
  //   356..527  the four-cloud loop
  // so the clouds are drawn AFTER the copy and the header clear, onto the
  // target the switch just selected -- not into the source surface that the
  // copy then overwrites from.
  state.N = 0;
  input.onTargetChanged?.(state.N);
  input.onSurfaceCopy?.(0, state.c1);
  input.onSurfaceHeader?.(0);
  if (input.geometry && input.randomRemainder) {
    for (let index = 0; index < 4; index += 1) {
      const xSlots = input.geometry[0];
      const ySlots = input.geometry[1];
      const variantSlots = input.geometry[2];
      // Offsets 363..388: re-roll a cloud once it has drifted past x 240, or
      // on the first pass (a[0][3] == -1000, set by run()). BUG FIX
      // (2026-10-08, oracle): the test was inverted, re-rolling every cloud
      // every frame (and burning 12+ extra Random calls per frame).
      if (xSlots[index] > 240 || xSlots[3] === -1000) {
        xSlots[index] = -88 - input.randomRemainder(0xffff, 60);
        ySlots[index] = input.randomRemainder(0xffff, 48);
        variantSlots[index] = input.randomRemainder(0xff, 4);
      }
      // Offsets 444..517: both moves are stored back (dup_x2/iastore), so the
      // clouds drift right; they were only applied to the draw position.
      xSlots[index] += (variantSlots[index] + 2) >> 1;
      ySlots[index] += input.randomRemainder(0xff, 5) === 0
        ? input.randomRemainder(0xff, 3) - 1
        : 0;
      input.onDrawHelper?.(1667 + variantSlots[index], xSlots[index], ySlots[index]);
    }
  }
  input.onDrawHelper?.(1665, 120, 0);
  // Offsets 681..698: S:I = 0, T:I = 272, then a(1118, 1).
  state.S = 0;
  state.T = 272;
  input.onImageHelper?.(1118, 1);
  if (input.onFrameCommand) input.onFrameCommand(10, 25, 64);
  else input.onDrawHelper?.(10, 25, 64);
  state.flags[10] = true;
  state.flags[17] = true;
  if (input.onFrameCommand) input.onFrameCommand(17, 0, 320);
  else input.onDrawHelper?.(17, 0, 320);
}
