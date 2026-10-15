/** Raw private b.e() selector used by b.v() before b.y(). */
export type LegacyEntityESelectionInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  /** b(int) (#340). */
  readonly readStatus: (id: number) => number;
  /** c(int) (#359). */
  readonly readRecordCheck: (record: number) => boolean;
  /** a(int) (#288), the nearest-building pick, given the record's kind. */
  readonly readSecondaryCheck?: (kind: number) => boolean;
  /** g(int) (#384). */
  readonly onG?: (value: number) => void;
  /** Q() (#253). */
  readonly onQ?: () => void;
};

function tableByte(bytes: Int8Array, offsets: Int16Array, table: number, index: number): number {
  return bytes[(offsets[table] ?? 0) + index] ?? 0;
}

/**
 * Direct translation of b.e() (bytecode/b-javap.txt 12641, offsets 0..596).
 * b.v() returns when it is true and otherwise runs y().
 * CORRECTED 2026-09-27: offsets 165..270 increment e[8932 + record] when the
 * record is not the unit's own or is an idle kind-2 record (the port called
 * an unwired onRecordCounter for the opposite case only); and the method
 * ends at offset 569 -- the a(x,y,0)/p() tail the port ran after it is
 * y()'s gate2 (LegacyEntityFollowup.ts), so it has been removed here (its
 * a(x,y,0) was overwriting b.z on every true return).
 */
export function stepLegacyEntityESelection(input: LegacyEntityESelectionInput): boolean {
  const { state, entityId: id, packedBytes, packedOffsets } = input;
  const type = state[2828 + id] ?? 0;
  const mode = (state[2929 + id] ?? 0) & 0xff;
  if (tableByte(packedBytes, packedOffsets, 39, type) !== 1 ||
      (state[4040 + id] ?? 0) <= 0 || mode < 8 ||
      (state[3131 + id] ?? 0) !== (state[id] ?? 0) ||
      (state[3232 + id] ?? 0) !== (state[101 + id] ?? 0)) {
    return mode <= 7;
  }

  const record = state[4444 + id] ?? 0;
  if (input.readRecordCheck(record)) {
    state[2929 + id] = input.readStatus(id);
    if ((state[8810 + record] ?? 0) !== id ||
        ((state[8749 + record] ?? 0) === 2 && (state[8627 + record] ?? 0) === 0)) {
      state[8932 + record] = ((((state[8932 + record] ?? 0) + 1) & 0xff) ^ 0x80) - 0x80;
    }
    state[606 + id] = state[4040 + id] ?? 0;
    state[1313 + id] = -1;
    state[4040 + id] = -100;
    state[1111 + id] = (state[1111 + id] ?? 0) & 0xf0;
    state[4848 + id] = 0;
    return true;
  }

  const table41 = tableByte(packedBytes, packedOffsets, 41, type);
  if (table41 === 0 && type !== 69 && (state[8749 + record] ?? 0) !== 11) {
    if (input.readSecondaryCheck?.(state[8749 + record] ?? 0)) input.onG?.(1);
  } else if (table41 !== 0 && (table41 < 13 || table41 > 15)) {
    // Offsets 475..566: `t41 == 0` or 13..15 skip Q(). CORRECTED 2026-10-10
    // (oracle run 7, frame 20221): the port had the range inverted.
    input.onQ?.();
  }

  return true;
}
