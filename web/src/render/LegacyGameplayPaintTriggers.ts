import type { Graphics } from "../platform/Graphics";
import { UNIT_DIRECTION, UNIT_MODE, UNIT_TIMER, UNIT_TYPE } from "../core/DenseLayout";

/**
 * Raw ports of private f.K() and private f.R(), the two remaining callers
 * of f.n() (see reverse-engineering/gameplay-paint-cluster.md). Both are
 * short enough to translate directly rather than skim.
 */

export type LegacyGameplayPaintTriggerState = {
  /** f.H:Z (#57) -- "needs full camera reset" trigger, shared with f.am(). */
  needsFullReset: boolean;
  /** f.A:Z (#36) -- same one-shot recenter flag f.n() itself reads. */
  followFlag: boolean;
  /** f.b:[Z] (#234), a *different* 20-length array from the already-known
   *  f.a:[Z] (#123) that paint()/m()'s 20-slot loop reads. */
  readonly entityScanFlags: boolean[];
};

export type LegacyGameplayPaintTriggerCallbacks = {
  /** private void n() -- LegacyCameraScroll.stepLegacyCameraScroll. */
  readonly onScroll?: () => void;
  /** private void u() -- not yet ported (the ~1200-instruction gameplay renderer). */
  readonly onGameplayDraw?: () => void;
  /**
   * private void O() -- CORRECTION (2026-08-24): already fully ported and
   * wired as `stepLegacyO` (`LegacyRuntimeState.ts`), used by the "K" and
   * "M" handlers' own `onO`, and now this method's `onPopulateItems` too.
   * This docblock's "not yet ported" was stale.
   */
  readonly onPopulateItems?: () => void;
  /**
   * private void a(byte,int,int) -- the already-ported
   * LegacyZElementScan.scanLegacyZElementPrefix(state, aD, xOffset, yOffset).
   */
  readonly onElementScan?: (aD: number, xOffset: number, yOffset: number) => void;
};

// f.K() lives in LegacySimpleFrameHandlers.ts ("K"); a second copy here was
// never called and was deleted 2026-09-23.

export type LegacyRState = LegacyGameplayPaintTriggerState & {
  /** f.an:B (#210). */
  an: number;
  /** f.ao:B (#212). */
  ao: number;
  /** f.aR:I (#167). */
  aR: number;
  /** f.J:Z (#66), written only by S() (game.jSceneFlag). */
  JFlag: boolean;
  /** f.aP:I (#164). */
  aP: number;
  /** f.aQ:I (#165). */
  aQ: number;
  /** f.aS:I (#168) -- unrelated to LegacyGameState's aS()/wait-phase method. */
  aS: number;
  /** f.N:B (#79) -- offscreen Graphics/Image slot index; distinct from the
   *  entity-record `N` field (#80, int) used by a(int,byte) (LegacyMapMarkerDispatch.ts). */
  targetSlot: number;
  /** f.bc/bd/be/bf:I (#250..253) -- clip-rect scratch fields, output only. */
  bc: number;
  bd: number;
  be: number;
  bf: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacyRCallbacks = LegacyGameplayPaintTriggerCallbacks & {
  /** f.a(int,int):int -- the seeded RNG helper, `(nextInt() & mask) % divisor`. */
  readonly randomRemainder?: (mask: number, divisor: number) => number;
  /**
   * The shared static blit helper (constant pool #435, same as
   * f.paint()/f.n()) -- fully decoded 2026-08-18 (`stepGameplayPaintComposite`'s
   * own docblock): just `drawRegion` with `transform=0`, wrapped in a
   * try/catch. `a(Graphics[0],Image[1],0,120,264,128-aQ,0,120+aQ,0)`.
   * Exposed as the raw computed 128-aQ/120+aQ pair rather than invoked
   * directly here -- this call site itself is not yet wired.
   */
  readonly onPartialBlit?: (heightArg: number, destYArg: number) => void;
};

/** Exact f.R(), bytecode/f-javap.txt offsets 0..362. */
export function stepLegacyR(
  state: LegacyRState,
  graphics: readonly Graphics[],
  callbacks: LegacyRCallbacks = {},
): void {
  if (state.an === 0) {
    const tableValue = state.packedBytes[state.packedOffsets[155] + 84 + state.ao] ?? 0;
    if (tableValue < -1 && state.aR <= 0) return;
  }

  if (state.needsFullReset) {
    state.followFlag = true;
    state.targetSlot = 1;
    callbacks.onScroll?.();
  }

  if (state.JFlag) {
    if (!state.needsFullReset) return;
    state.needsFullReset = false;
    state.followFlag = true;
    callbacks.onScroll?.();
    callbacks.onGameplayDraw?.();
    callbacks.onPopulateItems?.();
    state.entityScanFlags[12] = true;
    return;
  }

  if (state.aP !== 0 && !state.needsFullReset) return;

  state.aQ = 0;
  if (state.aS === 24) {
    state.aQ = callbacks.randomRemainder?.(255, 8) ?? 0;
  }
  callbacks.onPartialBlit?.(128 - state.aQ, 120 + state.aQ);

  if (state.aS === 24) {
    const bar = graphics[0]; // f's static Graphics[M:B] target -- M:B is confirmed 0 at every write site seen so far.
    if (bar) {
      bar.setColor(0);
      // BUG FIX (2026-08-31): both calls pass literal x=0/y=96 and y=240 to
      // the shared static helper #437 (`private static void a(Graphics,int,
      // int,int,int)`, bytecode/f-javap.txt offsets 32846..32860), which
      // ALWAYS adds 11 to its x argument and 8 to its y argument before
      // calling the real Graphics.fillRect -- confirmed by direct read of
      // the helper's own body, not assumed. paint()'s own letterbox bars
      // (offset 502..600) pass `a:S-11`/`b:S-8` (=-11/-8 since a:S/b:S are
      // permanently 0), which cancels the helper's own +11/+8, so THOSE
      // callers correctly simplify to literal 0. R()'s calls here pass
      // literal 0 directly (bytecode offsets 220/238, `iconst_0`, NOT
      // `a:S-11`) -- there is nothing to cancel, so the real fillRect lands
      // at (11, 96+8)/(11, 240+8), not (0, 96)/(0, 240) as this port
      // previously had it.
      bar.fillRect(11, 104, 240, 16);
      bar.fillRect(11, 248, 240, 16);
    }
  }

  state.targetSlot = 0;
  state.bc = 0;
  state.bd = 120;
  state.be = 264;
  state.bf = 128;
  graphics[state.targetSlot]?.setClip(state.bc, state.bd, state.be, state.bf);
  callbacks.onGameplayDraw?.();
  state.bc = 0;
  state.bd = 0;
  state.be = 528;
  state.bf = 704;
  graphics[state.targetSlot]?.setClip(state.bc, state.bd, state.be, state.bf);
}

export type LegacyPState = LegacyRState & {
  /** f.j:Z (#327) -- written at offset 406 (and by Q()); not J:Z (#66), which P() only reads. */
  jFlag: boolean;
  /** f.aP:I (#164) -- a slide-transition progress counter; positive while
   *  opening, negative while closing, snaps through 0 when idle. */
  aP: number;
  /** f.c:Z (#261) -- a transition-in-progress flag LOCAL to this method's
   *  own draw cadence; unrelated to LegacyGameplayCommand's `game.cFlag`
   *  despite the reused TS field name in the codebase's *other* uses of
   *  "cFlag" -- kept here as plain `c` to avoid that collision. */
  c: boolean;
  /** f.am:B (#208). */
  am: number;
  /** f.al:B (#206). */
  al: number;
  /**
   * f.f:I (#294) -- confirmed via direct bytecode read of P() itself
   * (offset 337/352), i.e. `game.animPhase`. CORRECTION 2026-08-18: NOT
   * the same field the negative-entity branch's own sprite draw uses
   * (that one is genuinely `e:I`/#284/`game.animStep` -- see
   * LegacyGameplayNegativeEntityBranch.ts's own corrected docblock).
   * `u()`'s row-end draw and the map-marker-detail method DO share this
   * f:I field with P(), independently confirmed for each.
   */
  phase: number;
  /** f.e:[B] (#286), needed only for the stepLegacyQ() call this method makes. */
  readonly dense: Int8Array;
  /** f.p:[B] (#350), the same 40-length scratch record LegacyRuntimeState.ts's
   *  auxiliaryScratch already represents ("used as the scratch record by b.b(III)"). */
  readonly p: Int8Array;
};

export type LegacyPCallbacks = LegacyRCallbacks & LegacyQCallbacks & {
  /** private void i() (#610) -- zero-arg overload, NOT the same method as
   *  private void i(int) (LegacyGameplayCellLoop.ts's onSecondaryCell). */
  readonly onI?: () => void;
  /** private void d(int,int,int,int) (#572) / LegacyZSubrecordDraw. */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
};

/**
 * Exact f.P(), bytecode/f-javap.txt offsets 0..548 -- 549 instructions, the
 * largest single method in this cluster. `f.R()`'s ONLY call site (offset
 * 462) lives here, gated behind the offset 191..457 section below.
 *
 * Superseding correction (2026-08-13): a PARTIAL, pre-existing port of this
 * method already runs in the live wired runtime as
 * `LegacySimpleFrameHandlers.ts`'s `case "P"` (`stepLegacyP` there, a
 * different, older function of the same name). That port only covered
 * offsets 0..191 (this function's `if (state.aP > 0 && !state.J)` section
 * and part of the `H`/`J` overlay section) and, comparing side by side,
 * inverted the offset-97 early-return condition: the real bytecode returns
 * the WHOLE method when `aP - 4 <= 160` and only proceeds (negating `aP`,
 * clearing `c`, calling `i()`) when `aP - 4 > 160`; the older port's
 * `if (state.aP - 4 > 160) { ...; return; }` does the opposite. It also
 * silently drops all four `fillRect` calls in sections 1-2, and the entire
 * offsets 191..548 section (the actual `R()` trigger logic and the
 * epilogue) is missing outright. See
 * reverse-engineering/gameplay-paint-cluster.md's "Who calls f.K()/f.R()?"
 * section for the full derivation. This function is the complete,
 * corrected replacement; wiring it in place of the old one is a separate
 * step (see that doc's "Suggested next slice").
 */
export function stepLegacyP(
  state: LegacyPState,
  graphics: readonly Graphics[],
  callbacks: LegacyPCallbacks = {},
): void {
  const bar = graphics[0]; // f's static Graphics[M:B] target, same as stepLegacyR.

  // Offsets 0..121.
  if (state.aP > 0 && !state.JFlag) {
    state.aP += 4;
    if (bar) {
      bar.setColor(0);
      // BUG FIX (2026-08-31): see stepLegacyR's own fillRect comment just
      // above for the full derivation -- these two calls also pass literal
      // x=0/y=0 and y=336-aP (bytecode offsets 42/43 and 64/65..72,
      // `iconst_0`, NOT `a:S-11`/`b:S-8`) into the SAME shared helper #437,
      // which unconditionally adds 11/8 to x/y. Was drawn at (0,0)/(0,336-aP)
      // instead of the real (11,8)/(11,344-aP), leaving offscreen columns
      // 0..10 cleared for nothing and columns 240..250 (the rightmost 11
      // visible pixels after paint()'s own -11 blit shift) never cleared at
      // all -- the stray full-height bar at Q=17's right edge.
      bar.fillRect(11, 8, 240, 16 + state.aP);
      bar.fillRect(11, 344 - state.aP, 240, state.aP);
    }
    state.c = true;
    if (state.aP - 4 <= 160) return;
    state.aP = -state.aP;
    state.c = false;
    callbacks.onI?.();
  }

  // Offsets 122..191.
  if (state.needsFullReset && !state.JFlag) {
    state.entityScanFlags[12] = true;
    if (bar) {
      bar.setColor(0);
      // BUG FIX (2026-08-31): same helper-#437 +11/+8 shift as above
      // (bytecode offsets 162/163 and 179/180, literal `iconst_0`).
      bar.fillRect(11, 8, 240, 112);
      bar.fillRect(11, 248, 240, 96);
    }
  }

  // Offsets 191..457: the R()-trigger logic.
  const tableA0 = state.packedBytes[state.packedOffsets[155] + 0 + state.aS] ?? 0;
  if (tableA0 === 1) {
    if (state.aR < 0) {
      stepLegacyPEpilogue(state, callbacks);
      return;
    }
    const tableA84 = state.packedBytes[state.packedOffsets[155] + 84 + state.aS] ?? 0;
    if (state.aR < tableA84 || state.am !== 0) {
      state.targetSlot = 0;
      if (bar) {
        bar.setColor(0);
        // BUG FIX (2026-08-31): same helper-#437 +11/+8 shift (bytecode
        // offset 280/281, literal `iconst_0`).
        bar.fillRect(11, 120, 240, 128);
      }
      const tableA28 = state.packedBytes[state.packedOffsets[155] + 28 + state.aS] ?? 0;
      callbacks.onSpriteDraw?.(98 + tableA28, 120, 176, state.am !== 0 ? state.phase : state.aR);
      callbacks.onSpriteDraw?.(104, 120, 176, state.phase);
      state.aR = state.am !== 0 ? state.aR : state.aR + 1;
      stepLegacyPEpilogue(state, callbacks);
      return;
    }
    // Offsets 385..409. `state.am !== 0` here is confirmed always false --
    // the only path into this branch already requires `am === 0` (the
    // `if_icmplt 257` above skips straight past this re-check when
    // `aR < tableA84`, and the `am` value cannot change between the two
    // reads) -- kept as a literal translation per this project's rule
    // against pruning confirmed-dead bytecode.
    if (state.am !== 0) {
      stepLegacyPEpilogue(state, callbacks);
      return;
    }
    if (state.aS === 0) {
      stepLegacyPEpilogue(state, callbacks);
      return;
    }
    state.aR = -1;
    state.jFlag = true;
    return; // Direct `return` (offset 409) -- skips the epilogue entirely.
  }

  const tableA0ByAo = state.packedBytes[state.packedOffsets[155] + 0 + state.ao] ?? 0;
  if (tableA0 >= 2 || tableA0ByAo >= 2) {
    stepLegacyQ(state, callbacks);
    stepLegacyR(state, graphics, callbacks);
  }
  stepLegacyPEpilogue(state, callbacks);
}

/** Offsets 466..548, shared by every path through stepLegacyP() except the offset-409 direct return. */
function stepLegacyPEpilogue(state: LegacyPState, callbacks: LegacyPCallbacks): void {
  state.needsFullReset = false;
  if (state.aP < 0) {
    state.aP += 4;
    state.c = true;
    if (state.aP >= -48) {
      state.aP = 0;
      state.c = false;
      callbacks.onI?.();
    }
  }
  if (state.aP === 0 && state.al !== 0) {
    callbacks.onElementScan?.(12, 0, 0);
    callbacks.onElementScan?.(17, 0, 320);
  }
}

export type LegacyQState = {
  /** f.aS:I (#168). */
  readonly aS: number;
  /** f.aR:I (#167). */
  aR: number;
  /** f.aP:I (#164). */
  readonly aP: number;
  /** f.H:Z (#57). */
  readonly needsFullReset: boolean;
  /** f.al:B (#206). */
  readonly al: number;
  /** f.j:Z (#327) -- a boolean FIELD, distinct from the private void j() (#613) method below. */
  jFlag: boolean;
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.p:[B] (#350), a 40-length scratch record (LegacyRuntimeState.ts's auxiliaryScratch). */
  readonly p: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacyQCallbacks = {
  /**
   * private void j() (#613) -- zero-arg, distinct from the j:Z FIELD above.
   * `f.j()`, the world update. h() only calls it for v == 1 and P()/Q() only
   * run for v == 0, so this is the cutscene-time update, not a second run.
   * WIRED 2026-10-08 (oracle frame 441); it had been left out on that worry.
   */
  readonly onJ?: () => void;
};

/**
 * Exact f.Q(), bytecode/f-javap.txt offsets 0..490. Always called
 * immediately before f.R() from f.P()'s offset 458..463, and only from
 * there -- no other call site in class f.
 *
 * Refreshes a handful of dense-state fields (keyed by each nonzero slot in
 * `p:[B]`, a 40-length scratch record) from two more table-155/196-driven
 * lookups, gated on `aR===0` (i.e. only once per "opening" transition, not
 * every frame); then, regardless, advances `aR` similarly to how
 * `stepLegacyP`'s epilogue advances `aP` -- including the SAME `al`-gated
 * early-exit-with-`jFlag=true` pattern seen there.
 */
export function stepLegacyQ(state: LegacyQState, callbacks: LegacyQCallbacks = {}): void {
  if (state.aS <= 0) return;
  if (state.aR < 0) return;
  if (state.aP !== 0 && !state.needsFullReset) return;

  if (state.aR === 0) {
    const tableA28 = state.packedBytes[state.packedOffsets[155] + 28 + state.aS] ?? 0;
    if (tableA28 > 0) {
      for (let local2 = 0; local2 < state.p.length; local2 += 1) {
        const slot = state.p[local2] ?? 0;
        if (slot === 0) continue;
        const local1 = Math.min(local2, 6);
        const base = state.packedOffsets[196] + local1 * 33 + tableA28 * 3;
        const tableVal2 = state.packedBytes[base + 0] ?? 0;
        if (tableVal2 !== 0) {
          state.dense[UNIT_MODE + slot] = tableVal2;
          state.dense[UNIT_TIMER + slot] = state.packedBytes[base + 2] ?? 0;
          state.dense[UNIT_TYPE + slot] = 105;
        }
        const tableVal4 = state.packedBytes[base + 1] ?? 0;
        if (tableVal4 !== 0) {
          state.dense[UNIT_DIRECTION + slot] = tableVal4 - 10; // Int8Array assignment truncates like i2b.
          state.dense[808 + slot] = 0;
        }
        state.dense[3030 + slot] = 0;
      }
    }
  }

  const tableA84 = state.packedBytes[state.packedOffsets[155] + 84 + state.aS] ?? 0;
  if (state.aR >= tableA84) {
    state.aR = -2;
    if (state.al === 0) {
      state.jFlag = true;
      return; // Direct return -- skips the aR increment/onJ call below.
    }
  }
  state.aR += 1;
  if (state.aR > 0) callbacks.onJ?.();
}

// private void i() (#610), the method stepLegacyP's own onI callback
// fires, is ported as resetLegacyZI in LegacyZI.ts (2026-08-22: merged
// here from a separate, redundant port -- see that file's docblock).
