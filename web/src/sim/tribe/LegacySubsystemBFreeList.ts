import { BLD_KIND, BLD_OWNER, BLD_PLANNED_KIND } from "../../core/DenseLayout";
/**
 * Direct port of class b's `final boolean b(byte)` (bytecode/b-javap.txt
 * offsets 0..142), `LegacyZB2.ts`'s `onB` seam -- return value discarded by
 * the original (`pop`), called for its side effects.
 *
 * **RETRACTED (2026-09-07)**: this file previously consisted of a single
 * `throw`, on the finding that class b's own `byte[][] g` (#176) "has ZERO
 * putfield sites anywhere in the class (exhaustively grepped, 20+ read
 * sites, no write) -- always null". The grep was right and the conclusion
 * was wrong: `g:[[B]` is allocated from outside class b, by `f.g()`
 * (bytecode/f-javap.txt offset 678..682, `new byte[3][20]`), which is
 * exactly the shape this port already carries as
 * `LegacySubsystemArrays.gRows`. See docs/unknowns.md's 2026-09-07 entry.
 *
 *   for (aK = 0; aK < 20; aK++)
 *     if (g[0][aK] < 1) {
 *       g[0][aK] = id; g[1][aK] = 0; g[2][aK] = 0;
 *       dense[9237+id] = dense[8810+id];
 *       dense[8810+id] = 0;
 *       dense[9298+id] = 0;
 *       if (dense[8749+id] === 2) a(id);     // b's own final void a(int) (#476)
 *       return true;
 *     }
 *   return false;
 */
export type LegacySubsystemBFreeListCallbacks = {
  /**
   * b's `final void a(int)` (#476) -- ported as
   * `releaseLegacySubsystemBTenSlotEntity` (LegacySubsystemBTenSlot.ts);
   * kept a callback so this module does not reach into runtime state.
   */
  readonly onReleaseTenEntity?: (id: number) => void;
};

export function subsystemBFreeListInsert(
  gRows: readonly Int8Array[],
  dense: Int8Array,
  id: number,
  callbacks: LegacySubsystemBFreeListCallbacks = {},
): boolean {
  for (let aK = 0; aK < 20; aK += 1) {
    if ((gRows[0]?.[aK] ?? 0) >= 1) continue;
    if (gRows[0]) gRows[0][aK] = id;
    if (gRows[1]) gRows[1][aK] = 0;
    if (gRows[2]) gRows[2][aK] = 0;
    dense[BLD_PLANNED_KIND + id] = dense[BLD_OWNER + id] ?? 0;
    dense[BLD_OWNER + id] = 0;
    dense[9298 + id] = 0;
    if ((dense[BLD_KIND + id] ?? 0) === 2) callbacks.onReleaseTenEntity?.(id);
    return true;
  }
  return false;
}
