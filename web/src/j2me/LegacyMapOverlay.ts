export type LegacyMapOverlayInput = {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;
  readonly tileFlags: Int16Array;
  readonly tileKinds: Int8Array;
  readonly mapIndex: number;
  readonly packedBytes?: Int8Array;
  readonly packedOffsets?: Int16Array;
  readonly onSpecialTile?: (type: number, x: number, y: number, parameter: number) => void;
};

export type LegacyMapOverlay = {
  /** Row-major raw f.c overlay values, including Java signed markers. */
  readonly values: Int8Array;
};

/** Exact f.c(int): true for signed markers -110 through -61, inclusive. */
export function isLegacyMapSpecialMarker(value: number): boolean {
  return value <= -61 && value >= -110;
}

/** The first-pass overlay writes from f.aN(), before its later neighbor pass. */
export function buildLegacyMapOverlay(input: LegacyMapOverlayInput): LegacyMapOverlay {
  const { width, height, tiles, tileFlags, tileKinds, mapIndex } = input;
  if (tiles.length !== width * height) throw new RangeError("map tile count does not match dimensions");
  const values = new Int8Array(tiles.length);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const offset = row * width + column;
      const tile = tiles[offset];
      const flag = ((tileFlags[tile] ?? 0) & 0xffff) >>> 13 & 1;
      // BUG FIX (2026-09-09): this condition was INVERTED. f.aN() offsets
      // 304..365 read:
      //   304: iload 6 (tile); sipush 175; if_icmpge 318   -> tile >= 175 marks
      //   312: iload 9 (flag); iconst_1;  if_icmpne 344    -> flag != 1 clears
      //   318: if c[y][x] != -127 then c[y][x] = -126
      //   344: if c[y][x] == -126 then c[y][x] = 0
      // i.e. mark when `tile >= 175 || flag === 1`, clear otherwise. The port
      // marked `tile < 175 && flag !== 1` instead, so ordinary walkable
      // ground got -126 and the real obstacles got cleared -- gridC was
      // inverted across the whole map. Everything that gates on
      // `gridC[y][x] === 0` therefore saw the map inside-out: the record
      // allocator's `if (c[y][x] == 0) c[y][x] = id` (f.a(BBBBB) offsets
      // 1421..1441) silently dropped 5 of the tutorial's 9 starting units,
      // and the building footprint check rejected the tent outright.
      if (tile >= 175 || flag === 1) {
        if (signedByte(values[offset]) !== -127) values[offset] = -126;
      } else if (signedByte(values[offset]) === -126) {
        values[offset] = 0;
      }

      if (mapIndex !== 3) {
        const kind = ((tileKinds[tile] ?? 0) & 0xff) >>> 6 & 3;
        if (kind === 2) values[offset] = -125;
        if (tile >= 180 && tile <= 231) values[offset] = -124;
        if (tile >= 175 && tile <= 179) {
          const specialType = tile - 175 + 1;
          let parameter = 0;
          if (input.packedBytes && input.packedOffsets) {
            const tableOffset = input.packedOffsets[110];
            const parameterIndex = tableOffset + specialType;
            if (parameterIndex < 0 || parameterIndex >= input.packedBytes.length) {
              throw new RangeError(`special tile parameter index ${parameterIndex} outside packed table`);
            }
            parameter = input.packedBytes[parameterIndex];
          }
          input.onSpecialTile?.(specialType, column, row, parameter);
        }
      }

      if (row === 0 || row === height - 1 || column === width - 1) values[offset] = -126;
    }
  }
  return { values };
}

/** The second neighbor pass from f.aN(), using the already-built overlay. */
export function applyLegacyMapNeighborPass(
  /** f.e:S -- the decode stride `tiles`/`overlay` are laid out with. */
  stride: number,
  /** f.d:S -- the LOGICAL map height; this loop's row bound (offset 543). */
  rows: number,
  /** f.c:S -- the LOGICAL map width; this loop runs columns 1..c:S-2 (offset 555). */
  columns: number,
  tiles: Uint8Array,
  overlay: Int8Array,
  denseState: Int8Array,
): void {
  if (overlay.length !== tiles.length) {
    throw new RangeError("map neighbor pass dimensions do not match buffers");
  }
  // BUG FIX (2026-09-09): this used to take one width/height pair and use it
  // for both the stride and the bounds. aN()'s second loop (offsets 536..712)
  // bounds itself with `d:S`/`c:S` -- the LOGICAL dimensions -- while indexing
  // the same `c[[]]`/`b[[]]` grids the first loop filled at the DECODE stride.
  for (let row = 0; row < rows; row += 1) {
    for (let column = 1; column < columns - 1; column += 1) {
      const offset = row * stride + column;
      const marker = signedByte(overlay[offset]);
      // Offsets 572..595: e[9833 + (c + 61) * -1], the kind of node slot
      // -c - 61 (5 = fish). FIXED 2026-10-07: was `9833 - c` (61 cells off,
      // into 9883.., the amounts), so no fish ever got its -127 fishing cells.
      if (!isLegacyMapSpecialMarker(marker) || denseState[9833 - (marker + 61)] !== 5) continue;
      if (isLegacyMapNeighborTile(tiles[offset - 1])) overlay[offset - 1] = -127;
      if (isLegacyMapNeighborTile(tiles[offset + 1])) overlay[offset + 1] = -127;
    }
  }
}

function signedByte(value: number): number {
  const normalized = value & 0xff;
  return normalized >= 0x80 ? normalized - 0x100 : normalized;
}

function isLegacyMapNeighborTile(tile: number): boolean {
  return tile === 33 || tile === 34 || tile === 37 || tile === 38;
}
