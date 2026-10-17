import { BLD_OWNER, UNIT_AGE, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * Raw port of private b.h(int) (#388), javap offsets 163..960 (b-javap.txt
 * line 5221), after `LegacyEntityHPrefix.ts`.
 *
 *  - 163..534, order target: with `arg != 0`, continue only when `!f.N`,
 *    `m` is 12 or 16 and `t41[6464]` is 3 or 7. Then `(f.N || K < 50) &&
 *    t41[m] == 0` stops. If the unit still owns its own cell: `f.c(v)`
 *    unless `t39[m] == 1 && (8810[k2] == v || t41[m] == 0)`. Unless
 *    `t39[m] == 1`: `6464 = (arg == 0 && 19 <= m <= 26) ? 69 : t29[m]`,
 *    `6262/6363 = 3131/3232`.
 *  - 535..658: when `1414 >= 12` and (`arg < 2`, or `!f.N`, `m` 12/16 and
 *    `t41[6464]` 3/7): `a(v, m)` (#275) -- the unit takes type `m`.
 *  - 659..913: a type-13 unit slides 3131 one column left, then right, onto
 *    a cell holding -127 or itself.
 *  - 914..960: `t39[2828] == 1` -> `b(k[1], k[2])` (#333), the work-cell
 *    pick that writes 3131/3232 and a positive 4040 (what b.e() waits for).
 *
 * CORRECTED 2026-09-14: every early exit in 163..534 jumps to 535, not out
 * of the method; the port returned there and had never ported 535..960, so
 * an ordered villager never changed type or got a work cell. The `f.N`/`K`
 * gate and the `f.c(v)` condition were also wrong.
 */
export type LegacyEntityHActionBranchInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  readonly argument: number;
  /** b.k:[B] (#196) indices 1 and 2. */
  readonly k1: number;
  readonly k2: number;
  /** b.m:B (#202). */
  readonly m: number;
  /** f.N:Z. */
  readonly fN: boolean;
  /** b.K:B (#28). */
  readonly K: number;
  /** f.c:S. */
  readonly mapWidth: number;
  readonly readEntityCell: (row: number, column: number) => number;
  /** f.c(int) (#354). */
  readonly onFC: (entityId: number) => void;
  /** a(int,byte) (#275). */
  readonly onChangeType: (entityId: number, type: number) => void;
  /** b(int,int) (#333). */
  readonly onNearestCandidate: (arg1: number, arg2: number) => void;
};

function table(input: LegacyEntityHActionBranchInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
}

function workAction(input: LegacyEntityHActionBranchInput): boolean {
  const kind = table(input, T_TYPE_JOB, input.state[UNIT_JOB_TYPE + input.entityId] ?? 0);
  return kind === 3 || kind === 7;
}

export function stepLegacyEntityHActionBranch(input: LegacyEntityHActionBranchInput): void {
  const { state, entityId: id, argument, m } = input;
  orderTarget(input);

  if ((state[UNIT_AGE + id] ?? 0) >= 12 &&
      (argument < 2 || (!input.fN && (m === 12 || m === 16) && workAction(input)))) {
    input.onChangeType(id, m);
  }

  if ((state[UNIT_TYPE + id] ?? 0) === 13) {
    if ((state[UNIT_TARGET_X + id] ?? 0) > 0) {
      const cell = input.readEntityCell(state[UNIT_TARGET_Y + id] ?? 0, (state[UNIT_TARGET_X + id] ?? 0) - 1);
      if (cell === -127 || cell === id) state[UNIT_TARGET_X + id] = (state[UNIT_TARGET_X + id] ?? 0) - 1;
    }
    if ((state[UNIT_TARGET_X + id] ?? 0) < input.mapWidth - 1) {
      const cell = input.readEntityCell(state[UNIT_TARGET_Y + id] ?? 0, (state[UNIT_TARGET_X + id] ?? 0) + 1);
      if (cell === -127 || cell === id) state[UNIT_TARGET_X + id] = (state[UNIT_TARGET_X + id] ?? 0) + 1;
    }
  }

  if (table(input, 39, state[UNIT_TYPE + id] ?? 0) === 1) {
    input.onNearestCandidate(input.k1, input.k2);
  }
}

/** Offsets 163..534; every exit continues at 535. */
function orderTarget(input: LegacyEntityHActionBranchInput): void {
  const { state, entityId: id, argument, m } = input;
  if (argument !== 0 && (input.fN || (m !== 12 && m !== 16) || !workAction(input))) return;
  if ((input.fN || input.K < 50) && table(input, T_TYPE_JOB, m) === 0) return;

  if (input.readEntityCell(state[UNIT_Y + id] ?? 0, state[id] ?? 0) === id &&
      (table(input, 39, m) !== 1 || ((state[BLD_OWNER + input.k2] ?? 0) !== id && table(input, T_TYPE_JOB, m) !== 0))) {
    input.onFC(id);
  }
  if (table(input, 39, m) === 1) return;

  state[UNIT_JOB_TYPE + id] = toByte(argument === 0 && m >= 19 && m <= 26 ? 69 : table(input, 29, m));
  state[UNIT_HOME_X + id] = state[UNIT_TARGET_X + id] ?? 0;
  state[UNIT_HOME_Y + id] = state[UNIT_TARGET_Y + id] ?? 0;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
