import { UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_GENDER, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_SELECTION } from "../core/DenseLayout";
import { T_TYPE_JOB } from "../core/DataTables";
/**
 * Raw port of `private boolean a()` (constant pool #444, bytecode/f-javap.txt
 * offsets 0..275, file lines 5394..5543) and `private boolean b()` (constant
 * pool #534, bytecode/f-javap.txt offsets 0..918, file lines 5544..6032).
 * Both are called from `private void p()` (lines 5141..5394, ported
 * separately as `LegacySpriteLayerLoop.ts`'s `stepLegacySpriteLayerLoop`,
 * exposed there as the still-unwired `onA`/`onB` callbacks) -- `a()` when
 * `Y===29`, `b()` when `Y===29 && dense[1414+aq]>=12`. Neither method takes
 * any parameters or reads anything `p()` doesn't already carry on the same
 * shared `f` instance, so both are ported here as no-arg functions over an
 * explicit mutable state bag, matching `p()`'s own field names exactly
 * (`ay`/`az`/`ap`/`ax`/`ao`/`an`/`aq`/`ar`/`as`/`at`/`av`/`aw`) so the same
 * live object can eventually satisfy both this file's state types and
 * `LegacySpriteLayerLoopState`.
 *
 * **`a()`'s real return value is unconditionally `true`.** Every branch in
 * its body (offsets 0..29's four-part entry gate, and the final loop at
 * offsets 166..271) either falls through or jumps to the single `return`
 * at offset 274 (`iconst_1; ireturn`) -- there is no `iconst_0` anywhere in
 * this method. It exists purely for its side effects (`ax`/`aC` writes and
 * the `onComposite` draw call), not as a real predicate. This means `p()`'s
 * own `ifne 124` after calling it (bytecode offset 118) is dead code on the
 * false side -- confirmed by direct read, not inferred from the name.
 *
 * `a()`'s offsets 166..271 are a real double loop over `f.c:[[B]` (#262),
 * i.e. `gridC`, counting live team-0 entities in the (B,C)-(B+D,C+E)
 * rectangle into `aC` and setting `ax=1` when this call's own entity is
 * among them.
 *
 * **RETRACTED (2026-09-07)**: this docblock first claimed #262 is
 * "permanently null across the ENTIRE decompiled jar", following
 * `LegacyEntityRecordCancel.ts`, and reproduced a throw here instead of the
 * loop body. That is false, and so is the same claim wherever else this
 * codebase makes it. `f.c:[[B]` is allocated by `e.i()`
 * (bytecode/e-javap.txt offset 41..45, `multianewarray [[B 96,96`), in the
 * same prologue that allocates `f.e:[B` (#286, offset 10..15) -- the
 * `denseState` this entire port runs on -- and `f.b:[[B]` (offset 26..30).
 * The grep behind the original claim only covered class `f`; every array
 * field of class `f` is in fact allocated from outside it, by class `e`.
 * `gridC` is live in this port and its contents were dumped from a running
 * session. See docs/unknowns.md's 2026-09-07 entry for the full sweep.
 *
 * `b()` has no method calls at all (confirmed by an exhaustive scan of its
 * own offset range for `invoke*` opcodes) and no `gridC`/#262 dependency --
 * every branch is pure field/table arithmetic, ending in a real mix of
 * `true`/`false` returns.
 *
 * Every `getfield`/`putfield` below was resolved against its own
 * constant-pool index, not guessed from the field letter -- this class has
 * same-letter fields of different types throughout (`an:I`#209 vs
 * `an:B`#210, `ao:I`#211 vs `ao:B`#212, `ap:I`#213 vs `ap:B`#214, `ax:I`#230
 * vs `ax:B`#229, `ay:I`#231 vs `ay:B`#232 -- see `LegacySpriteLayerLoop.ts`'s
 * own docblock for the same confirmations, re-verified independently here).
 */

export type LegacySpriteLayerPredicateAState = {
  /** f.ay:I (#231). Read-only in `a()`. */
  readonly ay: number;
  /** f.s:Z (#365), tracked elsewhere as `sFlag`. */
  readonly sFlag: boolean;
  /** f.v:B (#376), tracked elsewhere as `vByte`. */
  readonly vByte: number;
  /** f.at:I (#221). Read-only in `a()`. */
  readonly at: number;
  /** f.e:[B (#286), dense state. */
  readonly dense: Int8Array;
  /** f.aq:I (#216). Read-only in `a()`. */
  readonly aq: number;
  /** f.F:B (#50), tracked elsewhere as `game.selectionGroup`. */
  readonly FByte: number;
  /** f.k:B (#333), tracked elsewhere as `game.kByte`. */
  readonly kByte: number;
  /** f.ar:I (#217). Read-only in `a()` (offsets 92..95) -- distinct call-site copy from `LegacyEntityAction.ts`'s own mutable `ar`, same field. */
  readonly ar: number;
  /** f.as:I (#220). Read-only in `a()` (offsets 109..112). */
  readonly as: number;
  /** f.j:[[B (#326), tracked elsewhere as `byteTables`. */
  readonly byteTables: readonly Int8Array[];
  /** f.az:I (#233). Read-only in `a()`. */
  readonly az: number;
  /** f.W:B (#110), tracked elsewhere as `game.hoverUnit`. */
  readonly cWByte: number;
  /**
   * f.ax:I (#230). Output -- mutated only along the offset 131..158 path
   * (when the draw branch is NOT taken AND `cWByte===aq`); left completely
   * untouched otherwise (not even reset), matching the bytecode exactly.
   */
  ax: number;
  /**
   * f.aC:I (#151), tracked elsewhere as `game.boxUnitCount`. Output --
   * unconditionally reset to 0 (offset 161..163) once the top 4-part gate
   * passes, regardless of which branch runs afterward.
   */
  cACInt: number;
  /** f.C:I (#40), tracked elsewhere as `game.CCounter`. */
  readonly CCounter: number;
  /** f.E:I (#48), tracked elsewhere as `game.ECounter`. */
  readonly ECounter: number;
  /** f.B:I (#38), tracked elsewhere as `game.BCounter`. */
  readonly BCounter: number;
  /** f.D:I (#43), tracked elsewhere as `game.DCounter`. */
  readonly DCounter: number;
  /**
   * f.c:[[B (#262) -- `gridC`, the 96x96 occupancy grid. NOT null: it is
   * allocated by `e.i()` (bytecode/e-javap.txt offset 41..45,
   * `multianewarray [[B 96,96`), in the same prologue that allocates
   * `f.e:[B` (#286 / `denseState`, offset 10..15) which this whole port
   * already runs on. See this file's docblock for the retraction.
   */
  readonly gridC: readonly Int8Array[];
};

export type LegacySpriteLayerPredicateACallbacks = {
  /** f.a(int,int,int) (#439) / LegacyPackedSpriteRenderer.drawComposite, offsets 87..128. */
  readonly onComposite?: (record: number, x: number, y: number) => void;
};

/**
 * Exact port of `private boolean a()`. Always returns `true`; the return
 * value is kept (rather than making this `void`) purely to mirror the
 * original signature -- see this file's own docblock for why every path
 * reaches the same `iconst_1; ireturn`.
 */
export function stepLegacySpriteLayerPredicateA(
  state: LegacySpriteLayerPredicateAState,
  callbacks: LegacySpriteLayerPredicateACallbacks = {},
): boolean {
  // Offsets 0..29: four-part early gate. Any failing condition skips
  // straight to the shared `return true` at offset 274 with none of the
  // side effects below.
  if (state.ay === 10 && !state.sFlag && state.vByte === 1 && state.at > -1) {
    // Offsets 32..86: re-reads dense[909+aq] twice (same value, no
    // intervening mutation) before combining with the F/k checks.
    const d909 = state.dense[UNIT_SELECTION + state.aq] ?? 0;
    const drawCond =
      (d909 !== 0 && d909 === state.FByte) ||
      (state.FByte === -1 && state.kByte === state.aq);

    if (drawCond) {
      // Offsets 87..128.
      callbacks.onComposite?.(
        599,
        state.ar + (state.byteTables[12]?.[state.az] ?? 0),
        state.as + (state.byteTables[13]?.[state.az] ?? 0),
      );
    } else if (state.cWByte === state.aq) {
      // Offsets 131..158: only mutates ax when cWByte===aq; otherwise ax
      // is left completely untouched (offset 139 skips straight to 161).
      state.ax = 1;
      if (state.cWByte >= 51) state.ax = 3;
    }

    // Offset 161..163: unconditional once the top gate passed.
    state.cACInt = 0;

    // Offsets 166..271: counts the live team-0 entities inside the
    // (B,C)-(B+D,C+E) rectangle into aC, and flags ax when this call's own
    // entity is one of them.
    //   for (local1 = C+1; local1 <= C+E; local1++)
    //     for (local2 = B+1; local2 <= B+D; local2++) {
    //       local3 = gridC[local1][local2];              // offset 206..215
    //       if (local3 < 1 || local3 > 50) continue;     // offset 216..223
    //       if (dense[1919+local3] <= 0) continue;       // offset 226..236
    //       aC++;                                        // offset 239..246
    //       if (local3 === aq) ax = 1;                   // offset 249..259
    //     }
    for (let local1 = state.CCounter + 1; local1 <= state.CCounter + state.ECounter; local1 += 1) {
      for (let local2 = state.BCounter + 1; local2 <= state.BCounter + state.DCounter; local2 += 1) {
        const local3 = state.gridC[local1]?.[local2] ?? 0;
        if (local3 < 1 || local3 > 50) continue;
        if ((state.dense[UNIT_HP + local3] ?? 0) <= 0) continue;
        state.cACInt += 1;
        if (local3 === state.aq) state.ax = 1;
      }
    }
  }

  // Offset 274..275: the shared return, reached both by the early gate
  // failing and by the gate passing with a loop that never actually enters.
  return true;
}

export type LegacySpriteLayerPredicateBState = {
  /** f.ay:I (#231). Read-only in `b()`. */
  readonly ay: number;
  /** f.az:I (#233). Read-only in `b()`. */
  readonly az: number;
  /** f.ap:I (#213). Output -- written, never read, in `b()`. */
  ap: number;
  /** f.ax:I (#230). Read and written throughout `b()`. */
  ax: number;
  /** f.aq:I (#216). Read-only in `b()`. */
  readonly aq: number;
  /** f.an:I (#209). Output -- written, never read, in `b()`. Distinct from `an:B` (#210). */
  an: number;
  /** f.ao:I (#211). Output -- written, never read, in `b()`. Distinct from `ao:B` (#212). */
  ao: number;
  /** f.e:[B (#286), dense state. */
  readonly dense: Int8Array;
  /** f.a:[[S (#131), tracked elsewhere as `statScratch` (`new short[2][26]`, see `LegacyMapMarkerDetail.ts`). Only row 0 is read here. */
  readonly statScratch: Int16Array[];
  /** f.a:[B (#137), tracked elsewhere as `packedBytes`. */
  readonly packedBytes: Int8Array;
  /** f.a:[S (#138), tracked elsewhere as `packedOffsets`. */
  readonly packedOffsets: Int16Array;
  /** f.aw:I (#228). Read-only in `b()`. */
  readonly aw: number;
  /** f.at:I (#221). Read-only in `b()`. */
  readonly at: number;
  /** f.av:I (#225). Read-only in `b()`. */
  readonly av: number;
};

/** Exact port of `private boolean b()`. */
export function stepLegacySpriteLayerPredicateB(state: LegacySpriteLayerPredicateBState): boolean {
  if (state.ay === 0) {
    // Offsets 7..120.
    state.ap = state.az;
    // Offset 15..17 sets ax=0; immediately clobbered by the unconditional
    // offset 20..38 write below (dead write, not reproduced).
    state.ax = ((state.dense[5151 + state.aq] ?? 0) >> 2) & 3;
    if (state.ax > 1) {
      // Offsets 41..61.
      state.ax -= 2;
      state.an = 0;
    }
    // Offsets 64..117.
    state.ax *= 72;
    if (state.aq >= 51) state.ax += 36;
    state.ax += (state.dense[UNIT_GENDER + state.aq] ?? 0) * 18;
    return true;
  }

  if (state.ay === 9) {
    // Offsets 132..277.
    state.ao = state.az;
    // Offset 140..142 sets ax=0; immediately clobbered by the
    // unconditional offset 145..161 write below (dead write).
    state.ax = (state.dense[5151 + state.aq] ?? 0) & 3;
    if (state.aq >= 51) {
      // Offsets 164..178.
      state.an = 3;
    } else if (state.ax > 0) {
      // Offsets 181..193.
      state.an = state.ax;
    }
    // Offsets 196..263: three-way classification.
    let value: number;
    if ((state.dense[UNIT_GENDER + state.aq] ?? 0) === 1) value = 1;
    else if ((state.dense[UNIT_AGE + state.aq] ?? 0) < 30) value = 3;
    else if ((state.dense[UNIT_AGE + state.aq] ?? 0) < 50) value = 2;
    else value = 0;
    // Offsets 266..274.
    state.ax = value * 12;
    return true;
  }

  if (state.ay === 7) {
    // Offsets 289..315.
    const row0 = state.statScratch[0];
    if (state.aq === (row0?.[17] ?? 0)) {
      state.ax += 2;
      return true;
    }
    // Offsets 318..412.
    const inner =
      state.packedBytes[(state.packedOffsets[T_TYPE_JOB] ?? 0) + (state.dense[UNIT_JOB_TYPE + state.aq] ?? 0)] ?? 0;
    const outer = state.packedBytes[(state.packedOffsets[42] ?? 0) + inner] ?? 0;
    if (outer === 0) return false;
    state.ax += outer - 1;
    return true;
  }

  // Offsets 415..437: reached whenever ay is not 0, 9, or 7.
  if (state.aw === 0 && state.ay >= 5 && state.ay <= 8) {
    const d6565 = state.dense[UNIT_HELD_ITEM + state.aq] ?? 0;
    // Offsets 439..464.
    if (state.at < 0 && d6565 === 1) return false;
    // Offsets 465..521.
    if ((state.ay === 5 && d6565 === 4) || (state.ay === 6 && d6565 === 5)) {
      state.ax = 1;
      return true;
    }
    // Offsets 524..559.
    const classified = state.packedBytes[(state.packedOffsets[145] ?? 0) + d6565] ?? 0;
    return classified === state.ay;
  }

  // Offset 560 onward: reached when aw!==0, or aw===0 with ay outside [5,8].
  if (state.aw === 2) {
    const d3535 = state.dense[UNIT_CARRY_KIND + state.aq] ?? 0;
    if (d3535 !== 0) {
      // Offsets 584..732.
      if (state.ay === 4) {
        const d3636 = state.dense[UNIT_CARRY_AMOUNT + state.aq] ?? 0;
        if (
          d3636 > 0 ||
          state.av === 113 ||
          state.av === 114 ||
          state.av === 115 ||
          state.av === 116
        ) {
          state.ax += d3535;
          return true;
        }
        // Falls through: ay===4 with none of the above -- reaches offset
        // 669's own `ay!==5`/`ay!==8` checks, both false-then-true here
        // since ay is 4, landing on the final `return true` below.
      } else if (state.ay === 5) {
        const d6565b = state.dense[UNIT_HELD_ITEM + state.aq] ?? 0;
        if (d6565b === 9) return false;
        state.ax += d6565b;
        return true;
      } else if (state.ay === 8) {
        return false;
      }
      return true;
    }

    // Offsets 733..858 (d3535===0). Offset 745..746 re-reads
    // dense[3535+aq] and branches `ifne 917`, but nothing mutates it
    // between the two reads inside this sub-branch, so that re-check is
    // always false here and is not reproduced as a literal branch.
    if (state.ay === 4) return false;
    if (state.ay === 5) {
      const d6565c = state.dense[UNIT_HELD_ITEM + state.aq] ?? 0;
      if (d6565c === 1) return false;
      if (d6565c === 9) return false;
      state.ax += d6565c;
      return true;
    }
    if (state.ay === 8) {
      const d6565d = state.dense[UNIT_HELD_ITEM + state.aq] ?? 0;
      return d6565d === 1;
    }
    return true;
  }

  // Offsets 859..918.
  if (state.aw === 1 && state.ay === 5) {
    const d6565e = state.dense[UNIT_HELD_ITEM + state.aq] ?? 0;
    if (d6565e === 9) return false;
    state.ax += d6565e;
    return true;
  }

  return true;
}
