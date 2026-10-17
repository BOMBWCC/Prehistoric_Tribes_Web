import { UNIT_AGE, UNIT_ENERGY, UNIT_FLAGS, UNIT_FOOD, UNIT_JOB_TYPE, UNIT_MODE, UNIT_SORCERY_SKILL, UNIT_TYPE } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * Direct translation of `private boolean r()` (constant pool #413),
 * bytecode/b-javap.txt offsets 0..754 (line 36331). Its only caller is
 * `q()` (`LegacySubsystemEntityRegen.ts`, offset 677: `if (!r()) return
 * false;`).
 *
 * **RETRACTED (2026-09-07)** -- this file previously threw unconditionally
 * for every `level>=12` entity, on the finding that `bShort[c:[S][4] +
 * f.q]` (offset 43) dereferences class `b`'s own `b:[S]` (#132), a field
 * "confirmed permanently null" by a grep that covered only class `b`'s own
 * disassembly. It is not null: `b.b:[S]` is copied from `f.b:[S]` in
 * `b.a(f)` (b-javap.txt:550), which itself is allocated and filled by
 * `e.f()` (e-javap.txt offsets 30..41 alloc, 252..316 fill) -- the SAME
 * 570-entry table this port already decodes as `LegacyRuntimeState
 * .saveOffsets`. The claim that the rest of the method (offsets 47..553)
 * was therefore "provably unreachable" falls with it: all of it is real,
 * reachable AI-timing logic, restored below from the bytecode. See
 * docs/unknowns.md's 2026-09-04 entries for the full 26-site sweep this
 * file was one of.
 *
 * `c:[S]` (#142, `b.c:[S]`, aliased from `f.c:[S]` #141) turned out to
 * already be modeled too, just under a different name: `e.f()` builds it
 * with the exact same running-sum loop it uses for `f.a:[S]`
 * (`packedOffsets`), as the 5 section-boundary offsets that carve the
 * 570-entry `b:[S]` table into segments -- and `BinaryResource
 * .decodeShortTableB()` already computes and returns those 5 boundaries as
 * `shortTableBOffsets`, live as `LegacyRuntimeState.sectionOffsets` and
 * already wired into `changeLegacyEntityType`/`deriveLegacyEntityB`
 * (`LegacyEntityTypeChange.ts`). This file is the first to read `b:[S]`
 * itself (not just `dense[]`) through one of those section offsets:
 * `bShort[shortTableBOffsets[4] + fQByte]` -- a per-game-mode frame
 * threshold that gates when level-12+ entities start the extra behavior
 * below.
 *
 * Full structure:
 *  - offset 0..15: `level < 12` -- skip straight to the shared tail
 *    (offset 554, unchanged from before).
 *  - offset 18..46: `frame < bShort[shortTableBOffsets[4]+fQByte]` --
 *    same skip (the level-12+ escalation hasn't unlocked yet this game).
 *  - offset 47..134: `table(41,dense[6464+id])===9 && (frame&63)===
 *    (id&63)`: bump `dense[2020+id]` (capped at 100), then join the
 *    shared tail below at offset 322.
 *  - offset 137..321 (the `else`): `table(50,type) < 127 && frame %
 *    (table(50,type)*(team*4+1)) <= 3`: decrement `dense[2020+id]` (or
 *    call `onRandomAction(id,-1)` when it's already <=0); if it's now
 *    <=5 and `outerLoopLFlag` and `dense[7979+id]&64`, call `onMove(14,
 *    id, id)` (`b.a(byte,int,int)` #274 -- `LegacyEntityMoveTrigger.ts`'s
 *    own target, left as a callback: that file is mid-fix elsewhere this
 *    session for an unrelated field and out of scope here).
 *  - offset 322..401 (unconditional, both branches join here): `aJ =
 *    (dense[2929+id]&255<=14) ? table(170,dense[2929+id]) :
 *    table(52,type)`.
 *  - offset 404..544: mirrors offset 137..321 exactly but on `dense[2121+
 *    id]`/`aJ` instead of `dense[2020+id]`/`table(50,type)`, and calls
 *    `onMove(15, id, id)`.
 *  - offset 545..553: `if (!s()) return false` (`LegacySubsystemEntity
 *    HpGate.ts`, same as the shared tail's own `s()` call).
 *  - offset 554..754: the shared tail, unchanged (see below).
 *
 * Real structure (level < 12, OR level >= 12 but not yet past the frame
 * gate, offset 554..754): a real, narrow "periodic random action"
 * dispatcher, sequential if/else-if:
 *  1. `dense[7373+id]>1 && table(41,dense[6464+id])===11`: on a `%46<=3`
 *     timing window, calls the unresolved `a(int,int):boolean`(#294,
 *     `onRandomAction`, mode=2, result discarded) and returns `true`.
 *  2. `(f.c&127)===(id&15)`: calls `onRandomAction(id,1)` unless
 *     `dense[7979+id]&4` is already set, returns `true`.
 *  3. `dense[7979+id]&4>0 && (f.c&31)===(id&15)`: calls
 *     `onRandomAction(id,-1)`, then defers to `s()`
 *     (`LegacySubsystemEntityHpGate.ts`) -- `r()` returns `false` only
 *     when `s()` does.
 *  4. Otherwise: `true`.
 */
export type LegacySubsystemEntityRRollInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  readonly frame: number;
  /** b.u:I (#222) -- team, same field `LegacySubsystemEntityRegen.ts` reads. */
  readonly team: number;
  /** f.q:B (#211), tracked elsewhere in this port as `game.mission`. */
  readonly fQByte: number;
  /**
   * b.b:[S] (#132), aliased from f.b:[S] (#245) -- live as `LegacyRuntimeState
   * .saveOffsets`. Kept `Int16Array | null` (rather than required) for the
   * same reason `LegacyEntityAction.ts`'s `bShort` is: the field really is
   * `null` before `e.f()`/`b.a(f)` run, and this port has no enclosing
   * try/catch of its own here (the caller chain's does -- see this file's
   * own docblock).
   */
  readonly bShort: Int16Array | null;
  /**
   * b.c:[S] (#142), aliased from f.c:[S] (#141) -- the 5-entry section-
   * boundary table `BinaryResource.decodeShortTableB()` already returns as
   * `shortTableBOffsets`, live as `LegacyRuntimeState.sectionOffsets` and
   * already required (non-nullable) by `LegacyEntityTypeChange.ts`; same
   * convention followed here.
   */
  readonly shortTableBOffsets: Int16Array;
  /** f.L:Z (#73), tracked elsewhere in this port as `game.formUpActive`. */
  readonly outerLoopLFlag: boolean;
  /** private boolean a(int,int) (#294) -- confirmed real call, result discarded, not derived. */
  readonly onRandomAction?: (id: number, mode: number) => void;
  /**
   * b's own `final void a(byte,int,int)` (#274) -- `LegacyEntityMoveTrigger
   * .ts`'s `triggerLegacyEntityMove`, called here as `a(14,id,id)`/
   * `a(15,id,id)` (same "byte command, id, id" shape as
   * `LegacyEntityActionDispatch.ts`'s own `onMove`). Left as a callback:
   * that file is being fixed for an unrelated field (`d:[S]`#152) by
   * another agent this session and is out of scope here.
   */
  readonly onMove?: (action: number, id: number, idAgain: number) => void;
  /** private boolean s() -- LegacySubsystemEntityHpGate.ts. */
  readonly onS: () => boolean;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

/** Java `irem` semantics: sign-of-dividend, throw on divide-by-zero. */
function irem(a: number, b: number): number {
  if (b === 0) throw new Error("r(): % by zero");
  return a % b;
}

export function stepLegacySubsystemEntityRRoll(input: LegacySubsystemEntityRRollInput): boolean {
  const { state, packedBytes, packedOffsets, entityId: id, frame, team } = input;

  const level = state[UNIT_AGE + id] ?? 0;
  if (level >= 12) {
    const gateFrame = (input.bShort![(input.shortTableBOffsets[4] ?? 0) + input.fQByte] ?? 0);
    if (frame >= gateFrame) {
      if (
        table(packedBytes, packedOffsets, T_TYPE_JOB, state[UNIT_JOB_TYPE + id] ?? 0) === 9 &&
        (frame & 63) === (id & 63)
      ) {
        if ((state[UNIT_FOOD + id] ?? 0) < 100) {
          state[UNIT_FOOD + id] = (state[UNIT_FOOD + id] ?? 0) + 1;
        }
      } else {
        const maxHits = table(packedBytes, packedOffsets, 50, state[UNIT_TYPE + id] ?? 0);
        if (maxHits < 127 && irem(frame, maxHits * (team * 4 + 1)) <= 3) {
          if ((state[UNIT_FOOD + id] ?? 0) > 0) {
            state[UNIT_FOOD + id] = (state[UNIT_FOOD + id] ?? 0) - 1;
          } else {
            input.onRandomAction?.(id, -1);
          }
          if (
            (state[UNIT_FOOD + id] ?? 0) <= 5 &&
            input.outerLoopLFlag &&
            ((state[UNIT_FLAGS + id] ?? 0) & 64) !== 0
          ) {
            input.onMove?.(14, id, id);
          }
        }
      }

      const action = (state[UNIT_MODE + id] ?? 0) & 255;
      const aJ = action <= 14
        ? table(packedBytes, packedOffsets, 170, state[UNIT_MODE + id] ?? 0)
        : table(packedBytes, packedOffsets, 52, state[UNIT_TYPE + id] ?? 0);

      if (aJ < 127 && irem(frame, aJ * (team * 4 + 1)) <= 3) {
        if ((state[UNIT_ENERGY + id] ?? 0) > 0) {
          state[UNIT_ENERGY + id] = (state[UNIT_ENERGY + id] ?? 0) - 1;
        } else {
          input.onRandomAction?.(id, -1);
        }
        if (
          (state[UNIT_ENERGY + id] ?? 0) <= 5 &&
          input.outerLoopLFlag &&
          ((state[UNIT_FLAGS + id] ?? 0) & 64) !== 0
        ) {
          input.onMove?.(15, id, id);
        }
      }

      if (!input.onS()) return false;
    }
  }

  const cooldown = state[UNIT_SORCERY_SKILL + id] ?? 0;
  if (cooldown > 1 && table(packedBytes, packedOffsets, T_TYPE_JOB, state[UNIT_JOB_TYPE + id] ?? 0) === 11) {
    // Offsets 602..629: `f.c % (46 - 7373 * 3) <= 3`. FIXED 2026-10-14 (oracle run 15, play23
    // frame 73859, enemy 58): the port had `(f.c - 7373 * 3) % 46`.
    if (irem(frame, 46 - cooldown * 3) <= 3) input.onRandomAction?.(id, 2);
    return true;
  }

  if ((frame & 127) === (id & 15)) {
    if (((state[UNIT_FLAGS + id] ?? 0) & 4) === 0) input.onRandomAction?.(id, 1);
    return true;
  }

  if (((state[UNIT_FLAGS + id] ?? 0) & 4) > 0) {
    if ((frame & 31) === (id & 15)) {
      input.onRandomAction?.(id, -1);
      if (!input.onS()) return false;
    }
    return true;
  }

  return true;
}
