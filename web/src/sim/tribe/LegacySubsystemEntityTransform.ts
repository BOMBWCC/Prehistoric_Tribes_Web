import { calculateLegacyEntityM } from "../units/LegacyEntityMCalculation";
import { BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK, UNIT_AGE, UNIT_HELD_ITEM, UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
import { T_ITEM_CLASS } from "../../core/DataTables";

/**
 * Class b's entity-transform cluster: `private void e(int,int,int)` (#379,
 * bytecode/b-javap.txt:50348..50468), `private void c(int,int,int,int)`
 * (#355, :50186..50348), and `private void a(int,int,boolean)` (#273,
 * :5742..5985) -- the entry point, `c(IIII)` calling `e(III)`.
 *
 * **RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07)**: this
 * whole cluster used to be confirmed a 100%-unconditional guaranteed throw
 * on every call, on the premise that `e(int,int,int)` unconditionally
 * dereferences `b:[S]` (#132) and that field is "permanently null". It is
 * not -- `e.f()` allocates it (`new short[570]`) and `b.a(f)` copies it in
 * (bytecode/b-javap.txt:550); it is this port's `saveOffsets`, already
 * live and correct throughout the rest of the codebase (see e.g.
 * `LegacySpiralPlacementGate.ts`'s own retraction of the same premise).
 * All three methods are ordinary field arithmetic once that premise is
 * dropped -- zero unreached instructions, confirmed by tracing every
 * offset against the raw bytecode.
 *
 * Table identities (constant-pool indices are class b's own, confirmed via
 * `grep -n "#N " bytecode/b-javap.txt` against each getfield's own inline
 * comment):
 *  - `a:[B]`(#61) = `dense`, `b:[[B]`(#129) = `gridC`, `b:[B]`(#130) =
 *    `packedBytes`, `a:[S]`(#66) = `packedOffsets`, `b:[S]`(#132) =
 *    `saveOffsets`, `v:I`(#225) = the ambient entity `id`, `u:I`(#222) =
 *    `team` (`game.bTeam`), `f.q:B`(#211, via `a:Lf;`) = `fQ`
 *    (`game.mission`) -- all already-established names elsewhere in this
 *    port, reused here rather than renamed.
 *  - `k:[B]`(#196) = `game.subsystemKBytes` (`new byte[4]`, already
 *    tracked). `e(III)` is this array's ONLY writer anywhere in class b
 *    (confirmed: the sole `putfield`/`bastore` sites for #196 outside this
 *    cluster are all `baload` reads).
 *  - `f.a:[[[I]` (#72 via `a:Lf;`) = `mainArrays.aInt`, the SAME
 *    2-layer/3-row/96-col vision bitmap `legacyOccupancyClass`/
 *    `LegacyCellCompatibilityCheck.ts` already read (`layers[layer][x>>5][y]`,
 *    bit `x&31`) -- `c(IIII)` is the only writer-adjacent reader of layer 1
 *    specifically (layer 0 is the same bit `LegacyCellCompatibilityCheck`
 *    already consults).
 *  - `k:B`(#197, singular byte, a DIFFERENT field from `k:[B]`#196 despite
 *    the shared name) and `l:B`(#199) are genuine cross-method persistent
 *    scalars, NOT locals:
 *     - `k:B`(#197) is set once here (`= k[0]`, offset 43) and read 4 more
 *       times within THIS method, but is also read/written twice more
 *       inside `private byte a()` (#276, b-javap.txt:50561/50670,
 *       `stepLegacySubsystemEntityTransformA` below). Modeled as
 *       `LegacySubsystemArrays.bField197`.
 *     - `l:B`(#199) is set here (`= a()`'s result, offset 51) and read by
 *       TWO already-ported real callers: `g(int)` (`LegacyEntityGPrefix.ts`,
 *       offsets 204..312, its own `readL` callback) and `t()`
 *       (`LegacyEntityTargetStep.ts`, offset 111..115, its own
 *       `onPositionProbe` return value) -- confirmed via
 *       `grep -n "#199 " bytecode/b-javap.txt`. Modeled as
 *       `LegacySubsystemArrays.bField199` and returned directly from
 *       `stepLegacySubsystemEntityTransform` for callers that want it.
 *  - `m:B`(#202) = `game.subsystemM`, already established (see
 *    `LegacySubsystemEntityMoveGate.ts`).
 *
 * `private byte a()` (#276, bytecode/b-javap.txt:50468+) is ported too,
 * as `stepLegacySubsystemEntityTransformA` (2026-09-14); the old note that
 * it stayed an `onComputeL` callback was stale (corrected 2026-09-27).
 */

export type LegacySubsystemEntityTransformArrays = {
  readonly dense: Int8Array;
  readonly gridC: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b:[S] (#132), this port's saveOffsets -- the dense-stride table. */
  readonly saveOffsets: Int16Array;
  /** f.a:[[[I] (#72 via a:Lf;) -- mainArrays.aInt, the 2-layer vision bitmap. */
  readonly visibilityBits: readonly (readonly Int32Array[])[];
  /** k:[B] (#196), game.subsystemKBytes -- e(III)'s own scratch array. */
  readonly k: Int8Array;
};

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function idiv(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new RangeError("stepLegacySubsystemEntityTransformE: idiv by zero (bytecode/b-javap.txt:50415)");
  }
  return Math.trunc(numerator / denominator);
}

/**
 * `private void e(int, int, int)` (#379), offsets 0..173. Its only callers
 * are the 4 call sites inside `c(int,int,int,int)` below (confirmed via
 * `grep -n "#379 " bytecode/b-javap.txt` across the whole class) -- kept
 * as a plain internal function rather than a callback since it has no
 * caller outside this cluster.
 *
 *   k[0] = (byte) p2;
 *   k[2] = (byte)(p1 * packedBytes[po[90]+p2] + packedBytes[po[90]+7+p2]);
 *   k[1] = dense[ saveOffsets[ packedBytes[po[91]+p2] ] + k[2] ];
 *   if (packedBytes[po[92]+p2] < 127) {
 *     adjust = (k[0]===1 || k[0]===2) ? 1 : 0;
 *     k[3] = (byte)( ((k[2]-adjust) / packedBytes[po[92]+p2]) + p3) & 1 );
 *   } else {
 *     k[3] = 0;
 *   }
 *
 * No local exception table (confirmed -- neither this method, `c(IIII)`,
 * nor `a(int,int,boolean)` has one), so the `idiv` above genuinely throws
 * on a zero divisor rather than silently becoming `?? 0`, matching Java's
 * `ArithmeticException` for `idiv`.
 */
function stepLegacySubsystemEntityTransformE(
  arrays: LegacySubsystemEntityTransformArrays,
  p1: number,
  p2: number,
  p3: number,
): void {
  const { dense, packedBytes, packedOffsets, saveOffsets, k } = arrays;

  k[0] = toByte(p2);

  const factor = packedBytes[(packedOffsets[90] ?? 0) + p2] ?? 0;
  const addend = packedBytes[(packedOffsets[90] ?? 0) + 7 + p2] ?? 0;
  k[2] = toByte(p1 * factor + addend);

  const rowSelector = packedBytes[(packedOffsets[91] ?? 0) + p2] ?? 0;
  k[1] = toByte(dense[(saveOffsets[rowSelector] ?? 0) + k[2]] ?? 0);

  const divisor = packedBytes[(packedOffsets[92] ?? 0) + p2] ?? 0;
  if (divisor < 127) {
    const adjust = k[0] === 1 || k[0] === 2 ? 1 : 0;
    k[3] = toByte((idiv(k[2] - adjust, divisor) + p3) & 1);
  } else {
    k[3] = 0;
  }
}

/**
 * `private void c(int, int, int, int)` (#355), offsets 0..261.
 * `a(int,int,boolean)`'s only caller, always as `c(x, y, team, 0)`.
 *
 *   cell = gridC[y][x];
 *   if (arg4 === 0) cell = dense[4747+id];
 *
 *   if (arg3 === 0 && visionBit(layer=0, x, y) === 0) {
 *     e(0, 0, arg3);
 *   } else {
 *     for (af = 0; af < 7; af++) {
 *       if (cell < packedBytes[po[89]+af]) continue;
 *       if (cell > packedBytes[po[89]+7+af]) continue;
 *       if (arg3 === 0 && af === 1 && visionBit(layer=1, x, y) === 0) {
 *         e(0, 0, arg3);
 *       } else {
 *         e(cell, af, arg3);
 *       }
 *       break;
 *     }
 *   }
 *
 *   // shared tail, offset 191..261, ALWAYS runs regardless of the above.
 *   if (k[0] === 1 || k[0] === 2) {
 *     threshold = dense[ saveOffsets[ packedBytes[po[78]+k[0]] ] + k[2] ];
 *     if (threshold <= 0) e(-126, 6, arg3);
 *   }
 */
export function stepLegacySubsystemEntityTransformC(
  arrays: LegacySubsystemEntityTransformArrays,
  id: number,
  x: number,
  y: number,
  arg3: number,
  arg4: number,
): void {
  const { dense, gridC, packedBytes, packedOffsets, saveOffsets, visibilityBits, k } = arrays;

  let cell = gridC[y]?.[x] ?? 0;
  if (arg4 === 0) cell = dense[UNIT_WORK_TARGET + id] ?? 0;

  const visionBit = (layer: number): number => {
    const packed = visibilityBits[layer]?.[x >> 5]?.[y] ?? 0;
    return (packed >> (x & 31)) & 1;
  };

  if (arg3 === 0 && visionBit(0) === 0) {
    stepLegacySubsystemEntityTransformE(arrays, 0, 0, arg3);
  } else {
    for (let af = 0; af < 7; af += 1) {
      const low = packedBytes[(packedOffsets[89] ?? 0) + af] ?? 0;
      if (cell < low) continue;
      const high = packedBytes[(packedOffsets[89] ?? 0) + 7 + af] ?? 0;
      if (cell > high) continue;

      if (arg3 === 0 && af === 1 && visionBit(1) === 0) {
        stepLegacySubsystemEntityTransformE(arrays, 0, 0, arg3);
      } else {
        stepLegacySubsystemEntityTransformE(arrays, cell, af, arg3);
      }
      break;
    }
  }

  // Shared tail, offset 191..261 -- always runs, regardless of which (if
  // any) branch above fired.
  if (k[0] === 1 || k[0] === 2) {
    const rowSelector = packedBytes[(packedOffsets[78] ?? 0) + k[0]] ?? 0;
    const threshold = dense[(saveOffsets[rowSelector] ?? 0) + k[2]] ?? 0;
    if (threshold <= 0) {
      stepLegacySubsystemEntityTransformE(arrays, -126, 6, arg3);
    }
  }
}

export type LegacySubsystemEntityTransformScratch = {
  /** b's own k:B (#197) -- see the module docblock. */
  bField197: number;
  /** b's own l:B (#199) -- see the module docblock. */
  bField199: number;
  /** m:B (#202), game.subsystemMByte. */
  mByte: number;
};

export type LegacySubsystemEntityTransformInput = LegacySubsystemEntityTransformArrays & {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly flag: boolean;
  readonly team: number;
  /** f.q:B (#211), game.mission. */
  readonly fQ: number;
  /** b.a:[[S (#63) -- f.a:[[S; a() reads row 0 index 17. */
  readonly shortRows: readonly Int16Array[];
  readonly scratch: LegacySubsystemEntityTransformScratch;
};

/**
 * `private byte a()` (#276), bytecode/b-javap.txt line 50468, offsets
 * 0..405; only caller a(int,int,boolean). Returns `l:B` and may overwrite
 * `k:B` (#197), which the m calculation reads afterwards.
 *
 *  - `k[3] != 0` -> -1.
 *  - `k[0] == 2` (a record target, `k[2]` its id): 11 when `k[1] != 10` and
 *    `1414[v] < 12`; 13 for `k[1] == 2` at an unbuilt record with `9237 > 1`
 *    and a unit not of type 111; a built record (8627 1 or 2) sets `k:B = 8`
 *    -> -1; then `k[1] == 1 && t77[6565] != -1` -> 6, `k[1] == 5 &&
 *    t77[6565] < 0` -> 7, `k[1] == 10 && 1414 >= 11` -> 9, `k[1] == 3` and
 *    `v != a[0][17]` -> 10; otherwise a foreign owner (8810 > 0, != v) sets
 *    `k:B = 7` -> -1.
 *  - `k[0] == 3 && k[1] == 5 && 6565 != 2` -> 8.
 *  - Otherwise -1.
 *
 * CORRECTED 2026-09-14: this was left unported with `l` defaulting to 0, so
 * g(int) never saw `l < 0` and every order fell through to h(int) -- e.g. a
 * villager sent to a tree walked there and never started gathering.
 */
export function stepLegacySubsystemEntityTransformA(
  input: Pick<LegacySubsystemEntityTransformInput, "dense" | "packedBytes" | "packedOffsets" | "k" | "id" | "shortRows" | "scratch">,
): number {
  const { dense, k, id: v, scratch } = input;
  const t77 = (index: number) => input.packedBytes[(input.packedOffsets[T_ITEM_CLASS] ?? 0) + index] ?? 0;
  const k1 = k[1] ?? 0;
  const k2 = k[2] ?? 0;
  if ((k[3] ?? 0) !== 0) return -1;
  if ((k[0] ?? 0) === 2) {
    if (k1 !== 10 && (dense[UNIT_AGE + v] ?? 0) < 12) return 11;
    if (k1 === 2 && (dense[BLD_WORK + k2] ?? 0) === 0 && (dense[BLD_PLANNED_KIND + k2] ?? 0) > 1 && (dense[UNIT_TYPE + v] ?? 0) !== 111) return 13;
    const stage = dense[BLD_WORK + k2] ?? 0;
    if (stage === 1 || stage === 2) {
      scratch.bField197 = 8;
      return -1;
    }
    if (k1 === 1 && t77(dense[UNIT_HELD_ITEM + v] ?? 0) !== -1) return 6;
    if (k1 === 5 && t77(dense[UNIT_HELD_ITEM + v] ?? 0) < 0) return 7;
    if (k1 === 10 && (dense[UNIT_AGE + v] ?? 0) >= 11) return 9;
    if (k1 === 3 && v !== (input.shortRows[0]?.[17] ?? 0)) return 10;
    if ((dense[BLD_OWNER + k2] ?? 0) > 0 && (dense[BLD_OWNER + k2] ?? 0) !== v) scratch.bField197 = 7;
    return -1;
  }
  if ((k[0] ?? 0) === 3 && k1 === 5 && (dense[UNIT_HELD_ITEM + v] ?? 0) !== 2) return 8;
  return -1;
}

/**
 * `private void a(int, int, boolean)` (#273), offsets 0..429 -- the entry
 * point. Returns `l:B` (#199) directly for the two real callers that read
 * it right after calling this method (`g(int)`'s `readL`, `t()`'s
 * `onPositionProbe`); callers that discard the original's `void` result
 * (`d(int)`'s `onAssociate`, `stepLegacySubsystemBDecision`'s
 * `onEntityTransform`) simply ignore it.
 *
 *   if (flag) dense[4747+id] = gridC[y][x];
 *   c(x, y, team, 0);
 *   k:B (#197) = k[0];
 *   l:B (#199) = a();           // may rewrite k:B
 *   m:B (#202) = <offsets 54..429, LegacyEntityMCalculation.calculateLegacyEntityM>;
 */
export function stepLegacySubsystemEntityTransform(input: LegacySubsystemEntityTransformInput): number {
  const { dense, gridC, k, id, team, scratch } = input;

  if (input.flag) {
    dense[UNIT_WORK_TARGET + id] = gridC[input.y]?.[input.x] ?? 0;
  }

  stepLegacySubsystemEntityTransformC(input, id, input.x, input.y, team, 0);

  scratch.bField197 = k[0] ?? 0;
  const l = toByte(stepLegacySubsystemEntityTransformA(input));
  scratch.bField199 = l;

  const m = calculateLegacyEntityM({
    state: dense,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    entityId: id,
    k0: k[0] ?? 0,
    k1: k[1] ?? 0,
    k2: k[2] ?? 0,
    k3: k[3] ?? 0,
    currentK: scratch.bField197,
    flag: input.flag,
    fQ: input.fQ,
  });
  scratch.mByte = m;

  return l;
}
