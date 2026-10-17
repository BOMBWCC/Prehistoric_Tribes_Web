import { T_BUILDING } from "../../core/DataTables";
/** Raw port of f.a(int x, int y, int type, boolean requireTerrainClass). */
export type LegacyFootprintCheckInput = {
  readonly map: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.c/f.d bounds used by the original private b(int,int). */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** Original private a(int,int), returning the raw 2/1/0 bit-plane class. */
  readonly occupancyClass: (x: number, y: number) => number;
};

export function canPlaceLegacyFootprint(
  input: LegacyFootprintCheckInput,
  x: number,
  y: number,
  type: number,
  requireTerrainClass: boolean,
): boolean {
  const tableBase = input.packedOffsets[T_BUILDING];
  const width = input.packedBytes[tableBase + 104 + type];
  const height = input.packedBytes[tableBase + 130 + type];
  let available = true;

  // f.a(int,int,int,boolean) offsets 47..133. Per cell, in this order:
  //   64..76  `b(x+xx, y+yy)` (#533, the bounds test) -- `ifeq 116`, so
  //           OUT OF BOUNDS FAILS. It is not a cell to skip.
  //   79..93  `c[y+yy][x+xx] != 0` -> `ifne 116`, fail.
  //   96..98  `flag == 0` -> `ifeq 119`, pass this cell.
  //  101..113 `a(x+xx, y+yy)` (#447, occupancy class) -> `ifeq 119`, pass.
  //           Otherwise fall through to 116, fail.
  //
  // BUG FIX (2026-09-09), two errors here:
  //  - an out-of-bounds cell used to be skipped entirely (the `if (inBounds)`
  //    wrapper), i.e. treated as placeable;
  //  - the occupancy test was inverted -- it failed when the class was 0,
  //    where the bytecode fails when it is NOT 0.
  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) {
      const cellX = x + xx;
      const cellY = y + yy;
      if (cellX < 0 || cellY < 0 || cellX >= input.mapWidth || cellY >= input.mapHeight) {
        available = false;
      } else if (input.map[cellY][cellX] !== 0) {
        available = false;
      } else if (requireTerrainClass && input.occupancyClass(cellX, cellY) !== 0) {
        available = false;
      }
    }
  }
  return available;
}
