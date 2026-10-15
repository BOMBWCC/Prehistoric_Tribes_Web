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

/**
 * private void o() (bytecode/f-javap.txt line 3154), per cell in row-major
 * order: gridB < 175 draws that terrain piece, otherwise a(gridB, 0); then a
 * gridC value in [-123, -1] -- buildings, resources, markers -- goes to
 * a(gridC, 0).
 *
 * Deviations kept from the earlier port: the whole window is redrawn (the
 * original walks aj..al x ak..am and, under D:Z, only cells flagged in
 * a:[[Z]), because f.n()'s partial blit is not wired; cells past the map
 * edge are skipped, which is what s:Z + b(int,int) do in the original.
 */
export function renderLegacyMap(input: LegacyMapRenderInput, viewport: LegacyMapViewport): void {
  const maxColumns = Math.min(viewport.columns, Math.max(0, input.width - viewport.column));
  const maxRows = Math.min(viewport.rows, Math.max(0, input.height - viewport.row));
  for (let ai = 0; ai < maxRows; ai += 1) {
    const row = viewport.row + ai;
    for (let ah = 0; ah < maxColumns; ah += 1) {
      const column = viewport.column + ah;
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
