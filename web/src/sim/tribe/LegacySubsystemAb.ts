import { javaRow, type LegacyBuildingScratch } from "./LegacySubsystemBuildingEconomy";
import { BLD_HP, BLD_KIND, BLD_PLANNED_KIND, BLD_WORK, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_MODE, UNIT_ORDER, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";

/**
 * Exact `private void ab()` (#309), bytecode/b-javap.txt line 38477,
 * offsets 0..1071, for worker `w` (b.w:I #228) of record `v`; `z` is the
 * record type and `x` its index in `f[0]`/`g[0]`, both set by g().
 *
 * Worker slot 0 (`4646 == 0`):
 *  - `6161 == 2` returns.
 *  - Built record (8627 != 0): clear `g[1][x]`/`g[2][x]` once `g1 >= g2`;
 *    when `g[2][x] == 0`, `a(w, 99)` and `6161 = 3`.
 *  - Unbuilt: when (`f[1][x] < t80[9237]` and `z >= 12`) or (`z == 4`,
 *    `a[u][0] < 40`, worker type 66): `6161 = 3`, then `a(w,
 *    t81[t82[9237] + f[1][x]])` for a site, else `a(w, 54)` with `6161 = 0`
 *    for a carrier of 3535 in {1,5,6,7}, else `a(w, 37)`.
 *  - Then only for record type 6, or 16 with `9237 == 6`: `6161 != 3` ->
 *    `d(false)`; else `6161 = 0`, and `a(2828[w], false, w)` (#292) true ->
 *    (type 16: `f[1][x]++`) `d(false)`; false -> `d(8749 == 6 || 8505 >=
 *    t83[t84[9237] + f[1][x]])`.
 * Other slots:
 *  - Type 59 returns. Built: `a(w, g1 < g2 ? t60[t177[z]+slot] :
 *    t59[t177[z]+slot])`. Unbuilt: `a(w, (8505 < t83[t84[9237]+f[1][x]] &&
 *    z >= 12) || (z == 4 && a[u][0] > 0) ? t58[t174[z]+slot] :
 *    t57[t174[z]+slot])`.
 *
 * `d(boolean)` (#372, line 39878, only caller ab()) is `workerFinish` below.
 * `f:Z` (#172) is written before it is read, so it is a local.
 */
export type LegacySubsystemAbInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.j:[[B (#194) row 4 -- action cycle lengths by mode. */
  readonly cycleLengths: Int8Array;
  readonly fRows: Int8Array[];
  readonly gRows: Int8Array[];
  /** b.a:[[S (#63). */
  readonly shortRows: Int16Array[];
  readonly scratch: LegacyBuildingScratch;
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** a(int,boolean,int) (#292). */
  readonly onActionCheck: (type: number, flag: boolean, id: number) => boolean;
  /** b.f:Z (#172), shared with i()Z/j()Z/K(): offsets 590..681 store the finish flag in it. */
  readonly f?: { value: boolean };
};

export function stepLegacySubsystemAb(input: LegacySubsystemAbInput, w: number): void {
  const { state, fRows, gRows, scratch: s } = input;
  const v = s.v;
  const z = s.z;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const g = (row: number) => javaRow(gRows, row, s.x);
  const f1 = () => javaRow(fRows, 1, s.x).get();
  const built = () => (state[BLD_WORK + v] ?? 0) !== 0;
  const slot = () => state[UNIT_SLOT + w] ?? 0;
  const stageTarget = () => table(83, table(84, state[BLD_PLANNED_KIND + v] ?? 0) + f1());
  const aTeam0 = () => input.shortRows[s.u]?.[0] ?? 0;

  if (slot() !== 0) {
    if ((state[UNIT_TYPE + w] ?? 0) === 59) return;
    if (built()) {
      input.onChangeType(w, g(1).get() < g(2).get()
        ? table(60, table(177, z) + slot())
        : table(59, table(177, z) + slot()));
      return;
    }
    const working = ((state[BLD_HP + v] ?? 0) < stageTarget() && z >= 12) || (z === 4 && aTeam0() > 0);
    input.onChangeType(w, working ? table(58, table(174, z) + slot()) : table(57, table(174, z) + slot()));
    return;
  }

  if ((state[UNIT_ORDER + w] ?? 0) === 2) return;

  if (built()) {
    if (g(1).get() >= g(2).get()) {
      g(2).set(0);
      g(1).set(0);
    }
    if (g(2).get() === 0) {
      input.onChangeType(w, 99);
      state[UNIT_ORDER + w] = 3;
    }
  } else {
    const enter = (f1() < table(80, state[BLD_PLANNED_KIND + v] ?? 0) && z >= 12) ||
      (z === 4 && aTeam0() < 40 && (state[UNIT_TYPE + w] ?? 0) === 66);
    if (enter) {
      state[UNIT_ORDER + w] = 3;
      if (z >= 12) {
        input.onChangeType(w, table(81, table(82, state[BLD_PLANNED_KIND + v] ?? 0) + f1()));
      } else if ((state[UNIT_CARRY_AMOUNT + w] ?? 0) > 0 && [1, 5, 6, 7].includes(state[UNIT_CARRY_KIND + w] ?? 0)) {
        input.onChangeType(w, 54);
        state[UNIT_ORDER + w] = 0;
      } else {
        input.onChangeType(w, 37);
      }
    }
  }

  const recordType = state[BLD_KIND + v] ?? 0;
  if (recordType !== 6 && !(recordType === 16 && (state[BLD_PLANNED_KIND + v] ?? 0) === 6)) return;
  if ((state[UNIT_ORDER + w] ?? 0) !== 3) {
    workerFinish(input, w, false);
    return;
  }
  state[UNIT_ORDER + w] = 0;
  if (input.onActionCheck(state[UNIT_TYPE + w] ?? 0, false, w)) {
    if ((state[BLD_KIND + v] ?? 0) === 16) javaRow(fRows, 1, s.x).set(f1() + 1);
    workerFinish(input, w, false);
    return;
  }
  let finished = true;
  if ((state[BLD_KIND + v] ?? 0) !== 6 && (state[BLD_HP + v] ?? 0) < stageTarget()) finished = false;
  // Offsets 590..689: the flag lives in f:Z, then d(f). Not written back until 2026-10-08.
  if (input.f) input.f.value = finished;
  workerFinish(input, w, finished);
}

/** `private void d(boolean)` (#372), offsets 0..276. */
function workerFinish(input: LegacySubsystemAbInput, w: number, flag: boolean): void {
  const { state } = input;
  const mode = () => state[UNIT_MODE + w] ?? 0;
  const cycleEnd = () => (state[3030 + w] ?? 0) === (input.cycleLengths[mode() & 255] ?? 0) - 1;
  if (flag) {
    input.onChangeType(w, 78);
    if (mode() !== 115 && mode() !== 113) {
      state[UNIT_MODE + w] = 115;
      state[3030 + w] = -1;
      state[UNIT_TIMER + w] = 1;
      return;
    }
    if (cycleEnd()) state[UNIT_MODE + w] = 113;
    return;
  }
  if (mode() === 115 || mode() === 113) {
    state[UNIT_MODE + w] = 116;
    state[3030 + w] = -1;
    return;
  }
  if (cycleEnd()) input.onChangeType(w, 56);
}
