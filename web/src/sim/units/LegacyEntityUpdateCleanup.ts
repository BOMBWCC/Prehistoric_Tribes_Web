import { BLD_LEVEL, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK } from "../../core/DenseLayout";
/** Raw port of b.ad() for the current b.v entity and b.x association index. */
export type LegacyEntityUpdateCleanupInput = {
  readonly state: Int8Array;
  readonly subsystemG: Int8Array[];
  readonly id: number;
  readonly associationIndex: number;
  /** Original f.a(id, 0) state/position callback. */
  readonly onEntityReset?: (id: number, mode: number) => void;
  /** Original f.d(id) callback after the association is cleared. */
  readonly onEntityFinalize?: (id: number) => void;
};

/** Exact field writes and callback ordering observed in b.ad(). */
export function cleanupLegacyEntityUpdate(input: LegacyEntityUpdateCleanupInput): void {
  const { state, id, associationIndex } = input;
  if ((state[9054 + id] & 1) === 0) {
    input.onEntityReset?.(id, 0);
    if (state[BLD_WORK + id] === 1) state[BLD_LEVEL + id] = toByte(state[BLD_LEVEL + id] + 1);
  }
  state[9054 + id] = toByte(state[9054 + id] & 254);
  state[BLD_WORK + id] = 0;
  state[BLD_OWNER + id] = state[BLD_PLANNED_KIND + id];
  state[BLD_PLANNED_KIND + id] = 0;
  input.subsystemG[0][associationIndex] = 0;
  input.onEntityFinalize?.(id);
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
