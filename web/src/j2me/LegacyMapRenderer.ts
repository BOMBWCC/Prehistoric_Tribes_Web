/** Raw map data after f.aN(), including its signed overlay marker plane. */
export type LegacyRenderableMap = {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;
  readonly overlay: Int8Array;
};

export type LegacyMapViewport = {
  /** Original f.I / f.K tile-window origin, in map cells. */
  readonly column: number;
  readonly row: number;
  readonly columns: number;
  readonly rows: number;
};

export type LegacyMapRenderInput = {
  readonly width: number;
  readonly height: number;
  /** f.b:[[B] (#242) and f.c:[[B] (#262): live terrain and occupant grids. */
  readonly gridB: readonly Int8Array[];
  readonly gridC: readonly Int8Array[];
  /** f.a(int,int,int) (#439). */
  readonly onComposite: (record: number, x: number, y: number) => void;
  /** private void a(int,byte) (#441) with byte 0, for cell (ah, ai). */
  readonly onMarker: (value: number, ah: number, ai: number) => void;
};

/** f.o()'s window: f.aj..f.al columns and f.ak..f.am rows, inclusive, relative to f.I / f.K. */
export type LegacyMapRedrawRange = {
  readonly fromColumn: number;
  readonly toColumn: number;
  readonly fromRow: number;
  readonly toRow: number;
};

/**
 * private void o() (bytecode/f-javap.txt line 3154), per cell of the range in row-major order:
 * gridB < 175 draws that terrain piece, otherwise a(gridB, 0); then a gridC value in [-123, -1]
 * -- buildings, resources, markers -- goes to a(gridC, 0).
 *
 * Offsets 38..79: with D:Z set (`dirty` given) only cells flagged in a:[[Z] are drawn, and their
 * flag is cleared. Cells past the map edge are skipped (s:Z + b(int,int) in the original).
 *
 * CORRECTED 2026-10-15 (pixel comparison, play26 frame 37500): this used to redraw the whole
 * window every time. f.n() redraws only the newly exposed column or row after a scroll, the
 * bottom three rows for C:Z and the dirty cells for B:Z, so a cell's detail pieces that reach into
 * a neighbour (pebbles, rock edges) stay on screen in the original; a full redraw painted the
 * neighbour over them.
 */
export function renderLegacyMap(
  input: LegacyMapRenderInput,
  origin: { readonly column: number; readonly row: number },
  range: LegacyMapRedrawRange,
  dirty: boolean[][] | null = null,
): void {
  for (let ai = range.fromRow; ai <= range.toRow; ai += 1) {
    const row = origin.row + ai;
    for (let ah = range.fromColumn; ah <= range.toColumn; ah += 1) {
      if (dirty) {
        const dirtyRow = dirty[ai];
        if (!dirtyRow?.[ah]) continue;
        dirtyRow[ah] = false;
      }
      const column = origin.column + ah;
      if (row < 0 || column < 0 || row >= input.height || column >= input.width) continue;
      const tile = (input.gridB[row]?.[column] ?? 0) & 0xff;
      if (tile < 175) input.onComposite(tile, ah * 22, ai * 16);
      else input.onMarker(tile, ah, ai);
      const cell = input.gridC[row]?.[column] ?? 0;
      if (cell < 0 && cell >= -123) input.onMarker(cell, ah, ai);
    }
  }
}

/** Default visible window for the 240x320 logical surface. */
export const LEGACY_DEFAULT_MAP_VIEWPORT: LegacyMapViewport = {
  column: 0, row: 0, columns: 12, rows: 19,
};
