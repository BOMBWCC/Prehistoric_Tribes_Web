import { ANIMAL_X, ANIMAL_Y, BLD_X, BLD_Y, UNIT_DIRECTION, UNIT_HP, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_Y } from "../core/DenseLayout";
/**
 * Raw port of private f.r(), bytecode/f-javap.txt offsets 0..780.
 * Called from f.u()'s post-loop tail alongside f.s() (see
 * reverse-engineering/gameplay-paint-cluster.md).
 *
 * A fixed 40-slot scan over `f.d:[[B]` (#268) -- a *third* distinct
 * per-slot 2D array, alongside `f.e:[[B]` (#280, f.s()'s 30-slot list) and
 * the map grids. Per active slot (`slotTable[0][slot] > 0`), computes a
 * world position from one of three dense-state offset families selected by
 * `slotTable[6][slot]`, gates on the already-ported viewport/occupancy
 * checks, and -- for kind 1/2 only -- walks a chain of nested table lookups
 * (`b[3]`/`b[2]`/`b[4]`/`b[8]`, `j[4]`/`j[9]`/`j[12..15]`) whose sole
 * purpose turns out to be finding a frame-specific `(dx,dy)` position
 * correction (`j[12][frame]`/`j[13][frame]`) for the entity's current
 * animation state. The sprite actually drawn is always `slotTable[0][slot]`
 * itself (a fixed per-slot record id, NOT anything computed by that chain);
 * the phase counter `slotTable[1][slot]` increments every call and frees
 * the slot once it reaches `j[9][slotTable[0][slot]]`.
 *
 * A genuinely surprising control-flow detail, preserved exactly: failing
 * the viewport/occupancy/exception gate frees the CURRENT slot and returns
 * from the WHOLE method immediately (bytecode offset 269 `return`), not
 * just a `continue` to the next slot.
 */

export type LegacyAnimatedSlotScanState = {
  /** f.d:[[B] (#268). Rows seen: 0 record id, 1 phase counter, 2 packed
   *  nibble/state byte, 5 aq-index, 6 kind selector (0 default / 1 / 2). */
  readonly slotTable: Int8Array[];
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.b:[[S] (#244) -- the same packed short 2D table as `packedData.shortTables`. */
  readonly shortTable2D: readonly Int16Array[];
  /** f.b:[S] (#245) -- a *different*, 1D short array also named `b`. */
  readonly shortTable1D: Int16Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.j:[[B] (#326), the existing packed byte tables (rows 4,9,12,13,14,15 read here). */
  readonly byteRows: readonly Int8Array[];
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
};

export type LegacyAnimatedSlotScanCallbacks = {
  /** private boolean a(int,int) / isLegacyWithinViewport. */
  readonly isWithinViewport?: (x: number, y: number) => boolean;
  /** private byte a(int,int) / legacyOccupancyClass. */
  readonly classifyOccupancy?: (x: number, y: number) => number;
  /** private void d(int,int,int,int) / LegacyZSubrecordDraw. */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
  /**
   * f.aq:I (#216) writes: -1 at offset 23, then d[5][slot] per active slot (58). The field is
   * shared with a(IIIIB); added 2026-10-09 (oracle menu run, frame 397).
   */
  readonly onAq?: (aq: number) => void;
};

/** Exact f.r(). Returns after the first slot that fails its gate (matches the bytecode's own early `return`). */
export function stepLegacyAnimatedSlotScan(
  state: LegacyAnimatedSlotScanState,
  callbacks: LegacyAnimatedSlotScanCallbacks = {},
): void {
  callbacks.onAq?.(-1);
  for (let slot = 0; slot < 40; slot += 1) {
    if ((state.slotTable[0]?.[slot] ?? 0) <= 0) continue;

    let kind = 29;
    const aq = state.slotTable[5]?.[slot] ?? 0;
    callbacks.onAq?.(aq);
    const slotKind = state.slotTable[6]?.[slot] ?? 0;

    let x: number;
    let y: number;
    if (slotKind === 1) {
      x = state.dense[0 + aq] ?? 0;
      y = state.dense[UNIT_Y + aq] ?? 0;
    } else if (slotKind === 2) {
      x = state.dense[ANIMAL_X + aq] ?? 0;
      y = state.dense[ANIMAL_Y + aq] ?? 0;
      kind = 108;
      if (state.slotTable[2]) state.slotTable[2][slot] = 0;
    } else {
      const packedNibble = state.slotTable[2]?.[slot] ?? 0;
      x = (state.dense[BLD_X + aq] ?? 0) + (packedNibble & 15);
      y = (state.dense[BLD_Y + aq] ?? 0) + ((packedNibble >> 4) & 15);
    }

    const withinViewport = callbacks.isWithinViewport?.(x, y) ?? false;
    const occupancyClass = callbacks.classifyOccupancy?.(x, y) ?? 0;
    const goodPosition = withinViewport && occupancyClass === 0;
    const shouldDraw = goodPosition && ((state.dense[UNIT_HP + aq] ?? 0) > 0 || slotKind !== 1);
    if (!shouldDraw) {
      if (state.slotTable[0]) state.slotTable[0][slot] = 0;
      return;
    }

    let pixelX = (x - state.originColumn) * 22;
    let pixelY = (y - state.originRow) * 16;

    if (slotKind === 1 || slotKind === 2) {
      const stateIndex = (state.dense[(state.shortTable1D[kind] ?? 0) + aq] ?? 0) & 0xff;
      const bank = (state.shortTable2D[3]?.[stateIndex] ?? 0) >> 14 & 3;
      const frameSelector = state.dense[UNIT_DIRECTION + aq] ?? 0;
      const frameRecordBase = state.packedBytes[state.packedOffsets[99] + bank * 8 + frameSelector] ?? 0;

      const recordBase = (state.shortTable2D[2]?.[stateIndex] ?? 0) & 4095;
      const stride = state.byteRows[4]?.[stateIndex] ?? 0;
      const extra = state.dense[(state.shortTable1D[kind + 1] ?? 0) + aq] ?? 0;
      const combinedRecord = recordBase + frameRecordBase * stride + extra;

      const frameGroupStart = state.shortTable2D[4]?.[combinedRecord] ?? 0;
      const frameBase = state.shortTable2D[8]?.[frameGroupStart] ?? 0;

      let frameIndex = 0;
      const frameCount = state.byteRows[15]?.[frameGroupStart] ?? 0;
      for (let step = 0; step < frameCount; step += 1) {
        frameIndex = frameBase + step;
        if (((state.byteRows[14]?.[frameIndex] ?? 0) & 15) === (state.slotTable[2]?.[slot] ?? 0)) break;
      }

      if (slotKind === 1) {
        pixelX += (state.dense[UNIT_OFFSET_X + aq] ?? 0) + (state.byteRows[12]?.[frameIndex] ?? 0);
        pixelY += (state.dense[UNIT_OFFSET_Y + aq] ?? 0) + (state.byteRows[13]?.[frameIndex] ?? 0);
      } else {
        pixelX += (state.dense[9403 + aq] ?? 0) + (state.byteRows[12]?.[frameIndex] ?? 0);
        pixelY += (state.dense[9425 + aq] ?? 0) + (state.byteRows[13]?.[frameIndex] ?? 0);
      }
    }

    const record = state.slotTable[0]?.[slot] ?? 0;
    const phase = state.slotTable[1]?.[slot] ?? 0;
    callbacks.onSpriteDraw?.(record, pixelX, pixelY, phase);

    const nextPhase = toJavaByte(phase + 1);
    if (state.slotTable[1]) state.slotTable[1][slot] = nextPhase;
    if (nextPhase >= (state.byteRows[9]?.[record] ?? 0)) {
      if (state.slotTable[0]) state.slotTable[0][slot] = 0;
    }
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
