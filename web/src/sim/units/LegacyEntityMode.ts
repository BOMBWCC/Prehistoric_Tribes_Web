import { BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_WORK, BLD_WORKER_HEAD, UNIT_NEXT_WORKER } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/** Raw port of f.b(int id, boolean enabled). */
export type LegacyEntityModeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** Original b.b((byte)id) status query. */
  readonly onStatusQuery?: (id: number) => void;
  /** Original f.a(linkedId, id, false, false) relation update. */
  readonly onLinkedRecord?: (linkedId: number, id: number, first: boolean, second: boolean) => void;
};

export function setLegacyEntityMode(
  input: LegacyEntityModeInput,
  id: number,
  enabled: boolean,
): void {
  input.onStatusQuery?.(id);
  let linkedId = input.state[BLD_WORKER_HEAD + id];
  while (linkedId > 0) {
    input.onLinkedRecord?.(linkedId, id, false, false);
    linkedId = input.state[UNIT_NEXT_WORKER + linkedId];
  }

  input.state[BLD_WORK + id] = enabled ? 1 : 2;
  if (!enabled) return;

  const tableIndex = 7 + input.state[BLD_LEVEL + id];
  const tableOffset = input.packedOffsets[T_BUILDING] + tableIndex * 26 + input.state[BLD_KIND + id];
  input.state[BLD_MAX_HP + id] = input.packedBytes[tableOffset];
}
