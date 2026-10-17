/**
 * Raw port of private void m() (no-arg -- NOT the already-ported
 * `f.m(int)` numeric-sequence overload, a completely different method),
 * bytecode/f-javap.txt offsets 0..280.
 *
 * This is `f.u()`'s 5th and last call site (the other 3 -- `K()`, `R()`
 * x2, `am()` -- are already wired; see
 * reverse-engineering/gameplay-paint-cluster.md), and it's also the real
 * per-frame trigger for the gameplay HUD's 20-slot element-scan loop
 * (offsets 119..268), which calls the already-ported `f.a(byte,int,int)`
 * / `LegacyZElementScan.ts` -- the SAME machinery the menu "Z scan" list
 * already uses. The 20 boolean gates it reads (`f.a:[Z]` #123) are
 * already populated live by `LegacySelectionFlags.ts`'s
 * `stepLegacySelectionFlags` (already wired elsewhere in the runtime),
 * so wiring this loop reaches real content, not permanently-false flags.
 *
 * `v!=1` branch (offsets 269..280) is trivial (`if (v===0) F();`) and
 * included here too, even though `F()` is already reachable via other
 * paths, to keep this file a complete, faithful port of the whole method.
 *
 * Two calls to `private void c(int,int)` (constant pool #552, bytecode
 * offset 10706) are exposed as an `onC` callback. CORRECTION
 * (2026-08-24): this docblock used to describe it as a large,
 * out-of-scope dependency -- it was actually fully derived and ported as
 * `stepLegacyC2` on 2026-08-18 (offsets 0..966, not ~800), and IS wired
 * (`LegacyRuntimeState.ts`'s `onC`); left as a callback here purely for
 * this file's own structural reasons, not because it's unported.
 *
 * CONFIRMED (2026-08-24): the 20-slot loop's `state.cInts` (`frameRecordInts`,
 * `f.c:[I]`#264) was believed permanently null (RETRACTED 2026-09-07 -- it is not) in the original (exhaustively
 * grepped, zero writes anywhere in class f) -- the real bytecode's
 * `iaload` on it is a guaranteed throw with no exception table in `m()`
 * itself, reachable whenever any of the 20 gates above is true (which,
 * per the paragraph above, is real live content, not permanently-false).
 * This port intentionally does NOT reproduce that throw (`?? 0` fallback
 * instead) pending real-emulator confirmation -- see `docs/unknowns.md`'s
 * 2026-08-24 entry before changing this; it may be the actual cause of
 * this project's long-standing "HUD content never observed" mystery.
 */

export type LegacyGameplayFramePrepState = {
  /** f.v:B (#376). */
  readonly vByte: number;
  /**
   * f.c:[B] (#263), read at index 1 -- an image-group/frame slot selector.
   * CONFIRMED (2026-08-24): a bootstrap-time constant, always `1` -- see
   * `LegacyGameState.ts`'s `frameImageSlots` docblock for the full trace
   * (class e's bootstrap writes the literal {0,1,0,0,0,0,2,0,2,2,0,0,0}
   * once -- the port's initial value, checked 2026-09-28; index 1 is never
   * touched again anywhere in the class).
   */
  readonly imageSlotC1: number;
  /** f.y:B (#387). */
  readonly scrollY: number;
  /** f.ad:I (#185). */
  readonly ad: number;
  /** f.A:B (#34). */
  readonly scrollA: number;
  /** f.ae:I (#188). */
  readonly ae: number;
  /** f.a:[Z] (#123), the 20 gameplay-HUD element-scan gates -- already populated by `LegacySelectionFlags.ts`. */
  readonly slotFlags: readonly boolean[];
  /** f.a:[I] (#136 area, `c:[I]` in bytecode comments -- an int lookup table read by the element-scan record computation). */
  readonly cInts: { readonly [index: number]: number };
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.ax:B (#229). */
  readonly ax: number;
  /** f.bb:I (#249). */
  readonly bb: number;
  /** f.ba:I (#248). */
  readonly ba: number;
};

export type LegacyGameplayFramePrepCallbacks = {
  /** private void n() -- LegacyCameraScroll.stepLegacyCameraScroll, already wired elsewhere. */
  readonly onN?: () => void;
  /** private void w() -- LegacyCameraFrame's letterbox/cursor halves, already wired elsewhere. */
  readonly onW?: () => void;
  /** private void u() -- stepGameplayOuterLoop, already wired elsewhere. */
  readonly onU?: () => void;
  /** Offset 30..48: draws Image[c[1]] into the offscreen Graphics[3] target at (0,0), anchor 0. */
  readonly onOffscreenDraw?: (imageSlot: number) => void;
  /** Offset 51..53/165..172/94..97: raw f.N:B (#79) writes -- same field already tracked as `game.targetSlot`. */
  readonly onTargetSlot?: (slot: number) => void;
  /**
   * private void c(int,int) (#552). CORRECTION (2026-08-24): already
   * fully ported and wired as `stepLegacyC2` since 2026-08-18
   * (`LegacyRuntimeState.ts`'s own `onC: (x, y) => this.stepLegacyC2(x, y)`)
   * -- this docblock's "NOT ported" was stale.
   */
  readonly onC?: (x: number, y: number) => void;
  /** f.S:Z (#97) := false. */
  readonly onSReset?: () => void;
  /** private void a(byte,int,int) (#438) / LegacyZElementScan.scanLegacyZElementPrefix. */
  readonly onElementScan?: (aD: number, xOffset: number, yOffset: number) => void;
  /** private void a(int,int,int) (#439) / LegacyPackedSpriteRenderer.drawSprite, the two fixed-record (524/528) special cases. */
  readonly onFixedSprite?: (record: number, x: number, y: number) => void;
  /** private void F() -- LegacyFrameDispatch, already reachable via other paths. */
  readonly onF?: () => void;
};

export function stepLegacyGameplayFramePrep(
  state: LegacyGameplayFramePrepState,
  callbacks: LegacyGameplayFramePrepCallbacks = {},
): void {
  if (state.vByte !== 1) {
    // Offsets 269..280: `getfield v; ifne 280; F()` -- F() only when v == 0.
    // (Was inverted until 2026-09-30.)
    if (state.vByte === 0) callbacks.onF?.();
    return;
  }

  callbacks.onTargetSlot?.(state.imageSlotC1);
  callbacks.onN?.();
  callbacks.onW?.();
  callbacks.onU?.();
  callbacks.onOffscreenDraw?.(state.imageSlotC1);

  callbacks.onTargetSlot?.(3);
  callbacks.onC?.(state.scrollY * 22 - state.ad, state.scrollA * 16 - state.ae);
  callbacks.onTargetSlot?.(state.imageSlotC1);
  callbacks.onC?.(state.scrollY * 22, state.scrollA * 16);
  callbacks.onSReset?.();

  for (let slot = 0; slot < 20; slot += 1) {
    if (!state.slotFlags[slot]) continue;

    const recordIndex = state.packedBytes[(state.packedOffsets[195] ?? 0) + slot] ?? 0;
    callbacks.onElementScan?.(slot, 0, (state.cInts[recordIndex] ?? 0) - 8);

    callbacks.onTargetSlot?.(state.imageSlotC1);
    const slot20Table = state.packedBytes[(state.packedOffsets[195] ?? 0) + 20 + slot] ?? 0;
    if (slot20Table === 1) {
      callbacks.onFixedSprite?.(524, 0, state.ax);
    } else if (slot20Table === 2) {
      callbacks.onFixedSprite?.(528, 0, 320 - state.bb - state.ba + state.ax);
    }
  }
}
