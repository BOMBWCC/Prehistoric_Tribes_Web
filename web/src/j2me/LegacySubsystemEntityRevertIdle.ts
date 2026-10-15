import { deriveLegacyEntityStateCode } from "./LegacySubsystemEntityStateCode";

/**
 * Direct translation of `private void P()` (constant pool #252),
 * bytecode/b-javap.txt offsets 0..28 (line 31662). Trivial: reuses
 * `final byte b(int)` (`deriveLegacyEntityStateCode`) to recompute
 * `dense[2929+id]`. Real callers: `c()`'s "compatible occupied cell" tail
 * and `F()`'s "revert to idle" tail (both `LegacySubsystemEntityPathStep.ts`
 * / `LegacySubsystemEntityMoveCancel.ts`).
 */
export function stepLegacySubsystemEntityRevertIdle(state: Int8Array, id: number): void {
  state[2929 + id] = (deriveLegacyEntityStateCode(state, id) % 7) + 8;
}
