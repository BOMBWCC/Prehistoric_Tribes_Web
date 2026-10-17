import { copyLegacyAuxiliary } from "./LegacyAuxiliaryCopy";
import { UNIT_AGE, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_RANGED_SKILL } from "../../core/DenseLayout";

/**
 * **HISTORY.** This file used to export a `queueLegacyAuxiliary` that
 * claimed to be `private void b(int,int,int)` (#342). It was not -- hand-
 * tracing that method (bytecode/b-javap.txt line 22380, offsets 0..234)
 * showed it was a CHIMERA: `b(int,int,int)`'s real prologue (offsets
 * 0..113, `p[1]=p[2]=row17`, the `first!==0` fan-out, `O`/`N` seeding)
 * glued to a completely different method's loop body and epilogue. That
 * second method turned out to be `private void c(boolean)` (#361, line
 * 22515), and `2026-08-31` (`ed318ec`) repointed the two call sites that
 * really were `b(0,0,3)` (b.al()'s `onSubsystemAction`, b.i()'s own tail)
 * to the faithful `selectLegacyAuxiliaryCandidates` below, while leaving
 * the chimera wired at its one remaining caller (`placeLegacyAuxiliary`'s
 * `onNestedPlacement`) because that call was "plausibly" the real
 * `c(boolean)` -- `c` takes one boolean and an `eRows`-shaped 2D array,
 * and both matched at a glance.
 *
 * **THAT GUESS WAS WRONG.** Properly deriving `c(boolean)` (below) and
 * re-reading `private void b(int, int, int, int)` (bytecode/b-javap.txt
 * line 22131 -- NOT the same method as `f.b(int,int,int,int)`, which is
 * `allocateLegacySubsystemRecord`; class b and class f each have their own
 * unrelated `b(IIII)`, a same-name-different-method trap this project has
 * hit before) shows `onNestedPlacement`'s real bytecode target
 * (offset 256..260: `this.b(first, x, 1)`) is `invokespecial #342 //
 * Method b:(III)V` -- i.e. `b(int,int,int)` itself, the SAME method
 * `selectLegacyAuxiliaryCandidates` already faithfully ports. So
 * `onNestedPlacement` is now repointed there too (see
 * `LegacyRuntimeState.ts`), and the chimera `queueLegacyAuxiliary` is
 * fully retired -- deleted, not just deprecated, now that every one of its
 * former call sites is confirmed to be plain `b(III)` and its "extra"
 * logic (the insertion-sort loop, `dense[8933]`/`dense[6464+..]`) is
 * confirmed to be `c(boolean)`'s own body, which is itself unreachable
 * dead code (see `refreshLegacyAuxiliaryTag` below) -- it was never a
 * fragment worth preserving.
 */

export type LegacyAuxiliaryCandidateInput = {
  /** f.p:[B (#210) -- the 6-slot participant scratch array. */
  readonly p: Int8Array;
  /** b.a:[B (#61) / f.e:[B -- the shared dense entity bank. */
  readonly dense: Int8Array;
  /** b.a:[[S (#63); only row 0 index 17 is read. */
  readonly shortRows: Int16Array[];
};

export type LegacyAuxiliaryQueueState = {
  O: number;
  N: number;
  G: number;
  eFlag: boolean;
  /**
   * b.H:B (#22) -- NOT `game.subsystemH`/b.H:I (#21), a completely
   * different class-b scalar that just happens to share the letter (a
   * trap this project has hit before). Only `c(boolean)` touches #22.
   */
  H: number;
};

/**
 * Faithful, instruction-by-instruction translation of
 * `private void b(int,int,int)` (#342, bytecode/b-javap.txt line 22380,
 * javap offsets 0..234), derived 2026-08-31 while wiring
 * `private void i(int)`'s own `b(v,0,1)` call (offset 708).
 *
 * `N:I` (#38) and `O:I` (#41) are the same two class-b scalars
 * `LegacyAuxiliaryQueueState` already models, so the caller threads the
 * shared state object through rather than using locals.
 */
export function selectLegacyAuxiliaryCandidates(
  input: LegacyAuxiliaryCandidateInput,
  state: LegacyAuxiliaryQueueState,
  first: number,
  second: number,
  third: number,
): void {
  const { p, dense, shortRows } = input;
  const row17 = shortRows[0]?.[17] ?? 0;
  // offset 0..39
  p[1] = toByte(row17);
  p[2] = toByte(row17);
  p[5] = toByte(second);
  // offset 40..84
  if (first !== 0) {
    p[0] = toByte(first);
    p[2] = toByte(first);
    p[3] = toByte(first);
    p[4] = toByte(first);
  }
  // offset 85..113
  state.O = third;
  state.N = first !== row17 && first !== 0 ? 3 : 2;
  // offset 116..231
  while (state.O <= 50 && state.N <= 4) {
    if (
      (dense[UNIT_HP + state.O] ?? 0) > 0 &&
      (dense[UNIT_AGE + state.O] ?? 0) >= 12 &&
      state.O !== first &&
      state.O !== row17
    ) {
      p[state.N] = toByte(state.O);
      state.N += 1;
    }
    state.O += 1;
  }
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export type LegacyAuxiliaryTagInput = {
  /** b.a:[B (#61) -- the shared dense entity bank. */
  readonly dense: Int8Array;
  /** b.a:[[S (#63); only row 0 index 17 is read here. */
  readonly shortRows: Int16Array[];
  /** b.e:[[B (#165) -- the 4x8 auxiliary candidate/tag table. */
  readonly auxiliaryRows: Int8Array[];
  /** b.b:[B (#130) / f.a:[B -- packedBytes, forwarded to c(int,int). */
  readonly packedBytes: Int8Array;
  /** b.a:[S (#66) / f.a:[S -- packedOffsets, forwarded to c(int,int). */
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132), alias of f.b:[S (#245) -- saveOffsets, forwarded to c(int,int). */
  readonly saveOffsets: Int16Array;
};

/**
 * Faithful translation of `private void c(boolean)` (#361,
 * bytecode/b-javap.txt lines 22515..22841, offsets 0..582): picks team 0's
 * three best adults for a scripted event.
 *
 *  - 0..46: `e:Z = false`, `H:B = dense[8994] == chief`, `c(chief, 0)`.
 *  - 49..96: clear `e[1..3][0..1]`.
 *  - 99..470: for each living adult 1..50 other than the chief, score
 *    `Q = max(1717, 1616)` (melee/ranged skill) and insertion-sort it into
 *    `e[1..3] = [id, score]`, best first. With `flag`, one unit carrying
 *    `6464 == 57` (last time's pick) may take a slot it did not outscore,
 *    after which slot 1 is reserved (`e:Z`) and the scan starts at slot 2.
 *  - 473..581: `c(e[G][0], G)` for each filled slot G; with `flag`, the
 *    slot-1 pick is tagged `6464 = 57`. `dense[8933] = G` (one past the last
 *    filled slot).
 *
 * `Q:I`/`P:I` (#47/#44) are written before they are read here and in their
 * only other user `H()`, so they are locals. COMPLETED 2026-09-23: offsets
 * 49..582 were an acknowledged gap.
 */
export function refreshLegacyAuxiliaryTag(
  input: LegacyAuxiliaryTagInput,
  state: LegacyAuxiliaryQueueState,
  flag: boolean,
): void {
  const { dense } = input;
  const rows = input.auxiliaryRows;
  const copy = (id: number, slot: number) => copyLegacyAuxiliary({
    auxiliaryRows: rows,
    dense,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    saveOffsets: input.saveOffsets,
    shortRows: input.shortRows,
    H: state.H,
  }, id, slot);

  state.eFlag = false;
  const chief = input.shortRows[0]?.[17] ?? 0;
  state.H = dense[8994] === chief ? 1 : 0;
  copy(chief, 0);

  for (state.N = 1; state.N < 4; state.N += 1) {
    rows[state.N]![0] = 0;
    rows[state.N]![1] = 0;
  }

  for (state.O = 1; state.O <= 50; state.O += 1) {
    const o = state.O;
    if ((dense[UNIT_HP + o] ?? 0) <= 0 || chief === o || (dense[UNIT_AGE + o] ?? 0) < 12) continue;
    const melee = dense[UNIT_MELEE_SKILL + o] ?? 0;
    const ranged = dense[UNIT_RANGED_SKILL + o] ?? 0;
    const q = melee > ranged ? melee : ranged;
    for (state.N = 1 + (flag && state.eFlag ? 1 : 0); state.N < 4; state.N += 1) {
      const favoured = flag && !state.eFlag && (dense[UNIT_JOB_TYPE + o] ?? 0) === 57;
      if ((rows[state.N]![1] ?? 0) >= q && !favoured) continue;
      for (let p = 3; p > state.N; p -= 1) {
        rows[p]![0] = rows[p - 1]![0]!;
        rows[p]![1] = rows[p - 1]![1]!;
      }
      rows[state.N]![0] = o;
      rows[state.N]![1] = q;
      if (favoured) state.eFlag = true;
      break;
    }
  }

  for (state.G = 1; state.G < 4 && (rows[state.G]![0] ?? 0) !== 0; state.G += 1) {
    const id = rows[state.G]![0]!;
    copy(id, state.G);
    if (state.G === 1 && flag) dense[UNIT_JOB_TYPE + id] = 57;
  }
  dense[8933] = state.G;
}

/**
 * `final void f()` (#594 via f), bytecode/b-javap.txt line 22986, offsets
 * 0..152: undoes `c(boolean)` when an event scene ends (f.U() calls it
 * while `ao == 9`). `dense[8933] = H`; for slots `G-1` down to 0, writes the
 * seven fields `c(int,int)` saved in `e[slot][1..7]` back to the unit
 * `e[slot][0]`; then the party list head `dense[8994]` returns to the chief
 * (when it was already linked, `H > 0`) or 0. WIRED 2026-09-23: without it
 * a second event linked the same units again and looped the 8994 list.
 */
export function restoreLegacyAuxiliary(
  input: LegacyAuxiliaryTagInput,
  state: LegacyAuxiliaryQueueState,
): void {
  const { dense, packedBytes, packedOffsets, saveOffsets } = input;
  const rows = input.auxiliaryRows;
  dense[8933] = state.H;
  for (state.O = state.G - 1; state.O >= 0; state.O -= 1) {
    const row = rows[state.O]!;
    for (state.N = 1; state.N < 8; state.N += 1) {
      const cat = packedBytes[(packedOffsets[186] ?? 0) + state.N] ?? 0;
      dense[(saveOffsets[cat] ?? 0) + (row[0] ?? 0)] = row[state.N] ?? 0;
    }
  }
  dense[8994] = state.H > 0 ? (input.shortRows[0]?.[17] ?? 0) : 0;
}
