import { BLD_KIND, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Exact `private void x()` (bytecode/b-javap.txt line 11946, offsets 0..1253):
 * a worker leaves its record (e.g. a builder whose work ended).
 *
 *  - 0..192: `8932[rec] -= 1`; unlink the unit from the record's worker list
 *    (head 8993, next 4545).
 *  - 193..428: if the record has flag 2 and the unit flag 4, clear the flag
 *    and set it again if another listed worker has flag 4 (and the record is
 *    built or not type 8).
 *  - 429..473: `4646 = -1; 4545 = 0; b(byte)(rec)` (#341).
 *  - 474..597: `a(1, 127, 8383 + t24[type], 8444 + t25[type])` (#270) -- find
 *    a free cell by the record's door; it becomes 3131/3232.
 *  - 598..770: the unit steps there: position = 3131/3232, 202/303 = 0,
 *    606 = t111[type], `gridC[y][x] = v`.
 *  - 771..931: `1313 = 0; 1818 -= 2`; type 59 -> `6464 = 69`, 6262/6363 =
 *    position; P(); `1111 &= 240`; `5050 = 1010`; f.h(v) (#390).
 *  - 932..963: type >= 109 -> `6161 = 0`.
 *  - 964..1046: `(f.p & 3) == 1 && 7575 > 3 && u == 0 && f.q < 7` ->
 *    b(v, 0, 1) (#342), f.b(61) (#343), `f.p |= 2`, return.
 *  - 1047..1231: `t160[type] == 69 && type < 109` -> unless n() (#402):
 *    `a(1, 21, x-3+rand(6), y-3+rand(6))` clamped to the map, Q(); then
 *    p(); `z = a(x, y, 0)`; return.
 *  - 1232..1253: `6161 < 2` -> N().
 *
 * CORRECTED 2026-10-10 (oracle run 7, frame 21390): the two list walks
 * used a local instead of b.x:I, which callers read afterwards.
 *
 * CORRECTED 2026-09-15: the port stopped at offset ~920, wrote position into
 * 3131/3232 instead of the reverse, passed wrong door coordinates to #270 and
 * skipped b(byte), P(), f.h(v) and the whole tail -- so a released worker
 * never looked for its next task.
 */
export type LegacyEntityAssociationCleanupInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[[B (#129). */
  readonly gridC: Int8Array[];
  readonly entityId: number;
  /** b.x:I (#230) -- both worker-list walks use it as their cursor (offsets 117..164, 290..426). */
  readonly fields: { x: number };
  /** b.u:I (#222). */
  readonly team: number;
  /** f.p:B (#353). */
  readonly fP: number;
  /** f.q:B (#211). */
  readonly fQ: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** b(byte) (#341). */
  readonly onRecordWorkerLevel: (record: number) => void;
  /** final boolean a(int,int,int,int) (#270), result popped. */
  readonly onGate: (mode: number, scanLimit: number, x: number, y: number) => void;
  /** P() (#252). */
  readonly onP: () => void;
  /** f.h(int) (#390). */
  readonly onSelectionRelease: (id: number) => void;
  /** b(int,int,int) (#342). */
  readonly onAuxiliary: (id: number, second: number, third: number) => void;
  /** f.b(int) (#343). */
  readonly onSceneDispatch: (value: number) => void;
  /** f.p:B write. */
  readonly onFP: (value: number) => void;
  /** private boolean n() (#402). */
  readonly onNeeds: () => boolean;
  /** Q() (#253). */
  readonly onQ: () => void;
  /** p() (#408). */
  readonly onPStep: () => void;
  /** a(int,int,int) (#266), stored into z:I (#234) by the caller. */
  readonly onOccupancy: (x: number, y: number, layer: number) => void;
  /** N() (#250). */
  readonly onN: () => void;
  /** f.a(int,int) (#269). */
  readonly randomRemainder: (mask: number, divisor: number) => number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value >= max ? max : value;
}

export function stepLegacyEntityAssociationCleanup(input: LegacyEntityAssociationCleanupInput): void {
  const { state, entityId: id } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const rec = () => state[UNIT_RECORD + id] ?? 0;

  state[BLD_WORKERS + rec()] = toByte((state[BLD_WORKERS + rec()] ?? 0) - 1);

  const f = input.fields;
  if ((state[BLD_WORKER_HEAD + rec()] ?? 0) === id) {
    state[BLD_WORKER_HEAD + rec()] = state[UNIT_NEXT_WORKER + id] ?? 0;
  } else {
    f.x = state[BLD_WORKER_HEAD + rec()] ?? 0;
    while ((state[UNIT_NEXT_WORKER + f.x] ?? 0) !== id && f.x !== 0) f.x = state[UNIT_NEXT_WORKER + f.x] ?? 0;
    state[UNIT_NEXT_WORKER + f.x] = state[UNIT_NEXT_WORKER + id] ?? 0;
  }

  if (((state[8871 + rec()] ?? 0) & 2) !== 0 && ((state[UNIT_FLAGS + id] ?? 0) & 4) !== 0) {
    state[8871 + rec()] = toByte((state[8871 + rec()] ?? 0) & 253);
    f.x = state[BLD_WORKER_HEAD + rec()] ?? 0;
    while ((state[UNIT_NEXT_WORKER + f.x] ?? 0) !== 0) {
      if (((state[UNIT_FLAGS + f.x] ?? 0) & 4) !== 0 &&
          ((state[BLD_WORK + rec()] ?? 0) !== 0 || (state[BLD_KIND + rec()] ?? 0) !== 8)) {
        state[8871 + rec()] = toByte((state[8871 + rec()] ?? 0) | 2);
        break;
      }
      f.x = state[UNIT_NEXT_WORKER + f.x] ?? 0;
    }
  }

  state[UNIT_SLOT + id] = -1;
  state[UNIT_NEXT_WORKER + id] = 0;
  input.onRecordWorkerLevel(rec());
  const kind = state[BLD_KIND + rec()] ?? 0;
  input.onGate(1, 127, (state[BLD_X + rec()] ?? 0) + table(24, kind), (state[BLD_Y + rec()] ?? 0) + table(25, kind));

  state[id] = state[UNIT_TARGET_X + id] ?? 0;
  state[UNIT_Y + id] = state[UNIT_TARGET_Y + id] ?? 0;
  state[UNIT_OFFSET_X + id] = 0;
  state[UNIT_OFFSET_Y + id] = 0;
  state[UNIT_DIRECTION + id] = table(111, state[BLD_KIND + rec()] ?? 0);
  const row = input.gridC[state[UNIT_Y + id] ?? 0];
  if (row) row[state[id] ?? 0] = toByte(id);
  state[UNIT_TIMER + id] = 0;
  state[1818 + id] = toByte((state[1818 + id] ?? 0) - 2);
  if ((state[UNIT_TYPE + id] ?? 0) === 59) {
    state[UNIT_JOB_TYPE + id] = 69;
    state[UNIT_HOME_X + id] = state[id] ?? 0;
    state[UNIT_HOME_Y + id] = state[UNIT_Y + id] ?? 0;
  }
  input.onP();
  state[1111 + id] = toByte((state[1111 + id] ?? 0) & 240);
  state[5050 + id] = state[UNIT_SPEED + id] ?? 0;
  input.onSelectionRelease(id);

  if ((state[UNIT_TYPE + id] ?? 0) >= 109) state[UNIT_ORDER + id] = 0;

  if ((input.fP & 3) === 1 && (state[UNIT_SCOUT_SKILL + id] ?? 0) > 3 && input.team === 0 && input.fQ < 7) {
    input.onAuxiliary(id, 0, 1);
    input.onSceneDispatch(61);
    input.onFP(toByte(input.fP | 2));
    return;
  }

  const type = state[UNIT_TYPE + id] ?? 0;
  if (table(160, type) === 69 && type < 109) {
    if (!input.onNeeds()) {
      input.onGate(
        1,
        21,
        clamp((state[id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapWidth - 1),
        clamp((state[UNIT_Y + id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapHeight - 1),
      );
      input.onQ();
    }
    input.onPStep();
    input.onOccupancy(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 0);
    return;
  }

  if ((state[UNIT_ORDER + id] ?? 0) < 2) input.onN();
}
