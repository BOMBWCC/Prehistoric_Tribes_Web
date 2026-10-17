import { UNIT_AGE, UNIT_HP, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
/**
 * Raw port of private b.b(int,int,int,int) (#346, bytecode/b-javap.txt line
 * 22131, offsets 0..436): the mission-script step for opcode 1 (from H(), a
 * unit sighting another tribe) and opcode 7 (from v()). Nothing happens
 * unless `(x, y)` lies in the step's rectangle `t289[t290[q] + 4f ..]` and
 * (q != 3) the chief is a living adult. Then:
 *  - q == 4 && f == 1 (175..253): `c(false)` picks the best adults and
 *    `f.p[1..4] = e[N][0]`, falling back to the chief;
 *  - otherwise (256..376): `b(first, second, 1)`, the second unit's target
 *    becomes its own cell, `O:I = 0`, and `a(q==2 ? 9 : 8, 25, ...)` gathers
 *    the nearby adults into `f.p[6..]`;
 *  - both (377..433): scene `t286[t288[q] + f]`, `f += 50`.
 * `N:I` (#38) holds the rectangle base first, then the f.p loop counter.
 *
 * RETRACTED 2026-09-23: the q == 4 branch stopped after `c(false)` on the
 * premise that it always throws; it does not, and the branch goes on to play
 * the scene and advance the step like the other one.
 */
export type LegacyAuxiliaryPlacementInput = {
  readonly q: number;
  readonly bFByte: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly dense: Int8Array;
  readonly shortRows: Int16Array[];
  /** b.c(boolean) (#361). */
  readonly onAuxiliaryTagRefresh?: (flag: boolean) => void;
  /** b.e:[[B] (#165) and f.p:[B]. */
  readonly eRows: readonly Int8Array[];
  readonly fP: Int8Array;
  /** b.N:I (#38), b.O:I (#41). */
  readonly fields: { N: number; O: number };
  /** b.b(int,int,int) (#342), called as `b(first, second, 1)`. */
  readonly onNestedPlacement?: (first: number, second: number, third: number) => void;
  /** final boolean a(int,int,int,int) (#270) -- LegacySpiralPlacementGate; the result is popped. */
  readonly onFootprintCheck?: (mode: number, span: number, x: number, y: number) => boolean;
  /** f.b(int) (#343). */
  readonly onRecordFinalize?: (value: number) => void;
  /** Offset 424..433: `f:B = (byte)(f:B + 50)` -- this is what retires a tutorial step. */
  readonly onStepAdvance?: (next: number) => void;
};

export function placeLegacyAuxiliary(
  input: LegacyAuxiliaryPlacementInput,
  first: number,
  second: number,
  x: number,
  y: number,
): void {
  const { packedBytes, packedOffsets, dense, shortRows, fields } = input;
  fields.N = packedOffsets[289] + packedBytes[packedOffsets[290] + input.q] + input.bFByte * 4;
  const rectangleBase = fields.N;
  // CORRECTED 2026-09-21: the rectangle is tested against params 3 and 4
  // (`iload_3`/`iload 4` at offsets 41/54/70/85), not params 2 and 3 -- the
  // earlier signature shifted every argument one place left.
  if (
    x < packedBytes[rectangleBase] ||
    y < packedBytes[rectangleBase + 1] ||
    x > packedBytes[rectangleBase + 2] ||
    y > packedBytes[rectangleBase + 3]
  ) return;

  if (
    input.q !== 3 &&
    (dense[UNIT_HP + shortRows[0][17]] <= 0 || dense[UNIT_AGE + shortRows[0][17]] < 12)
  ) return;

  if (input.q === 4 && input.bFByte === 1) {
    // Offsets 175..253.
    input.onAuxiliaryTagRefresh?.(false);
    for (fields.N = 0; fields.N < 4; fields.N += 1) {
      const pick = input.eRows[fields.N]?.[0] ?? 0;
      input.fP[fields.N + 1] = pick !== 0 ? pick : (input.eRows[0]?.[0] ?? 0);
    }
  } else {
    // Offsets 256..299.
    input.onNestedPlacement?.(first, second, 1);
    dense[UNIT_TARGET_X + second] = dense[second];
    dense[UNIT_TARGET_Y + second] = dense[UNIT_Y + second];

    // Offsets 300..376. CORRECTED 2026-09-21: `a(IIII)` takes FOUR separate
    // arguments -- the literal 25 is its own (offset 324's `bipush 25` is
    // never added to anything; the `iadd` at 347 belongs to the array index).
    fields.O = 0;
    const mode = input.q === 2 ? 9 : 8;
    const coordinateIndex = input.q === 2 ? second : first;
    input.onFootprintCheck?.(mode, 25, dense[coordinateIndex], dense[UNIT_Y + coordinateIndex]);
  }

  // Offsets 377..433.
  input.onRecordFinalize?.(
    packedBytes[packedOffsets[286] + packedBytes[packedOffsets[288] + input.q] + input.bFByte],
  );
  input.onStepAdvance?.((((input.bFByte + 50) << 24) >> 24));
}
