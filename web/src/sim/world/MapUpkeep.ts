import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { BLD_KIND, BLD_X, BLD_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
import { stepLegacyAnimatedSlotTimers } from "../../render/LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotTimers } from "../../render/LegacyEffectSlotScan";
import { stepLegacyD as stepLegacyFD } from "../../ui/LegacyFrameProgressionScan";
import { LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, markLegacyEntityFootprint } from "../units/LegacyEntityFootprintMark";

/**
 * Rules the original ran while drawing the map (f.u(), every tick): the demolition dust's timer and
 * what happens when it runs out, a building being seen, and the hit effects' frames. Moved out of the drawing
 * (modernization step 2, 2026-10-27) so the map can be drawn by anything, or not at all, without
 * changing the game; `docs/modernization-survey.md` B1-B5.
 */

/** Before the world's step: the demolition dust (f.s()'s timers, f.e:[[B #280). */
export function stepDemolitionDust(rt: LegacyRuntimeState): void {
  stepLegacyEffectSlotTimers(rt.mainArrays.e, rt.denseState, rt.packedBytes, rt.packedOffsets, {
    onModeThreeExpire: (id) => rt.stepEntityRemoval(id, false),
    onSlotAction: (id) => {
      const dState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
      stepLegacyFD(id, dState);
      rt.game.pendingP = dState.P;
    },
    onRect: (x, y, width, height) => rt.repaintRect(x, y, width, height),
  });
}

/**
 * After the world's step: a building (record 1..60) is seen the first time a tile of it is in sight
 * or explored (fog class < 2). It is then remembered (dense[9176 + id] = 4: the drawing shows it in
 * the fog) and its whole footprint becomes explored (fog layer 0). The original only looked at the
 * camera's 11 x 18 tiles, during letterboxed scenes as if all were in sight; this looks at the whole
 * map with the real fog.
 */
export function stepSeenBuildings(rt: LegacyRuntimeState): void {
  const dense = rt.denseState;
  const base = rt.packedOffsets[T_BUILDING] ?? 0;
  for (let row = 0; row < rt.game.mapHeight; row += 1) {
    const cells = rt.gridC[row];
    if (!cells) continue;
    for (let column = 0; column < rt.game.mapWidth; column += 1) {
      const id = -(cells[column] ?? 0);
      if (id < 1 || id > 60 || ((dense[9176 + id] ?? 0) & 4) !== 0) continue;
      if (rt.occupancyClass(column, row) >= 2) continue;
      const kind = dense[BLD_KIND + id] ?? 0;
      markLegacyEntityFootprint(
        { layer: 0, widthMasks: LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, layers: rt.mainArrays.aInt, mapHeight: rt.game.mapHeight },
        dense[BLD_X + id] ?? 0,
        dense[BLD_Y + id] ?? 0,
        rt.packedBytes[base + 104 + kind] ?? 0,
        rt.packedBytes[base + 130 + kind] ?? 0,
      );
      dense[9176 + id] = 4;
    }
  }
}

/** Before the world's step: the hit effects' frames (f.r()'s, f.d:[[B #268, 40 slots). */
export function stepHitEffects(rt: LegacyRuntimeState): void {
  stepLegacyAnimatedSlotTimers(rt.mainArrays.d, rt.denseState, rt.packedData?.byteTables ?? []);
}
