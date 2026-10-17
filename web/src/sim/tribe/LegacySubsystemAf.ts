import { ANIMAL_DEST_X, ANIMAL_DEST_Y, ANIMAL_HIT_BY, ANIMAL_KIND, ANIMAL_TARGET, ANIMAL_X, ANIMAL_Y, BLD_HP, UNIT_HP, UNIT_Y } from "../../core/DenseLayout";
import { T_ANIMAL_DAMAGE } from "../../core/DataTables";
/**
 * Direct translation of `private void af()` (constant pool #313),
 * bytecode/b-javap.txt offsets 0..1101 (line 40377). One of `h()`'s own
 * "tail maintenance" pair (with `ah()`), called together for each of 22
 * scratch slots (`v` 0..21) whenever `dense[9513+v]>0` -- see
 * `LegacySubsystemH.ts`'s own `onTailMaintenance` (currently unwired).
 *
 * Operates on a previously-unmodeled `dense[9xxx+v]` scratch region (a
 * fixed 22-slot table, indexed by the SAME `v` this loop iterates, not by
 * entity id) -- confirmed real, working logic.
 *
 * Careful re-derivation (2026-08-29, redone after an earlier rushed first
 * pass introduced real transcription errors): EVERY exit path in this
 * method funnels through offset 1031 (`z:I = neighborValue(dense[9359+v],
 * dense[9381+v], 101); ag(); return`) EXCEPT the very first
 * `dense[9403+v]!==0 || dense[9425+v]!==0` gate, which returns directly.
 * Structure:
 *  1. Increments `dense[9579+v]`; once it reaches `f.j[4][dense[9557+v]
 *     &255]`, resets it to `0`, and -- only when `dense[9557+v]===37+
 *     dense[9535+v]` -- calls the SAME unresolved 8-arg queue helper `S()`
 *     (`LegacySubsystemEntityPaceReset.ts`) already leaves as
 *     `onQueueAction8` (result discarded there too).
 *  2. `dense[9403+v]!==0 || dense[9425+v]!==0`: sets `dense[9557+v]=2+
 *     dense[9535+v]` and returns immediately -- the ONLY early exit that
 *     skips the offset-1031 tail entirely.
 *  3. Otherwise, dispatches on `dense[9447+v]`:
 *     - `>19`: treats it (after subtracting 19) as an ENTITY ID, passing
 *       that entity's own `dense[0+id]`/`dense[101+id]` position to the
 *       unresolved `a(int,int,byte,int)` (#289, `onFinishSlot`).
 *     - `6..19`: calls the unresolved `e(boolean)`(#376, `onAnimReset`,
 *       `false`) and resets the animation timer.
 *     - `<=5`: runs the real throttle+target-tracking block -- gated on a
 *       `f.c%table[179]` cycle (or a `dense[9557+v]&255<=7` fallback),
 *       calls the already-ported `checkLegacySpiralPlacementGate`
 *       (mode=6, scanLimit=6), then tracks a live target
 *       (`dense[9601+v]`): if positive and the referenced entity is alive
 *       AND self-consistent with `gridC`, caches its position into
 *       `dense[9645/9667+v]` (and resets `9689`, then drops it when
 *       `neighborValue` (#266) clears a `59` threshold); if negative (a
 *       building), drops it once that building's `8505` is gone.
 *  4. offset 1031..1068 (reached by everything except step 2's early
 *     return): `z:I` (#234, `game.subsystemEntityZ`) is recomputed via
 *     `neighborValue`, then `ag()` (`LegacySubsystemAg.ts`) always runs and
 *     reads it. CORRECTED 2026-09-23: this wrote `dense[234]` (unit 32's 202
 *     field) while ag() read the scalar, so animals only walked when some
 *     unrelated method happened to leave z above 9.
 */
export type LegacySubsystemAfInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  /** b.z:I (#234), written at offset 1064 for ag() to read. */
  readonly z: { value: number };
  readonly slot: number;
  readonly frame: number;
  readonly sceneQ: number;
  readonly subsystemFByte: number;
  readonly jRow4: (index: number) => number;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** private boolean a(int,int,int,int) (#270), checkLegacySpiralPlacementGate. Result discarded. */
  readonly onFootprintGate: (mode: number, scanLimit: number, x: number, y: number) => boolean;
  /** private int a(int,int,int) (#266), the established neighborValue helper. */
  readonly neighborValue: (x: number, y: number, mode: number) => number;
  /** private boolean a(int,int,int,int,int,int,int,int) (#298) -- same unresolved queue helper S() already leaves as a callback. */
  readonly onQueueAction8?: (
    a1: number, a2: number, a3: number, a4: number,
    a5: number, a6: number, a7: number, a8: number,
  ) => void;
  /** private void a(int,int,byte,int) (#289) -- confirmed real call, not derived. */
  readonly onFinishSlot?: (targetX: number, targetY: number, targetId: number, arg4: number) => void;
  /** private void e(boolean) (#376) -- confirmed real call, not derived. */
  readonly onAnimReset?: (flag: boolean) => void;
  /** private void ag() -- LegacySubsystemAg.ts. */
  readonly onAg: () => void;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

export function stepLegacySubsystemAf(input: LegacySubsystemAfInput): void {
  const { state, packedBytes, packedOffsets, gridC, slot: v } = input;

  state[9579 + v] = (state[9579 + v] ?? 0) + 1;
  if ((state[9579 + v] ?? 0) >= input.jRow4((state[9557 + v] ?? 0) & 0xff)) {
    state[9579 + v] = 0;
    if ((state[9557 + v] ?? 0) === 37 + (state[ANIMAL_KIND + v] ?? 0)) {
      const target = state[ANIMAL_TARGET + v] ?? 0;
      const arg7 = Math.trunc(
        (table(packedBytes, packedOffsets, T_ANIMAL_DAMAGE, state[ANIMAL_KIND + v] ?? 0) * (2 + input.randomRemainder(255, 3))) / 4,
      );
      input.onQueueAction8?.(
        (state[ANIMAL_X + v] ?? 0) + table(packedBytes, packedOffsets, 1, state[9491 + v] ?? 0),
        (state[ANIMAL_Y + v] ?? 0) + table(packedBytes, packedOffsets, 1, 8 + (state[9491 + v] ?? 0)),
        2,
        target <= 0 ? 2 : 1,
        Math.abs(target),
        0,
        arg7,
        0,
      );
    }
  }

  if ((state[9403 + v] ?? 0) !== 0 || (state[9425 + v] ?? 0) !== 0) {
    state[9557 + v] = 2 + (state[ANIMAL_KIND + v] ?? 0);
    return;
  }

  state[9623 + v] = 0;

  if ((state[ANIMAL_HIT_BY + v] ?? 0) > 5) {
    if ((state[ANIMAL_HIT_BY + v] ?? 0) <= 19) {
      input.onAnimReset?.(false);
      state[9557 + v] = 10 + (state[ANIMAL_KIND + v] ?? 0);
      state[9579 + v] = 0;
    } else {
      const targetId = (state[ANIMAL_HIT_BY + v] ?? 0) - 19;
      state[ANIMAL_HIT_BY + v] = targetId;
      input.onFinishSlot?.(state[targetId] ?? 0, state[UNIT_Y + targetId] ?? 0, targetId, 0);
    }
    state[ANIMAL_HIT_BY + v] = 0;
  } else {
    const period = table(packedBytes, packedOffsets, 179, state[ANIMAL_KIND + v] ?? 0);
    // NOTE: the real bytecode computes `f.c % period` unconditionally here
    // (offset 534..568), so if `period` is ever really 0 for a valid kind
    // value, Java throws ArithmeticException (would be caught by h()'s own
    // exception table). JS `%` returns NaN instead of throwing -- a known,
    // narrow divergence, not modeled since it's unconfirmed whether period
    // is ever actually 0 in real game data.
    const skip = !(period !== 0 && input.frame % period === 0) && ((state[9557 + v] ?? 0) & 0xff) > 7;
    if (!skip && !(input.sceneQ === 3 && input.subsystemFByte >= 5)) {
      input.onFootprintGate(6, 6, state[ANIMAL_X + v] ?? 0, state[ANIMAL_Y + v] ?? 0);
      // Offsets 649..1030. A unit target that is alive and on its own cell is followed (its cell,
      // 9689 = 0), then dropped when a(x, y, 101) > 59; a dead or displaced one is dropped. A
      // building target (< 0) is dropped once its hit points are gone. FIXED 2026-10-13 (oracle
      // run 15, play14 frame 65824): the 9689 reset and the > 59 check sat in the building branch.
      const target = state[ANIMAL_TARGET + v] ?? 0;
      if (target > 0) {
        const row = gridC[state[UNIT_Y + target] ?? 0];
        if ((state[UNIT_HP + target] ?? 0) > 0 && row && (row[state[target] ?? 0] ?? 0) === target) {
          state[ANIMAL_DEST_X + v] = state[target] ?? 0;
          state[ANIMAL_DEST_Y + v] = state[UNIT_Y + target] ?? 0;
          state[9689 + v] = 0;
          const result = input.neighborValue(state[ANIMAL_X + v] ?? 0, state[ANIMAL_Y + v] ?? 0, 101);
          if (result > 59 && !(input.sceneQ === 3 && input.subsystemFByte === 4)) {
            state[ANIMAL_TARGET + v] = 0;
            state[ANIMAL_DEST_X + v] = state[ANIMAL_X + v] ?? 0;
            state[ANIMAL_DEST_Y + v] = state[ANIMAL_Y + v] ?? 0;
          }
        } else {
          state[ANIMAL_TARGET + v] = 0;
        }
      } else if (target < 0) {
        if ((state[BLD_HP - target] ?? 0) <= 0) state[ANIMAL_TARGET + v] = 0;
      }
    }
  }

  input.z.value = input.neighborValue(state[ANIMAL_X + v] ?? 0, state[ANIMAL_Y + v] ?? 0, 101);
  input.onAg();
}
