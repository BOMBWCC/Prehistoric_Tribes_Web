import { UNIT_MODE, UNIT_ORDER, UNIT_RECORD, UNIT_SAVED_TYPE, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_PROGRESS, UNIT_Y } from "../../core/DenseLayout";
export type LegacyEntityFollowupInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly readPacked: (row: number, index: number) => number;
  readonly raw: { d: boolean };
  readonly z: { value: number };
  readonly bValue: number;
  /** private boolean b(int,boolean,int) (#344) -- confirmed real call, not derived. */
  readonly onType84Action?: (value: number, enabled: boolean, id: number) => boolean;
  /** private boolean i() (#392) -- LegacySubsystemEntityProbe.ts. */
  readonly onEntityProbe?: () => boolean;
  /** private void i(int) (#391) -- already ported as stepLegacyEntityIUpdate,
   * but that method has its own large, separately-derived `raw:{x,H,y,p}`
   * callback surface not yet threaded through this call path (same
   * convention as LegacyEntityActionCommit.ts's own onIUpdate no-op). */
  readonly onEntityI?: (value: number) => void;
  /** b.b[row][column] (#129, gridC). */
  readonly readCell: (row: number, column: number) => number;
  /** private int a(int) (#281), `LegacySubsystemWorkerDispatch.ts`; y() stores the result in v:I. */
  readonly onWorkerDispatch: (arg: number) => void;
  /** private int a(int,int,int) (#266); y() stores the result in z:I. */
  readonly onOccupancy: (x: number, y: number, layer: number) => number;
  /** private void p() (#408). */
  readonly onP: () => void;
};

/**
 * Direct translation of `private void y()` (bytecode/b-javap.txt offsets
 * 0..582, line 12968). `v()`'s own `d=true; y();` tail call (offset
 * 518..527) and its earlier `mode<=7` early-exit (offset 323's
 * `if_icmple 523`, which jumps straight into `y()` WITHOUT setting `d`
 * first) are `y()`'s only two call sites -- see `LegacyEntityCoreUpdate.ts`.
 *
 * CORRECTED (2026-08-31): the previous port treated every early gate
 * failure as an immediate `return`. The real bytecode instead converges
 * ALL exits (both gate failures and the real body) on a single tail at
 * offset 567 that re-checks `d:Z` and, if true, unconditionally calls
 * `i(int):V` (#391) with the current `z:I` value -- regardless of whether
 * either gate above ever passed. Since `d` can already be `true` on entry
 * (whenever `v()` reached `y()` via its post-`e():Z` call site), the old
 * port silently dropped this call in exactly that case. Also fixed a second
 * bug in the gate leading to `i():Z` (#392): the original OR'd in
 * `record < 0` as an independent true condition, but the real bytecode's
 * `iflt` at offset 274 only SKIPS the `z/10<=B` check when `record<0` -- it
 * does not by itself satisfy the gate (the type===85/===80 checks still
 * apply either way). Both bugs were caught by hand-tracing every offset
 * against a freshly saved scratch copy of this method's bytecode, not
 * inherited from the pre-existing (uncredited, unaudited) prior port.
 *
 * Structure:
 *  1. offset 0..126 (gate1): `(table171!==-2 && threshold>=T37[type]) ||
 *     (table171===-2 && d)` -- if false, skip straight to step 5.
 *  2. offset 127..261: resets `dense[1111+id]`'s low nibble; if type===84
 *     and a packed selector is in `[28,49]` or `===99`, calls the real
 *     `b(int,boolean,int):Z` (#344, `onType84Action`) and may set
 *     `dense[404+id]=100`.
 *  3. offset 261..326 (gate2): `(record>=0 && z/10<=B) || type===85 ||
 *     type===80` -- if false, skip to step 5.
 *  4. offset 327..563: `if (i())` (#392, `onEntityProbe`):
 *     - type 69 with `6161 >= 2`: nothing (goto 567).
 *     - already on its target (3131/3232 == x/y): `if (b[y][x] != v)
 *       return;` (skips the tail) else `d = true`.
 *     - otherwise: types 58/57 run `v = a(v)` (#281); `z = a(x, y, 0)`
 *       (#266); `p()`; `if (808 > 0) return;` (skips the tail); `d = true`.
 *     RETRACTED 2026-09-14: this step used to be "provably unreachable" on
 *     the premise that i()Z never returns true; that premise was retracted
 *     when i()Z was ported, and this block is how a unit given a gather
 *     order (e.g. type 11 at a tree) actually starts moving.
 *  5. offset 567..582 (the real convergence tail, ALWAYS reached exactly
 *     once): if `d:Z` is true, calls `i(int):V` (#391, `onEntityI`) with
 *     the current `z:I` value.
 */
export function stepLegacyEntityFollowup(input: LegacyEntityFollowupInput): void {
  const { state, entityId: id } = input;
  const mode = (state[UNIT_MODE + id] ?? 0) & 255;
  const type = state[UNIT_TYPE + id] ?? 0;
  const table171 = input.readPacked(171, mode);
  const threshold = ((state[1111 + id] ?? 0) & 255) >> 4;

  const gate1 = (table171 !== -2 && threshold >= input.readPacked(37, type)) ||
    (table171 === -2 && input.raw.d);

  if (gate1) {
    state[1111 + id] = (state[1111 + id] ?? 0) & 15;
    if (type === 84) {
      const selector = state[UNIT_SAVED_TYPE + id] ?? 0;
      if ((selector >= 28 && selector <= 49) || selector === 99) {
        if (input.onType84Action?.(selector - 28, true, id)) state[UNIT_WORK_PROGRESS + id] = 100;
      }
    }

    const record = state[UNIT_RECORD + id] ?? 0;
    const gate2 = (record >= 0 && Math.trunc(input.z.value / 10) <= input.bValue) ||
      type === 85 || type === 80;

    if (gate2 && (input.onEntityProbe?.() ?? false)) {
      const unitType = state[UNIT_TYPE + id] ?? 0;
      if (unitType !== 69 || (state[UNIT_ORDER + id] ?? 0) < 2) {
        if ((state[UNIT_TARGET_X + id] ?? 0) === (state[id] ?? 0) && (state[UNIT_TARGET_Y + id] ?? 0) === (state[UNIT_Y + id] ?? 0)) {
          if (input.readCell(state[UNIT_Y + id] ?? 0, state[id] ?? 0) !== id) return;
          input.raw.d = true;
        } else {
          if (unitType === 58 || unitType === 57) input.onWorkerDispatch(id);
          input.z.value = input.onOccupancy(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 0);
          input.onP();
          if ((state[808 + id] ?? 0) > 0) return;
          input.raw.d = true;
        }
      }
    }
  }

  if (input.raw.d) {
    input.onEntityI?.(input.z.value);
  }
}
