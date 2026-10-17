import { BLD_KIND, UNIT_CARRY_AMOUNT, UNIT_NAME, UNIT_PORTRAIT } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";
/**
 * Direct translation of `private boolean c()` (bytecode/f-javap.txt:12798,
 * offsets 0..1147) -- the "changed" gate `f.a(byte,int,int)`'s offset-6
 * `invokespecial #556` call reads. This is a DIFFERENT method from the
 * already-ported 2-arg `private void c(int,int)` (`stepLegacyC2`); the two
 * only share the letter "c". See reverse-engineering/frame-command-changed-
 * cluster.md for the full derivation and open questions.
 *
 * Confirmed reachable branches (opening the command menu via LSK/`*`
 * activates selectionFlags[0]/[5]/[17], which f.m()'s 20-slot HUD loop
 * turns into command=0/5/17 calls -- see the cluster doc's own docblock in
 * its section 0): aD===0 and aD∈{2,5} (the latter via the fully-ported
 * `stepLegacyZAdChange`, offset-decoded from `z()`).
 *
 * aD===17 calls `B()` (`bytecode/f-javap.txt:13931`) directly; its
 * `vByte===1` branch AND its shared change-detection tail (offsets
 * 371..472, see `stepLegacyMenuIconState`'s own docblock -- BUG FIX
 * 2026-09-03, this tail was missing entirely and is the reason `changed`
 * could never be true for aD===17) are both fully ported here
 * (`stepLegacyMenuIconState`) -- command=17 is the single most common real
 * call value (the shared text/dialogue overlay every non-G/H handler
 * uses, and ground truth Sec.8's selected-unit HUD panel), so this closes
 * the last major gap in that path. `B()`'s `vByte!==1` branch (offsets
 * 206..370) sets the menu soft-key icon states; ported 2026-09-28.
 *
 * aD===6 calls `A()` (`bytecode/f-javap.txt:13839`) directly, fully ported
 * here (`stepLegacyA`). aD∈{7,8} is `c()`'s own inline logic (offsets
 * 252..473, no sub-method call), also fully ported (`stepLegacyAd7Or8`).
 * **Both confirmed reachable via live jdb trace against the real
 * JAR/KEmulator** (2026-08-26): with the Build submenu open, every single
 * frame fires exactly `aD=0,6,8,17` in that order (~3000 consecutive hits,
 * zero variation across building-type switches) -- see the cluster doc's
 * §6. `aD===8` is the confirmed real Build-submenu value; `aD===7` never
 * appeared in the trace, but shares the exact same code (`case 7: case 8:`
 * in the original switch) so it's ported together.
 *
 * aD===4 calls `y()` (`bytecode/f-javap.txt:13552`) -- **confirmed a
 * guaranteed no-op crash** (2026-08-26), not a callback seam. `y()`'s very
 * first real instruction dereferences `f.b:[S]` (#245) via `saload`; that
 * field is a constructor-aliased copy of `b.b:[S]` (#132), already
 * believed permanently null (RETRACTED 2026-09-07 -- it is not) in 8+ other methods this project has ported
 * (never once assigned via `putfield` anywhere in the class -- grep
 * confirms zero writes). `y()` has no exception table of its own, and
 * neither does `c()`, so the resulting `NullPointerException` propagates
 * uncaught up to `f.a(byte,int,int)`'s own broad `catch (Exception)`
 * (offsets 5..1059 -> target 1060, confirmed via its own exception table)
 * -- the SAME boundary `LegacyFrameCommandDraw.ts`'s `catch { return
 * undefined; }` already models. Net effect: **every real `command===4`
 * call draws nothing at all, in the original game, unconditionally** --
 * live jdb trace confirms `aD=4` fires continuously and stably while the
 * Villagers roster is open (`reverse-engineering/frame-command-changed-
 * cluster.md` §7), so this dead-render is a real, reachable original bug,
 * not a hypothetical. `drawFrameCommandPrimitive` skips calling
 * `drawLegacyFrameCommand` entirely for `command===4` to match; nothing
 * from `y()`'s unreachable loop/epilogue body is modeled (would be
 * inventing behavior no execution path ever reaches).
 *
 * aD∈{1,9} calls `x()` (`bytecode/f-javap.txt:13415`) directly, fully
 * ported here (`stepLegacyX`). Live-observed as `aD=1` near the Call to
 * arms/Form up! transitions (cluster doc §7) -- reachable, though not
 * pinned to as precise a trigger as `aD=2`/`4` yet.
 *
 * aD===12 is `c()`'s own second inline block (offsets 567..744, a completely
 * separate `if (aD===12)` from the aD∈{7,8} block above -- no sub-method
 * call), ported as `stepLegacyAd12`. **Confirmed live-reachable**: at Q=17
 * (the dialog/cutscene screen), resource 12's row loop consumes `d:[S]`
 * index 57 for its group===3 kind3 "speaker name" row -- this is the exact
 * producer that populates the index `f.a(byte,int,int)`'s row loop reads
 * via `aE`, closing the gap where that row fell back to record 0
 * ("ARMOURY") because `d:[S]` was never written. See docs/unknowns.md's
 * 2026-09-02 entry.
 *
 * aD 10/13/14/15/16/18/19 (offsets 476..566, 745..1142) ported
 * 2026-09-29 (they were bare callbacks, and 15 was missing from the switch).
 * aD 14 is the map overview (Q 19, `L()`); its `D()` is `onD`.
 */
export type LegacyFrameCommandChangedState = {
  /** f.a:[[S] (#131) -- mainArrays.aShort, the 2x26 per-team stat table (NOT packedData.shortTables, see the cluster doc's own field-mapping correction). */
  readonly aShortStats: readonly Int16Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.d:[S] (#269) -- game.zlDShorts, the shared 107-element scratch table. */
  readonly dShort: Int16Array;
  /** f.k:[B] (#330) -- game.zlKBytes, the shared 107-element scratch table. */
  readonly kBytes: Int8Array;
  /** f.b:[Z] (#234) -- game.frameFlags. */
  readonly flags: boolean[];
};

export type LegacyFrameCommandChangedCallbacks = {
  /** private void D() (#406): the map overview's scroll update, aD 14. */
  readonly onD?: () => void;
};

/**
 * f.a:[[S][0][packedBytes[packedOffsets[146]+i]] compared against the
 * cached zlDShorts[packedOffsets[195]+60+i] for i in 0..4 -- offsets
 * 12..153. `packedOffsets[146]` is referenced nowhere else in the class.
 */
function stepAd0(state: LegacyFrameCommandChangedState): boolean {
  const stats = state.aShortStats[0];
  if (!stats) return false;
  const lookupBase = state.packedOffsets[146] ?? 0;
  // Offsets 42..62: d[ a[a_s[195] + 60 + 0] + i ] -- the command's aE read
  // from the packed table (CORRECTED 2026-09-29: the table offset itself was
  // used as the index, so the top bar's counts stayed 0).
  const cacheBase = state.packedBytes[(state.packedOffsets[195] ?? 0) + 60] ?? 0;
  let changed = false;
  for (let i = 0; i < 5; i += 1) {
    const statIndex = state.packedBytes[lookupBase + i] ?? 0;
    const fresh = stats[statIndex] ?? 0;
    const cached = state.dShort[cacheBase + i] ?? 0;
    if (fresh !== cached) {
      state.dShort[cacheBase + i] = fresh;
      state.kBytes[cacheBase + i] = 1;
      changed = true;
    }
  }
  return changed;
}

/**
 * Exact `private void y()` (bytecode/f-javap.txt:13552, offsets 0..245) --
 * c()'s aD == 4 case, the selected-unit panel (HUD slot 4). For the 23 unit
 * fields `e[saveOffsets[t147[i]] + l]` it compares against the cache
 * `d[t195[64] + i]`; a difference sets G and the cell's `k` flag and updates
 * the cache. Cells 11 and 12 redraw together; `d[29] = 0` when
 * `e[3636 + l] == 0`; `d[14] = 108 + e[6868 + l]`.
 * PORTED 2026-09-28: this was treated as a guaranteed throw on the retracted
 * "f.b:[S] (#245) is null" premise (e.f() writes it -- saveOffsets), and the
 * caller skipped command 4 entirely, so the panel area stayed black. The
 * user's KEmulator screenshot (2026-09-29) shows the panel.
 */
export function stepLegacyY(state: LegacyZAdChangeState): boolean {
  const { dense, dShort, kBytes, packedBytes, packedOffsets, saveOffsets, l } = state;
  const base = packedBytes[(packedOffsets[195] ?? 0) + 60 + 4] ?? 0;
  const t147 = packedOffsets[147] ?? 0;
  let changed = false;
  for (let i = 0; i < 23; i += 1) {
    const value = dense[(saveOffsets[packedBytes[t147 + i] ?? 0] ?? 0) + l] ?? 0;
    if (value !== (dShort[base + i] ?? 0)) {
      changed = true;
      dShort[base + i] = value;
      kBytes[base + i] = 1;
    }
  }
  if (kBytes[11] === 1 || kBytes[12] === 1) {
    kBytes[11] = 1;
    kBytes[12] = 1;
  }
  if ((dense[UNIT_CARRY_AMOUNT + l] ?? 0) === 0) dShort[29] = 0;
  dShort[14] = ((108 + (dense[UNIT_NAME + l] ?? 0)) << 16) >> 16;
  return changed;
}

export function stepLegacyFrameCommandChanged(
  command: number,
  vByte: number,
  state: LegacyZAdChangeState,
  callbacks: LegacyFrameCommandChangedCallbacks = {},
): boolean {
  if (command === 0) return stepAd0(state);

  switch (command) {
    case 1:
    case 9:
      return stepLegacyX(state);
    case 2:
    case 5:
      return stepLegacyZAdChange(command, state);
    case 4:
      return stepLegacyY(state);
    case 6:
      return stepLegacyA(command, state);
    case 7:
    case 8:
      return stepLegacyAd7Or8(command, state);
    case 10:
      // Offsets 476..513: no G write.
      if (state.Q === 16 && state.frameGenCounterZ !== state.frameGenCounterY) state.kBytes[53] = 1;
      return false;
    case 12:
      return stepLegacyAd12(state);
    case 13: {
      // Offsets 745..833.
      const add = state.qByte === 7 ? 21 : (state.packedBytes[(state.packedOffsets[248] ?? 0) + state.qByte] ?? 0);
      state.dShort[62] = toShort(82 + add);
      state.dShort[63] = state.akByte;
      return markIfNewFrame(state, 61);
    }
    case 14:
      return stepLegacyAd14(state, callbacks);
    case 15:
      // Offsets 516..564.
      state.dShort[73] = toShort(98 + state.mByte);
      return markIfNewFrame(state, 72);
    case 16:
      // Offsets 1018..1051.
      return markIfNewFrame(state, 76);
    case 17:
      return stepLegacyMenuIconState(command, vByte, state, callbacks);
    case 18:
    case 19: {
      // Offsets 1054..1142: highlight row Z of the t307[m]-row list; no G write.
      const base = state.packedBytes[(state.packedOffsets[195] ?? 0) + 60 + command] ?? 0;
      const rows = state.packedBytes[(state.packedOffsets[307] ?? 0) + state.mByte] ?? 0;
      for (let i = 0; i < rows; i += 1) state.kBytes[base + i] = i === state.Z ? 1 : 0;
      return false;
    }
    default:
      return false;
  }
}

export type LegacyZAdChangeState = LegacyFrameCommandChangedState & {
  /** f.b:[S] (#245) -- saveOffsets (written by e.f()); read by y(). */
  readonly saveOffsets: Int16Array;
  /** f.l:B (#337) -- game.selectedId, the selected unit; read by y(). */
  readonly l: number;
  /** f.r:[B] (#358) -- mainArrays.r. */
  readonly r: Int8Array;
  /** f.as:B (#219) -- game.menuCursor, the same selector stepLegacyZAe's left/right input cycles. */
  readonly as: number;
  /** f.K:Z (#69) -- game.choosingChief. */
  readonly kFlag: boolean;
  /** f.F:Z (#49) -- game.entityFocusFlag. */
  readonly entityFocusFlag: boolean;
  /** f.V:Z (#109) -- game.zAfCursorVFlag. */
  readonly zAfCursorVFlag: boolean;
  /** f.e:[B] (#286) -- denseState. */
  readonly dense: Int8Array;
  /** Set on `state.vInt` write (zlDShorts[4] > 0 branch); caller applies to game.vInt. */
  vInt: number;
  /** f.w:B (#382) -- game.barMode. */
  readonly wByte: number;
  /** f.Y:I (#118) -- game.zlYInt. */
  readonly zlYInt: number;
  /** f.q:I (#356) -- game.qCounter. */
  readonly qCounter: number;
  /** f.F:B (#50) -- game.selectionGroup. */
  readonly FByte: number;
  /** f.ad:B (#186) -- game.selectionAd, written only by a(ZZZZZZZZZ) (#464). */
  readonly adByte: number;
  /** f.y:I (#388), lowercase -- game.frameGenCounterY. NOT zlYInt (Y:I #118, UPPERCASE). */
  readonly frameGenCounterY: number;
  /** f.z:I (#391), lowercase -- game.frameGenCounterZ. */
  readonly frameGenCounterZ: number;
  /** f.ay:B (#232) -- game.ayByte. */
  readonly ayByte: number;
  /** f.a:[[B] (#130) -- mainArrays.aByte, byte[5][50]. */
  readonly aByteRows: readonly Int8Array[];
  /**
   * f.u:[B] (#371) -- mainArrays.uBytes, the SAME 10-element delayed
   * action-queue array `stepLegacyByteActionQueue` already reads/writes
   * (confirmed: only one `u:[B]` field exists in the whole class, sized
   * `new byte[10]` at both the constructor and this field's own binding --
   * not a new field despite the unrelated method context).
   */
  readonly uBytes: Int8Array;
  /** f.am:B (#208) -- game.am. Read-write: `stepLegacyAd12` can clamp it to 51. */
  am: number;
  /**
   * f.q:B (#357) -- game.mission. NOT `qCounter` (f.q:I #356, a totally
   * different field that happens to share the letter "q" -- see that
   * field's own docblock above).
   */
  readonly qByte: number;
  /** f.Q:B (#90) -- game.screen, the screen-state selector. */
  readonly Q: number;
  /** f.al:B (#206) -- game.al. */
  readonly al: number;
  /** f.ai:B (#200) -- game.ai. */
  readonly ai: number;
  /** f.m:B (#339) -- game.mByte. */
  readonly mByte: number;
  /** f.ak:B (#204) -- game.akByte. */
  readonly akByte: number;
  /** f.Z:I (#120) -- game.Z, the list highlight read by aD 18/19. */
  readonly Z: number;
  /** f.W:I (#111) / f.X:I (#114) -- the map overview window origin. */
  readonly W: number;
  readonly X: number;
  /** f.c:S (#254) / f.d:S (#266) -- map width and height. */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** f.T/U/Q/R:Z (#102/#106/#92/#95), written by aD 14. */
  zAd14T: boolean;
  zAd14U: boolean;
  zAd14Q: boolean;
  zAd14R: boolean;
  /** f.af:I (#192) / f.ag:I (#194), cleared by aD 14. */
  af: number;
  ag: number;
};

/**
 * Direct translation of `private void z()` (bytecode/f-javap.txt:13702,
 * offsets 0..232) -- `c()`'s aD∈{2,5} target.
 */
export function stepLegacyZAdChange(command: number, state: LegacyZAdChangeState): boolean {
  const cached4 = state.dShort[4] ?? 0;
  if (cached4 > 0) {
    state.vInt = cached4;
    state.kBytes[5] = -1;
    state.kBytes[3] = -1;
    return true;
  }

  const selected = state.r[state.as] ?? 0;
  if ((state.dShort[5] ?? 0) === selected) {
    if (!state.flags[command]) return false;
  }
  state.dShort[5] = selected;
  state.kBytes[5] = 1;
  state.kBytes[3] = 1;

  let record: number;
  if (selected < 10) {
    if (selected >= 0) {
      record = 12 + selected;
    } else if (state.kFlag) {
      record = 41;
    } else if (!state.entityFocusFlag && state.zAfCursorVFlag) {
      // Offsets 177..217: F (browsing VILLAGERS) -> 191, the name; else V ->
      // 217, GET OUT! (29). FIXED 2026-10-08: was `F || V`, so the
      // VILLAGERS list titled every villager GET OUT!.
      record = 29;
    } else {
      record = 108 + (state.dense[UNIT_NAME - selected] ?? 0);
    }
  } else {
    record = 11 + selected;
  }
  state.dShort[3] = record;
  state.kBytes[4] = -1;
  return true;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

/** `if (z != y) { k[index] = 1; G = true; }` -- the common aD 13/15/16 tail. */
function markIfNewFrame(state: LegacyZAdChangeState, index: number): boolean {
  if (state.frameGenCounterZ === state.frameGenCounterY) return false;
  state.kBytes[index] = 1;
  return true;
}

/**
 * `c()` offsets 836..999, aD 14 (the map overview): the four edge flags,
 * `D()` when the window origin moved, then `k[66] = 1` and af = ag = 0.
 * `ag:B`/`ah:B` are the statics 40/60 (f.<clinit> offsets 28..35). No G write.
 */
function stepLegacyAd14(state: LegacyZAdChangeState, callbacks: LegacyFrameCommandChangedCallbacks): boolean {
  state.zAd14T = state.W !== 0;
  state.zAd14U = state.W + 40 < state.mapWidth;
  state.zAd14Q = state.X === 0;
  state.zAd14R = state.X + 60 >= state.mapHeight;
  if ((state.dShort[66] ?? 0) !== state.W || (state.dShort[71] ?? 0) !== state.X) {
    state.dShort[66] = toShort(state.W);
    state.dShort[71] = toShort(state.X);
    callbacks.onD?.();
  }
  state.kBytes[66] = 1;
  state.af = 0;
  state.ag = 0;
  return false;
}

/**
 * Direct translation of `private void B()` -- `c()`'s aD===17 target.
 * Covers the `vByte===1` branch (bytecode/f-javap.txt:13931, offsets
 * 0..203) plus the shared tail at offsets 371..472 that BOTH the
 * `vByte===1` branch and the `vByte!==1`/`Q===32` branch (offsets 206..370,
 * still a separate, unrelated splash-draw investigation left as a
 * callback here) fall through into -- confirmed via the bytecode's own
 * control flow: offset 203 (`goto 371`) and the `Q!==32` block ending at
 * offset 370 both land on 371 with no further branch.
 *
 * BUG FIX (2026-09-03): this tail was previously missing entirely, so
 * `c()`'s shared `G:Z` (#54, the method's "changed" return value) could
 * never become true for aD===17 -- every call fell through the dispatcher
 * to a hardcoded `return false`. Traced byte-for-byte: offsets 371..389
 * recompute the SAME `tableIndex` as the `vByte===1` prefix
 * (`packedBytes[commandBase+60+17]`, i.e. `commandBase+60+aD` with
 * aD fixed at 17, not the running `command` param); offsets 391..469 loop
 * `tableIndex` and `tableIndex+1` comparing `zlDShorts[i]` (the cache)
 * against `zlKBytes[i]` (the just-written value1/value2 above) -- on any
 * mismatch, the cache is updated and `G:Z=true` (offset 451..453,
 * `putfield #54`); on a match, `zlKBytes[i]` is zeroed instead (offset
 * 459..465, no G write). This is the SAME "compare against dShort cache,
 * mark G on mismatch" shape `stepAd0`/`stepLegacyX`/`stepLegacyA` already
 * implement for their own commands -- B() was simply missing its copy.
 *
 * Without this, `drawLegacyFrameCommand`'s `changed` gate for command 17
 * (the shared text/dialogue overlay, and -- per the packed row table --
 * ground truth Sec.8's selected-unit HUD panel) could only ever be
 * reached via the one-shot `selection` flag (`flags[17]`), which
 * `drawLegacyFrameCommand` itself consumes (`flags[command]=false`) after
 * a single draw -- so the panel drew for at most one frame after
 * selection and then silently stopped, with no per-tick mechanism to
 * bring it back even though `value1`/`value2` (and hence the real
 * on-screen content) keep changing every tick a unit stays selected.
 *
 * Both writes below target `zlKBytes` at an index READ from the packed
 * command table (`packedBytes[commandBase+60+aD]`), not the fixed
 * `commandBase+60+aD` pattern `stepAd0`/`stepLegacyZAdChange` use -- traced
 * byte-for-byte via the JVM operand stack (the two `getfield`s at offsets
 * 9/13 push `kBytes` then `packedBytes` in that order, so the later
 * `baload` at offset 32 reads `packedBytes[idx]` while `kBytes` stays
 * beneath it on the stack as the eventual `bastore` target -- easy to
 * misread as a `kBytes` self-read on a first pass, see
 * reverse-engineering/frame-command-changed-cluster.md).
 */
export function stepLegacyMenuIconState(
  command: number,
  vByte: number,
  state: LegacyZAdChangeState,
  callbacks: LegacyFrameCommandChangedCallbacks = {},
): boolean {
  const commandBase = (state.packedOffsets[195] ?? 0) + 60;
  const tableIndex = state.packedBytes[commandBase + command] ?? 0;

  if (vByte !== 1) {
    // Offsets 206..370 (ported 2026-09-28; was an unwired callback wrongly
    // called a splash draw): menu screens set the two soft-key icon states,
    // 2/3 on Q 32, otherwise t153[116 + Q] / t153[145 + Q].
    const table153 = state.packedOffsets[153] ?? 0;
    if (state.Q === 32) {
      state.kBytes[tableIndex] = 2;
      state.kBytes[tableIndex + 1] = 3;
    } else {
      state.kBytes[tableIndex] = state.packedBytes[table153 + 116 + state.Q] ?? 0;
      state.kBytes[tableIndex + 1] = state.packedBytes[table153 + 145 + state.Q] ?? 0;
    }
  } else {
    // Offsets 34..125: 2 when w == 3, Y == 4, or a valid build choice is
    // pending (q > 0, e[8749+q] == 0, 0 <= r[as] <= 5); else 0 for w 4/2, 1.
    // CORRECTED 2026-09-28: the q/e/r terms were negated.
    const pick = state.r[state.as] ?? 0;
    const value1 =
      state.wByte === 3 ||
      state.zlYInt === 4 ||
      (state.qCounter > 0 && (state.dense[BLD_KIND + state.qCounter] ?? 0) === 0 && pick >= 0 && pick <= 5)
        ? 2
        : state.wByte === 4 || state.wByte === 2
          ? 0
          : 1;
    state.kBytes[tableIndex] = value1;

    const value2 = state.kFlag
      ? 2
      : state.wByte === 1
        ? 0
        : state.FByte !== -1
          ? 0
          : state.adByte === 1 || state.adByte === 9
            ? 1
            : 0;
    state.kBytes[tableIndex + 1] = value2;
  }

  // Shared tail (offsets 371..472): 2-slot cache compare, sets G on any mismatch.
  let changed = false;
  for (let i = tableIndex; i < tableIndex + 2; i += 1) {
    if ((state.dShort[i] ?? 0) === (state.kBytes[i] ?? 0)) {
      state.kBytes[i] = 0;
    } else {
      state.dShort[i] = state.kBytes[i] ?? 0;
      state.kBytes[i] = 1;
      changed = true;
    }
  }
  return changed;
}

/**
 * Direct translation of `private void A()` (bytecode/f-javap.txt:13839,
 * offsets 0..151) -- `c()`'s aD===6 target. Confirmed live-reachable via
 * jdb (fires every frame the Build submenu is open, alongside aD=0/8/17
 * -- see reverse-engineering/frame-command-changed-cluster.md §6).
 *
 * Activates 5 CONSECUTIVE zlKBytes slots (34..38) whenever the selected
 * item (`r[as]`) changes -- traced via the JVM operand stack (two
 * `dup_x2`/`bastore` triplets writing 34/38/36 then 35/37, all to value
 * 1). Strongly suggestive of "mark all 5 top-level menu icons dirty" but
 * unconfirmed -- see the cluster doc.
 */
export function stepLegacyA(command: number, state: LegacyZAdChangeState): boolean {
  let changed = false;
  const selected = state.r[state.as] ?? 0;
  if ((state.dShort[36] ?? 0) !== selected || state.flags[command]) {
    state.vInt = selected;
    state.dShort[36] = selected;
    state.kBytes[34] = 1;
    state.kBytes[35] = 1;
    state.kBytes[36] = 1;
    state.kBytes[37] = 1;
    state.kBytes[38] = 1;
    changed = true;
  }
  if (state.frameGenCounterZ !== state.frameGenCounterY) {
    state.kBytes[38] = 1;
    changed = true;
  }
  state.dShort[34] = selected;
  return changed;
}

/**
 * Direct translation of `c()`'s own inline `aD∈{7,8}` logic (bytecode/
 * f-javap.txt:12939, offsets 252..473, no sub-method call). Confirmed
 * live-reachable (`aD===8` specifically) via jdb -- see this file's own
 * top-level docblock and reverse-engineering/frame-command-changed-
 * cluster.md §6.
 *
 * Reads the SAME selector (`r[as]`) `stepLegacyZAe`'s left/right input
 * cycles, and `packedOffsets[138]` -- the building-footprint width/height
 * table `stepLegacyC2` already uses -- strongly suggesting this is the
 * Build submenu's own per-building-type record lookup (icon + two
 * adjacent attribute values, e.g. cost pair or width/height).
 */
export function stepLegacyAd7Or8(command: number, state: LegacyZAdChangeState): boolean {
  const selected = state.r[state.as] ?? 0;
  if ((state.dShort[46] ?? 0) === selected && !state.flags[command]) {
    return false;
  }
  state.dShort[46] = selected;
  if (selected >= 10) return true;

  // Offsets 319..354: d[ a[a_s[195] + 60 + aD] ] = r[as] (CORRECTED
  // 2026-09-29: the packed-table read was missing).
  const commandBase = (state.packedOffsets[195] ?? 0) + 60;
  const baseIndex = state.packedBytes[commandBase + command] ?? 0;
  state.dShort[baseIndex] = selected;
  const footprintBase = state.packedOffsets[T_BUILDING] ?? 0;
  state.dShort[baseIndex + 1] = state.packedBytes[footprintBase + 338 + selected + 12] ?? 0;
  state.dShort[baseIndex + 2] = state.packedBytes[footprintBase + 364 + selected + 12] ?? 0;
  return true;
}

/**
 * Direct translation of `c()`'s own second, unrelated inline `aD===12`
 * block (bytecode/f-javap.txt:13113, offsets 567..744, no sub-method call
 * -- a completely separate `if (aD===12)` guard from the aD∈{7,8} block
 * above, not a shared branch). Confirmed live-reachable: resource 12 is one
 * of the two `f.a(byte,int,int)` calls Q=17's dialog screen makes every
 * tick, and its row loop's group===3 kind3 "speaker name" row consumes
 * `d:[S]` index 57 -- exactly the index this writes. Before this was wired,
 * `d[57]` stayed 0 for the entire session (game.zlDShorts starts and stays
 * all-zero), so that row always read text record 0 ("ARMOURY", the first
 * of the 12 building names) instead of the intended speaker-name record.
 * See docs/unknowns.md's 2026-09-02 entry.
 *
 * offsets 576..596: `if (am>=51 && q<=2) am=51` -- a clamp, not a plain
 * write (both a lower AND upper bound: only fires when am is already >=51,
 * so it just re-pins it to exactly 51, never raises a smaller am).
 *
 * offsets 599..643: `d[57] = (a[0][17]===am) ? 104 : 108+e[6868+am]` -- the
 * base speaker-name record lookup, `am` selecting which speaker table row.
 *
 * offsets 644..697: `if (Q===17 && al===3 && ai∈{35,50,54}) d[57] = 105`
 * -- an override active only in the al===3 page-turn-in-progress state (a
 * DIFFERENT al value from the al===2 "settled dialog" state this session's
 * live checks run in), so it doesn't fire in the recipe's normal capture.
 *
 * offsets 697..717: `d[58] = e[2727+am]` -- the speaker's face: the
 * dialog row command 1151 draws composite `720 + d[58]` (seen at Q=17 and
 * Q=20, 2026-10-02). `e[2727+id]` is re-rolled by f.b(byte) at ages 12
 * and 35, so a villager's portrait changes with age.
 *
 * offsets 718..742: `if (z!==y) { k[56]=1; G=true }` -- G:Z (#54) is this
 * method's own inline "changed" accumulator (set false at method entry,
 * true on write, `return G` at the shared epilogue); mirrors how every
 * other branch in this file returns its own `changed` boolean.
 */
export function stepLegacyAd12(state: LegacyZAdChangeState): boolean {
  if (state.am >= 51 && state.qByte <= 2) {
    state.am = 51;
  }

  const stat17 = state.aShortStats[0]?.[17] ?? 0;
  state.dShort[57] = stat17 === state.am ? 104 : 108 + (state.dense[UNIT_NAME + state.am] ?? 0);

  if (state.Q === 17 && state.al === 3 && (state.ai === 35 || state.ai === 50 || state.ai === 54)) {
    state.dShort[57] = 105;
  }

  state.dShort[58] = state.dense[UNIT_PORTRAIT + state.am] ?? 0;

  if (state.frameGenCounterZ !== state.frameGenCounterY) {
    state.kBytes[56] = 1;
    return true;
  }
  return false;
}

/**
 * Direct translation of `private void x()` (bytecode/f-javap.txt:13415,
 * offsets 0..220) -- `c()`'s aD∈{1,9} target. Confirmed live-reachable
 * via jdb (`aD=1` observed near the Call to arms/Form up! transitions,
 * reverse-engineering/frame-command-changed-cluster.md §7), though not
 * yet pinned to as precise a trigger as `aD=2`/`4`.
 *
 * Unlike every other branch ported so far, this one hardcodes the literal
 * index `9` for its final compare/sync loop -- NOT the `command` parameter
 * (verified: `aD===1` and `aD===9` both run this exact same code, and the
 * table lookup at offset 124..127 uses `bipush 9`, not `iload` of `aD`).
 */
export function stepLegacyX(state: LegacyZAdChangeState): boolean {
  state.kBytes[47] = state.ayByte;

  for (let i = 0; i < 2; i += 1) {
    const row = state.aByteRows[2 + i];
    if (state.FByte === 2 + i) {
      state.kBytes[48 + i] = 2;
    } else if ((row?.[0] ?? 0) > 0) {
      state.kBytes[48 + i] = 1;
    } else {
      state.kBytes[48 + i] = 0;
    }
  }

  const u0 = state.uBytes[0] ?? 0;
  state.kBytes[50] = (41 + u0) & 0xff;
  const table304 = state.packedOffsets[304] ?? 0;
  state.kBytes[51] = state.packedBytes[table304 + u0] ?? 0;

  const base = state.packedBytes[(state.packedOffsets[195] ?? 0) + 60 + 9] ?? 0;
  let changed = false;
  for (let i = base; i < base + 5; i += 1) {
    if (state.kBytes[i] === -1) continue;
    if ((state.dShort[i] ?? 0) === state.kBytes[i]) {
      state.kBytes[i] = 0;
    } else {
      state.dShort[i] = state.kBytes[i] ?? 0;
      state.kBytes[i] = 1;
      changed = true;
    }
  }
  return changed;
}
