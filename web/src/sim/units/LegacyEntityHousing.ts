import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_WORK } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Exact `private void V()` (#258), bytecode/b-javap.txt line 35743,
 * offsets 0..196: a homeless adult is given a home. Its only caller is
 * `private boolean a()`'s offset 483 (`LegacyEntityStatusGuard.ts`'s `onV`,
 * every 32 frames for an adult whose `3434 < 1`).
 *
 *   if (v == a[u][17]) { 3434[v] = 1; return; }      // the chief lives in record 1
 *   for (aI = u*30+1; aI <= (u+1)*30; aI++)
 *     if (8749[aI] == 2 && 8627[aI] == 0 &&
 *         8810[aI] < t138[(9115[aI]-1)*26 + 2]) {      // a hut with a free bed
 *       3434[v] = aI; 8810[aI] += 1; return;
 *     }
 *
 * For a hut, `8810` is its resident count (the same field
 * `LegacyEntityDeathCleanup.ts`'s `releaseLegacyEntityHome` decrements when a
 * resident dies). `aI:I` (#84) is written before it is read, so it is a local.
 *
 * WIRED 2026-09-18: the status guard's only call site passed `onVacate` but
 * not `onV`, so no villager ever got a home and every hut's resident count
 * stayed 0.
 */
export type LegacyEntityHousingInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.a:[[S (#63) -- mainArrays.aShort; slot 17 is the chief. */
  readonly pool: readonly Int16Array[];
  readonly id: number;
  /** b.u:I (#222). */
  readonly team: number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityHousing(input: LegacyEntityHousingInput): void {
  const { state, id: v, team: u } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  if (v === (input.pool[u]?.[17] ?? 0)) {
    state[3434 + v] = 1;
    return;
  }

  for (let aI = u * 30 + 1; aI <= (u + 1) * 30; aI += 1) {
    if ((state[BLD_KIND + aI] ?? 0) !== 2 || (state[BLD_WORK + aI] ?? 0) !== 0) continue;
    const beds = table(T_BUILDING, ((state[BLD_LEVEL + aI] ?? 0) - 1) * 26 + 2);
    if ((state[BLD_OWNER + aI] ?? 0) >= beds) continue;
    state[3434 + v] = toByte(aI);
    state[BLD_OWNER + aI] = toByte((state[BLD_OWNER + aI] ?? 0) + 1);
    return;
  }
}
