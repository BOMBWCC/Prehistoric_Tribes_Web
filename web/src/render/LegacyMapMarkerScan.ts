/**
 * Raw port of private f.v(), bytecode/f-javap.txt offsets 0..531. Called
 * once at the very start of f.u(), before its main visible-window loop
 * (see reverse-engineering/gameplay-paint-cluster.md).
 *
 * Three independent parts, each self-contained (no cross-branch local
 * variable ambiguity like f.u()'s own unported health-bar section):
 *
 *  1. offsets 0..55: a decay pass over dense-state indices 1..60 -- clears
 *     bit 0 of `e[8871+i]` and clamps `e[9176+i]` down to 5 if it was
 *     larger. Fixed range 1..60 (not tied to any loop var elsewhere).
 *  2. offsets 55..357: a manually-unrolled 2-team x 5-slot scan over a
 *     THIRD distinct 3D byte array, `f.c:[[[B]` (#256, not the map grids
 *     also confusingly named `c`) -- each `[team][slot]` entry is
 *     `[x, y, type, flag]`; when `type>=0`, `flag===1`, and `(x,y)` is
 *     within the viewport expanded by 1 tile on each side, scans a further
 *     9 offsets (from packed table 141) drawing packed-sprite record 68
 *     wherever the occupancy classifier permits.
 *  3. offsets 357..531: a 30-slot scan over a FOURTH distinct 3D byte
 *     array, `f.b:[[[B]` (#237, not the map grids also named `b`) -- each
 *     `[0][slot]` entry (columns 0..4) gates on column 1 === 3 and column 0
 *     !== 0, bounds-checks `(x=col2, y=col3)` against the same expanded
 *     viewport, then draws a record computed as `68 + (1 - col4) * 5`
 *     (note the subtraction order: `1 - col4`, not `col4 - 1`).
 *
 * Both draw call sites use the fixed record base 68 and pass `this.f:I`
 * (#294) as the phase argument -- confirmed 2026-08-18 to be `game.animPhase`,
 * the SAME field `P()`/`u()`'s row-end draw/map-marker-detail already use
 * (see `LegacyGameState.ts`'s `fCounter` docblock for the full cluster);
 * exposed here as an explicit caller-supplied scalar rather than guessed at.
 *
 * Wired 2026-08-18 into `LegacyRuntimeState.ts`'s `stepGameplayOuterLoop`
 * (f.u()'s own port), matching the real bytecode's unconditional call at
 * the very start of that method. `f.b:[[[B]`(#237)'s field identity was
 * already established as `game.xSlotTable` (from an earlier `X()`
 * investigation); `f.c:[[[B]`(#256) is `game.teamMarkerTable`. CONFIRMED
 * (2026-08-22): both fields' real producer is `aM()`, which was already
 * ported and wired but pointed at disconnected duplicate arrays
 * (`mainArrays.b`/`mainArrays.c`) instead of these two -- fixed, see
 * `LegacyGameState.ts`'s own docblocks for the full writeup.
 */

export type LegacyMapMarkerScanState = {
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.c:[[[B] (#256) -- teamMarkerTable[team][slot] = [x, y, type, flag]. */
  readonly teamMarkerTable: readonly (readonly Int8Array[])[];
  /** f.b:[[[B] (#237) -- resourceNodeTable[0][column][slot], columns 0..4. */
  readonly resourceNodeTable: readonly (readonly Int8Array[])[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.O:B (#83). */
  readonly columns: number;
  /** f.P:B (#87). */
  readonly rows: number;
  /**
   * f.f:I (#294)/`game.animPhase` -- confirmed 2026-08-18 via direct
   * bytecode read of v() itself (offset 326/519), same field this
   * codebase's other "phase" call sites (P(), u()'s row-end draw,
   * map-marker-detail) already use. See fCounter's own docblock.
   */
  readonly phase: number;
};

export type LegacyMapMarkerScanCallbacks = {
  /** private byte a(int,int) / legacyOccupancyClass. */
  readonly classifyOccupancy?: (x: number, y: number) => number;
  /** private void d(int,int,int,int) / LegacyZSubrecordDraw. */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
};

/** Part 1: bytecode offsets 0..55. Mutates `dense` in place. */
export function decayLegacyMapMarkerDenseState(dense: Int8Array): void {
  for (let i = 1; i <= 60; i += 1) {
    dense[8871 + i] = (dense[8871 + i] ?? 0) & 254;
    if ((dense[9176 + i] ?? 0) > 0) dense[9176 + i] = 5;
  }
}

/** Part 2: bytecode offsets 55..357. */
export function scanLegacyTeamMarkers(
  state: LegacyMapMarkerScanState,
  callbacks: LegacyMapMarkerScanCallbacks,
): void {
  let team = 0;
  for (let slot = 0; slot < 5; ) {
    const entry = state.teamMarkerTable[team]?.[slot];
    const x = entry?.[0] ?? 0;
    const y = entry?.[1] ?? 0;
    const type = entry?.[2] ?? -1;
    const flag = entry?.[3] ?? 0;

    const inRange =
      type >= 0 &&
      flag === 1 &&
      x >= state.originColumn - 1 &&
      x <= state.originColumn + state.columns + 1 &&
      y >= state.originRow - 1 &&
      y <= state.originRow + state.rows + 1;

    if (inRange) {
      for (let step = 0; step < 9; step += 1) {
        const tileX = x + (state.packedBytes[state.packedOffsets[141] + step] ?? 0);
        const tileY = y + (state.packedBytes[state.packedOffsets[141] + 9 + step] ?? 0);
        if ((callbacks.classifyOccupancy?.(tileX, tileY) ?? 0) === 0) {
          const pixelX = (x - state.originColumn + (state.packedBytes[state.packedOffsets[141] + step] ?? 0)) * 22;
          const pixelY = (y - state.originRow + (state.packedBytes[state.packedOffsets[141] + 9 + step] ?? 0)) * 16;
          callbacks.onSpriteDraw?.(68, pixelX, pixelY, state.phase);
        }
      }
    }

    if (slot === 4 && team === 0) {
      slot = 0;
      team = 1;
    } else {
      slot += 1;
    }
  }
}

/** Part 3: bytecode offsets 357..531. */
export function scanLegacyResourceNodes(
  state: LegacyMapMarkerScanState,
  callbacks: LegacyMapMarkerScanCallbacks,
): void {
  const row = state.resourceNodeTable[0];
  for (let slot = 0; slot < 30; slot += 1) {
    const x = row?.[2]?.[slot] ?? 0;
    const y = row?.[3]?.[slot] ?? 0;
    if ((row?.[1]?.[slot] ?? 0) !== 3) continue;
    if ((row?.[0]?.[slot] ?? 0) === 0) continue;
    if (x < state.originColumn - 1) continue;
    if (x > state.originColumn + state.columns + 1) continue;
    if (y < state.originRow - 1) continue;
    if (y > state.originRow + state.rows + 1) continue;
    if ((callbacks.classifyOccupancy?.(x, y) ?? 0) !== 0) continue;

    const typeColumn = row?.[4]?.[slot] ?? 0;
    const record = 68 + (1 - typeColumn) * 5;
    const pixelX = (x - state.originColumn - 0) * 22;
    const pixelY = (y - state.originRow - 0) * 16;
    callbacks.onSpriteDraw?.(record, pixelX, pixelY, state.phase);
  }
}

/** Exact f.v(), bytecode offsets 0..531. */
export function stepLegacyMapMarkerScan(
  state: LegacyMapMarkerScanState,
  callbacks: LegacyMapMarkerScanCallbacks = {},
): void {
  decayLegacyMapMarkerDenseState(state.dense as Int8Array);
  scanLegacyTeamMarkers(state, callbacks);
  scanLegacyResourceNodes(state, callbacks);
}
