import { UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_MODE, UNIT_TYPE, UNIT_WORK_PROGRESS } from "../../core/DenseLayout";
/** Raw port of b.a(int id, byte type), javap offsets 0..172. */
export type LegacyEntityTypeChangeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly shortTableB: Int16Array;
  readonly shortTableBOffsets: Int16Array;
  readonly entityId: number;
  readonly type: number;
  /** b.B:I (#8), written at offsets 67/95. */
  readonly fields: { B: number };
  readonly onC?: (entityId: number, type: number) => void;
};

export function changeLegacyEntityType(input: LegacyEntityTypeChangeInput): number {
  const id = input.entityId;
  const type = toByte(input.type);
  if (input.state[UNIT_TYPE + id] !== type) {
    input.state[UNIT_WORK_PROGRESS + id] = 0;
    input.state[UNIT_TYPE + id] = type;
    input.state[1111 + id] = toByte(input.state[1111 + id] & 15);
    input.fields.B = deriveLegacyEntityB(input, id, type);
    // Offsets 98..110: C() unless 83 <= type <= 85. CORRECTED 2026-09-15: the
    // port also called it for 83..85 whenever B < 0.
    if (type < 83 || type > 85) input.onC?.(id, type);
  }

  // Offsets 114..171 run even when the type is unchanged (offset 11 jumps
  // here): 3838 = t32[type] == 0 ? id : dense[b[t32[type]] + id] -- e.g. a
  // builder's record (4444). CORRECTED 2026-09-15: this was inside the
  // type-change branch and added `id` to the stored value, so a builder's
  // work landed on record 4444 + id instead of its site.
  const table32 = input.packedBytes[input.packedOffsets[32] + type] ?? 0;
  input.state[3838 + id] = table32 === 0
    ? toByte(id)
    : (input.state[input.shortTableB[table32] + id] ?? 0);
  return input.state[3838 + id] ?? 0;
}

/**
 * Exact private void b.C() (#239), b-javap offsets 0..211, which a(int,byte) runs after a type
 * change (except to 83..85). It works on the AMBIENT v:I, not the id whose type changed: the unit's
 * work kind 3535 follows t40[type] (resetting the carried amount 3636 when it changes), and a type
 * with no kind (-1) clears 3535 once nothing is carried. A builder sitting at the site (type 78,
 * mode 113..116) is left alone. Unported until 2026-10-08 (oracle run 3, frame 3954).
 */
export function stepLegacySubsystemC(
  input: Pick<LegacyEntityTypeChangeInput, "state" | "packedBytes" | "packedOffsets">,
  v: number,
): void {
  const { state } = input;
  const type = state[UNIT_TYPE + v] ?? 0;
  const mode = state[UNIT_MODE + v] ?? 0;
  if (type === 78 && mode >= 113 && mode <= 116) return;
  const kind = input.packedBytes[(input.packedOffsets[40] ?? 0) + type] ?? 0;
  if (kind !== -1) {
    if ((state[UNIT_CARRY_KIND + v] ?? 0) !== kind) {
      state[UNIT_CARRY_AMOUNT + v] = 0;
      state[UNIT_CARRY_KIND + v] = kind;
    }
    return;
  }
  if ((state[UNIT_CARRY_AMOUNT + v] ?? 0) === 0) state[UNIT_CARRY_KIND + v] = 0;
}

/** Value of b.B for the current entity type, including the original fallback. */
export function deriveLegacyEntityB(
  input: Pick<LegacyEntityTypeChangeInput, "state" | "packedBytes" | "packedOffsets" | "shortTableB">,
  entityId: number,
  type: number,
): number {
  let bValue = input.packedBytes[input.packedOffsets[38] + toByte(type)] ?? 0;
  if (bValue < 0) {
    // BUG FIX (2026-09-04): same twin-table swap as above -- bytecode
    // offset 77..95 reads `b:[S]` (#132), not `c:[S]` (#142).
    bValue = input.state[input.shortTableB[-bValue] + entityId] ?? 0;
  }
  return bValue;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
