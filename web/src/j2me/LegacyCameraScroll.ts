/**
 * Raw port of private f.n(), the per-tick camera pixel-scroll handler.
 * bytecode/f-javap.txt offsets 0..456 (private void n()).
 *
 * Field names below use the original single-letter identifiers with a
 * distinguishing suffix only where the same short name is reused by another
 * field of a different type elsewhere in `f` (a real, repeated pattern in
 * this obfuscated class -- see e.g. `i:B`/`i:I`/`i:Z` documented in
 * docs/unknowns.md). `followFlag` here is bytecode field `A:Z` (constant
 * pool #36), distinct from the `A:I` (#35) and `A:B` (#34) fields read
 * elsewhere (paint()'s blit call and aK()/w() respectively).
 */
export type LegacyCameraScrollState = {
  /** f.ag:I -- pending row scroll delta. */
  rowScrollDelta: number;
  /** f.af:I -- pending column scroll delta. */
  columnScrollDelta: number;
  /** f.aj:I -- output sub-tile pixel column offset. */
  pixelColumnOffset: number;
  /** f.ak:I -- output sub-tile pixel row offset. */
  pixelRowOffset: number;
  /** f.al:I -- scroll target column fed to o(). */
  scrollTargetColumn: number;
  /** f.am:I -- scroll target row fed to o(). */
  scrollTargetRow: number;
  /** f.A:Z (#36) -- one-shot "recenter camera, full redraw" trigger. */
  followFlag: boolean;
  /** f.C:Z (#41) -- one-shot trigger for a fixed 3-row scroll-back redraw. */
  cFlag: boolean;
  /** f.B:Z (#39) -- one-shot trigger for a full-window redraw with f.D held. */
  bFlag: boolean;
  /** f.D:Z (#44) -- transient flag held true only during f.B's o() call. */
  dFlag: boolean;
  /** f.ai:I (#199) -- reset to 0 by this method; no other reader confirmed yet. */
  aiScratch: number;
  /** f.s:Z (#365) -- shared skip/fade flag also read by paint()'s v!=1 branch. */
  sFlag: boolean;
};

export type LegacyCameraScrollViewport = {
  /** f.O:B (#83) -- viewport column count (LegacyGameState.viewportO). */
  readonly columns: number;
  /** f.P:B (#87) -- viewport row count (LegacyGameState.viewportP). */
  readonly rows: number;
};

export type LegacyCameraScrollCallbacks = {
  /** private void o() -- the already-ported LegacyMapRenderer-driven redraw. */
  readonly onRedraw?: () => void;
  /**
   * private static boolean a(Graphics,Image,int,int,int,int,int,int,int) --
   * unconfirmed composite-blit helper shared with paint()'s offset-8 call.
   * `heightArg` is the raw value of field `A:I` (#35) at call time; its
   * exact role in the helper is not yet confirmed (do not guess).
   *
   * The two call sites in f.n() swap which offscreen Graphics/Image slot
   * (c[0] vs c[1]) is source and which is target -- `graphicsSlot`/
   * `imageSlot` report the exact `c[]` index each call read, so a future
   * wiring can tell them apart without guessing which one is "right".
   */
  readonly onPartialBlit?: (
    destX: number,
    destY: number,
    heightArg: number,
    graphicsSlot: 0 | 1,
    imageSlot: 0 | 1,
  ) => void;
};

/** Exact f.n() control flow; see bytecode/f-javap.txt offsets 0..456. */
export function stepLegacyCameraScroll(
  state: LegacyCameraScrollState,
  viewport: LegacyCameraScrollViewport,
  heightArg: number,
  callbacks: LegacyCameraScrollCallbacks = {},
): void {
  if (state.rowScrollDelta !== 0 && state.columnScrollDelta !== 0) state.followFlag = true;
  state.pixelColumnOffset = 0;
  state.pixelRowOffset = 0;

  if (state.followFlag) {
    state.followFlag = false;
    state.cFlag = false;
    state.scrollTargetColumn = viewport.columns - 1;
    state.scrollTargetRow = viewport.rows - 1;
    state.rowScrollDelta = 0;
    state.columnScrollDelta = 0;
    callbacks.onRedraw?.();
  } else {
    stepScrollBranches(state, viewport, heightArg, callbacks);
  }

  // Offsets 405..455, reached from both paths (the A:Z branch ends in
  // `goto 405`): copy the redrawn map layer back into the clean image.
  if (state.scrollTargetRow !== -1 && !state.sFlag) {
    callbacks.onPartialBlit?.(0, 0, heightArg, 0, 1);
  }
}

/** Offsets 83..404: restore the shifted clean map, then redraw what changed. */
function stepScrollBranches(
  state: LegacyCameraScrollState,
  viewport: LegacyCameraScrollViewport,
  heightArg: number,
  callbacks: LegacyCameraScrollCallbacks,
): void {
  state.aiScratch = 0;
  state.scrollTargetRow = -1;
  if (state.columnScrollDelta !== 0) {
    state.pixelColumnOffset = -state.columnScrollDelta * 22;
  } else if (state.rowScrollDelta !== 0) {
    state.pixelRowOffset = -state.rowScrollDelta * 16;
  }
  callbacks.onPartialBlit?.(state.pixelColumnOffset, state.pixelRowOffset, heightArg, 1, 0);

  if (state.columnScrollDelta !== 0) {
    state.pixelColumnOffset = (Math.trunc((state.columnScrollDelta - 2) / 2) + 1) * (viewport.columns - 1);
    state.scrollTargetColumn = state.pixelColumnOffset;
    state.pixelRowOffset = 0;
    state.scrollTargetRow = viewport.rows - 1;
    state.columnScrollDelta = 0;
    callbacks.onRedraw?.();
  }
  if (state.rowScrollDelta !== 0) {
    state.pixelRowOffset = (Math.trunc((state.rowScrollDelta - 2) / 2) + 1) * (viewport.rows - 1);
    state.scrollTargetRow = state.pixelRowOffset;
    state.pixelColumnOffset = 0;
    state.scrollTargetColumn = viewport.columns - 1;
    state.rowScrollDelta = 0;
    callbacks.onRedraw?.();
  }
  if (state.cFlag) {
    state.cFlag = false;
    state.pixelColumnOffset = 0;
    state.scrollTargetColumn = viewport.columns - 1;
    state.pixelRowOffset = viewport.rows - 1 - 3;
    state.scrollTargetRow = viewport.rows - 1;
    callbacks.onRedraw?.();
  }
  if (state.bFlag) {
    state.bFlag = false;
    state.pixelColumnOffset = 0;
    state.scrollTargetColumn = viewport.columns - 1;
    state.pixelRowOffset = 0;
    state.scrollTargetRow = viewport.rows - 1;
    state.dFlag = true;
    callbacks.onRedraw?.();
    state.dFlag = false;
  }
}
