import { UNIT_AGE } from "../../core/DenseLayout";
/**
 * Direct translation of `private void Q()` (constant pool #253),
 * bytecode/b-javap.txt offsets 0..39 (line 31682). Trivial level-gated
 * type change. Real caller: `F()`'s "revert to idle" tail
 * (`LegacySubsystemEntityMoveCancel.ts`).
 */
export function stepLegacySubsystemEntityTypeSettle(
  state: Int8Array,
  id: number,
  onChangeType: (id: number, type: number) => void,
): void {
  const level = state[UNIT_AGE + id] ?? 0;
  onChangeType(id, level >= 12 ? 69 : 17);
}
