import { BLD_WORK, UNIT_GENDER, UNIT_HP, UNIT_NEXT_WORKER, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void m(int)` (#400), bytecode/b-javap.txt line 34136, offsets
 * 0..134: the corpse cleanup `private boolean a()`'s dying branch runs once
 * the death animation has played out (`3030 >= f.j[4][2929 & 255]`).
 *
 *   d(id, 0);                                     // #367, subsystemD
 *   1919[id] = 0; 5959[id] = 0;
 *   gridC[101[id]][0[id]] = 4545[id] <= -111 ? 4545[id] : 0;
 *   a[(id-1)/50][11] -= 1;                        // population
 *   a[(id-1)/50][12 + 1515[id]] -= 1;             // the gender counters
 *   b(id);                                        // #350, releaseLegacyEntityHome
 *
 * Ported 2026-09-16 together with `final void b(int)` below; until then the
 * dying branch had no cleanup callback at all, so a dead villager stayed on
 * the map forever and the population count never dropped.
 */
export type LegacyEntityDeathCleanupInput = {
  readonly state: Int8Array;
  /** b.b:[[B (#129) -- gridC, row-major. */
  readonly gridC: Int8Array[];
  /** b.b:[S (#132) -- saveOffsets. */
  readonly saveOffsets: Int16Array;
  /** b.a:[[S (#63) -- mainArrays.aShort. */
  readonly shortRows: Int16Array[];
  /** d(int,int) (#367) -- subsystemD. */
  readonly onD: (id: number, argument: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

/**
 * `final void b(int)` (#350), bytecode/b-javap.txt line 35859, offsets 0..63:
 * gives up the unit's reserved hut.
 *
 *   home = 3434[id];
 *   if (home > 0) {
 *     dense[saveOffsets[8627[home] != 0 ? 97 : 90] + home] -= 1;
 *     3434[id] = 0;
 *   }
 */
export function releaseLegacyEntityHome(
  state: Int8Array,
  saveOffsets: Int16Array,
  id: number,
): void {
  const home = state[3434 + id] ?? 0;
  if (home <= 0) return;
  const row = (state[BLD_WORK + home] ?? 0) !== 0 ? 97 : 90;
  const slot = (saveOffsets[row] ?? 0) + home;
  state[slot] = toByte((state[slot] ?? 0) - 1);
  state[3434 + id] = 0;
}

export function stepLegacyEntityDeathCleanup(input: LegacyEntityDeathCleanupInput, id: number): void {
  const { state } = input;

  input.onD(id, 0);
  state[UNIT_HP + id] = 0;
  state[5959 + id] = 0;

  const row = input.gridC[state[UNIT_Y + id] ?? 0];
  if (row) {
    const saved = state[UNIT_NEXT_WORKER + id] ?? 0;
    row[state[id] ?? 0] = toByte(saved <= -111 ? saved : 0);
  }

  const team = Math.trunc((id - 1) / 50);
  const counters = input.shortRows[team];
  if (counters) {
    counters[11] = toShort((counters[11] ?? 0) - 1);
    const genderSlot = 12 + (state[UNIT_GENDER + id] ?? 0);
    counters[genderSlot] = toShort((counters[genderSlot] ?? 0) - 1);
  }

  releaseLegacyEntityHome(state, input.saveOffsets, id);
}
