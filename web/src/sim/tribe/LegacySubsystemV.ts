import { UNIT_AGE, UNIT_DIRECTION, UNIT_GENDER, UNIT_HP, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
/**
 * Exact `private boolean v()` (#421), bytecode/b-javap.txt line 43408,
 * offsets 0..1197 -- `b.i()`'s mission-script step for every mission but 4
 * (offset 425). `true` ends `b.i()` for this tick.
 *
 * `f:B` (#167) is the script position; a step retires by adding 50 (f.U()
 * later subtracts 49 to move on). The step's opcode is
 * `N = t287[t288[q] + f]`; only 3..9 act:
 *
 *  - 0..80: nothing once `f >= t291[q]`, or (q != 3) while the chief
 *    `aShort[0][17]` is dead or a child.
 *  - 127..165: the first frame the enemy count `aShort[1][11]` is 0 on an
 *    N == 3 step, `F:I` (still at its 1000000 sentinel) takes `f.c`.
 *  - N == 7 (185..427): the first living, idle (202 == 0 and 303 == 0)
 *    adult among 1..50 runs the step through `b(v, 0, x, y)` (#346); once
 *    that retires it (f >= 50), mission 3 calls `a(f.p[i], true)` for
 *    `f.p[0..4]`, and v() returns true.
 *  - Otherwise the step fires when (430..551): N == 3 and 40 frames passed
 *    since `F`; N == 4 and `F > 2` (three skilled units, see s()/a()Z);
 *    N == 5 and `f.c - F > (q < 2 ? 30 : 120)`; N == 6 and the enemy
 *    `aShort[1][14] < 5`; or N == 8 and `dense[8536] == 0`. Firing:
 *    - 554..580: q < 2 sets `I:B = N == 4 ? 3 : 0`.
 *    - N == 8 (592..868): `f.b(58, 30)`; three team-0 type-9 units at
 *      (57, 30) with f.aw = 1 around the call (then 2); living units 1..8
 *      are sorted into `f.p[4]` (1515 == 0) or `f.p[2]`/`f.p[3]`, facing
 *      `606 = 3 + 4 * 1515`; records type 2 at (56, 30) and (55, 31);
 *      `aShort[0][19] -= 5`.
 *    - N == 6 (871..1015): two waves of eight team-1 type-3 units at
 *      (21, 72) and (21, 75), then every living unit 51..100 is ordered
 *      (6161 = 2, 4747 = -1) to team 0's first record (8384/8445).
 *    - else (1018..1132): q == 5 runs `b(0, 0, 1)`; otherwise `c(q == 2)`
 *      and `f.p[1..4] = e[N][0]` or the chief.
 *    - 1135..1195: `f.b(t286[t288[q] + f])`, `f += 50`, true.
 *
 * aM:I (#88) and N:I (#38) are written before they are read in every user,
 * but N:I is b.b(III)/c(boolean)'s shared counter, so it stays live.
 */
export type LegacySubsystemVInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.a:[[S] (#63). */
  readonly aShort: readonly Int16Array[];
  /** b.e:[[B] (#165), 4 x 8. */
  readonly eRows: readonly Int8Array[];
  /** f.p:[B] -- `auxiliaryScratch`. */
  readonly fP: Int8Array;
  /** f.q:B. */
  readonly q: number;
  /** f.c:I. */
  readonly frame: number;
  /** b.K:B (#28). */
  readonly bField28: number;
  /** b.f:B (#167), b.F:I (#16), b.N:I (#38), b.I:B (#23), f.aw:B. */
  readonly fields: { f: number; F: number; N: number; I: number; aw: number };
  /** private void b(int,int,int,int) (#346). */
  readonly onPlaceStep: (first: number, second: number, x: number, y: number) => void;
  /** private void a(int,boolean) (#278). */
  readonly onCoordinateSync: (id: number, flag: boolean) => void;
  /** f.b(int,int) (#352). */
  readonly onFPair: (x: number, y: number) => void;
  /** b.a(int,int,int,byte,byte) (#307). */
  readonly onSpawn: (count: number, x: number, y: number, team: number, value: number) => void;
  /** f.a(byte,byte,byte,byte,byte) (#302); the result is popped. */
  readonly onRecord: (team: number, x: number, y: number, type: number, flags: number) => void;
  /** private void b(int,int,int) (#342). */
  readonly onAuxiliary: (first: number, second: number, third: number) => void;
  /** private void c(boolean) (#361). */
  readonly onPickAdults: (flag: boolean) => void;
  /** f.b(int) (#343). */
  readonly onScene: (value: number) => void;
};

const toByte = (value: number) => ((value & 0xff) ^ 0x80) - 0x80;

export function stepLegacySubsystemV(input: LegacySubsystemVInput): boolean {
  const { state, packedBytes, packedOffsets, fields, q } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;

  if (fields.f >= table(291, q)) return false;
  if (q !== 3) {
    const chief = input.aShort[0]?.[17] ?? 0;
    if ((state[UNIT_HP + chief] ?? 0) <= 0 || (state[UNIT_AGE + chief] ?? 0) < 12) return false;
  }
  fields.N = table(287, table(288, q) + fields.f);
  if ((input.aShort[1]?.[11] ?? 0) <= 0 && fields.N === 3 && fields.F === 1000000) fields.F = input.frame;
  if (fields.N < 3 || fields.N > 9) return false;

  if (fields.N === 7) {
    if (q === 3 && fields.f === 2 && input.bField28 < 50) return false;
    for (let aM = 1; aM <= 50; aM += 1) {
      if ((state[UNIT_HP + aM] ?? 0) <= 0 || (state[UNIT_AGE + aM] ?? 0) < 12 ||
          (state[UNIT_OFFSET_X + aM] ?? 0) !== 0 || (state[UNIT_OFFSET_Y + aM] ?? 0) !== 0) continue;
      input.onPlaceStep(aM, 0, state[aM] ?? 0, state[UNIT_Y + aM] ?? 0);
      if (fields.f < 50) continue;
      if (q === 3) {
        for (let i = 0; i < 5; i += 1) {
          if ((input.fP[i] ?? 0) !== 0) input.onCoordinateSync(input.fP[i]!, true);
        }
      }
      return true;
    }
    return false;
  }

  const n = fields.N;
  const elapsed = input.frame - fields.F;
  const fires = (n === 3 && elapsed > 40) ||
    (fields.F > 2 && n === 4) ||
    (elapsed > (q < 2 ? 30 : 120) && n === 5) ||
    (n === 6 && (input.aShort[1]?.[14] ?? 0) < 5) ||
    (n === 8 && (state[8536] ?? 0) === 0);
  if (!fires) return false;

  if (q < 2) fields.I = n === 4 ? 3 : 0;

  if (n === 8) {
    input.onFPair(58, 30);
    fields.aw = 1;
    input.onSpawn(3, 57, 30, 0, 9);
    fields.aw = 2;
    for (fields.N = 1; fields.N < 9; fields.N += 1) {
      const id = fields.N;
      if ((state[UNIT_HP + id] ?? 0) <= 0) continue;
      if ((state[UNIT_GENDER + id] ?? 0) === 0) {
        if ((input.fP[4] ?? 0) < 1) input.fP[4] = id;
      } else if ((input.fP[2] ?? 0) < 1) {
        input.fP[2] = id;
      } else if ((input.fP[3] ?? 0) < 1) {
        input.fP[3] = id;
      }
      state[UNIT_DIRECTION + id] = toByte(3 + ((state[UNIT_GENDER + id] ?? 0) << 2));
    }
    input.onRecord(0, 56, 30, 2, 0);
    input.onRecord(0, 55, 31, 2, 0);
    const row = input.aShort[0];
    if (row) row[19] = row[19]! - 5;
  } else if (n === 6) {
    input.onSpawn(8, 21, 72, 1, 3);
    input.onSpawn(8, 21, 75, 1, 3);
    for (fields.N = 51; fields.N <= 100; fields.N += 1) {
      const id = fields.N;
      if ((state[UNIT_HP + id] ?? 0) <= 0) continue;
      state[UNIT_ORDER + id] = 2;
      state[UNIT_WORK_TARGET + id] = -1;
      state[UNIT_TARGET_X + id] = state[8384] ?? 0;
      state[UNIT_TARGET_Y + id] = state[8445] ?? 0;
    }
  } else if (q === 5) {
    input.onAuxiliary(0, 0, 1);
  } else {
    input.onPickAdults(q === 2);
    for (fields.N = 0; fields.N < 4; fields.N += 1) {
      const pick = input.eRows[fields.N]?.[0] ?? 0;
      input.fP[fields.N + 1] = pick !== 0 ? pick : (input.eRows[0]?.[0] ?? 0);
    }
  }

  input.onScene(table(286, table(288, q) + fields.f));
  fields.f = toByte(fields.f + 50);
  return true;
}
