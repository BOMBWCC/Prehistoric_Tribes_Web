/**
 * Direct port of private void a(byte, byte, int, int) (bytecode/b-javap.txt
 * offsets 0..1432), `b.w()`'s own `onAction` callback target (see
 * `LegacyEntityWUpdate.ts`).
 *
 * **RETRACTED (2026-09-04, restored 2026-09-07)** -- this file used to stop
 * at offset 225 with a deliberate null dereference of `b:[S]` (#132, this
 * port's `saveOffsets`), on the premise (already disproven elsewhere this
 * session) that the field is permanently null. It is a live 570-entry table.
 * The method runs to completion; every offset from 171 to the `return` at
 * 1416 is real, reachable code, traced instruction-by-instruction below.
 *
 * Gate (offsets 0..170): if `dense[5959+id] > 0`, return (a per-entity
 * cooldown/busy flag). Otherwise compute `aG = packedBytes[packedOffsets[77]
 * + dense[6565+id]]` (a "kind"-indexed byte, `dense[6565+id]` being the same
 * `kind` field `LegacySecondaryCellChain.ts` reads), `aE = dense[3131+id] -
 * x`, `aF = dense[3232+id] - y` (`x`/`y` are the caller's current position),
 * and a "score" = `packedBytes[packedOffsets[53] + clamp(aF)*25 +
 * clamp(aE)] / 10` where `clamp(d) = (d<-12||d>12) ? 0 : 12+d` (the SAME
 * table-53 lookup `stepLegacySubsystemBBoolean` uses for its own "closest
 * candidate" scoring). If `score > entityB` (`b.B:I` #8, `entityBValue`),
 * return -- no observable effect.
 *
 * Everything past that (offsets 171..1416) is wrapped in one `try { }
 * catch (Exception) { dense[5959+id] = 0; }` local to this method (per the
 * exception table: ranges 0..16, 17..170 AND 171..1416 all target the same
 * handler at 1417). Two of the reads in that block reuse `aE`/`aF`
 * UNCLAMPED (unlike the score lookup above, which only ever uses the
 * clamped, always-in-range copies) -- for two entities far enough apart
 * this is a genuine out-of-bounds array read in the original JVM, and the
 * method's own local catch is exactly what swallows it. This port
 * reproduces that by throwing (not silently falling back to 0) at those two
 * sites so the same `dense[5959+id] = 0` reset happens; every integer
 * division in the method is likewise real (can throw on a zero divisor,
 * caught the same way) rather than guarded.
 *
 * Body (once past the gate):
 *  - `ax:I` (#126, RETRACTED-PREMISE site) = `saveOffsets[sectionOffsets[1]
 *    + abs(aF)*11 + abs(aE)]` -- the combined `saveOffsets[sectionOffsets[N]
 *    + q]` idiom, N=1 here (`b.ax()` uses N range 25..49 for a different N).
 *  - `dense[5959+id]` is immediately overwritten: `table159 =
 *    packedBytes[packedOffsets[159]+aG]`; new value = `ax<=table159 ? 1 :
 *    trunc(ax/table159)`. (`table159`/`aG` never change again this call, so
 *    this port computes each once and reuses it.)
 *  - `aA:I`(#76)/`aB:I`(#77)/`aC:I`(#78)/`aD:I`(#79)/`az:I`(#128) are all
 *    class fields in the original but this port treats them as locals: `aA`/
 *    `aB`/`az`/`ay` are unconditionally reset to 0 at offset 295..312 before
 *    any conditional use, and `aC`/`aD` are read ONLY inside the `aB>0`
 *    block (603..813) that is reached ONLY via the same two branches that
 *    also just finished writing `aC`/`aD` -- so no call ever observes a
 *    stale cross-call value of any of the five. (Checked against this
 *    session's "persistent scalar" trap explicitly: `ax:I`(#126)/`ay:I`
 *    (#127) do NOT get the same treatment -- see below.)
 *  - `dense[7878+id] = 9`, then IF `(packedBytes[packedOffsets[27] +
 *    dense[2828+id]] & 2) > 0`: pick `aB`/`aC`/`aD` from one of two
 *    sub-branches on `dense[4747+id]` vs 100 (each further gated by a
 *    `& 255` mask check on a `dense[9557|2929 + dense[4444+id]]` byte
 *    against 7); IF the resulting `aB > 0`: `dense[7878+id] = (byte)aB`,
 *    `az = dense[saveOffsets[aD]+dense[4444+id]] + trunc(packedBytes[
 *    packedOffsets[1]+aC]*22*dense[5959+id] / packedBytes[packedOffsets[15]
 *    +(aC&1)*9+aB])`, `aA` = the same shape with `aD+1`/`+8+aC`/`*16`.
 *  - `dense[5656+id] = (byte)trunc((aE*22+az+trunc(sign(aE)*dense[5959+id]/2))
 *    / dense[5959+id])`, `dense[5757+id]` the `aF`/`aA`/`*16` mirror.
 *  - `for (ay=0; ay<=dense[5959+id]; ay++)`: writes
 *    `f.h[ay][id]`/`f.i[ay][id]` (#185/#190 as seen from class b, the SAME
 *    runtime fields as `f.h:[[B]`(#308)/`f.i:[[B]`(#315) from class f's own
 *    pool -- this port's `secondaryCellHTable`/`secondaryCellITable`, a
 *    `[13][101]` pair `LegacySecondaryCellChain.ts` reads). **This falsifies
 *    that file's "PROVABLY ALWAYS ZERO... no bastore site exists anywhere"
 *    claim** (both docblocks are corrected alongside this file) -- the
 *    audit only grepped class f's own bytecode for #308/#315 and missed
 *    that class b writes the same fields via its `a:Lf;` back-reference
 *    (#60) under its own, different constant-pool indices (#185/#190) --
 *    the exact "package-visible field written from outside the class"
 *    pattern this session already hit once for `b:[S]`. `ax:I`(#126)/
 *    `ay:I`(#127) themselves ARE read elsewhere (the separate, still-
 *    unexamined `#298` gate method), so unlike aA/aB/aC/aD/az they are
 *    modeled as real shared fields (`LegacySubsystemArrays.bField126`/
 *    `bField127`), not locals, even though this method also resets `ay` to
 *    0 unconditionally at entry and only uses `ax` as a local within itself.
 *    `V = saveOffsets[sectionOffsets[3] + aG*8 + dense[606+id]]` doesn't
 *    depend on `ay`, so it's hoisted out of the loop.
 *    `h[ay][id] = (byte)(trunc((table159*ay*(ax-table159*ay))/V) + action -
 *    trunc(mode*ay/dense[5959+id]))` -- `action`/`mode` are this method's
 *    own params 3/4 (`iload_3`/`iload 4` at offsets 1106/1108), read here
 *    for the first and only time in the method; the RETRACTED docblock's
 *    claim that they're "never read anywhere in the reachable portion" was
 *    true only of the (wrongly) reachable-truncated offsets 0..225.
 *    `i[ay][id] = aG===2 ? (byte)(ay&1) : (byte)clampStatic(trunc(-4*((ax-
 *    2*table159*ay) - trunc(mode*V/ax)) / V) + 8, 0, 16)` (`clampStatic` is
 *    `private static int b(int,int,int)`, b-javap.txt:7562, a plain
 *    `v<lo?lo:(v>=hi?hi:v)` clamp with no other callers in this file).
 *  - After the loop: `dense[7676+id] = (byte)(packedBytes[packedOffsets[53]
 *    + (aF+12)*25 + (aE+12)] % 10)` -- the SECOND, UNCLAMPED use of table 53
 *    (see the out-of-bounds note above).
 *  - Unconditional tail: `dense[5858+id]=0`, `dense[5454+id]=0`,
 *    `dense[5555+id]=0`, `dense[5252+id]=x`, `dense[5353+id]=y`. (These are
 *    exactly the fields `LegacySecondaryCellChain.ts` reads as `local4`,
 *    `originColumn`-relative X, `hIndex`, and the Y computation's two
 *    terms -- this method is that chain's writer.)
 *
 * Net effect of the catch: any exception anywhere in this block (real
 * division-by-zero, real out-of-bounds table-53/saveOffsets reads, or
 * anything else) resets `dense[5959+id]` to 0 and returns, leaving whatever
 * was written before the throw in place -- exactly what the bytecode does.
 */

import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { ANIMAL_KIND, UNIT_DIRECTION, UNIT_HELD_ITEM, UNIT_MODE, UNIT_RECORD, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
import { T_ITEM_CLASS } from "../../core/DataTables";

export type LegacyEntityActionScoreGateInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132) via its f.b:[S] (#245) alias -- the "dense stride" table. */
  readonly saveOffsets: Int16Array;
  /** b.c:[S] (#142), 5 entries. */
  readonly sectionOffsets: Int16Array;
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly entityB: number;
  /** action/mode: this method's own params 3/4 (`iload_3`/`iload 4`), from `b.w()`'s onAction call sites. */
  readonly action: number;
  readonly mode: number;
  /**
   * f.h:[[B] (#308/b's #185) -- `secondaryCellHTable`, `[13][101]`, mutated
   * by this method. Ownership stays with the caller.
   */
  readonly hTable: Int8Array[];
  /** f.i:[[B] (#315/b's #190) -- `secondaryCellITable`, `[13][101]`. */
  readonly iTable: Int8Array[];
  /** b's own ax:I (#126) / ay:I (#127) -- shared scalars, see docblock above. */
  readonly bScalars: Pick<LegacySubsystemArrays, "bField126" | "bField127">;
};

function clamp(delta: number): number {
  return delta < -12 || delta > 12 ? 0 : 12 + delta;
}

function clampStatic(value: number, low: number, high: number): number {
  return value < low ? low : value >= high ? high : value;
}

function divTrunc(a: number, b: number): number {
  if (b === 0) throw new RangeError("b.a(byte,byte,int,int): integer division by zero");
  return Math.trunc(a / b);
}

function strictByte(bytes: Int8Array, index: number): number {
  if (index < 0 || index >= bytes.length) {
    throw new RangeError("b.a(byte,byte,int,int): packedBytes index out of range");
  }
  return bytes[index] ?? 0;
}

function strictShort(shorts: Int16Array, index: number): number {
  if (index < 0 || index >= shorts.length) {
    throw new RangeError("b.a(byte,byte,int,int): saveOffsets index out of range");
  }
  return shorts[index] ?? 0;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function stepLegacyEntityActionScoreGate(input: LegacyEntityActionScoreGateInput): void {
  const { dense, packedBytes, packedOffsets, saveOffsets, sectionOffsets, id } = input;
  if ((dense[5959 + id] ?? 0) > 0) return;

  const aG = packedBytes[(packedOffsets[T_ITEM_CLASS] ?? 0) + (dense[UNIT_HELD_ITEM + id] ?? 0)] ?? 0;
  const aE = (dense[UNIT_TARGET_X + id] ?? 0) - input.x;
  const aF = (dense[UNIT_TARGET_Y + id] ?? 0) - input.y;
  const tableIndex = clamp(aF) * 25 + clamp(aE);
  const score = Math.trunc((packedBytes[(packedOffsets[53] ?? 0) + tableIndex] ?? 0) / 10);
  if (score > input.entityB) return;

  try {
    const ax = strictShort(saveOffsets, (sectionOffsets[1] ?? 0) + Math.abs(aF) * 11 + Math.abs(aE));
    input.bScalars.bField126 = ax;
    const table159 = packedBytes[(packedOffsets[159] ?? 0) + aG] ?? 0;
    dense[5959 + id] = toByte(ax <= table159 ? 1 : divTrunc(ax, table159));
    const denseAim = dense[5959 + id] ?? 0;

    let aA = 0;
    let aB = 0;
    let aC = 0;
    let aD = 0;
    let az = 0;
    input.bScalars.bField127 = 0;
    dense[7878 + id] = 9;

    if (((packedBytes[(packedOffsets[27] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0) & 2) > 0) {
      const dense4444 = dense[UNIT_RECORD + id] ?? 0;
      if ((dense[UNIT_WORK_TARGET + id] ?? 0) > 100) {
        if (((dense[9557 + dense4444] ?? 0) & 255) <= 7) {
          aB = packedBytes[(packedOffsets[179] ?? 0) + (dense[ANIMAL_KIND + dense4444] ?? 0)] ?? 0;
          aC = dense[9491 + dense4444] ?? 0;
          aD = 101;
        }
      } else {
        if (((dense[UNIT_MODE + dense4444] ?? 0) & 255) <= 7) {
          aB = (dense[UNIT_SPEED + dense4444] ?? 0) - (dense[7777 + dense4444] ?? 0);
          aC = dense[UNIT_DIRECTION + dense4444] ?? 0;
          aD = 2;
        }
      }

      if (aB > 0) {
        dense[7878 + id] = toByte(aB);
        const divisor = packedBytes[(packedOffsets[15] ?? 0) + (aC & 1) * 9 + aB] ?? 0;
        az = (dense[(saveOffsets[aD] ?? 0) + dense4444] ?? 0) +
          divTrunc((packedBytes[(packedOffsets[1] ?? 0) + aC] ?? 0) * 22 * denseAim, divisor);
        aA = (dense[(saveOffsets[aD + 1] ?? 0) + dense4444] ?? 0) +
          divTrunc((packedBytes[(packedOffsets[1] ?? 0) + 8 + aC] ?? 0) * 16 * denseAim, divisor);
      }
    }

    dense[5656 + id] = toByte(divTrunc(aE * 22 + az + Math.trunc((aE > 0 ? 1 : -1) * denseAim / 2), denseAim));
    dense[5757 + id] = toByte(divTrunc(aF * 16 + aA + Math.trunc((aF > 0 ? 1 : -1) * denseAim / 2), denseAim));

    const dense606 = dense[UNIT_DIRECTION + id] ?? 0;
    const v = strictShort(saveOffsets, (sectionOffsets[3] ?? 0) + aG * 8 + dense606);

    for (let ay = 0; ay <= denseAim; ay += 1) {
      input.bScalars.bField127 = ay;
      const sum = table159 * ay * (ax - table159 * ay);
      input.hTable[ay][id] = toByte(divTrunc(sum, v) + input.action - divTrunc(input.mode * ay, denseAim));

      let iValue: number;
      if (aG === 2) {
        iValue = ay & 1;
      } else {
        const bigX = ax - 2 * table159 * ay;
        const bigY = divTrunc(input.mode * v, ax);
        const z = -4 * (bigX - bigY);
        iValue = clampStatic(divTrunc(z, v) + 8, 0, 16);
      }
      input.iTable[ay][id] = toByte(iValue);
    }

    dense[7676 + id] = toByte(strictByte(packedBytes, (packedOffsets[53] ?? 0) + (aF + 12) * 25 + (aE + 12)) % 10);

    dense[5858 + id] = 0;
    dense[5454 + id] = 0;
    dense[5555 + id] = 0;
    dense[5252 + id] = input.x;
    dense[5353 + id] = input.y;
  } catch {
    dense[5959 + id] = 0;
  }
}
