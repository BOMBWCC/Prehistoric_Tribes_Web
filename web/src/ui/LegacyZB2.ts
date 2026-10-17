import { subsystemBFreeListInsert } from "../sim/tribe/LegacySubsystemBFreeList";
import { BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_WORK, BLD_WORKER_HEAD, UNIT_NEXT_WORKER } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/**
 * Direct translation of `final void b(int, boolean)` (bytecode/f-javap.txt
 * offsets 0..121, line 23751) -- `af()`'s own `r[as] in {16,26}` handler.
 *
 * **RETRACTED (2026-09-07)**: a 2026-08-22 correction deleted this method's
 * entire body, keeping only the opening `this.a.b((byte)arg1)` call, on the
 * grounds that that call is a guaranteed throw (class b's `g:[[B]` #176
 * believed permanently null) and everything after it is therefore
 * unreachable dead code. `g:[[B]` is allocated by `f.g()`, so nothing here
 * is dead; the linked-list cancel walk and both dense writes are restored
 * from the bytecode. See LegacySubsystemBFreeList.ts and
 * docs/unknowns.md's 2026-09-07 entry.
 */
export type LegacyZB2State = {
  dense: Int8Array;
  readonly gRows: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacyZB2Callbacks = {
  /** b's final void a(int) (#476), forwarded into b.b(byte)'s own tail. */
  readonly onReleaseTenEntity?: (id: number) => void;
  /**
   * f's own `private void a(int,int,boolean,boolean)` (#470) --
   * `stepLegacyEntityRecordCancel`. Called once per linked-list node with
   * `(node, arg1, false, false)`.
   */
  readonly onRecordCancel?: (node: number, owner: number) => void;
};

export function stepLegacyZB2(
  state: LegacyZB2State,
  arg1: number,
  arg2: boolean,
  callbacks: LegacyZB2Callbacks = {},
): void {
  const { dense } = state;

  // Offset 0..9: `this.a.b((byte)arg1)`, result discarded (`pop`).
  subsystemBFreeListInsert(state.gRows, dense, (arg1 << 24) >> 24, {
    onReleaseTenEntity: callbacks.onReleaseTenEntity,
  });

  // Offset 10..44: walk the dense[8993+arg1] chain, cancelling each record.
  let node = dense[BLD_WORKER_HEAD + arg1] ?? 0;
  while (node > 0) {
    callbacks.onRecordCancel?.(node, arg1);
    node = dense[UNIT_NEXT_WORKER + node] ?? 0;
  }

  // Offset 47..65.
  dense[BLD_WORK + arg1] = arg2 ? 1 : 2;

  // Offset 66..120.
  if (!arg2) return;
  const base = (state.packedOffsets[T_BUILDING] ?? 0) + (7 + (dense[BLD_LEVEL + arg1] ?? 0)) * 26;
  dense[BLD_MAX_HP + arg1] = state.packedBytes[base + (dense[BLD_KIND + arg1] ?? 0)] ?? 0;
}
