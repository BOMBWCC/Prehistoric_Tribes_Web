import { UNIT_CARRY_AMOUNT, UNIT_DIRECTION, UNIT_JOB_TYPE, UNIT_MODE, UNIT_RECORD, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/** Raw state-update prefix of private b.w(), javap offsets 0..786. */
export type LegacyEntityWUpdateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** Original f.j[][] rows; ownership is intentionally supplied by caller. */
  readonly jRows: readonly Int8Array[];
  readonly entityId: number;
  readonly team: number;
  readonly mainShort: Int16Array[];
  readonly onC?: (x: number, y: number, value: number) => void;
  readonly onAction?: (x: number, y: number, a: number, b: number) => void;
  readonly onJ?: () => void;
};

function byte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function tableByte(bytes: Int8Array, offsets: Int16Array, table: number, index: number): number {
  return bytes[(offsets[table] ?? 0) + index] ?? 0;
}

export function stepLegacyEntityWUpdate(input: LegacyEntityWUpdateInput): void {
  const { state, entityId: id, packedBytes, packedOffsets } = input;
  const mode = (state[UNIT_MODE + id] ?? 0) & 0xff;
  const type = state[UNIT_TYPE + id] ?? 0;

  state[3030 + id] = byte((state[3030 + id] ?? 0) + 1);
  if (tableByte(packedBytes, packedOffsets, 171, mode) !== -2) {
    state[1111 + id] = byte((state[1111 + id] ?? 0) + 16);
  }

  if (type <= 4 &&
      tableByte(packedBytes, packedOffsets, 26, type) + (state[UNIT_RECORD + id] ?? 0) > 0 &&
      (input.jRows[5]?.[mode] ?? 0) === (state[3030 + id] ?? 0)) {
    const offset = state[UNIT_DIRECTION + id] ?? 0;
    const x = (state[id] ?? 0) + tableByte(packedBytes, packedOffsets, 1, offset);
    const y = (state[UNIT_Y + id] ?? 0) + tableByte(packedBytes, packedOffsets, 1, offset + 8);
    input.onC?.(x, y, input.jRows[6]?.[mode] ?? 0);
  }

  // Offsets 297..338: the strike lands one frame before the attack animation's end, at
  // `3030 == j[4][mode] - 1`. FIXED 2026-10-09 (oracle run 5, frame 12655): the `- 1` was missing,
  // so the animation wrapped first and a raider's throw never happened.
  if ((input.jRows[4]?.[mode] ?? 0) - 1 === (state[3030 + id] ?? 0) && mode >= 35 && mode <= 36) {
    if (type >= 5 && type <= 9) {
      input.onAction?.(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 0, tableByte(packedBytes, packedOffsets, 123, type - 5));
    } else if (type === 93 || type === 92 || type === 106) {
      input.onAction?.(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 24, 37);
    }
  }

  if ((state[UNIT_MODE + id] ?? 0) === 22 &&
      (state[3030 + id] ?? 0) === 10 &&
      type <= 26) {
    if (type < 26) {
      input.mainShort[input.team][23] = (input.mainShort[input.team][23] ?? 0) + (state[UNIT_CARRY_AMOUNT + id] ?? 0);
    }
    input.onJ?.();
  }

  if ((state[UNIT_MODE + id] ?? 0) === -108 && (state[3030 + id] ?? 0) === 6) {
    state[UNIT_JOB_TYPE + id] = 69;
  }
  if ((state[UNIT_MODE + id] ?? 0) === -109 && (state[3030 + id] ?? 0) === 1) {
    state[UNIT_JOB_TYPE + id] = tableByte(packedBytes, packedOffsets, 29, type);
  }
}
