/**
 * Exact private void f.k() (bytecode/f-javap.txt, offsets 0..407): the cursor's hover target.
 * h() calls it after V() every gameplay tick (w != 2 && w != 4). It picks W:B, the unit V()
 * selects on a tap when the cursor cell itself is not selectable -- the "cursor magnetism".
 *
 * The cell under the cursor wins outright if it holds a villager (1..50), or an enemy (>= 51)
 * while a unit is selected (w == 1). Otherwise the 3x3 neighbourhood is scanned and the unit
 * whose sprite offset (e[202+id], e[303+id]) puts it nearest the cursor is taken, enemies only
 * within distance 13; the current W keeps its place on ties. ac:I holds the best distance.
 * Offsets 20..405 sit in a catch-all exception handler, so an off-map cursor just returns.
 */
export type LegacyCursorHoverState = {
  readonly IByte: number;
  readonly yByte: number;
  readonly KByte: number;
  readonly AByte: number;
  /** f.u:Z (#370). */
  readonly uFlag: boolean;
  /** f.w:B (#382). */
  readonly wByte: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** f.W:B (#110). */
  cWByte: number;
  /** f.ac:I (#182). */
  acInt: number;
};

export function stepLegacyCursorHover(state: LegacyCursorHoverState, gridC: Int8Array[], dense: Int8Array): void {
  const x = state.IByte + state.yByte;
  const y = state.KByte + state.AByte;
  const cellAt = (cx: number, cy: number): number | undefined => {
    const row = gridC[cy];
    return row && cx >= 0 && cx < row.length ? row[cx] : undefined;
  };
  const selectable = (cell: number) => (cell >= 51 && state.wByte === 1) || (cell >= 1 && cell <= 50);

  const cell = cellAt(x, y);
  if (cell === undefined) return; // AIOOBE, swallowed
  if (state.uFlag || (cell <= -1 && cell >= -30)) {
    state.cWByte = 0;
    return;
  }

  if (selectable(cell)) {
    state.cWByte = cell;
  } else {
    let found = false;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (x + dx < 0 || y + dy < 0 || x + dx >= state.mapWidth || y + dy >= state.mapHeight) continue;
        const near = cellAt(x + dx, y + dy);
        if (near === undefined) return;
        if (!selectable(near)) continue;
        const ox = dense[202 + near] ?? 0;
        const oy = dense[303 + near] ?? 0;
        const ddy = dy < 0 ? 16 - oy : dy === 0 ? 0 : 16 + oy;
        const ddx = dx < 0 ? 22 - ox : dx === 0 ? 0 : 22 + ox;
        const dist = Math.trunc((ddy * ddy + ddx * ddx) / 2);
        const inReach = dist < 13 || near <= 50;
        if (state.cWByte === near && inReach) {
          state.acInt = dist;
          found = true;
        }
        if (dist < state.acInt && inReach) {
          state.acInt = dist;
          state.cWByte = near;
          found = true;
        }
      }
    }
    if (!found) {
      state.cWByte = 0;
      state.acInt = 1000;
    }
  }

  if (state.cWByte < 50 && state.wByte === 1) state.cWByte = 0;
}
