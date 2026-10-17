/** Exact mode 1..4 write segment of b.a(int,int,int,int), offsets 576..689. */
export type LegacyAuxiliaryModeWriteInput = {
  readonly mode: number;
  /** b.B after the common map probe. */
  readonly B: number;
  readonly x: number;
  readonly y: number;
  readonly offsetX: number;
  readonly offsetY: number;
  /** b.v selects the entity-relative dense slot. */
  readonly v: number;
  readonly dense: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onMode4Continuation?: () => void;
};

function javaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export type LegacyAuxiliaryModeWriteResult = {
  readonly accepted: boolean;
  /** True when the original method returns at bytecode 687. */
  readonly returnedTrue: boolean;
};

export function applyLegacyAuxiliaryModeWrites(
  input: LegacyAuxiliaryModeWriteInput,
): LegacyAuxiliaryModeWriteResult {
  const { mode, dense } = input;
  if (mode < 1 || mode > 4) return { accepted: false, returnedTrue: false };
  if (mode === 4 && input.B !== 0 && (input.B < 95 || input.B > 114)) {
    return { accepted: false, returnedTrue: false };
  }

  const xBase = input.packedOffsets[mode === 2 ? 112 : 31] ?? 0;
  const yBase = input.packedOffsets[mode === 2 ? 113 : 32] ?? 0;
  const direction = mode === 3 ? ((dense[8282 + input.v] ?? 0) & 1) : 0;
  dense[xBase + input.v + input.x + input.offsetX + direction] = javaByte(
    input.x + input.offsetX + direction,
  );
  dense[yBase + input.v + input.y + input.offsetY] = javaByte(
    input.y + input.offsetY,
  );

  if (mode >= 1 && mode <= 3) return { accepted: true, returnedTrue: true };
  input.onMode4Continuation?.();
  return { accepted: true, returnedTrue: false };
}
