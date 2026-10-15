/** Raw port of b.P(), javap offsets 0..28. */
export function promoteLegacyEntityMode(state: Int8Array, entityId: number, status: number): number {
  const mode = ((status % 7) + 7) % 7 + 8;
  state[2929 + entityId] = toByte(mode);
  return mode;
}

/** Raw port of b.Q(), javap offsets 0..39. */
export function selectLegacyEntityTypeAfterQ(
  state: Int8Array,
  entityId: number,
  onTypeChange?: (entityId: number, type: number) => void,
): number {
  const type = (state[1414 + entityId] ?? 0) >= 12 ? 69 : 17;
  onTypeChange?.(entityId, type);
  return type;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
