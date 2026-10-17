import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_WORK, UNIT_CARRY_AMOUNT, UNIT_FOOD, UNIT_MAX_HP, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE, UNIT_WORK_PROGRESS } from "../../core/DenseLayout";
import { T_SKILL_ATTR, T_SKILL_CAP, T_SKILL_CHANCE, T_SKILL_STEP } from "../../core/DataTables";
/**
 * Direct translation of `private boolean i()` (constant pool #392, a
 * distinct overload from `private void i(int)` -- same name, different
 * signature, this project's recurring hazard), bytecode/b-javap.txt
 * offsets 0..1030 (line 23074). `y()`'s own `onEntityProbe` gate
 * (`if (!onEntityProbe()) return;`).
 *
 * **RETRACTED (2026-09-04/2026-09-07)**: this docblock used to conclude
 * that `J()` (#246, offset 192-195) is a guaranteed throw via `b:[S]`#132
 * (permanently null), making offsets 196..1028 (~830 of the method's 1030
 * bytes) provably 100% unreachable, and cascading the same conclusion onto
 * `j():Z` (`LegacySubsystemEntityAssociationScan.ts`, this method's own
 * call at offset 595), `K()` (`LegacySubsystemEntityTypeReaction.ts`), and
 * everything past `y()`'s `onEntityProbe` gate. None of that holds:
 * `b:[S]` (#132) is class b's copy of `f.b:[S]` (#245), assigned in
 * `b.a(f)` at bytecode/b-javap.txt:550 from the `new short[570]` that
 * `e.f()` allocates -- live in this port as `LegacyRuntimeState.saveOffsets`.
 * `J()` was restored in full on 2026-09-04 (`subsystemEntityJTrigger`), so
 * it returns normally. This file now ports offsets 196..1028 for real; see
 * docs/unknowns.md's 2026-09-04/09-07 entries.
 *
 * Full control flow, offset by offset:
 *
 *  1. offset 0..79: `mode = dense[2929+id]&0xff`; `type = dense[2828+id]`.
 *     If `mode` in `[8,14]` AND `type` NOT in `{60,87}`, returns `false`
 *     immediately (offset 1029). Otherwise falls to offset 80.
 *  2. offset 80..82: resets scratch `f:Z`#172 (`fFlag` below, a local --
 *     NOT `LegacyGameState.subsystemFFlag`, a DIFFERENT already-modelled
 *     use of the same field by `K()`; this method starts its own trace
 *     with a fresh `false` and only reads it back within this same call,
 *     via the offset-916 check below) to `false`.
 *  3. offset 85..111: if `type>9` and `!l()` (`onL`, #398), returns `false`.
 *  4. offset 112..191: if `type` in `[28,49]` or `===99`, calls
 *     `a(int,boolean,int)` (#292, `onCheckTargetKind`, result discarded)
 *     then jumps to offset 916 -- where `fFlag` (still `false`, untouched
 *     on this path) forces `return false` at offset 920/1029. Modelled as
 *     a direct `return false` after the call.
 *  5. offset 192..195 (the only remaining path): calls `private void J()`
 *     (#246, `onJ`) unconditionally -- `subsystemEntityJTrigger`.
 *  6. offset 196..218: if `mode===117` (re-read of `dense[2929+id]`), calls
 *     `private void j(int)` (#394, `onJInt`) with `0` (offset 215 `iconst_0`: the
 *     rest branch, everyone else on the record recovers). CORRECTED 2026-10-16
 *     (oracle, custom-mode script, frame 64090): this passed 1, the healing branch,
 *     which turned a healed occupant out of its building a frame early.
 *  7. offset 219..441 (`dense[4646+id]>=0`) vs 442..594 (else): mirrors the
 *     shape of `j()`'s own offset 215..703 block (same field offsets --
 *     4646/8749/4444/8627/8810/9115/48/45/46/47/64 -- reused inline code,
 *     NOT the same logic; branch polarities and gates differ, traced
 *     independently, see below) --
 *     - `dense[4646+id]>=0`: `assoc = dense[4444+id]`;
 *       `bit2 = table(70, dense[8749+assoc]) & 2`. If `bit2===0`, skip
 *       entirely (opposite polarity from `j()`, which enters ITS
 *       reachSlot-check on `bit2===0`). If `bit2!==0`: requires
 *       `dense[8627+assoc]===0` (also opposite from `j()`, which requires
 *       `!==0` to short-circuit straight into the call); then requires
 *       EITHER `dense[8810+assoc]===id` OR
 *       `(table(70,dense[8749+assoc])&1)!==0`; then ADDITIONALLY requires
 *       `dense[1313+id]>0` (a gate `j()` does not have at all). Only if
 *       every one of those holds: `fFlag = b(int,int)` (#347,
 *       `onCheckSlotProgress`) called with `(dense[8749+assoc],
 *       dense[9115+assoc]-1)` -- fixed args, no `kind=16` special case
 *       (that only exists in `j()`, gated by the opposite `8627+assoc`
 *       condition).
 *     - else (`dense[4646+id]<0`): `bit2 = table(48,type)&2`. If
 *       `bit2!==0` (again opposite polarity from `j()`'s `ifne 703` skip):
 *       calls `a(byte,byte,byte,byte)` (#293, `onCheckQuad`) with
 *       `(table(45,type), table(46,type), table(47,type),
 *       table(64,table(45,type)))` -- result POPPED, `fFlag` untouched.
 *  8. offset 595..603: calls `private boolean j()` (#395, `onAssociationScan`
 *     -- `LegacySubsystemEntityAssociationScan.ts`, this method's ONLY call
 *     site in the class). If it returns `true`, `i()` returns `true`
 *     immediately.
 *  9. offset 604..644: re-reads `type`/`dense[404+id]` (fresh, post-`j()`
 *     call, since `j()` itself writes `dense[404+id]=0` on some paths). If
 *     `type===84 && dense[404+id]===100`, `fFlag = true`.
 *  10. offset 645..744: if `type` in `{70,71}`: `S:I`(#51, `subsystemS`) `=
 *      (dense[6767+id]+12)/12` (integer division); if
 *      `dense[2020+id] % (100/S) <= 4`, decrements
 *      `mainArrays.aShort[team][0]` by 1 (`i2s`-narrowed). NOTE: real
 *      bytecode divides by `S` unconditionally at offset 723 (`100/S`) --
 *      if `S` were ever really `0`, Java throws `ArithmeticException`
 *      (caught by `e()`'s own wrapping try/catch, same convention as
 *      `LegacySubsystemAf.ts`'s noted JS/Java div-by-zero divergence); JS
 *      `/` returns `Infinity` instead. Not modelled, unconfirmed whether
 *      `S` is ever actually `0` in real game data.
 *  11. offset 745..915 (every type): if `subsystemR*subsystemA <
 *      table(30,type)*subsystemA`, skip straight to offset 916 (fFlag
 *      unchanged by this whole block). Otherwise: if `table(31,type)>0`
 *      AND `type>9`, writes
 *      `dense[saveOffsets[table(31,type)]+dense[3838+id]] = table(30,type)`
 *      -- then, on EVERY path that reaches offset 911 (whether or not that
 *      write ran), unconditionally sets `fFlag = true`.
 *  12. offset 916..920: `if (!fFlag) return false;` (offset 1029).
 *  13. offset 923..1013: if `type===13` AND `(mode&0xff)<145` (fresh
 *      re-read of `dense[2929+id]`, mode may have changed since step 1):
 *      `dense[2929+id]=-110`; `dense[3636+id] -= 1` (`i2b`);
 *      `dense[404+id]=99`; return `false`.
 *  14. offset 1014..1022: else, calls `private boolean k()` (#396,
 *      `onKPredicate`, unresolved, no existing port). If it returns
 *      `true`, `i()` returns `true`.
 *  15. offset 1023..1028: else, calls `private void I()` (#245, uppercase --
 *      NOT the same constant-pool index as class f's `i()`/`I()` pair
 *      `LegacyZI.ts` already covers; class b's own `I()`, unresolved, no
 *      existing port). `i()` then unconditionally returns `true`.
 *
 * Field identities (constant-pool index confirmed via `grep -n "#N "
 * bytecode/b-javap.txt`, twins ruled out):
 *  - `a:[B`#61 = dense, `v:I`#225 = the entity id parameter (`id`).
 *  - `b:[B`#130 / `a:[S`#66 = packedBytes / packedOffsets.
 *  - `b:[S`#132 = saveOffsets (see the retraction above).
 *  - `a:[[S`#63 = `mainArrays.aShort` (`shortRows` below), `new short[2][26]`.
 *  - `u:I`#222 = team (`game.bTeam`).
 *  - `R:I`#49 = `game.subsystemR`, `A:I`#7 = `game.subsystemA` -- both
 *    READ-ONLY in this method (no `putfield` to either anywhere in `i()`).
 *  - `S:I`#51 = `game.subsystemS` -- WRITTEN here (previously believed
 *    touched only by `K()`'s own type===97 branch; `subsystemS`'s docblock
 *    already flagged this as "exposed defensively in case another
 *    unported method also touches it" -- this is that method).
 *  - `f:Z`#172 = the SAME field as `game.subsystemFFlag`, but this port
 *    threads it as a pure local (`fFlag`) since nothing outside this call
 *    reads the value `i()` leaves it at afterward.
 */
export type LegacySubsystemEntityProbeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132), alias of f.b:[S] (#245) -- saveOffsets, 570 entries. */
  readonly saveOffsets: Int16Array;
  /** b.a:[[S] (#63) -- mainArrays.aShort, new short[2][26]. */
  readonly shortRows: readonly Int16Array[];
  readonly entityId: number;
  /** b.u:I (#222) -- game.bTeam, the team this entity belongs to. */
  readonly team: number;
  /** b.R:I (#49) -- game.subsystemR, read-only here. */
  readonly rValue: number;
  /** b.A:I (#7) -- game.subsystemA, read-only here. */
  readonly aValue: number;
  /**
   * b.S:I (#51) -- game.subsystemS, written at offset 701 then read at
   * offset 720/723. Mutable ref so the caller can sync it back onto
   * `game.subsystemS`, matching this project's existing `z`-style
   * cross-call scratch convention.
   */
  readonly s: { value: number };
  /** private boolean l() (#398) -- confirmed real call, not derived. */
  readonly onL?: () => boolean;
  /** private boolean a(int,boolean,int) (#292) -- confirmed real call, not derived. */
  readonly onCheckTargetKind?: (type: number, flag: boolean, id: number) => boolean;
  /** private void J() (#246) -- LegacyRuntimeState.subsystemEntityJTrigger. */
  readonly onJ?: () => void;
  /** private void j(int) (#394) -- confirmed real call, not derived. */
  readonly onJInt?: (arg: number) => void;
  /** private boolean b(int,int) (#347) -- confirmed real call, not derived. */
  readonly onCheckSlotProgress?: (kind: number, index: number) => boolean;
  /** private boolean a(byte,byte,byte,byte) (#293) -- confirmed real call, not derived. */
  readonly onCheckQuad?: (arg1: number, arg2: number, arg3: number, arg4: number) => boolean;
  /** private boolean j() (#395) -- LegacySubsystemEntityAssociationScan.ts, this method's only call site. */
  readonly onAssociationScan?: () => boolean;
  /** private boolean k() (#396) -- confirmed real call, not derived, no existing port. */
  readonly onKPredicate?: () => boolean;
  /** private void I() (#245, class b's own -- distinct from class f's i()/I() pair) -- confirmed real call, not derived, no existing port. */
  readonly onIFinalize?: () => void;
  /**
   * b.f:Z (#172), live. CORRECTED 2026-09-14: this was a local, but offset 917
   * reads whatever was written last -- the jumps to 916 skip i()Z's own write
   * at 913, so j()Z's writes (446/826/858/984, e.g. "carry full") and
   * a(int,boolean,int)'s write reach it.
   */
  readonly f: { value: boolean };
};

/**
 * `private boolean l()` (#398), bytecode/b-javap.txt line 26245, offsets
 * 0..125; only caller i()Z (offset 85..111). True when the unit's mode is one
 * of its type's listed modes: `for (A = t166[type]; A < t166[type + 1]; A++)
 * if (2929 == t164[A]) return true;`. `A:I` (#7) is b's shared scratch.
 * Ported 2026-09-14 -- i()Z's `onL` was unwired, so every unit of type > 9
 * failed i()Z here and never reached y()'s movement block.
 */
export function checkLegacyEntityModeListed(
  state: Int8Array,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  entityId: number,
  scratch: { A: number },
): boolean {
  const type = state[UNIT_TYPE + entityId] ?? 0;
  for (scratch.A = table(packedBytes, packedOffsets, 166, type) & 255;
    scratch.A < (table(packedBytes, packedOffsets, 166, type + 1) & 255);
    scratch.A += 1) {
    if ((state[UNIT_MODE + entityId] ?? 0) === table(packedBytes, packedOffsets, 164, scratch.A)) return true;
  }
  return false;
}

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

export function stepLegacySubsystemEntityProbe(input: LegacySubsystemEntityProbeInput): boolean {
  const { state, packedBytes, packedOffsets, saveOffsets, shortRows, entityId: id, team } = input;
  const mode = (state[UNIT_MODE + id] ?? 0) & 0xff;
  const type = state[UNIT_TYPE + id] ?? 0;

  if (mode >= 8 && mode <= 14 && type !== 60 && type !== 87) {
    return false;
  }

  input.f.value = false; // offset 80..82

  if (type > 9 && !(input.onL?.() ?? false)) {
    return false;
  }

  if ((type >= 28 && type <= 49) || type === 99) {
    // offset 185..191: a(int,boolean,int) (#292), then goto 916, which reads f:Z.
    input.onCheckTargetKind?.(type, true, id);
    return probeTail(input, state[UNIT_TYPE + id] ?? 0);
  }

  // offset 192..195: J() (#246) -- restored 2026-09-04, no longer a crash.
  input.onJ?.();

  if ((state[UNIT_MODE + id] ?? 0) === 117) {
    input.onJInt?.(0);
  }

  const assoc = state[UNIT_RECORD + id] ?? 0;

  if ((state[UNIT_SLOT + id] ?? 0) >= 0) {
    const bit2 = table(packedBytes, packedOffsets, 70, state[BLD_KIND + assoc] ?? 0) & 2;
    if (bit2 !== 0 && (state[BLD_WORK + assoc] ?? 0) === 0) {
      let proceed = (state[BLD_OWNER + assoc] ?? 0) === id;
      if (!proceed) {
        const bit1 = table(packedBytes, packedOffsets, 70, state[BLD_KIND + assoc] ?? 0) & 1;
        proceed = bit1 !== 0;
      }
      if (proceed && (state[UNIT_TIMER + id] ?? 0) > 0) {
        input.f.value = input.onCheckSlotProgress?.(
          state[BLD_KIND + assoc] ?? 0,
          (state[BLD_LEVEL + assoc] ?? 0) - 1,
        ) ?? false;
      }
    }
  } else {
    const bit2 = table(packedBytes, packedOffsets, 48, type) & 2;
    if (bit2 !== 0) {
      const arg1 = table(packedBytes, packedOffsets, T_SKILL_ATTR, type);
      const arg2 = table(packedBytes, packedOffsets, T_SKILL_CHANCE, type);
      const arg3 = table(packedBytes, packedOffsets, T_SKILL_CAP, type);
      const arg4 = table(packedBytes, packedOffsets, T_SKILL_STEP, arg1);
      input.onCheckQuad?.(arg1, arg2, arg3, arg4); // result popped in the original.
    }
  }

  if (input.onAssociationScan?.() ?? false) {
    return true;
  }

  const typeLate = state[UNIT_TYPE + id] ?? 0; // fresh re-read, post-j() call.

  if (typeLate === 84 && (state[UNIT_WORK_PROGRESS + id] ?? 0) === 100) {
    input.f.value = true; // offset 642
  }

  if (typeLate === 70 || typeLate === 71) {
    const sValue = Math.trunc(((state[UNIT_MAX_HP + id] ?? 0) + 12) / 12);
    input.s.value = sValue;
    // offset 723: `100/S` unconditional -- see docblock's JS/Java
    // div-by-zero divergence note.
    if ((state[UNIT_FOOD + id] ?? 0) % Math.trunc(100 / sValue) <= 4) {
      const row = shortRows[team];
      if (row) row[0] = (row[0] ?? 0) - 1;
    }
  }

  // Offsets 745..913 run for every type: the 70/71 test at 678 is
  // `if_icmpne 745`. CORRECTED 2026-09-15: the port nested this block inside
  // the 70/71 branch, so no other unit (e.g. a carrier after J()) reached I().
  if (input.rValue * input.aValue >= table(packedBytes, packedOffsets, 30, typeLate) * input.aValue) {
    const t31 = table(packedBytes, packedOffsets, 31, typeLate);
    if (t31 > 0 && typeLate > 9) {
      const idx = (saveOffsets[t31] ?? 0) + (state[3838 + id] ?? 0);
      state[idx] = table(packedBytes, packedOffsets, 30, typeLate);
    }
    input.f.value = true; // offset 913
  }

  return probeTail(input, typeLate);
}

/** Offsets 916..1030: `if (!f) return false;`, the type-13 branch, k()Z, I(). */
function probeTail(input: LegacySubsystemEntityProbeInput, typeLate: number): boolean {
  const { state, entityId: id } = input;
  if (!input.f.value) return false;

  if (typeLate === 13) {
    const modeLate = (state[UNIT_MODE + id] ?? 0) & 0xff;
    if (modeLate < 145) {
      state[UNIT_MODE + id] = -110;
      state[UNIT_CARRY_AMOUNT + id] = (state[UNIT_CARRY_AMOUNT + id] ?? 0) - 1;
      state[UNIT_WORK_PROGRESS + id] = 99;
      return false;
    }
  }

  if (input.onKPredicate?.() ?? false) {
    return true;
  }

  input.onIFinalize?.();
  return true;
}
