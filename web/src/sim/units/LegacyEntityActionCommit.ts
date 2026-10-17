import { BLD_KIND, BLD_WORK, UNIT_JOB_TYPE, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * Exact private boolean a(byte, boolean) (constant pool #284),
 * bytecode/b-javap.txt offsets 0..708 -- `b.t()`'s `onAction` target
 * (`LegacyEntityTargetStep.ts`'s `onAction?.(-1, c)`).
 *
 * Derived 2026-08-27 as part of the resource-gathering investigation:
 * `b.t()` only reaches the OTHER guaranteed-throw method
 * (`subsystemEntityTransform`/`b.a(int,int,boolean)`, wired as `onPositionProbe`)
 * when the entity's mode (`dense[6161+id]`) is exactly 2 -- every other mode
 * value skips that call entirely and falls through to this method instead,
 * which depends on no confirmed-null field. Its net effect (once `mode!==2`
 * lets it run for real) is: if the entity isn't already mid-action (the two
 * `173/174` / `176/177` nested-table checks -- SAME nested-lookup shape
 * `docs/parity-checklist.md`'s `b.g(int)` row already documents for
 * `dense[2929+id]`), and its type isn't 79/80/83..85 (which instead trigger
 * a type change via `changeEntityType` and bail), commit to starting a timed
 * action: `dense[2929+id]=-108` (busy marker, the SAME one
 * `LegacyEntityWUpdate.ts` already reads), `dense[3030+id]=actionCode`
 * (echoed back to the caller), and -- only when the entity isn't already
 * occupying its own target cell -- `dense[1313+id]` set to a 50/51/1
 * duration (identical formula to `LegacyEntityWorkDeposit.ts`'s, a different
 * method reusing the same idiom).
 *
 * `private void i(int)` (#391, already ported as `stepLegacyEntityIUpdate`,
 * `LegacyEntityIUpdate.ts`) is called with a literal `0` from both
 * type-change branches; left an explicit callback here since wiring its own
 * large callback surface is a separate task from this method's own
 * derivation.
 */
export type LegacyEntityActionCommitInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  /** f.j:[[B] (#194), the same 25-row /pd0 byte-table family used elsewhere. */
  readonly jRows: readonly Int8Array[];
  readonly entityId: number;
  /** arg1: the action code echoed into dense[3030+id]. */
  readonly actionCode: number;
  /** arg2: `b.t()`'s own `c` (true only when the entity's mode was exactly 2). */
  readonly allowRestart: boolean;
  /** b.a(int,byte) (#275), already ported as changeEntityType. */
  readonly onChangeType?: (id: number, type: number) => void;
  /** b.i(int) (#391), already ported as stepLegacyEntityIUpdate. */
  readonly onIUpdate?: (arg: number) => void;
};

function tableByte(bytes: Int8Array, offsets: Int16Array, table: number, index: number): number {
  return bytes[(offsets[table] ?? 0) + index] ?? 0;
}

export function stepLegacyEntityActionCommit(input: LegacyEntityActionCommitInput): boolean {
  const { state, packedBytes, packedOffsets, entityId: id } = input;
  const association = state[UNIT_RECORD + id] ?? 0;

  if ((state[UNIT_SLOT + id] ?? 0) >= 0) {
    const kind = state[BLD_KIND + association] ?? 0;
    const firstTarget = tableByte(packedBytes, packedOffsets, 173, tableByte(packedBytes, packedOffsets, 174, kind) + (state[UNIT_SLOT + id] ?? 0));
    if ((state[UNIT_MODE + id] ?? 0) === firstTarget) return true;
    const secondTarget = tableByte(packedBytes, packedOffsets, 176, tableByte(packedBytes, packedOffsets, 177, kind) + (state[UNIT_SLOT + id] ?? 0));
    if ((state[UNIT_MODE + id] ?? 0) === secondTarget) return true;
  }

  const type = state[UNIT_TYPE + id] ?? 0;
  let skipGate = type === 79 || type === 80 || (type >= 83 && type <= 85);
  if (!skipGate && input.allowRestart) {
    const gate = tableByte(packedBytes, packedOffsets, 42, tableByte(packedBytes, packedOffsets, T_TYPE_JOB, state[UNIT_JOB_TYPE + id] ?? 0));
    if (gate !== 0) skipGate = true;
  }

  if (!skipGate) {
    if ((state[UNIT_MODE + id] ?? 0) !== -108) return false;
    const jRow4 = input.jRows[4];
    const counterTarget = (jRow4?.[(state[UNIT_MODE + id] ?? 0) & 255] ?? 0) - 1;
    if ((state[3030 + id] ?? 0) === counterTarget) return false;
  }

  const type2 = state[UNIT_TYPE + id] ?? 0;
  if (type2 === 83 || type2 === 84) {
    input.onChangeType?.(id, 85);
    input.onIUpdate?.(0);
    state[3030 + id] = input.actionCode;
    return true;
  }
  if (type2 === 79) {
    input.onChangeType?.(id, 80);
    input.onIUpdate?.(0);
    state[3030 + id] = input.actionCode;
    return true;
  }

  if (!input.allowRestart) return true;
  const gate2 = tableByte(packedBytes, packedOffsets, 42, tableByte(packedBytes, packedOffsets, T_TYPE_JOB, state[UNIT_JOB_TYPE + id] ?? 0));
  if (gate2 <= 0) return true;
  if ((state[UNIT_MODE + id] ?? 0) === -108) return true;

  state[808 + id] = 0;
  state[UNIT_MODE + id] = -108;
  state[3030 + id] = input.actionCode;

  const row = input.gridC[state[UNIT_Y + id] ?? 0];
  const occupant = row ? (row[state[id] ?? 0] ?? 0) : 0;
  if (occupant !== id) {
    const record = state[UNIT_RECORD + id] ?? 0;
    state[UNIT_TIMER + id] = (state[BLD_WORK + record] ?? 0) !== 0 ? 50 : (state[BLD_KIND + record] ?? 0) === 7 ? 51 : 1;
  }
  return true;
}
