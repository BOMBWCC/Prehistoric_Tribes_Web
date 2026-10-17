import { UNIT_FLAGS, UNIT_RECORD, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * Raw port of private b.h(int) (#388), javap offsets 0..162.
 *
 * `4444 = k[2]`; then only for `m` 2 or 7: `7979 = low ? 7979 & 127 :
 * 7979 | 128` with `low = type == 60 || arg == 0 || (type in {2,7} &&
 * (7979 & 128) == 0)` (offsets 49..160: `if_icmpeq 125` for type 60, `ifeq
 * 125` for arg 0). CORRECTED 2026-09-14: the port had the first two tests
 * inverted (`type != 60 && arg != 0` selected the `& 127` side).
 */
export type LegacyEntityHPrefixInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly argument: number;
  readonly k2: number;
  readonly m: number;
};

export function stepLegacyEntityHPrefix(input: LegacyEntityHPrefixInput): void {
  const { state, entityId: id } = input;
  state[UNIT_RECORD + id] = toByte(input.k2);
  if (input.m !== 2 && input.m !== 7) return;

  const type = state[UNIT_TYPE + id] ?? 0;
  const flags = state[UNIT_FLAGS + id] ?? 0;
  const low = type === 60 || input.argument === 0 ||
    ((type === 2 || type === 7) && (flags & 128) === 0);
  state[UNIT_FLAGS + id] = toByte(low ? flags & 127 : flags | 128);
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
