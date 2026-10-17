import { BLD_OWNER, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * `private void f(boolean)` (#382), bytecode/b-javap.txt line 45960,
 * offsets 0..572 -- **the armoury order loop**: what a unit does when it is
 * carrying a commissioned item. `k()` calls it with `true` for a type 26 or
 * 27 unit; `i()`'s finalizer (`LegacyEntityIFinalize.ts`) calls it with
 * `false` for the same two types.
 *
 * The loop walks the capturing team's 10 order rows (`f.a:[[[B` #74, this
 * port's `scoutMemory`) and works on the first one whose building this unit
 * owns:
 *
 *   for (aN = 0; aN < 10; aN++) {
 *     order = scoutMemory[u][aN];
 *     if (order[11] <= 0) continue;                       // no building
 *     if (v != dense[8810 + order[11]]) continue;         // not my building
 *     aO = order[10];                                     // which item
 *     if (!flag) {                                        // pick the material up
 *       dense[3535 + v] = t88[aO] - 5 + 8;  dense[3636 + v] = 1;  return;
 *     }
 *     if (dense[2828 + v] == 26) {                        // carry it home
 *       pools[u][t88[aO]] += 1;  f.d(dense[4444 + v]);
 *     } else {                                            // ... or put it down
 *       find aP in 0..29 with freeSlotTable[0][aP] == order[11]
 *            && freeSlotTable[2][aP] == dense[3131+v] && [3][aP] == dense[3232+v];
 *       gridC[dense[3232+v]][dense[3131+v]] = -111 - u * 6 - aO + 6;
 *       f.c(dense[3131+v], dense[3232+v], 1, 1);
 *       freeSlotTable[0][aP] = 0;
 *       if (u == 1) R:B += 1;
 *     }
 *     if (order[aO] > 0) order[aO] -= 1;                  // one fewer to make
 *     f.d(order[11]);
 *     return;
 *   }
 *
 * So the two types are the two halves of a production run: **26 banks the
 * finished item into the tribe's pool** (`t88[aO]` is the same item-to-pool
 * map `L()` and the 2026-09-21 equipment survey use), while **27 puts it on
 * the ground** as a negative grid marker. That second branch is the trap:
 * it confirms structurally why a net trap never turns up in an equipment
 * slot -- it is placed, not carried.
 *
 * `aN:I` (#89), `aO:I` (#90) and `aP:I` (#91) are this method's own cursors.
 */
export type LegacyEntityProduceItemInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[[B (#129) -- gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** f.a:[[[B (#74) -- this port's scoutMemory, [team][row][field]. */
  readonly orders: readonly (readonly Int8Array[])[];
  /** f.f:[[B (#173) -- this port's freeSlotTable, 4 rows x 30. */
  readonly freeSlotTable: readonly Int8Array[];
  /** b.a:[[S (#63) -- the per-team resource pools. */
  readonly pools: readonly Int16Array[];
  /** b.v:I (#225). */
  readonly v: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** b.R:B (#48). */
  readonly scratch: { R: number };
  /** f.d(int) (#370) -- completeLegacyEntityRecord. */
  readonly onRecordCompletion: (record: number) => void;
  /** f.c(int,int,int,int) (#357) -- the dirty-rectangle repaint. */
  readonly onMarkVisible: (x: number, y: number, width: number, height: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

export function stepLegacyEntityProduceItem(input: LegacyEntityProduceItemInput, flag: boolean): void {
  const { state, gridC, v, team, scratch } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  for (let aN = 0; aN < 10; aN += 1) {
    const order = input.orders[team]?.[aN];
    if (!order) continue;

    // Offsets 14..78.
    const building = order[11] ?? 0;
    if (building <= 0) continue;
    if (v !== (state[BLD_OWNER + building] ?? 0)) continue;

    // Offsets 79..102.
    const item = order[10] ?? 0;

    // Offsets 103..157: `flag` false is the "pick the material up" half.
    if (!flag) {
      state[UNIT_CARRY_KIND + v] = toByte(table(88, item) - 5 + 8);
      state[UNIT_CARRY_AMOUNT + v] = 1;
      return;
    }

    if ((state[UNIT_TYPE + v] ?? 0) === 26) {
      // Offsets 158..230: carried home, banked into the pool.
      const pool = input.pools[team];
      const slot = table(88, item);
      if (pool) pool[slot] = toShort((pool[slot] ?? 0) + 1);
      input.onRecordCompletion(state[UNIT_RECORD + v] ?? 0);
    } else {
      // Offsets 231..478: put down on the ground as a negative marker.
      const targetX = state[UNIT_TARGET_X + v] ?? 0;
      const targetY = state[UNIT_TARGET_Y + v] ?? 0;
      let aP = 0;
      while (aP < 30) {
        if ((input.freeSlotTable[0]?.[aP] ?? 0) === building &&
            (input.freeSlotTable[2]?.[aP] ?? 0) === targetX &&
            (input.freeSlotTable[3]?.[aP] ?? 0) === targetY) break;
        aP += 1;
      }
      const row = gridC[targetY];
      if (row) row[targetX] = toByte(-111 - team * 3 * 2 - item + 6);
      input.onMarkVisible(targetX, targetY, 1, 1);
      if (input.freeSlotTable[0] && aP < 30) input.freeSlotTable[0][aP] = 0;
      if (team === 1) scratch.R = toByte(scratch.R + 1);
    }

    // Offsets 479..558.
    if ((order[item] ?? 0) > 0) order[item] = toByte((order[item] ?? 0) - 1);
    input.onRecordCompletion(building);
    return;
  }
}
