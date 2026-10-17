import { UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
/** Raw port of private b.g(int), javap offsets 0..317. */
export type LegacyEntityGPrefixInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly argument: number;
  readonly partition: number;
  readonly currentI: number;
  readonly fQ: number;
  readonly fFlag: number;
  readonly readEntityCell: (row: number, column: number) => number;
  readonly onD?: (entityId: number, argument: number) => void;
  readonly onU?: () => void;
  readonly onCalculateM?: (x: number, y: number, flag: boolean) => number;
  readonly readL?: () => number;
  readonly onQ?: () => void;
  readonly onAByteIntInt?: (value: number, entityId: number, second: number) => void;
  readonly onH?: (argument: number) => void;
};

export type LegacyEntityGPrefixResult = "returned" | "h";

export function stepLegacyEntityGPrefix(input: LegacyEntityGPrefixInput): LegacyEntityGPrefixResult {
  const { state, entityId: id } = input;
  if ((state[UNIT_ORDER + id] ?? 0) > 1) {
    state[UNIT_ORDER + id] = toByte((state[UNIT_ORDER + id] ?? 0) === 2 ? 1 : 0);
    if ((input.currentI === 1 || input.currentI === 2) ||
        (input.fQ === 2 && input.partition === 1 && input.fFlag === 1)) {
      state[7777 + id] = 3;
    }
  }

  if (input.argument < 3) input.onD?.(id, input.argument);
  if (input.readEntityCell(state[UNIT_Y + id] ?? 0, state[id] ?? 0) !== id) {
    input.onU?.();
    return "returned";
  }

  input.onCalculateM?.(state[UNIT_TARGET_X + id] ?? 0, state[UNIT_TARGET_Y + id] ?? 0, input.argument > 0);
  const l = input.readL?.() ?? 0;
  // Offsets 205..222: `if (l < 0) goto 312; if (l == 10 && arg >= 2) goto 312;`
  // and 312 is `h(arg); return`. CORRECTED 2026-09-14: the port had this
  // inverted (reset + Q() for l < 0, h() otherwise); it only looked right
  // while `private byte a()` was unported and l was always 0.
  if (l < 0 || (l === 10 && input.argument >= 2)) {
    input.onH?.(input.argument);
    return "h";
  }
  state[UNIT_TARGET_X + id] = state[id] ?? 0;
  state[UNIT_TARGET_Y + id] = state[UNIT_Y + id] ?? 0;
  input.onQ?.();
  if ((state[UNIT_ORDER + id] ?? 0) === 1) input.onAByteIntInt?.(l, id, id);
  return "returned";
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
