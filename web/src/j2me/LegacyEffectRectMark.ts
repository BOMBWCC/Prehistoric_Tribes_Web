/**
 * Exact `final void c(int,int,int,int)`, bytecode/f-javap.txt offsets
 * 0..72. Two independently-found call sites: `LegacyEffectSlotScan.ts`'s
 * `onRect` callback (`f.s()`'s slot-expiry handler, called as
 * `c(x, y+1, width, height)`) and `LegacyFrameProgressionScan.ts`'s
 * `onExpireCell` callback (`f.j()`'s gridC sweep, called as
 * `c(column, row, 1, 1)` -- i.e. the general rectangle case degenerates to
 * a single cell there). Confirmed the same method by matching signature
 * (Java disallows two methods with an identical signature in one class).
 *
 * For every (x,y) in the rectangle `[arg1, arg1+arg3) x [arg2, arg2+arg4)`,
 * marks `boolGrid[y-originRow][x-originColumn] = true` when an unresolved
 * `private boolean a(int,int)` (#446, exposed as `isBlocked`) predicate
 * holds for that cell; unconditionally sets a `B:Z` (#39) flag afterward
 * regardless of whether anything was marked.
 */

export type LegacyEffectRectMarkState = {
  /** f.a:[[Z] (#129) -- unresolved 2D boolean grid, distinct from every other `a`-named field in this cluster. */
  readonly boolGrid: boolean[][];
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.B:Z (#39). */
  B: boolean;
};

export type LegacyEffectRectMarkCallbacks = {
  /** private boolean a(int,int) (#446) -- unresolved; NOT confirmed to be the same as LegacyOccupancyClass's f.a(int,int), which returns a byte class (0/1/2), not boolean. */
  readonly isBlocked?: (x: number, y: number) => boolean;
};

export function stepLegacyCRect(
  x: number,
  y: number,
  width: number,
  height: number,
  state: LegacyEffectRectMarkState,
  callbacks: LegacyEffectRectMarkCallbacks = {},
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (callbacks.isBlocked?.(column, row)) {
        const gridRow = state.boolGrid[row - state.originRow];
        if (gridRow) gridRow[column - state.originColumn] = true;
      }
    }
  }
  state.B = true;
}
