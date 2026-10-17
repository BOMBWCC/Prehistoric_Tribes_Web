import { UNIT_NEXT_WORKER } from "../../core/DenseLayout";
/**
 * Exact `private void c(int, int)` (#362, bytecode/b-javap.txt lines
 * 22841..22986, offsets 0..245).
 *
 * **RETRACTED (2026-09-07)** -- the 2026-08-31 correction above was right
 * that the old body's arithmetic was wrong, but wrong that the method
 * throws on its very first loop iteration. The `saload` at offset 60 reads
 * class b's own `b:[S]` (#132) -- but that field is NOT permanently null:
 * it is aliased from `f.b:[S]` (#245) in `b.a(f)` (bytecode/b-javap.txt
 * line 550), and `f.b:[S]` is itself allocated as `new short[570]` by
 * `e.f()` (bytecode/e-javap.txt:1115) and is exactly the table this port
 * already decodes as `LegacyRuntimeState.saveOffsets`. So the whole method
 * runs to completion for real; it has been fully re-derived below by
 * tracing every `getfield`/array-access instruction, offsets 0..245.
 *
 * Field identities (all read directly off `b`'s own constant pool, each
 * confirmed to have exactly one occurrence of its name+descriptor pair
 * anywhere in `bytecode/b-javap.txt`, so none of these collide with a
 * same-letter twin of a different type):
 *  - `e:[[B` (#165) -- `auxiliaryRows`, `new byte[4][8]` (`f.g()` offset
 *    654..656; `LegacySubsystemArrays.eRows`).
 *  - `a:[B` (#61) -- the shared dense entity bank (`f.e:[B`, `dense`).
 *  - `b:[S` (#132) -- `f.b:[S` (#245), `saveOffsets` (570 entries).
 *  - `b:[B` (#130) -- `f.a:[B` (#137 in `f`'s own pool), `packedBytes`.
 *  - `a:[S` (#66) -- `f.a:[S` (#138 in `f`'s own pool), `packedOffsets`.
 *  - `a:[[S` (#63) -- `f.a:[[S` (#131 in `f`'s own pool), `new short[2][26]`,
 *    `mainArrays.aShort` (`shortRows` in this port's existing vocabulary).
 *  - `H:B` (#22) -- `LegacyAuxiliaryQueueState.H`, already modelled by
 *    `LegacyAuxiliaryQueue.ts` (only ever written by `refreshLegacyAuxiliaryTag`,
 *    read here).
 *  - `N:I` (#38) -- a pure loop counter in this method (reset to 1 at
 *    offset 10..14, always ends at 8 when the loop exits at offset 15..21);
 *    it is a persistent instance field elsewhere (`LegacyAuxiliaryQueueState.N`,
 *    used by `selectLegacyAuxiliaryCandidates`), but nothing reads its value
 *    after THIS method returns, so it stays a local variable here rather
 *    than threading it through the shared state object.
 *
 * Full control flow:
 *
 *   eRows[row][0] = (byte) value;                          // offset 0..9
 *   for (N = 1; N < 8; N++) {                               // offset 10..21
 *     cat = packedBytes[packedOffsets[186] + N];             // offset 24..64 (partial)
 *     idx = saveOffsets[cat] + value;
 *     eRows[row][N] = (byte) dense[idx];
 *     if (cat === 29)      V = packedBytes[packedOffsets[188] + row];
 *     else if (cat === 46) V = row + 1;
 *     else                 V = packedBytes[packedOffsets[187] + N];
 *     dense[idx] = (byte) V;                                 // offset 65..183
 *   }
 *   if (value === shortRows[0][17] && H !== 0) return;       // offset 197..216
 *   dense[4545 + value] = dense[8994];                        // offset 217..234
 *   dense[8994] = (byte) value;                                // offset 235..244
 *
 * `idx` is recomputed independently for the read and the write (the real
 * bytecode issues two separate `getfield`/array-access chains for the same
 * subexpression, not a cached local) -- both derivations were traced
 * separately here and agree.
 */
export type LegacyAuxiliaryCopyInput = {
  readonly auxiliaryRows: Int8Array[];
  /** b.a:[B (#61) / f.e:[B -- the shared dense entity bank. */
  readonly dense: Int8Array;
  /** b.b:[B (#130) / f.a:[B -- packedBytes. */
  readonly packedBytes: Int8Array;
  /** b.a:[S (#66) / f.a:[S -- packedOffsets. */
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132), alias of f.b:[S (#245) -- saveOffsets, 570 entries. */
  readonly saveOffsets: Int16Array;
  /** b.a:[[S (#63) / f.a:[[S -- mainArrays.aShort, new short[2][26]. */
  readonly shortRows: readonly Int16Array[];
  /** b.H:B (#22) -- LegacyAuxiliaryQueueState.H. */
  readonly H: number;
};

export function copyLegacyAuxiliary(
  input: LegacyAuxiliaryCopyInput,
  value: number,
  row: number,
): void {
  const { auxiliaryRows, dense, packedBytes, packedOffsets, saveOffsets, shortRows, H } = input;

  auxiliaryRows[row][0] = toByte(value);

  for (let n = 1; n < 8; n += 1) {
    const cat = packedBytes[(packedOffsets[186] ?? 0) + n] ?? 0;
    const idx = (saveOffsets[cat] ?? 0) + value;
    auxiliaryRows[row][n] = toByte(dense[idx] ?? 0);

    let v: number;
    if (cat === 29) {
      v = packedBytes[(packedOffsets[188] ?? 0) + row] ?? 0;
    } else if (cat === 46) {
      v = row + 1;
    } else {
      v = packedBytes[(packedOffsets[187] ?? 0) + n] ?? 0;
    }
    dense[idx] = toByte(v);
  }

  if (value === (shortRows[0]?.[17] ?? 0) && H !== 0) return;

  dense[UNIT_NEXT_WORKER + value] = dense[8994] ?? 0;
  dense[8994] = toByte(value);
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
