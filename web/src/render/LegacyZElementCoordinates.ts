export type LegacyZElementCoordinatesState = {
  readonly byteRows: readonly Int8Array[];
  readonly shortRows: readonly Int16Array[];
  aI: number;
  aJ: number;
  aK: number;
};

/** Direct mirror of f.a(byte,int,int) coordinate setup, javap offsets 434..577. */
export function prepareLegacyZElementCoordinates(state: LegacyZElementCoordinatesState, entry: number, aD: number, xOffset: number, yOffset: number): void {
  const packed = state.shortRows[1]?.[entry] ?? 0;
  const xBits = ((packed >> 14) & 3) << 7;
  const yBits = ((packed >> 12) & 3) << 7;
  state.aI = packed & 4095;
  state.aJ = state.byteRows[1]?.[entry] ?? 0;
  state.aK = state.byteRows[2]?.[entry] ?? 0;
  if (aD >= 13 && aD <= 16) {
    state.aJ += 120;
    state.aK += 110;
  } else {
    state.aJ += xOffset;
    state.aK += yOffset;
  }
  state.aJ += xBits;
  state.aK += yBits;
}
