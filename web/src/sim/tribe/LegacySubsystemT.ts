import { UNIT_AGE, UNIT_FLAGS, UNIT_HP } from "../../core/DenseLayout";
/**
 * Exact `private boolean t()` (#417), bytecode/b-javap.txt line 42926,
 * offsets 0..597. `b.i()` calls it after its node loop (offset 398); `true`
 * ends `b.i()` for this tick.
 *
 *  - 0..381, marker timers: for each team's `f.c:[[[B` markers, up to the
 *    first one whose [2] is negative, [2] += 1 every 8th frame; at 100 it is switched
 *    off (-1), otherwise every adult (1414 >= 12) unit 1..100 standing in
 *    the 3x3 cells around the marker gets 7979 bit 2.
 *  - 382..597, chief succession: unless q == 3 (or q == 2 with f:B > 2),
 *    when team 0's chief `aShort[0][17]` is dead or not grown, K:Z is off,
 *    `aShort[0][11] > 0`, f:B < 50, u:B == 0 and K:B >= 50, the first
 *    living adult among 1..50 is handed to `f.a(18, v, v)` with K:Z set,
 *    and the method returns true.
 *
 * aM:I (#88) is written before every read in all of its users, so it is a
 * local; u/v/w/A/C/D are b's shared scratch and are written for real.
 */
export type LegacySubsystemTInput = {
  readonly state: Int8Array;
  /** b.b:[[B] -- the unit grid. */
  readonly gridC: readonly Int8Array[];
  /** f.c:[[[B] (#150 via b) -- `[team][slot] = [x, y, timer, ...]`. */
  readonly teamMarkerTable: readonly (readonly Int8Array[])[];
  /** b.a:[[S] (#63). */
  readonly aShort: readonly Int16Array[];
  /** f.c:I. */
  readonly frame: number;
  /** f.c:S / f.d:S. */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** f.q:B. */
  readonly q: number;
  /** b.f:B (#167). */
  readonly fByte: number;
  /** f.u:B. */
  readonly uByte: number;
  /** b.K:B (#28). */
  readonly bField28: number;
  /** f.K:Z, read and set. */
  readonly kFlag: { value: boolean };
  /** b.u:I, b.v:I, b.w:I, b.A:I, b.C:I, b.D:I. */
  readonly scratch: { u: number; v: number; w: number; A: number; C: number; D: number };
  /** f.a(byte,byte,byte) (#306). */
  readonly onPrompt: (ap: number, am: number, an: number) => void;
};

const toByte = (value: number) => ((value & 0xff) ^ 0x80) - 0x80;

export function stepLegacySubsystemT(input: LegacySubsystemTInput): boolean {
  const { state, scratch } = input;

  for (let aM = 0; aM < 2; aM += 1) {
    for (scratch.w = 0; scratch.w < 5; scratch.w += 1) {
      const marker = input.teamMarkerTable[aM]?.[scratch.w];
      // Offset 45..48: an unused slot ends this team's scan (goto 369, aM++).
      if (!marker || (marker[2] ?? 0) < 0) break;
      if ((input.frame & 7) === 0) marker[2] = toByte((marker[2] ?? 0) + 1);
      if ((marker[2] ?? 0) >= 100) {
        marker[2] = -1;
        continue;
      }
      for (scratch.u = -1; scratch.u < 2; scratch.u += 1) {
        for (scratch.v = -1; scratch.v < 2; scratch.v += 1) {
          scratch.C = (marker[0] ?? 0) + scratch.u;
          scratch.D = (marker[1] ?? 0) + scratch.v;
          if (scratch.C < 0 || scratch.C >= input.mapWidth || scratch.D < 0 || scratch.D >= input.mapHeight) continue;
          scratch.A = input.gridC[scratch.D]?.[scratch.C] ?? 0;
          if (scratch.A < 1 || scratch.A > 100 || (state[UNIT_AGE + scratch.A] ?? 0) < 12) continue;
          state[UNIT_FLAGS + scratch.A] = toByte((state[UNIT_FLAGS + scratch.A] ?? 0) | 4);
        }
      }
    }
  }

  if (input.q === 3 || (input.q === 2 && input.fByte > 2)) return false;
  const chief = input.aShort[0]?.[17] ?? 0;
  if ((state[UNIT_HP + chief] ?? 0) !== 0 && (state[UNIT_AGE + chief] ?? 0) >= 12) return false;
  if (input.kFlag.value || (input.aShort[0]?.[11] ?? 0) <= 0 || input.fByte >= 50 ||
      input.uByte !== 0 || input.bField28 < 50) return false;
  for (scratch.v = 1; scratch.v <= 50; scratch.v += 1) {
    if ((state[UNIT_HP + scratch.v] ?? 0) > 0 && (state[UNIT_AGE + scratch.v] ?? 0) >= 12) {
      input.kFlag.value = true;
      input.onPrompt(18, scratch.v, scratch.v);
      return true;
    }
  }
  return false;
}
