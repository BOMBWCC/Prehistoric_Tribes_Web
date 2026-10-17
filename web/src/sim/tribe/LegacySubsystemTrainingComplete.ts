import { BLD_LEVEL, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK } from "../../core/DenseLayout";
/**
 * Exact `private void ad()` (bytecode/b-javap.txt offsets 0..161,
 * line 39169).
 *
 * **RETRACTED (2026-09-07)** -- the 2026-08-27 correction above this line
 * was right that the OLD "threshold table" reading of the tail was wrong,
 * but wrong about why: it claimed the tail (offset 139..150) unconditionally
 * dereferences a permanently-null `g:[[B]` (#176). `g:[[B]` is NOT null --
 * it's allocated by `f.g()` as `new byte[3][20]` (bytecode/f-javap.txt
 * offset 671..682) and already modelled as `LegacySubsystemArrays.gRows`
 * (see `LegacySubsystemBTenSlot.ts`'s own docblock for the sibling case).
 * So this method runs to completion for real; the tail is just a single
 * array store, not a throw:
 *
 *   gRows[0][subsystemX] = 0;                          // offset 139..150
 *   game.d(v);   // f.d(int), completeLegacyEntityRecord // offset 151..161
 *
 * `subsystemX` is `b.x:I` (#230), the same brand-new field
 * `LegacyEntityCWatch.ts` introduced (its own producer is still not traced).
 * `game.d(v)` is `f.d(int)`, already ported as `completeLegacyEntityRecord`
 * in `LegacyEntityRecordCompletion.ts` -- exposed here as a callback rather
 * than imported directly, matching this file's existing `onEnqueueEffect`
 * pattern.
 *
 * **This also retracts the reachability claim.** The 2026-08-27 note said
 * `ad()`'s one call site in `b.g()` is itself dead code, because `g()`
 * "ALWAYS throws earlier for any busy building" reading the same
 * (believed-null) `g:[[B]`. Since `g:[[B]` is real, that specific argument
 * no longer holds -- but `g()`'s per-building loop as a whole is a
 * separate, ~800-instruction body that has NOT been re-derived (see
 * `LegacySubsystemBuildingEconomy.ts`'s own 2026-09-04 retraction), so
 * whether `ad()` actually runs in live play is an open question again, not
 * a settled one either way. This file ports `ad()` itself faithfully and
 * completely; it does not attempt to resolve `g()`'s own reachability.
 *
 * The offset 0..138 prefix below (bit0-gated completion effect + busy
 * counter bump, then the unconditional busy/progress-reset writes) was
 * already correct and is unchanged.
 */
export type LegacySubsystemTrainingCompleteInput = {
  readonly state: Int8Array;
  readonly buildingId: number;
  /** b.g:[[B] (#176) -- LegacySubsystemArrays.gRows, new byte[3][20]. */
  readonly gRows: Int8Array[];
  /** b.x:I (#230) -- game.subsystemX; own producer still untraced. */
  readonly subsystemX: number;
  /** f.a(int,int):V (#304), already ported as enqueueLegacyEffectSlot. */
  readonly onEnqueueEffect?: (arg1: number, arg2: number) => void;
  /** f.d(int):V (#370), already ported as completeLegacyEntityRecord. */
  readonly onRecordCompletion?: (record: number) => void;
};

export function stepLegacySubsystemTrainingComplete(input: LegacySubsystemTrainingCompleteInput): void {
  const { state, buildingId: v, gRows, subsystemX } = input;

  if (((state[9054 + v] ?? 0) & 1) === 0) {
    input.onEnqueueEffect?.(v, 0);
    if ((state[BLD_WORK + v] ?? 0) === 1) {
      state[BLD_LEVEL + v] = toJavaByte((state[BLD_LEVEL + v] ?? 0) + 1);
    }
  }

  state[9054 + v] = toJavaByte((state[9054 + v] ?? 0) & 254);
  state[BLD_WORK + v] = 0;
  state[BLD_OWNER + v] = state[BLD_PLANNED_KIND + v] ?? 0;
  state[BLD_PLANNED_KIND + v] = 0;

  if (gRows[0]) gRows[0][subsystemX] = 0;
  input.onRecordCompletion?.(v);
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
