import { BLD_HP, BLD_KIND, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORKERS, UNIT_FLAGS, UNIT_MODE, UNIT_ORDER, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Exact `private int a(int)` (#281), bytecode/b-javap.txt line 45448,
 * offsets 0..951. Callers: y() (as `v = a(v)` for unit types 57/58), e()
 * and ap(). It borrows b's `v:I` for the unit it is dispatching and returns
 * its argument, which the caller stores back into `v:I`.
 *
 *  - 0..304, for `aN` 0..9 of team `u`: record `r = A[u][aN][11]` (> 0),
 *    unit `v = 8810[r]` (> 0) of type 58 with `1313 >= 0`; the first
 *    `aO` < 10 with `A[u][aN][aO] > 0` (none -> skip): `a(v, t86[aO])`;
 *    `N()` if `v` stands on its own cell, else `6161[v] = 3`;
 *    `A[u][aN][10] = aO`.
 *  - 307..947, for record `aN` of team `u` (built: 8505 > 0, type 8, owner
 *    `v = 8810 >= 1` of type 57 with `1313 >= 0`, mode != -109, and either
 *    `8932 == 1` or `v` on its own cell): find `aO` < 30 with
 *    `B[u][0][aO]` equal to `aN` or zero. Past 30, or a zero slot: skip.
 *    If `B[u][2][aO] < 0` the slot is dropped (rows 0..4 shift left from
 *    `aO`, `B[u][0][29] = 0`) and the same record is tried again.
 *    Otherwise `a(v, t87[B[u][1][aO]])`, `4040[v] = aN`, `7979[v] &= 239`,
 *    `N()` or `6161[v] = 3` as above, and `9237[aN] = 1`.
 *
 * `A` is f.a:[[[B (#74 via b; `mainArrays.aByte3`), `B` is f.b:[[[B (#139
 * via b; `game.xSlotTable`). `aN`/`aO`/`aP` (#89..#91) are written before
 * they are read, so they are locals.
 */
export type LegacySubsystemWorkerDispatchInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  /** b.u:I (#222). */
  readonly team: number;
  /**
   * b.v:I (#225), live: offsets 70 and 407 store each candidate unit there, and
   * a(int,byte)'s C() then works on that ambient v. CORRECTED 2026-10-12
   * (oracle run 10, frame 24335): v was a local, so C() hit the stale v and the
   * new armourer's work kind 3535 stayed 0.
   */
  readonly fields: { v: number };
  /** f.a:[[[B -- [team][10][12]. */
  readonly aRows: readonly (readonly Int8Array[])[];
  /** f.b:[[[B -- [team][5][30]. */
  readonly bRows: readonly (readonly Int8Array[])[];
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** N() (#250) for the unit being dispatched. */
  readonly onN: (id: number) => void;
};

export function stepLegacySubsystemWorkerDispatch(input: LegacySubsystemWorkerDispatchInput, arg: number): number {
  const { state, team: u } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const onOwnCell = (v: number) => (input.gridC[state[UNIT_Y + v] ?? 0]?.[state[v] ?? 0] ?? 0) === v;
  const startWork = (v: number) => {
    if (onOwnCell(v)) input.onN(v);
    else state[UNIT_ORDER + v] = 3;
  };

  const aTeam = input.aRows[u]!;
  for (let aN = 0; aN < 10; aN += 1) {
    const row = aTeam[aN]!;
    if ((row[11] ?? 0) <= 0) continue;
    input.fields.v = state[BLD_OWNER + (row[11] ?? 0)] ?? 0;
    const v = input.fields.v;
    if (v <= 0 || (state[UNIT_TYPE + v] ?? 0) !== 58 || (state[UNIT_TIMER + v] ?? 0) < 0) continue;
    let aO = 0;
    while (aO < 10 && (row[aO] ?? 0) <= 0) aO += 1;
    if (aO === 10) continue;
    input.onChangeType(v, table(86, aO));
    startWork(v);
    row[10] = aO;
  }

  const bTeam = input.bRows[u]!;
  for (let aN = u * 30 + 1; aN <= (u + 1) * 30; aN += 1) {
    if ((state[BLD_HP + aN] ?? 0) <= 0 || (state[BLD_KIND + aN] ?? 0) !== 8 || (state[BLD_OWNER + aN] ?? 0) < 1) continue;
    input.fields.v = state[BLD_OWNER + aN] ?? 0;
    const v = input.fields.v;
    if ((state[UNIT_TYPE + v] ?? 0) !== 57 || (state[UNIT_TIMER + v] ?? 0) < 0 || (state[UNIT_MODE + v] ?? 0) === -109) continue;
    if ((state[BLD_WORKERS + aN] ?? 0) !== 1 && !onOwnCell(v)) continue;
    let aO = 0;
    while (aO < 30 && bTeam[0]![aO] !== aN && bTeam[0]![aO] !== 0) aO += 1;
    if (aO >= 30 || bTeam[0]![aO] === 0) continue;
    if ((bTeam[2]![aO] ?? 0) < 0) {
      for (; aO < 29; aO += 1) {
        for (let aP = 0; aP < 5; aP += 1) bTeam[aP]![aO] = bTeam[aP]![aO + 1]!;
      }
      bTeam[0]![29] = 0;
      aN -= 1;
      continue;
    }
    input.onChangeType(v, table(87, bTeam[1]![aO] ?? 0));
    state[4040 + v] = aN;
    state[UNIT_FLAGS + v] = (state[UNIT_FLAGS + v] ?? 0) & 239;
    startWork(v);
    state[BLD_PLANNED_KIND + aN] = 1;
  }
  return arg;
}
