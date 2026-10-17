import { UNIT_FLAGS, UNIT_HAPPINESS, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_PROGRESS } from "../../core/DenseLayout";
import { T_SKILL_ATTR, T_SKILL_CAP, T_SKILL_CHANCE, T_SKILL_STEP } from "../../core/DataTables";
/**
 * Exact private void K() (bytecode/b-javap.txt offsets 0..573), an
 * entity-type dispatcher gated on `dense[2828+v]` (entity type).
 *
 * REACHABILITY (2026-08-29): `K()`'s only real caller in the whole class is
 * `j():Z`'s own offset 96 (`LegacySubsystemEntityAssociationScan.ts`,
 * `onK`), gated on `dense[2828+id]` being `94..97` -- matching this
 * method's own dispatch range. But `j():Z` itself has exactly one call
 * site, `i()`'s own offset 595 (`LegacySubsystemEntityProbe.ts`).
 *
 * RETRACTED 2026-09-23: this used to conclude that `j()`, and therefore
 * `K()`, were "CONFIRMED UNREACHABLE" because `i()`'s `J()` at offset 192
 * was a guaranteed throw. `J()` (#246) is ported and wired as
 * `subsystemEntityJTrigger`, `j():Z` is wired at `i()`'s offset 595, and
 * this method is now wired too (`LegacyRuntimeState.entityTypeReaction`).
 * All three callees are ported: `#293` is `gainEntitySkill`, `#294` is
 * `entityHealthDelta`, `#295` is the courtship method
 * (`LegacyEntityCourtship.ts`).
 *
 * Shared prologue (ALWAYS runs, for every entity type including ones with
 * no dispatch below): `dense[404+v]=0` (the same courtship-cluster shared
 * marker field this project's earlier `I()`/`j(int)` investigation already
 * tracks), an unresolved `a(BBBB):Z`(#293) call (result discarded) whose 4
 * arguments are all `packedBytes`-lookups keyed by the entity's own type,
 * then `subsystemFFlag = true` unconditionally.
 *
 * `tableswitch` on `dense[2828+v]` (94..97, default = plain return):
 *
 * CORRECTED 2026-08-27 while writing this port (re-traced the tableswitch
 * jump table at offset 154 -- `94:256, 95:184, 96:280, 97:356, default:573`
 * -- directly against the labeled code blocks): an earlier docs/unknowns.md
 * entry had type 94 and 95 SWAPPED (the `a(int,int):Z` call is really
 * type===94's block at offset 256, and the `dense[8181]/[7979]` flag-set is
 * really type===95's block at offset 184, not the reverse), and incorrectly
 * described `default` as falling through into the SAME `dense[8181]/[7979]`
 * code as type===94 -- offset 573 is a lone `return`, a genuine no-op, not
 * shared with any case. It also had type===97's array-shift DIRECTION
 * backwards (`teamMarkerTable[team][R+1] = teamMarkerTable[team][R]`, i.e.
 * shifting toward the HIGHER index to free up slot 0 for the new entry at
 * the end -- not slot R+1 into slot R) and mis-scoped the final marker
 * write as if it ran after every branch, when it's exclusively part of
 * type===97's own control flow (types 94/95/96 all return well before
 * reaching that code). All fixed below and re-derived directly from a
 * fresh instruction-by-instruction stack trace.
 *
 *  - type 94: `subsystemFFlag = onCheckPair(dense[4444+v], 10)` -- the
 *    unresolved `a(int,int):Z`(#294) helper.
 *  - type 95: `dense[8181+dense[4444+v]] = 0`; `dense[7979+dense[4444+v]]
 *    |= 8` -- sets a flag bit on the entity's own associated record.
 *  - type 96: the courtship-cluster "borrow v to act on the associated
 *    target, then restore" pattern -- `subsystemR = dense[4444+v]`'s OLD
 *    entering value gets used first (`dense[505+subsystemR]=99`), THEN
 *    `subsystemR` is overwritten to hold the entering `v` so it can later
 *    be restored; the target id itself (`dense[4444+v]`) is passed
 *    explicitly to the unresolved `onActOnTarget` callback (#295,
 *    `a(boolean):Z`) rather than modeled as an ambient field swap, since
 *    the real bytecode's `v:I` swap only matters to whatever `a(boolean)`
 *    reads internally -- opaque from here. Faithful net effect on
 *    `subsystemR`: it ends the call holding the ORIGINAL `v`, matching the
 *    real bytecode (the method never restores `R` to its own prior value).
 *  - type 97: pushes a new `[x, y, type=0, flag=team^1]` entry onto
 *    `teamMarkerTable[team]` slot 0 -- CONFIRMED to be the SAME field
 *    already established as `game.teamMarkerTable` in
 *    `LegacyMapMarkerScan.ts` (`f.c:[[[B]`, #150 here vs #256 there,
 *    `[team][slot] = [x, y, type, flag]`, `type>=0 && flag===1` gates that
 *    scan's display). Existing valid entries (`[2]>=0`) are shifted from
 *    slot R into slot R+1 (R walking 3 down to 0), dropping whatever was
 *    in slot 4; the new entry's `x`/`y` come from `dense[3131+v]`/
 *    `dense[3232+v]` (a cached target position -- producer not traced
 *    here), `type=0`, `flag=team^1` (so it only satisfies the display
 *    gate's `flag===1` when this call's own team is 0).
 *
 * `packedBytes`/`packedOffsets` here are `b.b:[B]`(#130)/`b.a:[S]`(#66) --
 * CONFIRMED to be the exact same aliased fields as `game.packedBytes`/
 * `game.packedOffsets` via the constructor's `final void a(f)` alias-copy
 * (bytecode/b-javap.txt:538-545; see `LegacyRuntimeState.ts`'s own
 * "f's buffers aliased by b.a(f)" comment at their declaration).
 *
 * `a:(BBBB)Z`(#293), `a:(int,int)Z`(#294), `a:(boolean)Z`(#295) are
 * confirmed real calls, not yet derived -- left as explicit callbacks,
 * matching this project's convention for undereived dependencies (see
 * `LegacySubsystemUnitTraining.ts`'s `onG`/`isInView`).
 */
export type LegacySubsystemEntityTypeReactionInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.c:[[[B] (#150 here / #256 in class f) -- game.teamMarkerTable[team][slot] = [x, y, type, flag]. */
  readonly teamMarkerTable: Int8Array[][];
  /** b.v:I (#225) -- the entity this dispatch is running for. */
  readonly entityId: number;
  /** b.u:I (#222) -- the current team (game.bTeam). */
  readonly team: number;
  /** Mutable scratch -- b.R:I (#49) and b.f:Z (#172); see docblock. */
  readonly scratch: { R: number; fFlag: boolean };
};

export type LegacySubsystemEntityTypeReactionCallbacks = {
  /** private boolean a(byte,byte,byte,byte) (#293) -- confirmed real call, not yet derived. */
  readonly onCheckQuad?: (arg1: number, arg2: number, arg3: number, arg4: number) => boolean;
  /** private boolean a(int,int) (#294) -- confirmed real call, not yet derived. */
  readonly onCheckPair?: (arg1: number, arg2: number) => boolean;
  /** private boolean a(boolean) (#295) -- confirmed real call, not yet derived. */
  readonly onActOnTarget?: (targetId: number, flag: boolean) => boolean;
};

export function stepLegacySubsystemEntityTypeReaction(
  input: LegacySubsystemEntityTypeReactionInput,
  callbacks: LegacySubsystemEntityTypeReactionCallbacks = {},
): void {
  const { state, packedBytes, packedOffsets, teamMarkerTable, entityId: v, team, scratch } = input;

  state[UNIT_WORK_PROGRESS + v] = 0;
  const type = state[UNIT_TYPE + v] ?? 0;
  const arg1 = packedBytes[(packedOffsets[T_SKILL_ATTR] ?? 0) + type] ?? 0;
  const arg2 = packedBytes[(packedOffsets[T_SKILL_CHANCE] ?? 0) + type] ?? 0;
  const arg3 = packedBytes[(packedOffsets[T_SKILL_CAP] ?? 0) + type] ?? 0;
  const arg4 = packedBytes[(packedOffsets[T_SKILL_STEP] ?? 0) + arg1] ?? 0;
  callbacks.onCheckQuad?.(arg1, arg2, arg3, arg4);
  scratch.fFlag = true;

  switch (type) {
    case 94: {
      scratch.fFlag = callbacks.onCheckPair?.(state[UNIT_RECORD + v] ?? 0, 10) ?? scratch.fFlag;
      return;
    }
    case 95: {
      const assoc = state[UNIT_RECORD + v] ?? 0;
      state[8181 + assoc] = 0;
      state[UNIT_FLAGS + assoc] = toJavaByte((state[UNIT_FLAGS + assoc] ?? 0) | 8);
      return;
    }
    case 96: {
      state[UNIT_HAPPINESS + scratch.R] = 99;
      scratch.R = v;
      const target = state[UNIT_RECORD + v] ?? 0;
      if ((((state[8282 + target] ?? 0) & 127) >> 1) === 0) {
        callbacks.onActOnTarget?.(target, true);
      }
      return;
    }
    case 97: {
      for (let r = 3; r >= 0; r -= 1) {
        if ((teamMarkerTable[team]?.[r]?.[2] ?? -1) >= 0) {
          for (let s = 0; s < 4; s += 1) {
            const row = teamMarkerTable[team]?.[r];
            const nextRow = teamMarkerTable[team]?.[r + 1];
            if (row && nextRow) nextRow[s] = row[s] ?? 0;
          }
        }
      }
      const slot0 = teamMarkerTable[team]?.[0];
      if (slot0) {
        slot0[0] = state[UNIT_TARGET_X + v] ?? 0;
        slot0[1] = state[UNIT_TARGET_Y + v] ?? 0;
        slot0[2] = 0;
        slot0[3] = toJavaByte(team ^ 1);
      }
      return;
    }
    default:
      return;
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
