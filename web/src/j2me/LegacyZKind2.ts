export type LegacyZKind2State = {
  readonly Q: boolean;
  readonly R: boolean;
  readonly T: boolean;
  readonly U: boolean;
  readonly aI: number;
  readonly aJ: number;
  readonly aK: number;
  readonly y: number;
  readonly I: number;
  readonly W: number;
  readonly K: number;
  readonly X: number;
  readonly aL: number;
  readonly A: number;
  readonly O: number;
  readonly P: number;
  readonly f: number;
  readonly k: number;
  S: boolean;
};

export type LegacyZKind2Callbacks = {
  /**
   * private static void b(Graphics,int,int,int,int) (#536) ->
   * Graphics.drawRect(IIII) (an OUTLINE rect, not a fill -- confirmed by
   * reading #536's own body, which is a bare `invokevirtual drawRect`).
   * Only fires when `row - 1 === 1201`.
   */
  readonly onDrawRect?: (x: number, y: number, width: number, height: number) => void;
  /** Raw arguments of the shared f.d(IIII) subrecord draw (#572): index/x/y/phase. Always fires. */
  readonly onSubrecord?: (index: number, x: number, y: number, phase: number) => void;
};

/**
 * Direct mirror of f.d(2,row), javap offsets 48..326 -- the `group===2`
 * branch of `private void d(int,int)` (bytecode/f-javap.txt:11807..12296).
 * `row` is `d(int,int)`'s own second parameter (the row-table index the
 * caller's loop is on), NOT the resource/command id (10/17) -- confirmed
 * by cross-referencing the sibling `group===1` branch, which forwards the
 * exact same local straight into `j(int)`.
 *
 * REGRESSION NOTE (2026-08-31): this file previously had three inverted
 * guards (`Q`/`R`/`U` all tested the wrong polarity -- returned when the
 * bytecode's condition was FALSE, drew when it was TRUE) and two
 * mis-parenthesized coordinate formulas (`rectY`/`spriteY` added `A`/left
 * `aL` outside the `*4` group the bytecode actually multiplies as a
 * whole). Both were caught by re-deriving every instruction by hand
 * against `bytecode/f-javap.txt` offsets 53..292 rather than trusting the
 * existing port or its own (also wrong) regression test. This file was
 * never wired into any real call site, so the bug never reached a screen.
 */
export function stepLegacyZKind2(state: LegacyZKind2State, row: number, callbacks: LegacyZKind2Callbacks = {}): void {
  if (state.Q && (state.aI === 4 || state.aI === 94)) return;
  if (state.R && (state.aI === 5 || state.aI === 95)) return;
  if (!state.T && state.aI === 1) return;
  if (!state.U && state.aI === 2) return;

  if (row - 1 === 1201) {
    const rectX = 11 + state.aJ + (state.I - state.W) * 5;
    const rectY = 8 + state.aK + (state.K - state.X + state.aL) * 4;
    callbacks.onDrawRect?.(rectX, rectY, state.O * 5 - 1, state.P * 4 - 1);
    const spriteX = state.aJ + (state.y + state.I - state.W) * 5 - 11;
    const spriteY = state.aK + (state.A + state.K - state.X + state.aL) * 4 - 8;
    callbacks.onSubrecord?.(state.aI, spriteX, spriteY, Math.trunc(state.f / state.k));
  } else {
    callbacks.onSubrecord?.(state.aI, state.aJ, state.aK, Math.trunc(state.f / state.k));
  }
  state.S = true;
}
