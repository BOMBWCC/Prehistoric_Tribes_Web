import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, UNIT_NEXT_WORKER, UNIT_RECORD, UNIT_SLOT } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Direct translation of `private void G()` (constant pool #243),
 * bytecode/b-javap.txt offsets 0..992 (line 19389): picks the work slot
 * `dense[4646+v]` for entity `v` inside its record `dense[4444+v]`.
 * Callers: `Z()` (a freshly trained unit, `LegacySubsystemUnitTraining.ts`)
 * and `F()` (a unit joining a record, `LegacySubsystemEntityMoveCancel.ts`).
 *
 * b's scratch fields are locals here: `x:B`#231 = record type, `v:B`#226 =
 * default slot, `w:B`#229 = taken count; `i:[B`#189 (the eight slot owners) is the live array,
 * `x:I`#230/`y:I`#233 = loop cursors (every reader re-writes them first).
 *
 *  - 0..104: type; default = `8627==0 ? t138[156+type] : 0`; `w = 8932[rec]`.
 *  - 108..289: walk the record's worker list (8993 head, 4545 next) and
 *    mark each worker's slot -- `4646[n]` when `8627==0`, else
 *    `t93[t94[type] + 4646[n]]`.
 *  - 293..557: if default >= 0 and slot 0 is free: owner `8810[rec]` <= 0
 *    or == v claims the default slot outright (owner == v also bumps 8932)
 *    and returns; otherwise the owner is recorded in the default slot and
 *    `w` grows by one when that owner is stale (`4646[owner] < 0` or its
 *    4444 is a different record).
 *  - 561..688: `4646[v] = f.a(0xFFFFFF, n - w + 1) + 1`, with slot count
 *    `n = 8627==0 ? t138[(9115[rec]-1)*26 + type] : t138[494 + type]`.
 *  - 690..720: type 2 with slot 0 free -> slot 0, return.
 *  - 722..907: turn that 1-based rank into the index of the rank-th free slot.
 *  - 911..991: only when `8627 != 0`: `4646[v] = t95[t96[type] + 4646[v]]`.
 *
 * CORRECTED (2026-09-14): four branches were inverted or invented -- the
 * `n` ternary was swapped, the stale-owner increment fired for a live owner
 * instead of a stale one, and the tail was gated on `rec != 0` and added
 * an extra `+ 4646[v]`. The old test encoded all four.
 */
export type LegacySubsystemEntityTrainingSlotInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  /** class f's `a(int,int)` (#269). */
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /**
   * b.x:I (#230) / b.y:I (#233): G() runs its loops on these fields, and their last values outlive
   * the call (oracle run 5, frame 10727: x stayed at the previous writer's value). Readers all
   * rewrite them first, so only the leftovers matter.
   */
  readonly fields?: { x: number; y: number };
  /** b.i:[B (#189): cleared on entry (offsets 108..141); its last contents outlive the call. */
  readonly owners: Int8Array;
};

export function stepLegacySubsystemEntityTrainingSlot(input: LegacySubsystemEntityTrainingSlotInput): void {
  const { state, packedBytes, packedOffsets, entityId: v } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;

  const recordId = state[UNIT_RECORD + v] ?? 0;
  const kind = state[BLD_KIND + recordId] ?? 0;
  const flagged = (state[BLD_WORK + recordId] ?? 0) !== 0;
  const defaultSlot = flagged ? 0 : table(T_BUILDING, 156 + kind);
  let w = state[BLD_WORKERS + recordId] ?? 0;

  const owners = input.owners;
  owners.fill(0);
  let node = state[BLD_WORKER_HEAD + recordId] ?? 0;
  while (node > 0) {
    const slot = state[UNIT_SLOT + node] ?? 0;
    owners[flagged ? table(93, table(94, kind) + slot) : slot] = node;
    node = state[UNIT_NEXT_WORKER + node] ?? 0;
  }
  // Offsets 108..141 leave x = 8, then 167..289 walk the list in x itself.
  if (input.fields) input.fields.x = node;

  if (defaultSlot >= 0 && owners[0] === 0) {
    const owner = state[BLD_OWNER + recordId] ?? 0;
    if (owner <= 0 || owner === v) {
      if (owner === v) state[BLD_WORKERS + recordId] = (state[BLD_WORKERS + recordId] ?? 0) + 1;
      state[UNIT_SLOT + v] = defaultSlot;
      state[BLD_OWNER + recordId] = v;
      return;
    }
    owners[defaultSlot] = owner;
    if ((state[UNIT_SLOT + owner] ?? 0) < 0 || (state[UNIT_RECORD + owner] ?? 0) !== (state[UNIT_RECORD + v] ?? 0)) {
      w = (w + 1) << 24 >> 24;
    }
  }

  const slotCount = flagged
    ? table(T_BUILDING, 494 + kind)
    : table(T_BUILDING, ((state[BLD_LEVEL + recordId] ?? 0) - 1) * 26 + kind);

  state[UNIT_SLOT + v] = input.randomRemainder(16777215, slotCount - w + 1) + 1;

  if (kind === 2 && owners[0] === 0) {
    state[UNIT_SLOT + v] = 0;
    return;
  }

  let free = 0;
  let slot = 0;
  for (; slot < slotCount; slot += 1) {
    if (owners[slot] === 0) free += 1;
    if ((state[UNIT_SLOT + v] ?? 0) === free) {
      state[UNIT_SLOT + v] = slot;
      break;
    }
  }
  // Offsets 722..907: x is the slot cursor, y the free-slot count.
  if (input.fields) { input.fields.x = slot; input.fields.y = free; }

  if (flagged) {
    state[UNIT_SLOT + v] = table(95, table(96, kind) + (state[UNIT_SLOT + v] ?? 0));
  }
}
