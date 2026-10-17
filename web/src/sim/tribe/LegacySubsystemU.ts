import { UNIT_AGE, UNIT_HP } from "../../core/DenseLayout";
/**
 * Exact `private boolean u()` (#419), bytecode/b-javap.txt line 43246,
 * offsets 0..289 -- `b.i()`'s mission-4 script (offset 417, only when
 * `f.q == 4`; `v()` runs otherwise). `true` ends `b.i()` for this tick.
 * Nothing happens unless team 0's chief (`aShort[0][17]`) is alive and
 * grown (1414 >= 12).
 *
 *  - 44..121: once the vision bit `f.a[1][0][67] & 256` is seen, R:B bit 6
 *    clear and K:B >= 50: `b(chief, 0, 1)`, `f.b(51)`, R:B |= 64, true.
 *  - 122..287: while `0 < f:B < 3` and `f.c >= 3000 + 7000 * f:B` (and
 *    K:B >= 50): `c(false)` picks the best adults into `e[1..3]`;
 *    `f.p[1..4] = e[N][0]`, falling back to `e[0][0]` (the chief) for an
 *    empty slot; `f.b(f:B == 1 ? 53 : 54)`; `f:B += 50`; true.
 *
 * N:I (#38) is the loop counter and is left at 4, as in the original.
 */
export type LegacySubsystemUInput = {
  readonly state: Int8Array;
  /** b.a:[[S] (#63). */
  readonly aShort: readonly Int16Array[];
  /** f.a:[[[I] -- the vision bitmap, `mainArrays.aInt`. */
  readonly aInt: readonly (readonly Int32Array[])[];
  /** b.e:[[B] (#165), 4 x 8. */
  readonly eRows: readonly Int8Array[];
  /** f.p:[B] -- `auxiliaryScratch`. */
  readonly fP: Int8Array;
  /** f.c:I. */
  readonly frame: number;
  /** b.K:B (#28). */
  readonly bField28: number;
  /** b.R:B (#48), b.f:B (#167), b.N:I (#38). */
  readonly fields: { R: number; f: number; N: number };
  /** private void b(int,int,int) (#342). */
  readonly onAuxiliary: (first: number, second: number, third: number) => void;
  /** f.b(int) (#343) -- the scene/script step. */
  readonly onScene: (value: number) => void;
  /** private void c(boolean) (#361). */
  readonly onPickAdults: (flag: boolean) => void;
};

const toByte = (value: number) => ((value & 0xff) ^ 0x80) - 0x80;

export function stepLegacySubsystemU(input: LegacySubsystemUInput): boolean {
  const { state, fields } = input;
  const chief = input.aShort[0]?.[17] ?? 0;
  if ((state[UNIT_HP + chief] ?? 0) <= 0 || (state[UNIT_AGE + chief] ?? 0) < 12) return false;

  if (((input.aInt[1]?.[0]?.[67] ?? 0) & 256) !== 0 && (fields.R & 64) === 0 && input.bField28 >= 50) {
    input.onAuxiliary(chief, 0, 1);
    input.onScene(51);
    fields.R = toByte(fields.R | 64);
    return true;
  }

  if (fields.f <= 0 || fields.f >= 3 || input.frame < 3000 + fields.f * 7000 || input.bField28 < 50) return false;
  input.onPickAdults(false);
  for (fields.N = 0; fields.N < 4; fields.N += 1) {
    const pick = input.eRows[fields.N]?.[0] ?? 0;
    input.fP[fields.N + 1] = pick !== 0 ? pick : (input.eRows[0]?.[0] ?? 0);
  }
  input.onScene(fields.f === 1 ? 53 : 54);
  fields.f = toByte(fields.f + 50);
  return true;
}
