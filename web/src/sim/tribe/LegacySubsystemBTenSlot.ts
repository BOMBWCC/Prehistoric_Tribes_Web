import { BLD_PLANNED_KIND, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND } from "../../core/DenseLayout";
/**
 * Class b's "ten-slot table" cluster -- four methods over `f:[[B]` (#168)
 * and `c:[[B]` (#143).
 *
 * **RETRACTED (2026-09-07)** -- this file previously consisted of four
 * `throw` statements, on the finding that both fields are "confirmed
 * permanently null: exhaustively grepped every reference in
 * `bytecode/b-javap.txt` and found ZERO putfield sites anywhere in the
 * class". The greps were real but the conclusion does not follow: both
 * arrays are allocated from OUTSIDE class b, by `f.g()` --
 * `b.f:[[B] = new byte[2][10]` at bytecode/f-javap.txt offset 664..668 and
 * `b.c:[[B] = new byte[6][10]` at offset 590..594. (`f.g()` allocates most
 * of class b's arrays; symmetrically, class `e` allocates most of class
 * f's.) This port has in fact had both tables all along, correctly shaped,
 * as `LegacySubsystemArrays.fRows` (2x10) and `.cRows` (6x10) -- they were
 * simply never read, because every entry point here threw first. All four
 * methods below are now ported from the bytecode for real. See
 * docs/unknowns.md's 2026-09-07 entry for the full 11-field sweep.
 *
 * The file was named `LegacySubsystemBTenSlotThrows.ts`; the "Throws" is
 * gone from the name because the premise is gone.
 */

export type LegacySubsystemBTenSlotCallbacks = {
  /**
   * b's `private void k(int)` (#397) -- already ported and live as
   * `LegacyRuntimeState.subsystemK`. Reached only from `d(int,int)` below,
   * which is why `subsystemK` was previously (wrongly) marked unreachable.
   */
  readonly onK?: (id: number) => void;
  /**
   * b's own `private void d(int,int)` (#367) -- `releaseLegacySubsystemBEntitySlot`
   * in this same file; kept as a callback so the caller controls recursion
   * into the shared runtime state rather than this module importing it.
   */
  readonly onD?: (entityIndex: number, argument: number) => void;
};

/**
 * `final boolean a(byte)` (#475), bytecode/b-javap.txt offsets 0..80.
 *
 *   for (aK = 0; aK < 10; aK++)
 *     if (f[0][aK] < 1) { f[0][aK] = id; f[1][aK] = 0; dense[9298+id] = 0; return true; }
 *   return false;
 */
export function allocateLegacySubsystemBTenSlot(
  fRows: readonly Int8Array[],
  dense: Int8Array,
  id: number,
): boolean {
  for (let aK = 0; aK < 10; aK += 1) {
    if ((fRows[0]?.[aK] ?? 0) >= 1) continue;
    if (fRows[0]) fRows[0][aK] = id;
    if (fRows[1]) fRows[1][aK] = 0;
    dense[9298 + id] = 0;
    return true;
  }
  return false;
}

/**
 * `final void c(int)` (#563), offsets 0..54. Clears EVERY matching slot --
 * the loop has no early exit after a hit (offset 41 falls into the same
 * increment the non-matching path uses).
 */
export function releaseLegacySubsystemBTenSlot(fRows: readonly Int8Array[], id: number): void {
  for (let aK = 0; aK < 10; aK += 1) {
    if ((fRows[0]?.[aK] ?? 0) !== id) continue;
    if (fRows[0]) fRows[0][aK] = 0;
  }
}

/**
 * `final void a(int)` (#476), offsets 0..91.
 *
 *   if (dense[9237+id] < 1) return;
 *   for (af = 0; af < 10; af++) {
 *     if (c[4][af] === 0) continue;
 *     if (c[5][af] !== id) continue;
 *     d(c[0][af], -1);
 *     return;
 *   }
 */
export function releaseLegacySubsystemBTenSlotEntity(
  cRows: readonly Int8Array[],
  dense: Int8Array,
  id: number,
  callbacks: LegacySubsystemBTenSlotCallbacks = {},
): void {
  if ((dense[BLD_PLANNED_KIND + id] ?? 0) < 1) return;
  for (let af = 0; af < 10; af += 1) {
    if ((cRows[4]?.[af] ?? 0) === 0) continue;
    if ((cRows[5]?.[af] ?? 0) !== id) continue;
    callbacks.onD?.(cRows[0]?.[af] ?? 0, -1);
    return;
  }
}

/**
 * `private void d(int,int)` (#367), offsets 0..224.
 *
 *   ae = ((dense[8282+entityIndex] & 127) >> 1) - 1;
 *   if (ae < 0) return;                                        // offset 21..27
 *   if (argument > 0 && c[4][ae] !== 3) return;                 // offset 28..47
 *   c[4][ae] = 0;                                               // offset 48..59
 *   k( c[(dense[8282+entityIndex] + 1) & 1][ae] );               // offset 60..87
 *   if (argument < 0) k(entityIndex);                            // offset 90..98
 *   if (dense[3535+entityIndex] === 15) dense[3636+entityIndex] = 0;
 *   dense[8282 + c[0][ae]] &= 128;                               // offset 125..151
 *   dense[8282 + c[1][ae]] &= 128;                               // offset 152..178
 *   if (dense[9237 + c[5][ae]] < 3) dense[9237 + c[5][ae]] = 0;  // offset 179..223
 *
 * The `argument` parameter is real and load-bearing (it gates both the
 * offset-28 early return and the offset-90 second `k()` call); the previous
 * guard-then-throw version dropped it entirely.
 */
export function releaseLegacySubsystemBEntitySlot(
  cRows: readonly Int8Array[],
  dense: Int8Array,
  entityIndex: number,
  argument: number,
  callbacks: LegacySubsystemBTenSlotCallbacks = {},
): void {
  const ae = (((dense[8282 + entityIndex] ?? 0) & 127) >> 1) - 1;
  if (ae < 0) return;
  if (argument > 0 && (cRows[4]?.[ae] ?? 0) !== 3) return;
  if (cRows[4]) cRows[4][ae] = 0;

  const parity = ((dense[8282 + entityIndex] ?? 0) + 1) & 1;
  callbacks.onK?.(cRows[parity]?.[ae] ?? 0);
  if (argument < 0) callbacks.onK?.(entityIndex);

  if ((dense[UNIT_CARRY_KIND + entityIndex] ?? 0) === 15) dense[UNIT_CARRY_AMOUNT + entityIndex] = 0;

  const slot0 = 8282 + (cRows[0]?.[ae] ?? 0);
  dense[slot0] = (dense[slot0] ?? 0) & 128;
  const slot1 = 8282 + (cRows[1]?.[ae] ?? 0);
  dense[slot1] = (dense[slot1] ?? 0) & 128;

  const owner = 9237 + (cRows[5]?.[ae] ?? 0);
  if ((dense[owner] ?? 0) < 3) dense[owner] = 0;
}
