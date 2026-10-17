/**
 * CORRECTION (2026-08-25): this file used to also carry
 * `stepLegacyFrameProgression`, an independent, fully-tested-but-NEVER-
 * WIRED second port of private f.j() (bytecode/f-javap.txt offsets
 * 0..269). `f.j()`'s real, wired port is `LegacyFrameStep.ts`'s
 * `stepLegacyFrame` (run every tick via `LegacyGameplayTick.ts`'s
 * `onFrameUpdate`) -- see `LegacyGameState.ts`'s `hCounter`/`frameSweepCounter`
 * docblock and `docs/unknowns.md`'s "f.j()/LegacyFrameStep duplicate-field
 * cluster" for the full 2026-08-20 trace. `stepLegacyFrameProgression` had
 * zero callers anywhere outside its own test; removed.
 */

export type LegacyDState = {
  /** f.w:B (#382) -- the SAME field LegacyFrameProgressionState already tracks. */
  readonly w: number;
  /** f.q:I (#356). */
  readonly q: number;
  /** f.P:Z (#88) -- the SAME field LegacyFrameProgressionState already tracks. */
  P: boolean;
};

/**
 * Exact `final void d(int)`, bytecode/f-javap.txt offsets 0..21 -- one of
 * `f.s()`'s (LegacyEffectSlotScan.ts) three expiry callbacks
 * (`onSlotAction`). Trivial: sets `P:Z=true` only when `w:B===2` and the
 * argument matches `q:I`.
 */
export function stepLegacyD(id: number, state: LegacyDState): void {
  if (state.w === 2 && id === state.q) {
    state.P = true;
  }
}
