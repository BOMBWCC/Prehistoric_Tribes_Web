import type { LegacyBuildingScratch } from "./LegacySubsystemBuildingEconomy";

/**
 * Exact `private void aa()` (#308), bytecode/b-javap.txt line 38130,
 * offsets 0..669. Called by `g()` for record `v`: walks its worker list
 * (`w = 8993[v]`, next `4545[w]`; `w:I` #228 is handed to ab() explicitly).
 *
 *  - `C += 1` per worker.
 *  - Type-2 record, not built: remember a slot-0 worker in `x`; `A |= 1 +
 *    1515[w]` for a type-111 worker with `1313 > 0`. Next worker.
 *  - Construction finished (`z >= 12 && 8505 >= t138[182+9237]`): team 0
 *    workers become type 87 with `6161 = 3`; team 1 workers get `6161 = 2`.
 *  - Skip type 87 and `1313 == -3`. A builder (`1313 == -2`) needs its
 *    action cycle finished (`3030 >= f.j[4][2929] - 1`), matching
 *    `t42[t41[..]]` for 6464 and 2828, and nothing carried (`3636 <= 0`).
 *    Modes -109/-102 also need the cycle finished.
 *  - Then `ab()` when the record is unbuilt (8627 == 0) or the worker is
 *    type 56/76/77/78.
 */
export type LegacySubsystemAaInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.j:[[B (#194) row 4 -- action cycle lengths by mode. */
  readonly cycleLengths: Int8Array;
  readonly scratch: LegacyBuildingScratch;
  /** ab() (#309) for worker `w`. */
  readonly onAb: (worker: number) => void;
};

export function stepLegacySubsystemAa(input: LegacySubsystemAaInput): void {
  const { state, scratch: s } = input;
  const v = s.v;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const workClass = (type: number) => table(42, table(41, type));
  const cycleDone = (w: number) =>
    (state[3030 + w] ?? 0) >= (input.cycleLengths[(state[2929 + w] ?? 0) & 255] ?? 0) - 1;

  for (let w = state[8993 + v] ?? 0; w > 0; w = state[4545 + w] ?? 0) {
    s.C += 1;

    if (s.z === 2 && (state[8627 + v] ?? 0) === 0) {
      if ((state[4646 + w] ?? 0) === 0) s.x = w;
      if ((state[1313 + w] ?? 0) > 0 && (state[2828 + w] ?? 0) === 111) {
        s.A = s.A | (1 + (state[1515 + w] ?? 0));
      }
      continue;
    }

    if (s.z >= 12 && (state[8505 + v] ?? 0) >= table(138, 182 + (state[9237 + v] ?? 0))) {
      if (s.u === 0) {
        state[2828 + w] = 87;
        state[6161 + w] = 3;
      } else if (s.u === 1) {
        state[6161 + w] = 2;
      }
      continue;
    }

    const type = state[2828 + w] ?? 0;
    if (type === 87 || (state[1313 + w] ?? 0) === -3) continue;
    if ((state[1313 + w] ?? 0) === -2 &&
        (!cycleDone(w) || workClass(state[6464 + w] ?? 0) !== workClass(type) || (state[3636 + w] ?? 0) > 0)) {
      continue;
    }
    const mode = state[2929 + w] ?? 0;
    if ((mode === -109 || mode === -102) && !cycleDone(w)) continue;

    if ((state[8627 + v] ?? 0) === 0 || type === 56 || type === 76 || type === 77 || type === 78) {
      input.onAb(w);
    }
  }
}
