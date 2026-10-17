import { UNIT_AGE, UNIT_GENDER, UNIT_NAME, UNIT_PORTRAIT } from "../../core/DenseLayout";
import { T_PORTRAIT } from "../../core/DataTables";
/**
 * Direct ports of `final void g(int)` (bytecode/f-javap.txt offsets 0..77)
 * and `final void b(byte)` (offsets 0..163) -- `LegacyRecordAllocator.ts`'s
 * own `onRecordInitialized`/`onRecordIndexed` targets, both called
 * immediately after a new entity record's slot is allocated.
 */
export type LegacyEntityRecordLifecycleInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** f.l:B (#337), already tracked as game.selectedId. */
  readonly focusId: number;
  /** f.a:[Z] (#123), already tracked as game.selectionFlags. */
  readonly selectionFlags: readonly boolean[];
  /** f.b:[Z] (#234), already tracked as game.frameFlags (`entityScanFlags`). */
  readonly frameFlags: boolean[];
};

/** `final void g(int)`: randomized initial value at `state[6868+id]`. */
export function initializeLegacyEntityRecord(input: LegacyEntityRecordLifecycleInput, id: number): void {
  const { state } = input;
  let x: number;
  let value: number;
  if (id === 51 || id === 52) {
    value = -2;
  } else if (id > 51) {
    value = -1;
  } else {
    x = id > 3 ? 1 + input.randomRemainder(65535, 58) : id;
    value = (x % 60) + 60 * (state[UNIT_GENDER + id] ?? 0) - 1;
  }
  state[UNIT_NAME + id] = value;
}

/** `final void b(byte)`: table-driven `state[2727+id]` roll, plus a focus-id flag copy. */
export function indexLegacyEntityRecord(input: LegacyEntityRecordLifecycleInput, id: number): void {
  const { state, packedBytes, packedOffsets } = input;
  let bucket: number;
  if (id >= 51) {
    bucket = id === 51 ? 4 : 3;
  } else if ((state[UNIT_AGE + id] ?? 0) < 12) {
    bucket = 0;
  } else if ((state[UNIT_AGE + id] ?? 0) < 35) {
    bucket = 1;
  } else {
    bucket = 2;
  }

  const tableBase = (packedOffsets[T_PORTRAIT] ?? 0) + (state[UNIT_GENDER + id] ?? 0) * 10 + bucket * 2;
  state[UNIT_PORTRAIT + id] = (packedBytes[tableBase] ?? 0) + input.randomRemainder(255, packedBytes[tableBase + 1] ?? 0);

  if (id === input.focusId) {
    input.frameFlags[4] = input.selectionFlags[4] ?? false;
  }
}
