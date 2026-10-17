import { BLD_PLANNED_KIND, BLD_X, BLD_Y, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_DIRECTION, UNIT_GENDER, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct port of private boolean o() (bytecode/b-javap.txt offsets 0..1187),
 * `b.n()`'s own `onOther` target (fires when `state[2828+id]===109`, see
 * `LegacySubsystemBActivityPrefix.ts`).
 *
 * CORRECTED 2026-08-20: a prior version of this file was marked IMPLEMENTED
 * and tested, but its `type>=109` branch (`onFootprint`/`onFootprintCheck`/
 * `onFallback`) did not match the real bytecode at all -- no `invoke*`
 * instruction anywhere near offset 137 matches those callback signatures,
 * and its `type<109` branch used a real, non-null `phaseRow` (the caller
 * passed `gridC[4]`, the actual map-terrain grid's row 4) where the
 * original always reads from a genuinely different field. Both halves were
 * wrong; a full re-derivation followed.
 *
 * **RETRACTED (2026-09-07)**: that re-derivation then concluded `b.c:[[B]`
 * (#143) is permanently `null` ("exhaustive grep: zero `putfield` sites for
 * #143 anywhere in class `b`") and truncated the method into a guaranteed
 * `NullPointerException` right after the `type<109`/`type>=109` fork. The
 * grep was scoped to class `b` only -- `c:[[B]` is allocated from OUTSIDE
 * the class, by `f.g()` (`new byte[6][10]`, bytecode/f-javap.txt offset
 * 590..594, `putfield #259 // Field b.c:[[B`), the exact same pattern
 * already fixed for the sibling ten-slot methods in
 * `LegacySubsystemBTenSlot.ts` (see that file's own retraction). This port
 * already carries the table, correctly shaped, as
 * `LegacySubsystemArrays.cRows` (6x10) -- it was simply never read here.
 * The entire method is live, reachable code; this file now ports it in
 * full instead of stopping at the first dereference.
 *
 * Full trace (bytecode/b-javap.txt:30598..31283):
 *
 *  1. `index = ((state[8282+id]&127)>>1)-1`; if `index<0`, return `false`
 *     (offsets 0..30, unchanged from the earlier derivation).
 *  2. `type = state[2828+id]` (offsets 31..44).
 *  3. `type<109` (offsets 49..134, `if_icmpge 137` NOT taken): calls
 *     `b.a(int,byte)` (#275, `changeEntityType`) with
 *     `(id, 110-state[1515+id])` -- already correct in the prior version --
 *     THEN unconditionally sets `cRows[4][index]=2` (offset 74..85, this is
 *     the site that used to throw), THEN an occupancy check
 *     (`gridC[y][x]===id`, offset 86..121): if the entity occupies its own
 *     cell, calls `N()` (#250, already ported/wired as `stepSubsystemN`);
 *     otherwise calls `g(3)` (#384, already ported/wired as `subsystemG`).
 *     Either way, returns `true`.
 *  4. `type>=109` (jumped to offset 137 directly): reads `cRows[4][index]`.
 *     - `!==2` (offset 149, `if_icmpne 1136`): jumps to offset 1136 --
 *       returns `true` immediately unless `state[2828+id]===111`, in which
 *       case `state[9237 + cRows[5][index]] = 3` and calls `d(id,0)` (#367,
 *       already ported/wired as `subsystemD`), then returns `true`.
 *     - `===2`: a 10-way equality chain (offset 152..461, ALL of which must
 *       pass or the method returns `true` immediately, no further effect):
 *       with `c0=cRows[0][index]`, `c1=cRows[1][index]`,
 *         `state[c0] === state[3131+c0]`,
 *         `state[101+c0] === state[3232+c0]`,
 *         `state[c1] === state[3131+c0]+1`,
 *         `state[101+c1] === state[3232+c0]`,
 *         `state[2828+c0] === 109`, `state[2828+c1] === 109`,
 *         `state[202+c0] === 0`, `state[303+c0] === 0`,
 *         `state[202+c1] === 0`, `state[303+c1] === 0`.
 *       If all pass (offset 464..533): `rowIndex = state[1515+c0]`;
 *       `C = cRows[rowIndex][index]`; `D = cRows[1-rowIndex][index]` (two
 *       cross-method scratch fields, `C:I`#10/`D:I`#12 -- `C:I` is this
 *       port's existing `LegacySubsystemArrays.bField10`, also read by
 *       `J()`, so it is written for real here via an explicit `scratch`
 *       out-param; `D:I` has no currently-ported reader anywhere else in
 *       the class -- `c()`, `g()`, `t()`, `au()` all touch it but none are
 *       ported yet -- so it is kept as a plain local for this call, same
 *       treatment `LegacySubsystemBTenSlot.ts` already gives the
 *       analogous `ae:I`#105 inside `d(int,int)`).
 *       - `state[2929+C] !== -99` (offset 536..731, the "claim" case):
 *         writes `state[2929+C]=-99`, `state[2929+D]=-98`,
 *         `state[2828+C]=109`, `state[3030+C]=0`, `state[3030+D]=0`,
 *         `state[606+c0]=0`, `state[606+c1]=4`, `state[4646+c0]=-90`,
 *         `state[9237+c5]=2` (`c5=cRows[5][index]`), then calls `f`'s own
 *         `final void a(int,boolean)` with `(c5,true)` -- filterEntityLifecycle, wired as onEntityLinkTrigger 2026-09-20 (see
 *         below) -- and returns `true`.
 *       - `state[2929+C] === -99` (offset 734..): if
 *         `state[3030+id]===6 && state[3535+C]===15` (offset 734..767,
 *         both guards must pass), writes `state[3535+C]=0`,
 *         `state[3535+D]=15`, `state[3636+C]=0`, `state[3636+D]=1` and
 *         returns `true` (offset 770..827). Otherwise falls to offset
 *         830..872: `if (state[3030+id] !== jRows[4][state[2929+id]&255]-1)
 *         return true` (the exact `jRow4[...] - 1` idiom
 *         `LegacyEntityActionCommit.ts` already uses for the same table).
 *         If it matches (offset 875..1133): copies
 *         `state[3131+C]=state[3131+D]=state[8383+c5]`,
 *         `state[3232+C]=state[3232+D]=state[8444+c5]`,
 *         `state[2828+C]=state[2828+D]=111`, `state[808+C]=state[808+D]=0`,
 *         `cRows[4][index]=3`, then calls `g(3)` twice -- once for `c0`,
 *         once for `c1` (the original saves/restores its own `v:I` around
 *         these two calls since `g(int)` reads its target id from that
 *         instance field; this port's `subsystemG`/`onGroupMode` already
 *         takes the id explicitly, so no save/restore is needed) -- and
 *         returns `true`.
 *
 * `f`'s `final void a(int, boolean)` (b's constant pool #286;
 * bytecode/f-javap.txt:20621..20766, offsets 0..247) is NOT ported --
 * exposed as the optional `onEntityLinkTrigger` callback, undocumented
 * behavior left un-invented per this project's convention for callees that
 * are out of scope for this file.
 */
export type LegacySubsystemNPrivateOInput = {
  readonly state: Int8Array;
  readonly id: number;
  /** b's own c:[[B] (#143), f.g()-allocated `new byte[6][10]` -- LegacySubsystemArrays.cRows. */
  readonly cRows: readonly Int8Array[];
  /** b:[[B] (#129), this project's gridC alias. */
  readonly gridC: readonly Int8Array[];
  /** f.j:[[B] (#194), the same 25-row /pd0 byte-table family used elsewhere (packedData.byteTables). */
  readonly jRows: readonly Int8Array[];
  /**
   * b's own C:I (#10) -- cross-method scratch also read by `J()`
   * (LegacySubsystemArrays.bField10). Mutated in place for real fidelity;
   * pass the live `LegacySubsystemArrays` instance (or an object exposing
   * the same field) here.
   */
  /**
   * b.x:I (#230) -- a cross-method scratch field, NOT a local. o() computes it
   * at offsets 0..21 (`((dense[8282+v] & 127) >> 1) - 1`) and every array
   * index below is `x:I`, not a fresh local; `G()` and `x()` also write it and
   * `g()`, `ab()`, `at()`, `i(int)`, `av()`, `b(int)` and `a(boolean)` read
   * it. Modelling it as a local would discard o()'s write. Already tracked as
   * `game.subsystemX`; threaded in and out here so the write persists.
   */
  scratch: { bField10: number; x: number };
  readonly onAction?: (id: number, action: number) => void;
  /** private void N() (#250), already ported+wired -- LegacyRuntimeState.stepSubsystemN. */
  readonly onN?: () => void;
  /** private void g(int) (#384), already ported+wired -- LegacyRuntimeState.subsystemG. */
  readonly onGroupMode?: (id: number, argument: number) => void;
  /** private void d(int,int) (#367), already ported+wired -- LegacyRuntimeState.subsystemD. */
  readonly onD?: (id: number, argument: number) => void;
  /**
   * f's own `final void a(int, boolean)` -- b's constant pool #286,
   * f-javap.txt:20621..20766 (offsets 0..247). NOT ported. Optional
   * callback so this file doesn't invent its body.
   */
  readonly onEntityLinkTrigger?: (id: number, flag: boolean) => void;
};

export function stepLegacySubsystemNPrivateO(input: LegacySubsystemNPrivateOInput): boolean {
  const { state, id, cRows } = input;
  // Offsets 0..21: this is a putfield into x:I (#230), not a local.
  input.scratch.x = (((state[8282 + id] ?? 0) & 127) >> 1) - 1;
  const index = input.scratch.x;
  if (index < 0) return false;

  const type = state[UNIT_TYPE + id] ?? 0;
  if (type < 109) {
    input.onAction?.(id, 110 - (state[UNIT_GENDER + id] ?? 0));
    if (cRows[4]) cRows[4][index] = 2;
    const y0 = state[UNIT_Y + id] ?? 0;
    const x0 = state[id] ?? 0;
    if ((input.gridC[y0]?.[x0] ?? 0) === id) {
      input.onN?.();
    } else {
      input.onGroupMode?.(id, 3);
    }
    return true;
  }

  // type >= 109 (offset 137).
  if ((cRows[4]?.[index] ?? 0) !== 2) {
    // offset 1136.
    if ((state[UNIT_TYPE + id] ?? 0) !== 111) return true;
    const linked = cRows[5]?.[index] ?? 0;
    state[BLD_PLANNED_KIND + linked] = 3;
    input.onD?.(id, 0);
    return true;
  }

  // offset 152..461: 10-way equality chain, all must pass.
  const c0 = cRows[0]?.[index] ?? 0;
  const c1 = cRows[1]?.[index] ?? 0;
  const allMatch =
    (state[c0] ?? 0) === (state[UNIT_TARGET_X + c0] ?? 0) &&
    (state[UNIT_Y + c0] ?? 0) === (state[UNIT_TARGET_Y + c0] ?? 0) &&
    (state[c1] ?? 0) === (state[UNIT_TARGET_X + c0] ?? 0) + 1 &&
    (state[UNIT_Y + c1] ?? 0) === (state[UNIT_TARGET_Y + c0] ?? 0) &&
    (state[UNIT_TYPE + c0] ?? 0) === 109 &&
    (state[UNIT_TYPE + c1] ?? 0) === 109 &&
    (state[UNIT_OFFSET_X + c0] ?? 0) === 0 &&
    (state[UNIT_OFFSET_Y + c0] ?? 0) === 0 &&
    (state[UNIT_OFFSET_X + c1] ?? 0) === 0 &&
    (state[UNIT_OFFSET_Y + c1] ?? 0) === 0;
  if (!allMatch) return true;

  // offset 464..533.
  const rowIndex = state[UNIT_GENDER + c0] ?? 0;
  const C = cRows[rowIndex]?.[index] ?? 0;
  const D = cRows[1 - rowIndex]?.[index] ?? 0;
  input.scratch.bField10 = C;
  const c5 = cRows[5]?.[index] ?? 0;

  if ((state[UNIT_MODE + C] ?? 0) !== -99) {
    // offset 554..731: the "claim" case.
    state[UNIT_MODE + C] = -99;
    state[UNIT_MODE + D] = -98;
    state[UNIT_TYPE + C] = 109;
    state[3030 + C] = 0;
    state[3030 + D] = 0;
    state[UNIT_DIRECTION + c0] = 0;
    state[UNIT_DIRECTION + c1] = 4;
    state[UNIT_SLOT + c0] = -90;
    state[BLD_PLANNED_KIND + c5] = 2;
    input.onEntityLinkTrigger?.(c5, true);
    return true;
  }

  // offset 734..767.
  if ((state[3030 + id] ?? 0) === 6 && (state[UNIT_CARRY_KIND + C] ?? 0) === 15) {
    state[UNIT_CARRY_KIND + C] = 0;
    state[UNIT_CARRY_KIND + D] = 15;
    state[UNIT_CARRY_AMOUNT + C] = 0;
    state[UNIT_CARRY_AMOUNT + D] = 1;
    return true;
  }

  // offset 830..872.
  const jRow4 = input.jRows[4];
  const threshold = (jRow4?.[(state[UNIT_MODE + id] ?? 0) & 255] ?? 0) - 1;
  if ((state[3030 + id] ?? 0) !== threshold) return true;

  // offset 875..1133.
  const source1 = state[BLD_X + c5] ?? 0;
  const source2 = state[BLD_Y + c5] ?? 0;
  state[UNIT_TARGET_X + C] = source1;
  state[UNIT_TARGET_Y + C] = source2;
  state[UNIT_TARGET_X + D] = source1;
  state[UNIT_TARGET_Y + D] = source2;
  state[UNIT_TYPE + C] = 111;
  state[UNIT_TYPE + D] = 111;
  state[808 + C] = 0;
  state[808 + D] = 0;
  if (cRows[4]) cRows[4][index] = 3;
  input.onGroupMode?.(c0, 3);
  input.onGroupMode?.(c1, 3);
  return true;
}
