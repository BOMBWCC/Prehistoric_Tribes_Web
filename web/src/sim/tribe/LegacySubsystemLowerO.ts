import { UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void o(int)` (bytecode/b-javap.txt offsets 0..195) -- NOT the
 * unrelated uppercase `O()` cluster already ported as
 * `stepLegacySubsystemO`/`stepLegacySubsystemOAdvanced`/
 * `stepLegacySubsystemOBit64` (`LegacySubsystemO.ts`); named `LowerO`
 * here specifically to avoid that confusion. `at()`'s Block A calls this
 * with the literal argument `-1` when `dense[6565+v] === 9`
 * (`LegacySubsystemAt.ts`).
 *
 * Type-eligibility gate (CORRECTED 2026-08-27 while first reading this --
 * an earlier pass had the jump direction backwards): proceeds only when
 * `10 <= type <= 43` or `type > 50`; returns (no-op) when `type <= 9` or
 * `44 <= type <= 50`.
 *
 * Then: if the entity is NOT standing on its own grid cell (`gridC[y][x]
 * !== v` -- `b:[[B]` #129, the same field this session's `at()`/`ar()`/
 * `aw()` investigation independently concluded is `gridC`), it calls the
 * shared "change entity type" helper (`private void a(int,byte)` #275,
 * exposed here as `onChangeEntityType`) with `59`, sets mode to `3`
 * (moving), and returns.
 *
 * If it IS standing on its own cell and both `dense[202+v]`/`dense[303+v]`
 * are zero: computes a new type (`44+arg` when `arg>=0`, else `50`) and
 * applies it via the same helper; then checks a boolean gate
 * (`private boolean a(int)` #288, exposed as `onCheckGate`, called with
 * the literal `6` -- the SAME helper `at()`'s own Block D self-occupancy
 * tail calls) -- if true, calls `subsystemG(2)` (`private void g(int)`
 * #384, already known elsewhere as `subsystemG`) and returns; if false,
 * resets the type back to `69` (idle/default) via the same helper.
 */
export type LegacySubsystemLowerOInput = {
  readonly state: Int8Array;
  readonly gridC: readonly Int8Array[];
  readonly entityId: number;
  /** The literal argument passed to o(int); at()'s only real call site always passes -1. */
  readonly arg: number;
};

export type LegacySubsystemLowerOCallbacks = {
  /** private void a(int,byte) (#275) -- confirmed real, not yet separately ported. */
  readonly onChangeEntityType?: (id: number, type: number) => void;
  /** private boolean a(int) (#288) -- confirmed real, not yet derived. */
  readonly onCheckGate?: (arg: number) => boolean;
  /** private void g(int) (#384) / subsystemG, already known elsewhere. */
  readonly onGroupMode?: (id: number, argument: number) => void;
};

export function stepLegacySubsystemLowerO(
  input: LegacySubsystemLowerOInput,
  callbacks: LegacySubsystemLowerOCallbacks = {},
): void {
  const { state, gridC, entityId: v, arg } = input;
  const type = state[UNIT_TYPE + v] ?? 0;
  if (type <= 9 || (type >= 44 && type <= 50)) return;

  if ((gridC[state[UNIT_Y + v] ?? 0]?.[state[v] ?? 0] ?? 0) !== v) {
    callbacks.onChangeEntityType?.(v, 59);
    state[UNIT_ORDER + v] = 3;
    return;
  }

  if ((state[UNIT_OFFSET_X + v] ?? 0) === 0 && (state[UNIT_OFFSET_Y + v] ?? 0) === 0) {
    const newType = arg >= 0 ? 44 + arg : 50;
    callbacks.onChangeEntityType?.(v, newType);
    if (callbacks.onCheckGate?.(6) ?? false) {
      callbacks.onGroupMode?.(v, 2);
      return;
    }
    callbacks.onChangeEntityType?.(v, 69);
  }
}
