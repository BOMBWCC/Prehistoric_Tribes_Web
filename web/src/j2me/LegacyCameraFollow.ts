/**
 * Raw port of private f.Y(), bytecode/f-javap.txt offsets 0..385. The real
 * camera-pan driver: moves a viewport-relative cursor (`y:B`/`A:B`) toward
 * a target (`C:B`/`D:B`) one step at a time, and only pans the map origin
 * (`I:B`/`K:B`) -- while ALSO setting `af:I`/`ag:I` to +-1, the exact
 * scroll-delta signal `f.n()` (LegacyCameraScroll.ts) consumes to animate
 * the pan -- once the cursor has reached the edge of the current viewport.
 * `f.n()` itself never touches `I:B`/`K:B`; this method is what actually
 * decides "pan the camera".
 *
 * Direction fields confirmed directly from `keyPressed`'s bytecode
 * (offsets 344..424 of `bytecode/f-javap.txt`'s `keyPressed(int)`), cross-
 * checked against standard MIDP `Canvas.getGameAction()` constants
 * (UP=1, DOWN=6, LEFT=2, RIGHT=5): `e:Z` (#285) = UP, `f:Z` (#295) = DOWN,
 * `g:Z` (#305) = LEFT, `h:Z` (#310) = RIGHT -- matching
 * `LegacyGameState.ts`'s `inputUp`/`inputDown`/`inputLeft`/`inputRight`
 * (set alongside these exact fields at the same key-press cases), NOT the
 * unrelated, already-claimed `eFlag`/`fFlag` fields elsewhere in that file.
 * `B:Z` (#39) is confirmed the SAME field `LegacyCameraScroll.ts`'s
 * `bFlag` already reads (identical index in both methods' bytecode).
 */
export type LegacyCameraFollowState = {
  /** f.B:Z (#39) -- shared with LegacyCameraScrollState's bFlag. */
  readonly cameraBFlag: boolean;
  /** f.e:Z (#285) -- UP. */
  readonly inputUp: boolean;
  /** f.f:Z (#295) -- DOWN. */
  readonly inputDown: boolean;
  /** f.g:Z (#305) -- LEFT. */
  readonly inputLeft: boolean;
  /** f.h:Z (#310) -- RIGHT. */
  readonly inputRight: boolean;
  /** f.y:B (#387) -- viewport-relative cursor column offset. */
  cursorColumn: number;
  /** f.A:B (#34) -- viewport-relative cursor row offset. */
  cursorRow: number;
  /** f.C:B (#42) -- cursor target column. */
  readonly cursorTargetColumn: number;
  /** f.D:B (#45) -- cursor target row. */
  readonly cursorTargetRow: number;
  /** f.I:B (#60) -- map origin column, mutated on pan. */
  originColumn: number;
  /** f.K:B (#68) -- map origin row, mutated on pan. */
  originRow: number;
  /** f.af:I (#192) -- set to +-1 on a column pan, consumed by f.n(). */
  columnScrollDelta: number;
  /** f.ag:I (#194) -- set to +-1 on a row pan, consumed by f.n(). */
  rowScrollDelta: number;
  /** f.c:S (#254) -- map width in tiles. */
  readonly mapWidth: number;
  /** f.d:S (#266) -- map height in tiles. */
  readonly mapHeight: number;
  /** f.O:B (#83) -- viewport column count. */
  readonly viewportColumns: number;
  /** f.P:B (#87) -- viewport row count. */
  readonly viewportRows: number;
  /** f.a:[Z] (#123), index 4 read -- the delayed-action queue flags. */
  readonly selectionFlags: readonly boolean[];
  /** f.ba:I (#248). */
  readonly selectionBa: number;
};

export function stepLegacyCameraFollow(state: LegacyCameraFollowState): void {
  if (state.cameraBFlag) return;

  if (state.inputUp) {
    if (state.cursorRow > state.cursorTargetRow) {
      state.cursorRow -= 1;
      return;
    }
    // Offsets 206..239: pan when `(K > 0 && !a[4]) || (K > 1 && a[4])`.
    // FIXED 2026-10-07: was `K <= 0 || (K <= 1 && a[4])` (both tests
    // inverted), so UP never scrolled the map up from row 1 or more.
    if ((state.originRow > 0 && !state.selectionFlags[4]) || (state.originRow > 1 && state.selectionFlags[4])) {
      state.originRow -= 1;
      state.rowScrollDelta = -1;
      return;
    }
    if (state.cursorRow > 0) {
      state.cursorRow -= 1;
      return;
    }
    return;
  }

  if (state.inputDown) {
    if (state.cursorRow < state.cursorTargetRow) {
      state.cursorRow += 1;
      return;
    }
    if (state.originRow < state.mapHeight - state.viewportRows - 1 - (state.selectionBa >> 5)) {
      state.originRow += 1;
      state.rowScrollDelta = 1;
      return;
    }
    if (state.originRow + state.cursorRow < state.mapHeight - 2 - (state.selectionBa >> 5)) {
      state.cursorRow += 1;
      return;
    }
    return;
  }

  if (state.inputLeft) {
    if (state.cursorColumn > state.cursorTargetColumn) {
      state.cursorColumn -= 1;
      return;
    }
    if (state.originColumn > 0) {
      state.originColumn -= 1;
      state.columnScrollDelta = -1;
      return;
    }
    if (state.cursorColumn > 0) {
      state.cursorColumn -= 1;
      return;
    }
    return;
  }

  if (state.inputRight) {
    if (state.cursorColumn < state.cursorTargetColumn) {
      state.cursorColumn += 1;
      return;
    }
    if (state.originColumn < state.mapWidth - state.viewportColumns) {
      state.originColumn += 1;
      state.columnScrollDelta = 1;
      return;
    }
    if (state.originColumn + state.cursorColumn < state.mapWidth - 1) {
      state.cursorColumn += 1;
      return;
    }
    return;
  }
}
