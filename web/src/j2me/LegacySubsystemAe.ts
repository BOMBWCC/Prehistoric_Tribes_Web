import type { LegacyBuildingScratch } from "./LegacySubsystemBuildingEconomy";

/**
 * Exact `private void ae()` (#312), bytecode/b-javap.txt line 39409,
 * offsets 0..789. Called by `g()` every 16 ticks for a site or built
 * record `v`: recruits idle units until the record has `aK` workers.
 *
 *  - Team 0 returns while `f.N`; team 1 returns while `Q > 0`.
 *  - `aK = 8627 == 0 ? t138[(9115-1)*26 + type] : t138[494 + type]`; 9298
 *    is raised to 8932 when the record has an owner (8810 > 0).
 *  - For `aL` in the team's 50 unit ids while `9298 < aK`: team 0 takes an
 *    idle (6161 == 0) type-69 unit (or type 84 whose 3939 is 69) with
 *    `t42[t41[6464]] == 2`, unless its current destination cell holds an
 *    own record of type >= 12 or a built one; team 1 takes a unit with
 *    `j[aL-51] < t242[f.q]` and `t42[t41[6464]] != 2`. The unit's 3131/6262
 *    and 3232/6363 become the record's 8383/8444, 2828/6464 = 77, 6161 = 3,
 *    9298 += 1, and it becomes type 87 if it is not on its own cell.
 *
 * `aK:I` (#86) and `aL:I` (#87) are written before they are read, so they are locals.
 */
export type LegacySubsystemAeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly scratch: LegacyBuildingScratch;
  /** f.N:Z. */
  readonly fN: boolean;
  /** b.Q:B (#46). */
  readonly qByte: number;
  /** f.q:B (#211). */
  readonly fQ: number;
  /** b.j:[B (#191). */
  readonly jobTable: Int8Array;
};

export function stepLegacySubsystemAe(input: LegacySubsystemAeInput): void {
  const { state, scratch: s } = input;
  const v = s.v;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const cell = (row: number, column: number) => input.gridC[row]?.[column] ?? 0;

  if (s.u === 0 ? input.fN : (s.u === 1 && input.qByte > 0)) return;

  const type = state[8749 + v] ?? 0;
  const aK = (state[8627 + v] ?? 0) === 0
    ? table(138, ((state[9115 + v] ?? 0) - 1) * 26 + type)
    : table(138, 494 + type);
  if ((state[9298 + v] ?? 0) < (state[8932 + v] ?? 0) && (state[8810 + v] ?? 0) > 0) {
    state[9298 + v] = state[8932 + v] ?? 0;
  }
  if ((state[9298 + v] ?? 0) >= aK) return;

  for (let aL = s.u * 50 + 1; aL <= (s.u + 1) * 50 && (state[9298 + v] ?? 0) < aK; aL += 1) {
    const workClass = table(42, table(41, state[6464 + aL] ?? 0));
    let candidate = false;
    if (s.u === 0) {
      const unitType = state[2828 + aL] ?? 0;
      candidate = (unitType === 69 || (unitType === 84 && (state[3939 + aL] ?? 0) === 69)) &&
        (state[6161 + aL] ?? 0) === 0 && workClass === 2;
    } else if (s.u === 1) {
      candidate = (input.jobTable[aL - s.u * 50 - 1] ?? 0) < table(242, input.fQ) && workClass !== 2;
    }
    if (!candidate) continue;

    if (s.u === 0) {
      const target = -cell(state[6363 + aL] ?? 0, state[6262 + aL] ?? 0);
      if (target > s.u * 30 && target <= (s.u + 1) * 30 &&
          ((state[8749 + target] ?? 0) >= 12 || (state[8627 + target] ?? 0) !== 0)) {
        continue;
      }
    }

    state[3131 + aL] = state[8383 + v] ?? 0;
    state[6262 + aL] = state[3131 + aL] ?? 0;
    state[3232 + aL] = state[8444 + v] ?? 0;
    state[6363 + aL] = state[3232 + aL] ?? 0;
    state[2828 + aL] = 77;
    state[6464 + aL] = 77;
    state[6161 + aL] = 3;
    state[9298 + v] = (state[9298 + v] ?? 0) + 1;
    if (cell(state[101 + aL] ?? 0, state[aL] ?? 0) !== aL) state[2828 + aL] = 87;
  }
}
