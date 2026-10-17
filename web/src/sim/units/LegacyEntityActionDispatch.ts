import { UNIT_Y } from "../../core/DenseLayout";
export type LegacyEntityActionDispatchInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly action: number;
  /** Result of the original a(int) selector, including its h field. */
  readonly targetSearch: () => { selected: boolean; found: boolean };
  /** Raw b[row][column] lookup used before the private action call. */
  readonly entityAt?: (row: number, column: number) => number;
  readonly onAction?: (id: number, action: number) => void;
  readonly onMode?: (mode: number) => void;
  readonly onMove?: (action: number, id: number, idAgain: number) => void;
};

/** Exact dispatch shell of b.a(int,byte); private action/movement bodies stay callbacks. */
export function dispatchLegacyEntityAction(input: LegacyEntityActionDispatchInput): boolean {
  const { state, id } = input;
  const target = input.targetSearch();
  if (target.selected) {
    const row = state[UNIT_Y + id] ?? 0;
    const column = state[id] ?? 0;
    const occupant = input.entityAt?.(row, column) ?? id;
    if (occupant !== id) input.onAction?.(id, 87);
    input.onMode?.(1);
    return true;
  }
  if (!target.found) input.onMove?.(input.action, id, id);
  return false;
}
