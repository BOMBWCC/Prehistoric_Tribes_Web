import { BLD_OWNER } from "../../core/DenseLayout";
export type LegacyEntityLinkByteInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly value: number;
  readonly bCube: Int8Array[][];
};

/** Direct translation of final f.a(int,byte), javap offsets 0..111. */
export function writeLegacyEntityLinkByte(input: LegacyEntityLinkByteInput): number {
  const { state, entityId: id } = input;
  let record = id < 51 ? 1 : 31;
  const team = id < 51 ? 0 : 1;
  while (record < 30 && (state[BLD_OWNER + record] ?? 0) !== id) record += 1;

  let slot = 0;
  while (slot < 30 && (input.bCube[team]?.[0]?.[slot] ?? 0) !== record) slot += 1;
  if (slot < 30) input.bCube[team]![4]![slot] = input.value;
  return slot;
}
