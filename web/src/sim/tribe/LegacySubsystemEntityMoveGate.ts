import { BLD_HP, BLD_KIND, BLD_PLANNED_KIND, BLD_X, BLD_Y, UNIT_TYPE } from "../../core/DenseLayout";
import { T_BUILDING, T_TYPE_JOB } from "../../core/DataTables";
/**
 * Direct translation of `private boolean d(int)` (constant pool #371),
 * bytecode/b-javap.txt offsets 0..147 (line 15676).
 *
 * **RETRACTED (2026-09-07)** -- this file previously stopped at offset 97
 * with a guaranteed throw, on the finding that the method it calls there
 * (`private void a(int,int,boolean)`/#273, `LegacyRuntimeState.
 * subsystemEntityTransform`) unconditionally dereferences class b's own
 * `b:[S]`(#132) and that `b:[S]` is "confirmed permanently null". `b:[S]`
 * itself is NOT null (see `LegacySubsystemEntityOccupancyCheck.ts`'s own
 * docblock for the full derivation -- it's allocated by `e.f()` and copied
 * in `b.a(f)`, and this port already has it live as `LegacyRuntimeState.
 * saveOffsets`). Note, though, that `d(int)`'s OWN bytecode never
 * references `#132` at all -- it only calls into `subsystemEntityTransform`,
 * which is a SEPARATE method with its own SEPARATE still-open
 * `RETRACTED-PREMISE (2026-09-07)` marker in `LegacyRuntimeState.ts`
 * (around line 4582/4621) -- not one of the four sites this pass fixes.
 * So in the CURRENT state of this codebase, `d(int)` still throws whenever
 * it reaches that call, just for a real, still-unfixed reason elsewhere,
 * rather than a fabricated one here.
 *
 * Real control flow (offsets against `bytecode/b-javap.txt:15676`):
 *  - 0..12: `if (dense[8749+recordId] >= 12) { ... }` (this port's
 *    established "level" field).
 *  - 15..57 (only when level>=12): `threshold =
 *    packedBytes[packedOffsets[138]+182+dense[9237+recordId]]`; if
 *    `dense[8505+recordId] >= threshold`, return `false`.
 *  - 58..72: if `dense[8505+recordId] <= 0`, return `false`.
 *  - 73..97: unconditionally calls `this.a(dense[8383+recordId],
 *    dense[8444+recordId], true)` (#273, `subsystemEntityTransform`) --
 *    exposed here as the `onEntityTransform` callback rather than ported
 *    inline (it's a large, separately-tracked method with its own
 *    docblock and its own still-open retraction; porting it is out of
 *    scope for this file). The call's result is discarded (matches the
 *    real bytecode's own `pop`-free void signature -- nothing here reads
 *    a return value from it).
 *  - 98..145: `tableM = packedBytes[packedOffsets[41]+mByte]` (`mByte` is
 *    class b's own `m:B`#202, already tracked in this port as
 *    `game.subsystemM`/`mByte` -- see `LegacySubsystemAs.ts`); `tableAmbient
 *    = packedBytes[packedOffsets[41]+dense[2828+ambientId]]` (`ambientId`
 *    is `this`'s own `v:I`#225, the entity currently being processed --
 *    ambient in the original, threaded through explicitly here, same
 *    convention as `LegacySubsystemEntityOccupancyCheck.ts`'s `id`).
 *    Returns `tableM === tableAmbient`.
 *
 * Real callers: `c(int)` (`LegacyEntityRecordCheck.ts`) and `F()`
 * (`LegacySubsystemEntityMoveCancel.ts`, called as
 * `this.d(dense[4444+id])` with the ambient entity being `F()`'s own
 * `id`. `F()`'s own docblock previously argued its `offset 324..1415`
 * branch was unreachable because `d(int)` "can only ever return `false`
 * or throw" -- that argument leaned on the SAME retracted premise and no
 * longer holds in general (see that file's own updated docblock), though
 * `F()` itself is independently confirmed 100% unreachable dead code for
 * an unrelated reason, so this doesn't change any observable behavior.
 */
export type LegacySubsystemEntityMoveGateCallbacks = {
  /**
   * `private void a(int,int,boolean)` (#273), already ported (but
   * currently a confirmed guaranteed throw for a separate, not-yet-fixed
   * retracted-premise reason) as `LegacyRuntimeState.subsystemEntityTransform`.
   * Real args: `(dense[8383+recordId], dense[8444+recordId], true)`.
   */
  readonly onEntityTransform?: (arg1: number, arg2: number, flag: boolean) => void;
};

export function stepLegacySubsystemEntityMoveGate(
  state: Int8Array,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  recordId: number,
  ambientId: number,
  readM: () => number,
  callbacks: LegacySubsystemEntityMoveGateCallbacks = {},
): boolean {
  const level = state[BLD_KIND + recordId] ?? 0;
  if (level >= 12) {
    const threshold = packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 182 + (state[BLD_PLANNED_KIND + recordId] ?? 0)] ?? 0;
    if ((state[BLD_HP + recordId] ?? 0) >= threshold) return false;
  }
  if ((state[BLD_HP + recordId] ?? 0) <= 0) return false;

  callbacks.onEntityTransform?.(state[BLD_X + recordId] ?? 0, state[BLD_Y + recordId] ?? 0, true);

  // m:B is read after the call above, which is its only writer.
  const tableM = packedBytes[(packedOffsets[T_TYPE_JOB] ?? 0) + readM()] ?? 0;
  const tableAmbient = packedBytes[(packedOffsets[T_TYPE_JOB] ?? 0) + (state[UNIT_TYPE + ambientId] ?? 0)] ?? 0;
  return tableM === tableAmbient;
}
