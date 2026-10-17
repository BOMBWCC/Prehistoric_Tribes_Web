import { BLD_KIND, BLD_WORK, BLD_X, BLD_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";
/**
 * Raw ports of private f.s() and private boolean f.a(int,int), bytecode
 * offsets 0..309 and 0..45 (bytecode/f-javap.txt). Traced while scoping
 * f.u()'s post-loop tail (which calls both r() and s() after the main
 * visible-window loop finishes, see reverse-engineering/gameplay-paint-cluster.md).
 */

/** Exact f.a(int,int), a trivial viewport bounds check. */
export type LegacyViewportBounds = {
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.O:B (#83). */
  readonly columns: number;
  /** f.P:B (#87). */
  readonly rows: number;
};

export function isLegacyWithinViewport(bounds: LegacyViewportBounds, x: number, y: number): boolean {
  return (
    x >= bounds.originColumn &&
    x < bounds.originColumn + bounds.columns &&
    y >= bounds.originRow &&
    y < bounds.originRow + bounds.rows
  );
}

/**
 * Raw state for f.s(), a fixed 30-slot scan over a *different* entity list
 * from f.u()'s gridC-driven loop -- likely transient effects/animations,
 * not yet confirmed. `slotGrid` is f.e:[[B] (#280, 3 rows x 30 columns,
 * distinct from the 1D f.e:[B] (#286) dense-state array tracked elsewhere
 * as `denseState`).
 */
export type LegacyEffectSlotScanState = LegacyViewportBounds & {
  /** f.e:[[B] (#280) -- row 0: entity id per slot; row 1: a per-slot timer/counter; row 2: a per-slot mode byte. */
  readonly slotGrid: Int8Array[];
  /** f.e:[B] (#286) -- the existing dense-state array. */
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export type LegacyEffectSlotScanCallbacks = {
  /**
   * package void c(int,boolean) -- fires once, when the slot expires
   * (timer>=20) AND its mode byte (row 2) is 3, always with the boolean
   * arg false. CORRECTION (2026-08-25): this note previously said the
   * method was not ported -- it was, on 2026-08-24, as `stepEntityRemoval`
   * (`LegacyRuntimeState.ts`, the same #555 `final void c(int,boolean)`),
   * and wired here as `onModeThreeExpire: (id) => this.stepEntityRemoval(id, false)`.
   * The note just never got updated to say so.
   */
  readonly onModeThreeExpire?: (id: number, flag: false) => void;
  /**
   * package void c(int,int,int,int) -- fires once per slot when it
   * expires (timer>=20). Fully ported as `stepLegacyCRect`
   * (LegacyEffectRectMark.ts) -- the SAME method
   * `LegacyFrameProgressionScan.ts`'s `onExpireCell` also targets. Kept as
   * a callback here (not a direct call) since it needs a `boolGrid`/`B`
   * flag this file's own state doesn't track.
   */
  readonly onRect?: (x: number, y: number, width: number, height: number) => void;
  /**
   * package void d(int) -- fires once per slot when it expires
   * (timer>=20). Fully ported as `stepLegacyD`
   * (LegacyFrameProgressionScan.ts) -- kept as a callback here since it
   * needs `w`/`q`/`P` fields this file's own state doesn't track.
   */
  readonly onSlotAction?: (id: number) => void;
  /** private boolean a(int,int) / isLegacyWithinViewport -- exposed so callers can wire the real viewport. */
  readonly isWithinViewport?: (x: number, y: number) => boolean;
  /**
   * private void d(int,int,int,int) -- LegacyZSubrecordDraw, called once
   * per (col,row) step of the still-animating (timer<20) double loop where
   * isWithinViewport(x+col, y+row) is true.
   */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
};

/**
 * Exact final void a(int,int) (#477), bytecode offsets 0..55. Finds the
 * first free slot in the SAME 30-slot `e:[[B]`(#280) table `s()`/
 * `stepLegacyEffectSlotScan` above scans -- writes `[1][slot]=0`,
 * `[2][slot]=arg2`, `[0][slot]=arg1` (in that order; row 0, the entity id,
 * is written LAST, matching the real bytecode's own write order). No-op
 * if all 30 slots are occupied (no error, no growth).
 */
export function enqueueLegacyEffectSlot(slotGrid: Int8Array[], arg1: number, arg2: number): void {
  for (let slot = 0; slot < 30; slot += 1) {
    if ((slotGrid[0]?.[slot] ?? 0) !== 0) continue;
    if (slotGrid[1]) slotGrid[1][slot] = 0;
    if (slotGrid[2]) slotGrid[2][slot] = toJavaByte(arg2);
    if (slotGrid[0]) slotGrid[0][slot] = toJavaByte(arg1);
    return;
  }
}

/** Exact f.s(), bytecode offsets 0..309. */
export function stepLegacyEffectSlotScan(
  state: LegacyEffectSlotScanState,
  callbacks: LegacyEffectSlotScanCallbacks = {},
): void {
  const withinViewport = callbacks.isWithinViewport ?? ((x, y) => isLegacyWithinViewport(state, x, y));

  for (let slot = 0; slot < 30; slot += 1) {
    const id = state.slotGrid[0]?.[slot] ?? 0;
    if (id === 0) continue;

    const x = state.dense[BLD_X + id] ?? 0;
    const y = (state.dense[BLD_Y + id] ?? 0) - 1;
    const width = state.packedBytes[state.packedOffsets[T_BUILDING] + 104 + (state.dense[BLD_KIND + id] ?? 0)] ?? 0;
    const height = state.packedBytes[state.packedOffsets[T_BUILDING] + 130 + (state.dense[BLD_KIND + id] ?? 0)] ?? 0;

    const timer = state.slotGrid[1]?.[slot] ?? 0;
    if (timer < 20) {
      // Bytecode offsets 189..286: still animating -- step through the
      // sprite's footprint in 2-tile strides and draw record 74 wherever
      // it's currently within the viewport. Rows run to height inclusive (offset 198), columns
      // stop before width (offset 208). CORRECTED 2026-10-16 (pixel comparison, a demolished hut):
      // the column loop was inclusive too, drawing an extra column of dust on the right.
      for (let row = 0; row <= height; row += 2) {
        for (let col = 0; col < width; col += 2) {
          if (withinViewport(x + col, y + row)) {
            const phase = 4 * col + 2 * row + timer - 1;
            callbacks.onSpriteDraw?.(
              74,
              (x + col - state.originColumn) * 22,
              (y + row - state.originRow) * 16,
              phase,
            );
          }
        }
      }
    } else {
      // Bytecode offsets 129..186: timer expired -- free the slot (clear
      // its entity id) and run the one-shot expiry callbacks.
      if (state.slotGrid[0]) state.slotGrid[0][slot] = 0;
      if ((state.slotGrid[2]?.[slot] ?? 0) === 3) {
        callbacks.onModeThreeExpire?.(id, false);
        state.dense[BLD_WORK + id] = 3;
      }
      callbacks.onRect?.(x, y + 1, width, height);
      callbacks.onSlotAction?.(id);
    }

    if (state.slotGrid[1]) {
      state.slotGrid[1][slot] = toJavaByte(timer + 1);
    }
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
