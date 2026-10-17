import type { LegacyBuildingScratch } from "./LegacySubsystemBuildingEconomy";
import { BLD_HP, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKER_HEAD, UNIT_CARRY_AMOUNT, UNIT_GENDER, UNIT_JOB_TYPE, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";
import { T_BUILDING, T_TYPE_JOB } from "../../core/DataTables";

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
  const workClass = (type: number) => table(42, table(T_TYPE_JOB, type));
  const cycleDone = (w: number) =>
    (state[3030 + w] ?? 0) >= (input.cycleLengths[(state[UNIT_MODE + w] ?? 0) & 255] ?? 0) - 1;

  for (let w = state[BLD_WORKER_HEAD + v] ?? 0; w > 0; w = state[UNIT_NEXT_WORKER + w] ?? 0) {
    s.C += 1;

    if (s.z === 2 && (state[BLD_WORK + v] ?? 0) === 0) {
      if ((state[UNIT_SLOT + w] ?? 0) === 0) s.x = w;
      if ((state[UNIT_TIMER + w] ?? 0) > 0 && (state[UNIT_TYPE + w] ?? 0) === 111) {
        s.A = s.A | (1 + (state[UNIT_GENDER + w] ?? 0));
      }
      continue;
    }

    if (s.z >= 12 && (state[BLD_HP + v] ?? 0) >= table(T_BUILDING, 182 + (state[BLD_PLANNED_KIND + v] ?? 0))) {
      if (s.u === 0) {
        state[UNIT_TYPE + w] = 87;
        state[UNIT_ORDER + w] = 3;
      } else if (s.u === 1) {
        state[UNIT_ORDER + w] = 2;
      }
      continue;
    }

    const type = state[UNIT_TYPE + w] ?? 0;
    if (type === 87 || (state[UNIT_TIMER + w] ?? 0) === -3) continue;
    if ((state[UNIT_TIMER + w] ?? 0) === -2 &&
        (!cycleDone(w) || workClass(state[UNIT_JOB_TYPE + w] ?? 0) !== workClass(type) || (state[UNIT_CARRY_AMOUNT + w] ?? 0) > 0)) {
      continue;
    }
    const mode = state[UNIT_MODE + w] ?? 0;
    if ((mode === -109 || mode === -102) && !cycleDone(w)) continue;

    if ((state[BLD_WORK + v] ?? 0) === 0 || type === 56 || type === 76 || type === 77 || type === 78) {
      input.onAb(w);
    }
  }
}
