export type LegacyPackedSpritePrimitiveState = {
  readonly byteRows: readonly Int8Array[];
  readonly colorRows: readonly Int8Array[];
  readonly typeOverride: number;
};

export type LegacyPackedSpritePrimitiveCallbacks = {
  readonly onImage?: (group: 0 | 1, index: number, sourceX: number, sourceY: number, width: number, height: number, x: number, y: number, anchor: 20) => void;
  readonly onColor?: (red: number, green: number, blue: number) => void;
  readonly onFillRect?: (x: number, y: number, width: number, height: number) => void;
  readonly onDrawRect?: (x: number, y: number, width: number, height: number) => void;
  readonly onLine?: (x: number, y: number, width: number, height: number) => void;
};

/** Direct raw port of private f.b(int,int,int), offsets 0..632. */
export function drawLegacyPackedSpritePrimitive(
  state: LegacyPackedSpritePrimitiveState,
  id: number,
  x: number,
  y: number,
  callbacks: LegacyPackedSpritePrimitiveCallbacks = {},
): void {
  if (id === 0) return;
  const rows = state.byteRows;
  let type = (rows[20]?.[id] ?? 0) & 31;
  let group: 0 | 1 = 0;
  let forced = false;
  if (state.typeOverride >= 0) {
    if (state.typeOverride === 0 && type === 5) { type = 0; forced = true; }
    else if (state.typeOverride === 4 && type === 14) { type = 4; forced = true; }
    else if (state.typeOverride === 4 && type === 15) { type = 5; forced = true; }
    else if (type === 9) { type = state.typeOverride; forced = true; }
  }
  if (type < 27) {
    group = forced ? 1 : 0;
    callbacks.onImage?.(group, type, (rows[21]?.[id] ?? 0) & 127, rows[22]?.[id] ?? 0, rows[23]?.[id] ?? 0, rows[24]?.[id] ?? 0, x + 11, y + 8, 20);
    return;
  }
  const colorIndex = (((rows[20]?.[id] ?? 0) & 0xff) >> 5) | (((rows[21]?.[id] ?? 0) & 128) >> 4);
  void colorIndex;
  callbacks.onColor?.(0, 0, 0);
  const px = x + ((rows[21]?.[id] ?? 0) & 127);
  const py = y + (rows[22]?.[id] ?? 0);
  const width = rows[23]?.[id] ?? 0;
  const height = rows[24]?.[id] ?? 0;
  if (type === 27) callbacks.onLine?.(px + 11, py + 8, width, height);
  else if (type === 28) callbacks.onDrawRect?.(px + 11, py + 8, width, height);
  else if (type === 29) callbacks.onFillRect?.(px, py, width, height);
  else if (type === 30) callbacks.onFillRect?.(x + (rows[21]?.[id] ?? 0) * 4, y + (rows[22]?.[id] ?? 0) * 4, width * 4, height * 4);
}
