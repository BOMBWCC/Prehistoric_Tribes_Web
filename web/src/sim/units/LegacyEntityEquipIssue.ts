import { UNIT_HELD_ITEM, UNIT_MELEE_SKILL, UNIT_RANGED_SKILL, UNIT_RECORD } from "../../core/DenseLayout";
/**
 * `private void L()` (#248), bytecode/b-javap.txt line 27482, offsets
 * 0..245 -- **handing a villager a weapon**, i.e. the path behind the
 * store's weapon menu. `k()` calls it for a type-50 unit (one that has
 * arrived to be equipped), right after clearing `7979` bit 6.
 *
 * The whole method:
 *
 *   X = dense[1717 + v] < dense[1616 + v] ? 3 : 0;   // melee vs throwing skill
 *   for (Y = X; Y < 6 + X; Y++) {
 *     pool = a[u];                                    // the team's resource pool
 *     slot = t88[ t103[Y] ];
 *     if (pool[slot] < t104[Y]) continue;             // cannot afford it
 *     pool[slot] -= t104[Y];
 *     dense[6565 + v] = t103[Y];                      // equip it
 *     f.d(dense[4444 + v]);                           // #370
 *     return;
 *   }
 *
 * Two things fall out of this:
 *
 *  - `X` is the **preference**: a villager whose ranged skill (`1616`)
 *    beats its melee skill (`1717`) starts scanning at candidate 3 instead
 *    of 0, so the six candidates are two bands of three and the unit is
 *    offered the band it is better at first.
 *  - `t103[Y]` is the equipment-slot id and `t88[slot]` the resource pool
 *    it is paid from -- the same `t88` the 2026-09-21 equipment survey
 *    found, and the same slot ids `6565` carries (1 = stone, and only
 *    1/2/5 shift a unit into the throwing band via `t18`).
 *
 * `X:I` (#56) and `Y:I` (#57) have no reader or writer outside this method
 * (checked by constant-pool index across the whole class), so they are
 * locals here rather than shared scratch.
 */
export type LegacyEntityEquipIssueInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** b.a:[[S (#63) -- the per-team resource pools; only row `team` is touched. */
  readonly pools: readonly Int16Array[];
  /** b.u:I (#222). */
  readonly team: number;
  /** f.d(int) (#370) -- completeLegacyEntityRecord. */
  readonly onRecordCompletion: (record: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

export function stepLegacyEntityEquipIssue(input: LegacyEntityEquipIssueInput): void {
  const { state, v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const pool = input.pools[input.team];
  if (!pool) return;

  // Offsets 0..45.
  const start = (state[UNIT_MELEE_SKILL + v] ?? 0) < (state[UNIT_RANGED_SKILL + v] ?? 0) ? 3 : 0;

  // Offsets 46..244.
  for (let y = start; y < 6 + start; y += 1) {
    const item = table(103, y);
    const slot = table(88, item);
    const cost = table(104, y);
    if ((pool[slot] ?? 0) < cost) continue;

    pool[slot] = toShort((pool[slot] ?? 0) - cost);
    state[UNIT_HELD_ITEM + v] = toByte(item);
    input.onRecordCompletion(state[UNIT_RECORD + v] ?? 0);
    return;
  }
}
