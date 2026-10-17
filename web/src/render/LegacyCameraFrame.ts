import type { Graphics } from "../platform/Graphics";
import { BLD_KIND, BLD_X, BLD_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/**
 * Raw port of private f.w(), bytecode/f-javap.txt offsets 0..496.
 * Two independent halves, both gated separately:
 *
 *  - offsets 0..296 (gated by `letterboxFlag`, bytecode field `u:Z` #370 --
 *    the same field already tracked as `game.boxSelecting`, constant-pool index
 *    confirmed against f.V()'s read of the same field): draws an outlined
 *    rectangle (color 0 inset by 1px, then color 0x10DD64 = 1105252) sized to how far
 *    the current viewport extends past the map bounds -- screen letterboxing
 *    near map edges.
 *  - offsets 297..496 (unconditional): reads the map-grid cell at the
 *    camera-center tile; if the original 3-way classifier
 *    (`private static byte b(int)`, bytecode offsets 28941..28960: -30..-1
 *    -> 0, -31..-60 -> 1, else -> 2) returns 0, draws a 4-corner bracket
 *    (sprite records 6/7/8/9) around that tile via `f.d(int,int,int,int)`
 *    -- the exact same method already ported as
 *    `LegacyZSubrecordDraw.stepLegacyZSubrecordDraw` (confirmed by constant
 *    pool index #572 at every one of its call sites in f-javap.txt).
 *    Exposed here as a callback (`onCorner`) rather than importing that
 *    function directly, so this file stays a standalone, dependency-free
 *    module like the rest of this codebase's Legacy*.ts ports; the wiring
 *    layer should route `onCorner` through `stepLegacyZSubrecordDraw` with
 *    index 6/7/8/9 -- almost certainly the "currently centered tile" cursor
 *    decoration.
 */

export type LegacyCameraFrameLetterboxState = {
  /** f.u:Z (#370) -- same field as LegacyGameState/game.boxSelecting. */
  letterboxFlag: boolean;
  /** f.G:I (#53). */
  boxAnchorColumn: number;
  /** f.H:I (#58). */
  boxAnchorRow: number;
  /** f.I:B (#60). */
  viewportOriginI: number;
  /** f.K:B (#68). */
  viewportOriginK: number;
  /** f.y:B (#387). */
  scrollY: number;
  /** f.A:B (#34) -- distinct from the A:I/A:Z fields used by paint()/n(). */
  scrollA: number;
};

/**
 * Fields f.w() writes but never re-reads ITSELF (f.B:I/C:I/D:I/E:I,
 * #38/#40/#43/#48). NOT scratch-local to w(): confirmed (2026-08-14) these
 * are the SAME fields `LegacyStateMachine.ts`'s `stepLegacyAj` (the port
 * of `f.aJ()`, capital J -- NOT `f.aj()`, a different, unrelated method)
 * reads as `state.B/C/D/E`, and the same fields `aF()`'s loop bounds read.
 * The runtime writes this output back to `game.BCounter/CCounter/
 * DCounter/ECounter`, the same properties `stepEntityActionConfirmation`
 * already threads to `stepLegacyAj`.
 */
export type LegacyCameraFrameLetterboxOutput = {
  b: number;
  c: number;
  d: number;
  e: number;
};

/** Exact f.w() offsets 0..296. Draws directly into `graphics` when triggered. */
export function stepLegacyCameraLetterbox(
  state: LegacyCameraFrameLetterboxState,
  graphics: Graphics,
): LegacyCameraFrameLetterboxOutput | undefined {
  if (!state.letterboxFlag) return undefined;

  // Offsets 7..40 / 58..91: `G - I > y ? y : G - I`, the box's left (top) edge is the smaller of
  // the anchor and the cursor. CORRECTED 2026-10-15 (found while adding touch box select): this
  // took the larger, so a box dragged right or down started at the cursor and selected the wrong
  // tiles.
  const q = Math.min(state.boxAnchorColumn - state.viewportOriginI, state.scrollY);
  const b = q + state.viewportOriginI - 1;
  const r = Math.min(state.boxAnchorRow - state.viewportOriginK, state.scrollA);
  const c = r + state.viewportOriginK - 1;

  const qPixels = q * 22;
  const rPixels = r * 16;

  let widthSpan = state.viewportOriginI + state.scrollY - state.boxAnchorColumn;
  if (widthSpan < 0) widthSpan = -widthSpan;
  const d = widthSpan + 1;

  let heightSpan = state.viewportOriginK + state.scrollA - state.boxAnchorRow;
  if (heightSpan < 0) heightSpan = -heightSpan;
  const e = heightSpan + 1;

  const width = (widthSpan + 1) * 22;
  const height = (heightSpan + 1) * 16;

  graphics.setColor(0);
  graphics.drawRect(11 + qPixels + 1, 8 + rPixels + 1, width, height);
  graphics.setColor(0x10dd64); // ldc 1105252; was 0x10dee4 until 2026-10-16 (screenshot diff)
  graphics.drawRect(11 + qPixels, 8 + rPixels, width, height);

  return { b, c, d, e };
}

/** private static byte b(int), bytecode offsets 28941..28960. */
export function classifyLegacyCameraCell(value: number): number {
  if (value <= -1 && value >= -30) return 0;
  if (value <= -31 && value >= -60) return 1;
  return 2;
}

export type LegacyCameraFrameCursorState = {
  /** f.c:[[B -- the same map grid tracked elsewhere as gridC. */
  readonly gridC: readonly Int8Array[];
  /** f.K:B (#68). */
  viewportOriginK: number;
  /** f.A:B (#34). */
  scrollA: number;
  /** f.I:B (#60). */
  viewportOriginI: number;
  /** f.y:B (#387). */
  scrollY: number;
  /** f.e:[B -- dense state, same array as LegacyMapMarkerDispatch's `dense`. */
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacyCameraFrameCursorCallbacks = {
  /**
   * One call per corner (index 6/7/8/9, in that exact order): route through
   * `LegacyZSubrecordDraw.stepLegacyZSubrecordDraw(state, index, x, y, phase)`
   * to reach the final sprite-composite draw.
   */
  readonly onCorner?: (index: 6 | 7 | 8 | 9, x: number, y: number, phase: number) => void;
};

/**
 * Exact f.w() offsets 297..496. `animationPhase` is the raw value of field
 * `e:I` (#284) at call time -- confirmed via direct bytecode read (offsets
 * 442/457/472/490) to be `game.animStep`, the same field `f.h()`
 * increments every tick and wraps at 8 (already wired at this method's own
 * call site, `LegacyRuntimeState.ts`'s `stepLegacyCameraCursor` call).
 */
export function stepLegacyCameraCursor(
  state: LegacyCameraFrameCursorState,
  animationPhase: number,
  callbacks: LegacyCameraFrameCursorCallbacks = {},
): void {
  const row = state.gridC[state.viewportOriginK + state.scrollA];
  const cellValue = row ? (row[state.viewportOriginI + state.scrollY] ?? 0) : 0;
  if (classifyLegacyCameraCell(cellValue) !== 0) return;

  const x = ((state.dense[BLD_X - cellValue] ?? 0) - state.viewportOriginI) * 22;
  const y = ((state.dense[BLD_Y - cellValue] ?? 0) - state.viewportOriginK) * 16;

  const denseIndex8749 = state.dense[BLD_KIND - cellValue] ?? 0;
  const width = (state.packedBytes[state.packedOffsets[T_BUILDING] + 104 + denseIndex8749] ?? 0) * 22;
  const height = (state.packedBytes[state.packedOffsets[T_BUILDING] + 130 + denseIndex8749] ?? 0) * 16;

  callbacks.onCorner?.(6, x, y, animationPhase);
  callbacks.onCorner?.(7, x + width, y, animationPhase);
  callbacks.onCorner?.(8, x, y + height, animationPhase);
  callbacks.onCorner?.(9, x + width, y + height, animationPhase);
}
