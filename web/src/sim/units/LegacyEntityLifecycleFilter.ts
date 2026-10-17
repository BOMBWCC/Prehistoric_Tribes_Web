import { BLD_KIND, BLD_WORK, BLD_WORKER_HEAD, UNIT_HELD_ITEM, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_SLOT } from "../../core/DenseLayout";
/** Raw port of f.a(int,boolean), javap offsets 0..247. */
export type LegacyEntityLifecycleFilterInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  readonly enabled: boolean;
  readonly onAction?: (record: number, entityId: number, first: number, second: number) => void;
};

function packed(input: LegacyEntityLifecycleFilterInput, offset: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[offset] ?? 0) + index] ?? 0;
}

export function filterLegacyEntityLifecycle(input: LegacyEntityLifecycleFilterInput): void {
  const { state, entityId: id } = input;
  let record = state[BLD_WORKER_HEAD + id] ?? 0;
  while (record > 0) {
    if ((state[UNIT_SLOT + record] ?? 0) === 0 && !input.enabled) {
      record = state[UNIT_NEXT_WORKER + record] ?? 0;
      continue;
    }
    if ((state[BLD_KIND + id] ?? 0) === 11 && (state[BLD_WORK + id] ?? 0) === 0 &&
        packed(input, 18, state[UNIT_HELD_ITEM + record] ?? 0) !== 0) {
      record = state[UNIT_NEXT_WORKER + record] ?? 0;
      continue;
    }
    if ((state[UNIT_MODE + record] ?? 0) !== -108) {
      const mode = state[UNIT_MODE + record] ?? 0;
      const type = state[BLD_KIND + id] ?? 0;
      const association = state[UNIT_SLOT + record] ?? 0;
      const first = packed(input, 173, packed(input, 174, type) + association);
      const second = packed(input, 176, packed(input, 177, type) + association);
      if (mode !== first && mode !== second) input.onAction?.(record, id, 0, 0);
    }
    record = state[UNIT_NEXT_WORKER + record] ?? 0;
  }
}
