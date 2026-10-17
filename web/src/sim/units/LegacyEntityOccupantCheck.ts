import { UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
/**
 * Direct port of private boolean c(byte) (bytecode/b-javap.txt offsets
 * 0..290), `an()`'s own compatibility check for the entity currently
 * occupying a target cell (see `LegacySubsystemAn.ts`).
 *
 * Two independent accept paths:
 *  - offsets 0..108: if the occupant argument equals `state[4747+id]`
 *    (this entity's own recorded target/owner) AND the entity's own type
 *    is NOT one of `{10,12,13,15,16}`, accept immediately.
 *  - offsets 109..290: otherwise, only proceeds when type IS in
 *    `[10,16]` and the occupant argument is in `[-110,-61]` (a raw
 *    negative-id range, matching the negative-entity-id convention used
 *    elsewhere in this project). Computes `local2` from a packed-table
 *    lookup keyed by `state[9772-arg]`, then accepts when either
 *    `(type===12||type===16) && (local2===12||local2===16) &&
 *    state[9822-arg]>0`, or `state[9872-arg]>0 && local2===type`.
 */
export type LegacyEntityOccupantCheckInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
};

export function checkLegacyEntityOccupant(input: LegacyEntityOccupantCheckInput, occupant: number): boolean {
  const { state, packedBytes, packedOffsets, id } = input;
  const type = state[UNIT_TYPE + id] ?? 0;
  const typeExcluded = type === 10 || type === 12 || type === 13 || type === 15 || type === 16;

  if ((occupant === (state[UNIT_WORK_TARGET + id] ?? 0)) && !typeExcluded) return true;

  if (type < 10 || type > 16) return false;
  if (occupant > -61 || occupant < -110) return false;

  const local2 = packedBytes[
    (packedOffsets[16] ?? 0) + (packedBytes[(packedOffsets[17] ?? 0) + 3] ?? 0) + (state[9772 - occupant] ?? 0)
  ] ?? 0;

  if ((type === 12 || type === 16) && (local2 === 12 || local2 === 16) && (state[9822 - occupant] ?? 0) > 0) {
    return true;
  }
  return (state[9872 - occupant] ?? 0) > 0 && local2 === type;
}
