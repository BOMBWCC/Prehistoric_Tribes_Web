export type LegacyMapRleInput = {
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly maBytes: Uint8Array;
  readonly maOffsets: readonly number[];
};

export type LegacyRawMap = {
  /**
   * f.e:S (#278) -- the DECODE width, straight from `a[a_s[149] + q*2]`, and
   * the stride `tiles` is laid out with. NOT the same as the logical map
   * width below: `aN()` writes both `e:S` and `c:S` from that table entry
   * (offsets 14..41, a `dup_x1`) and then overrides ONLY `c:S`/`d:S` for
   * q === 0 and q === 5 (offsets 76..115), while its decode loop reads
   * `f:S`/`e:S` (offsets 129/139). The tutorial therefore decodes a 64x48
   * grid that the rest of the game reads as a 40x32 map.
   */
  readonly width: number;
  /** f.f:S (#288) -- the DECODE height, same story. */
  readonly height: number;
  /** f.c:S (#254) -- the logical map width every bounds check uses. */
  readonly logicalWidth: number;
  /** f.d:S (#266) -- the logical map height. */
  readonly logicalHeight: number;
  /** Row-major raw tile values before f.a(3,3) adjustment, `width` per row. */
  readonly tiles: Uint8Array;
  readonly streamSection: number;
  readonly bytesConsumed: number;
};

/**
 * Raw `/ma` tile stream portion of f.aN().  The later terrain adjustment is
 * intentionally injected as a callback: its helper depends on additional
 * decoded tables and is not part of this byte-stream decoder.
 */
export function decodeLegacyMapTiles(input: LegacyMapRleInput, mapIndex: number): LegacyRawMap {
  const { packedBytes, packedOffsets, maBytes, maOffsets } = input;
  const dimensionBase = read(packedOffsets, 149) + mapIndex * 2;
  // BUG FIX (2026-09-09): these overrides used to be applied to the decode
  // dimensions. aN() offsets 14..73 write the table entry into BOTH e:S/c:S
  // and f:S/d:S (two `dup_x1`s), and offsets 76..115 then override only
  // `c:S`/`d:S`. The decode loop at offsets 127..139 iterates `f:S` rows of
  // `e:S` columns -- the UN-overridden pair. Decoding the tutorial at 40 wide
  // instead of 64 sheared every row of the map by 24 tiles.
  const width = read(packedBytes, dimensionBase);
  const height = read(packedBytes, dimensionBase + 1);
  let logicalWidth = width;
  let logicalHeight = height;
  if (mapIndex === 0) {
    logicalWidth = 40;
    logicalHeight = 32;
  } else if (mapIndex === 5) {
    logicalWidth -= 32;
  }
  if (width < 0 || height < 0) throw new RangeError(`Invalid raw map dimensions ${width}x${height}`);

  const sectionIndex = read(packedBytes, read(packedOffsets, 248) + mapIndex) & 0xff;
  const sectionStart = maOffsets[sectionIndex];
  if (!Number.isInteger(sectionStart) || sectionStart < 0 || sectionStart >= maBytes.length) {
    throw new RangeError(`Invalid /ma section index ${sectionIndex}`);
  }

  const tiles = new Uint8Array(width * height);
  let streamCursor = 0;
  let thresholdTableIndex = 0;
  let counter = 10;
  let threshold = read(packedBytes, read(packedOffsets, 197));
  let tile = 0;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      if (counter >= threshold) {
        tile = read(maBytes, sectionStart + streamCursor) & 0xff;
        streamCursor += 1;
        if (tile >= 250) {
          // BUG FIX (2026-09-09): f.aN() offsets 215..216 are
          // `iconst_0; istore 7` -- the run counter is RESET TO ZERO here,
          // and that reset is the entire run-length mechanism. Without it
          // `counter` only ever increments, so `counter >= threshold` stays
          // true forever after the first read and every single cell consumes
          // a fresh stream byte: the /ma stream was being read as raw
          // byte-per-tile instead of RLE, producing garbage terrain for the
          // whole map. Everything downstream inherited it -- gridC's blocked/
          // free marking, which cells the record allocator could write an id
          // into, and the building footprint check.
          counter = 0;
          const marker = tile - 250;
          thresholdTableIndex = marker;
          tile = read(packedBytes, read(packedOffsets, 197) + 6 + marker) & 0xff;
          // The bytecode re-reads `a[a_s[197] + 0 + local8]` on every cell
          // (offsets 147..164); `local8` only changes here, so caching it at
          // the one site that moves it is equivalent.
          threshold = read(packedBytes, read(packedOffsets, 197) + thresholdTableIndex);
        }
      }
      counter += 1;
      tiles[row * width + column] = tile & 0xff;
    }
  }
  return { width, height, logicalWidth, logicalHeight, tiles, streamSection: sectionIndex, bytesConsumed: streamCursor };
}

function read(buffer: Int8Array | Int16Array | Uint8Array, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= buffer.length) {
    throw new RangeError(`legacy map index ${index} outside ${buffer.length}`);
  }
  return buffer[index];
}
