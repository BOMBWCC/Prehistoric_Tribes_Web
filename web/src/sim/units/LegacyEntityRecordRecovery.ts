import { BLD_HP, BLD_KIND, BLD_OWNER, BLD_PLANNED_KIND, UNIT_AGE, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * The `r()` -> `ap()` -> `ao()` chain, all three previously unported:
 *
 *  - `private void r()` (#412), b-javap.txt line 6888, offsets 0..491 --
 *    `q()`'s own "this record's counter ran out" handler.
 *  - `private void ap()` (#323), line 46438, offsets 0..66.
 *  - `private void ao()` (#322), line 46281, offsets 0..285.
 *
 * `ao()` walks the team's 30 records for a live kind-8 (sanctuary) record this
 * unit owns, removes it from the team's 30-slot queue in `f.b:[[[B` (#139, the
 * same table this port carries as `game.xSlotTable`) by shifting every later
 * entry one slot left across all 5 rows, zeroes the last slot's row 0, clears
 * `dense[9237 + record]` and stops.
 *
 * `ap()` then: `ao()`, `a(v, 57)`, `N()`, **`v = a(v)`** (#281, the worker
 * dispatch -- it reassigns the ambient `v:I`), `z:I = a(dense[v], dense[101+v],
 * 0)` and `p()`.
 *
 * `r()` itself, offset by offset:
 *  - 1..32: type 2 or 7 -> `(7979 & 128) == 0 ? g(1) : Q()`.
 *  - 68..215: type 93/92/106 -> `b(false)`, `a(v, t57[t174[8749[4444[v]]] +
 *    4646[v]])`, `i(0)`, `dense[3030 + v] = -1`.
 *  - 217..244: unless `t27[type] & 1`, skip to the 94..96 tail.
 *  - 248..269: under 12 years old -> `Q()` and skip to that tail.
 *  - 273..340: `dense[6565 + v] == 9` and type 0 or 3 -> `dense[2828 + v] ^= 1`.
 *  - 343..348: `b:Z = a:Z = true`.
 *  - 352..373: type <= 9 and `p():Z` -> straight to the tail.
 *  - 377..450: `Q()`, and when `(dense[2929 + v] & 255) > 7` the target is
 *    parked on the unit's own cell.
 *  - 452..491: type 94..96 -> `ap()`.
 */
export type LegacyEntityAoInput = {
  readonly state: Int8Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.b:[[[B (#139) -- game.xSlotTable, [team][row 0..4][slot 0..29]. */
  readonly slotTable: Int8Array[][];
};

export function stepLegacyEntityAo(input: LegacyEntityAoInput): void {
  const { state, v, team } = input;
  const rows = input.slotTable[team];
  if (!rows) return;

  for (let record = team * 30 + 1; record <= (team + 1) * 30; record += 1) {
    if ((state[BLD_HP + record] ?? 0) <= 0) continue;
    if ((state[BLD_KIND + record] ?? 0) !== 8) continue;
    if ((state[BLD_OWNER + record] ?? 0) !== v) continue;

    // Offsets 90..142: find this record's slot.
    let slot = 0;
    while (slot < 30 && (rows[0]?.[slot] ?? 0) !== record) slot += 1;

    // Offsets 146..236: shift every later entry one slot left, all 5 rows.
    for (; slot < 29; slot += 1) {
      for (let row = 0; row < 5; row += 1) {
        const source = rows[row];
        if (source) source[slot] = source[slot + 1] ?? 0;
      }
    }

    // Offsets 240..270.
    if (rows[0]) rows[0][29] = 0;
    state[BLD_PLANNED_KIND + record] = 0;
    return;
  }
}

export type LegacyEntityApInput = LegacyEntityAoInput & {
  /** b.v:I (#225) -- ap() REASSIGNS it, so it is threaded through. */
  readonly scratch: { v: number; z: number };
  /** a(int,byte) (#275) -- changeEntityType. */
  readonly onChangeType: (id: number, type: number) => void;
  /** private void N() (#250). */
  readonly onN: () => void;
  /** private int a(int) (#281) -- the worker dispatch; its result becomes v. */
  readonly onWorkerDispatch: (id: number) => number;
  /** private int a(int,int,int) (#266) -- the occupancy score, stored in z:I. */
  readonly onOccupancy: (x: number, y: number, mode: number) => number;
  /** private void p() (#408). */
  readonly onP: (id: number) => void;
};

export function stepLegacyEntityAp(input: LegacyEntityApInput): void {
  const { state } = input;
  stepLegacyEntityAo(input);

  input.onChangeType(input.v, 57);
  input.onN();

  // Offsets 21..27: the ambient v:I really is reassigned here.
  input.scratch.v = input.onWorkerDispatch(input.v);
  const next = input.scratch.v;

  input.scratch.z = input.onOccupancy(state[next] ?? 0, state[UNIT_Y + next] ?? 0, 0);
  input.onP(next);
}

export type LegacyEntityRecordRecoveryInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly v: number;
  /** private void g(int) (#384) -- subsystemG. */
  readonly onGroupMode: (argument: number) => void;
  /** private void Q() (#253) -- selectEntityTypeAfterQ. */
  readonly onQ: () => void;
  /** private void b(boolean) (#335) -- subsystemBVoid. */
  readonly onBVoid: (flag: boolean) => void;
  /** a(int,byte) (#275) -- changeEntityType. */
  readonly onChangeType: (id: number, type: number) => void;
  /** private void i(int) (#391) -- stepEntityIUpdate. */
  readonly onIUpdate: (argument: number) => void;
  /** b.a:Z (#73) and b.b:Z (#137). */
  readonly flags: { a: boolean; b: boolean };
  /** private boolean p() (#409) -- LegacySubsystemBBoolean2. */
  readonly onPBoolean: () => boolean;
  /** private void ap() (#323) -- stepLegacyEntityAp above. */
  readonly onAp: () => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityRecordRecovery(input: LegacyEntityRecordRecoveryInput): void {
  const { state, v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const type = () => state[UNIT_TYPE + v] ?? 0;

  // Offsets 1..64.
  if (type() === 2 || type() === 7) {
    if (((state[UNIT_FLAGS + v] ?? 0) & 128) === 0) input.onGroupMode(1);
    else input.onQ();
  }

  // Offsets 68..215.
  if (type() === 93 || type() === 92 || type() === 106) {
    input.onBVoid(false);
    const recordKind = state[BLD_KIND + (state[UNIT_RECORD + v] ?? 0)] ?? 0;
    input.onChangeType(v, table(57, table(174, recordKind) + (state[UNIT_SLOT + v] ?? 0)));
    input.onIUpdate(0);
    state[3030 + v] = -1;
  }

  // Offsets 217..450, all skipped to the tail unless t27 bit 0 is set.
  if ((table(27, type()) & 1) > 0) {
    if ((state[UNIT_AGE + v] ?? 0) < 12) {
      input.onQ();
    } else {
      // Offsets 273..340.
      if ((state[UNIT_HELD_ITEM + v] ?? 0) === 9 && (type() === 0 || type() === 3)) {
        state[UNIT_TYPE + v] = toByte(type() ^ 1);
      }
      // Offsets 343..348.
      input.flags.b = true;
      input.flags.a = true;

      // Offsets 352..373: p():Z short-circuits straight to the tail.
      if (!(type() <= 9 && input.onPBoolean())) {
        input.onQ();
        if (((state[UNIT_MODE + v] ?? 0) & 255) > 7) {
          state[UNIT_TARGET_X + v] = state[v] ?? 0;
          state[UNIT_TARGET_Y + v] = state[UNIT_Y + v] ?? 0;
        }
      }
    }
  }

  // Offsets 452..491.
  if (type() >= 94 && type() <= 96) input.onAp();
}
