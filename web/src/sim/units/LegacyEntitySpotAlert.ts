import { UNIT_FLAGS, UNIT_JOB_TYPE, UNIT_MODE, UNIT_SCOUT_SKILL, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private boolean h()`, bytecode/b-javap.txt line 16152, offsets 0..738 --
 * `b.e()`'s offset-256 call, gated by the loop on `dense[7575 + id] > 3`
 * (the unit's sight range). Returning true makes `e()` **skip the rest of
 * that unit's tick**, which is how the "stop and look" animation holds.
 *
 * It was `e()`'s unwired `onEntityTimingCheck`.
 *
 *  - 0..336, once every 8 frames for this unit (`(f.c & 7) === (v & 7)`):
 *    sets `7979` bit 0, runs the spiral gate `a(7, 17, x, y)` (#270) for its
 *    side effects, and then, **for team 0 only**, walks team 1's five marker
 *    slots (`f.c:[[[B`[1], this port's `teamMarkerTable`, each row
 *    `[x, y, type, seen]`). A slot with a real type that nobody has marked
 *    seen yet is scored through the same 25x25 `t53` table the rest of the
 *    port uses, and if that score is within `dense[7575 + v] - 3` the slot's
 *    `seen` flag goes to 1. So this is a villager **noticing** an enemy
 *    marker, and the range it notices at is its own sight minus three.
 *  - 337..484: already playing one of the two notice animations (`2929`
 *    -106 or -107) -- advance `3030`, and while it is still short of
 *    `f.j[4][2929 & 255]` frames return true to hold the unit there. When
 *    it ends, `-107` additionally sets `7979` bit 1.
 *  - 485..586: an idle villager (type 69, job 69, no player order, and
 *    `7979 & 3 === 1`) starts the `-107` animation and returns true.
 *  - 587..736: with `7979` bit 1 set, start the `-106` animation and clear
 *    that bit -- unless the unit is an idle 69/105 that has bit 0 set and no
 *    player order, which is left alone.
 *
 * `7979`'s two low bits are the bookkeeping: bit 0 "has looked around this
 * cycle", bit 1 "has something to react to".
 */
export type LegacyEntitySpotAlertInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.c:I (#148) -- the frame counter. */
  readonly frame: number;
  /** f.c:[[[B (#150 via b, #256 in f) -- teamMarkerTable[team][slot] = [x, y, type, seen]. */
  readonly markerTable: readonly (readonly Int8Array[])[];
  /** f.j:[[B (#194) row 4 -- the animation frame counts. */
  readonly jRow4: (index: number) => number;
  /** b.B:B (#9) / b.z:B (#235) / b.A:B (#6) -- shared scratch this method writes. */
  readonly scratch: { B: number; z: number; A: number };
  /** final boolean a(int,int,int,int) (#270); the result is popped. */
  readonly onSpiralGate: (mode: number, scanLimit: number, x: number, y: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntitySpotAlert(input: LegacyEntitySpotAlertInput): boolean {
  const { state, v, scratch } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  // Offsets 0..336.
  if ((input.frame & 7) === (v & 7)) {
    state[UNIT_FLAGS + v] = toByte((state[UNIT_FLAGS + v] ?? 0) | 1);
    input.onSpiralGate(7, 17, state[v] ?? 0, state[UNIT_Y + v] ?? 0);

    if (input.team === 0) {
      for (scratch.B = 0; scratch.B < 5; scratch.B = toByte(scratch.B + 1)) {
        const row = input.markerTable[1]?.[scratch.B];
        if (!row) continue;
        if ((row[2] ?? 0) < 0) continue;
        if ((row[3] ?? 0) === 1) continue;

        scratch.z = toByte((row[0] ?? 0) - (state[v] ?? 0));
        scratch.A = toByte((row[1] ?? 0) - (state[UNIT_Y + v] ?? 0));
        const ay = scratch.A > -10 && scratch.A < 10 ? 12 + scratch.A : 0;
        const ax = scratch.z > -10 && scratch.z < 10 ? 12 + scratch.z : 0;
        const score = Math.trunc(table(53, ay * 25 + ax) / 10);
        if (score <= (state[UNIT_SCOUT_SKILL + v] ?? 0) - 3) row[3] = 1;
      }
    }
  }

  // Offsets 337..484.
  const action = state[UNIT_MODE + v] ?? 0;
  if (action === -106 || action === -107) {
    state[3030 + v] = toByte((state[3030 + v] ?? 0) + 1);
    if ((state[3030 + v] ?? 0) < input.jRow4(action & 255)) return true;
    if (action === -107) state[UNIT_FLAGS + v] = toByte((state[UNIT_FLAGS + v] ?? 0) | 2);
    return false;
  }

  // Offsets 485..586.
  if ((state[UNIT_TYPE + v] ?? 0) === 69 &&
      (state[UNIT_JOB_TYPE + v] ?? 0) === 69 &&
      (state[7777 + v] ?? 0) === 0 &&
      ((state[UNIT_FLAGS + v] ?? 0) & 3) === 1) {
    state[UNIT_MODE + v] = -107;
    state[3030 + v] = 0;
    return true;
  }

  // Offsets 587..736.
  if (((state[UNIT_FLAGS + v] ?? 0) & 2) !== 0) {
    const type = state[UNIT_TYPE + v] ?? 0;
    const settled = (type === 69 || type === 105) &&
      ((state[UNIT_FLAGS + v] ?? 0) & 1) !== 0 &&
      (state[7777 + v] ?? 0) <= 0;
    if (settled) return false;

    state[UNIT_MODE + v] = -106;
    state[3030 + v] = 0;
    state[UNIT_FLAGS + v] = toByte((state[UNIT_FLAGS + v] ?? 0) & 253);
    return true;
  }

  return false;
}
