import { BLD_WORKER_HEAD, UNIT_ENERGY, UNIT_HAPPINESS, UNIT_HP, UNIT_MAX_HP, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RECORD, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * `private void j(int)` (#394), bytecode/b-javap.txt line 26108, offsets
 * 0..245: what unit `v` does for everyone else listed on its own record --
 * the two halves of "being looked after inside a building".
 *
 *   S = dense[8993 + dense[4444 + v]];        // the record's worker-list head
 *   while (S > 0) {
 *     if (S != v) {
 *       if (arg == 0) {                        // offsets 47..153
 *         dense[505 + S]  = clamp(dense[505 + S]  + (dense[7272 + v] + 2) / 2, 0, 99);
 *         dense[2121 + S] = clamp(dense[2121 + S] + (dense[7272 + v] + 2) / 2, 0, 99);
 *       } else {                               // offsets 156..224
 *         a(S, 10);                            // #294, the heal/penalty step
 *         if (dense[1919 + S] >= dense[6767 + S]) {   // back to full HP
 *           dense[2828 + S] = 87;              // ... and out of the building
 *           dense[6161 + S] = 3;
 *         }
 *       }
 *     }
 *     S = dense[4545 + S];                     // next worker
 *   }
 *
 * `S:I` (#51) is class b's shared scratch (the same field `a(int,int,int)`
 * #266 and `i()`'s meal branch use), so it is threaded through explicitly
 * rather than kept local.
 *
 * Both call sites pass a constant: `i():Z` (offset 216) calls `j(0)` when the unit's mode is
 * 117, and `j():Z` (offset 123) calls `j(1)` -- the healing branch -- for a type-55 unit.
 * (Corrected 2026-10-16; this said i():Z passed 1 and K() passed 0.)
 */
export type LegacyEntityOccupantCareInput = {
  readonly state: Int8Array;
  /** b.v:I (#225), the unit doing the caring. */
  readonly v: number;
  /** b.S:I (#51), class b's shared scratch; written through so callers see it. */
  readonly scratch: { S: number };
  /** `a(int,int)` (#294) -- LegacyRuntimeState.entityHealthDelta. */
  readonly onHealthDelta: (id: number, delta: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min;
  return value >= max ? max : value;
}

export function stepLegacyEntityOccupantCare(input: LegacyEntityOccupantCareInput, argument: number): void {
  const { state, v, scratch } = input;

  scratch.S = state[BLD_WORKER_HEAD + (state[UNIT_RECORD + v] ?? 0)] ?? 0;
  while (scratch.S > 0) {
    const s = scratch.S;
    if (s !== v) {
      if (argument === 0) {
        const step = Math.trunc(((state[7272 + v] ?? 0) + 2) / 2);
        state[UNIT_HAPPINESS + s] = toByte(clampToRange((state[UNIT_HAPPINESS + s] ?? 0) + step, 0, 99));
        state[UNIT_ENERGY + s] = toByte(clampToRange((state[UNIT_ENERGY + s] ?? 0) + step, 0, 99));
      } else {
        input.onHealthDelta(s, 10);
        if ((state[UNIT_HP + s] ?? 0) >= (state[UNIT_MAX_HP + s] ?? 0)) {
          state[UNIT_TYPE + s] = 87;
          state[UNIT_ORDER + s] = 3;
        }
      }
    }
    scratch.S = state[UNIT_NEXT_WORKER + s] ?? 0;
  }
}
