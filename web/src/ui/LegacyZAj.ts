import { UNIT_HP } from "../core/DenseLayout";
/**
 * Direct translation of `private void aj()` (bytecode/f-javap.txt offsets
 * 0..55, line 23466), NOT the unrelated UPPERCASE `f.aJ()` (constant-pool
 * #491, already ported as `stepLegacyAj` in `LegacyStateMachine.ts`) --
 * a case-sensitive collision confirmed via direct bytecode read (different
 * constant-pool indices, #511 vs #491). This one is `af()`'s own
 * `r[as]===13` entry point: reset the selection cursor and scan `l:B`
 * forward to the next in-bounds row.
 *
 * BOUNDS FACT (2026-09-03, part of the array-bounds-loop-terminator sweep
 * that started with `1d926c8`): `l` is `f`'s own `l:B` field (constant-pool
 * #337, confirmed `byte`, not the unrelated `int l` field at #? -- see
 * `bytecode/f-javap.txt:23466`'s raw `aload_0; ...; getfield #337 // Field
 * l:B` reads). The loop's own increment is `l=(byte)(l+1)` (`i2b` right
 * after `iadd`, offsets 36..47) -- real Java wraps `l` through the full
 * signed-byte cycle (0..127, -128..-1, back to 0) every 256 iterations,
 * NOT an unbounded int walk. Because the read is `e[1919+l]` (base offset
 * 1919, so the effective index only ranges 1791..2046 even at `l`'s most
 * negative), and `f.e`/`dense` is allocated `new byte[9983]` (see
 * `EntityBank.ts`'s `F_E_LENGTH`), that index range never reaches `e`'s
 * real bounds -- this loop's original termination is genuinely BY VALUE
 * (find a positive `dense[1919+l]` within the 256-value cycle), never by
 * an implicit `ArrayIndexOutOfBoundsException`. This is the "opposite fix"
 * case the sweep's task description warned about: the port previously
 * incremented `frameLayoutL` as a plain unbounded number, so once it
 * walked past byte range (and eventually past `dense`'s real length) the
 * `?? 0` fallback made `0 <= 0` true forever -- an infinite spin with the
 * same "no exception, no console output" signature as `composeLegacyC`'s
 * bug, but the fix here is byte-wraparound truncation (`toJavaByte`), NOT
 * a `checkArrayIndex`-style throw -- there is no bounds exception to
 * reproduce at this specific site.
 */
export type LegacyZAjLowerState = {
  entityFocusFlag: boolean;
  as: number;
  frameLayoutAX: number;
  kByte: number;
  frameLayoutL: number;
  pendingP: boolean;
  dense: Int8Array;
};

export function stepLegacyZAj(state: LegacyZAjLowerState): void {
  state.entityFocusFlag = true;
  state.as = 0;
  state.frameLayoutAX = 0;
  state.kByte = 0;
  while ((state.dense[UNIT_HP + state.frameLayoutL] ?? 0) <= 0) {
    state.frameLayoutL = toJavaByte(state.frameLayoutL + 1);
  }
  state.pendingP = true;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
