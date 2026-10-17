import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { LegacyGameState } from "../../core/LegacyGameState";
import { stepLegacyClassCReset } from "../../platform/LegacyResourceTables";
import { runLegacySpatialPass, type LegacySpatialPassInput } from "./LegacyBSpatialPass";
import { type LegacyRawMap } from "./LegacyMapRleDecoder";
import { applyLegacyMapNeighborPass, buildLegacyMapOverlay, type LegacyMapOverlay } from "../../render/LegacyMapOverlay";
import { projectLegacyMapGrids } from "../../render/LegacyMapGridProjection";
import { allocateLegacySpecialTile, type LegacySpecialTile } from "./LegacySpecialTileAllocator";
import { type LegacyMapOverviewInput } from "../../render/LegacyMapOverview";
import { applyLegacyTerrainAdjustment } from "./LegacyTerrainAdjustment";
import { stepLegacyEntityBatchAllocate } from "../units/LegacyEntityBatchAllocate";
import { LegacyPackedSpriteRenderer } from "../../render/LegacyPackedSpriteRenderer";
import { resetLegacyZI } from "../../ui/LegacyZI";
import { type LegacyRenderableMap } from "../../render/LegacyMapRenderer";
import { runLegacyProjectionLifecycle, type LegacyProjectionLifecycleInput } from "../../render/LegacyProjectionLifecycle";
import { enqueueLegacyEffectSlot } from "../../render/LegacyEffectSlotScan";
import { canPlaceLegacyFootprint } from "./LegacyFootprintCheck";
import { selectLegacyAuxiliaryCandidates } from "./LegacyAuxiliaryQueue";
import { placeLegacyAuxiliary } from "./LegacyAuxiliaryPlacement";
import { stepLegacySubsystemBuildingEconomy, type LegacyBuildingScratch } from "../tribe/LegacySubsystemBuildingEconomy";
import { stepLegacySubsystemAa } from "../tribe/LegacySubsystemAa";
import { stepLegacySubsystemAb } from "../tribe/LegacySubsystemAb";
import { stepLegacySubsystemAe } from "../tribe/LegacySubsystemAe";
import { stepLegacyEntityVacate } from "../units/LegacyEntityVacate";
import { stepLegacyEntityPayCost } from "../units/LegacyEntityResourceCost";
import { stepLegacyEntityMUpdate } from "../units/LegacyEntityMUpdate";
import { stepLegacySubsystemTrainingCount } from "../tribe/LegacySubsystemTrainingCount";
import { stepLegacySubsystemTrainingComplete } from "../tribe/LegacySubsystemTrainingComplete";
import { stepLegacySubsystemNearestBuilding } from "../tribe/LegacySubsystemNearestBuilding";
import { stepLegacyEntityMarkerCommit } from "../units/LegacyEntityMarkerCommit";
import { stepLegacyAnimalRoam } from "../units/LegacyAnimalRoam";
import { stepLegacyEntityEquipIssue } from "../units/LegacyEntityEquipIssue";
import { dispatchLegacyEntityAction } from "../units/LegacyEntityActionDispatch";
import { stepLegacySubsystemBVoidO } from "../tribe/LegacySubsystemBVoidO";
import { stepLegacySubsystemScore } from "../tribe/LegacySubsystemScore";
import { findLegacyNearestCandidate } from "./LegacyNearestCandidateSearch";
import { checkLegacyCellCompatibility } from "./LegacyCellCompatibilityCheck";
import { completeLegacyEntityRecord } from "../units/LegacyEntityRecordCompletion";
import { clearLegacyEntityRecordTarget } from "../units/LegacyEntityRecordTargetClear";
import { markLegacySpatialRecord, markLegacySpatialRect } from "./LegacySpatialRecordUpdate";
import { stepLegacyAuxiliaryMode4 } from "./LegacyAuxiliaryMode4";
import { stepLegacyPathE, type LegacyPathEInput } from "./LegacyPathE";
import { resetLegacyAM, stepLegacyAOMap, stepLegacyMapEntry, type LegacyAOMapState, type LegacyAPPrefixInput } from "../../ui/LegacyStateMachine";
import { ANIMAL_HP, ANIMAL_KIND, ANIMAL_X, ANIMAL_Y, BLD_HP, BLD_KIND, BLD_X, BLD_Y, RES_KIND, RES_X, RES_Y, UNIT_DIRECTION, UNIT_HP, UNIT_MODE, UNIT_SLOT, UNIT_SPEED, UNIT_Y } from "../../core/DenseLayout";
import { LEGACY_SPATIAL_LAYER_INDEX, toJavaByte } from "../../core/LegacyRuntimeState";
import { runSubsystemN, stepSubsystemOLower, subsystemB, subsystemG, subsystemNOrchestrator, subsystemPrivateO, subsystemTenSlotAllocate, subsystemTenSlotReleaseEntity } from "../tribe/TribeRuntime";
import { changeEntityType, entityCourtship, placeEntity, selectEntityTypeAfterQ, stepEntityCoordinateUpdate } from "../units/UnitRuntime";
import { stepStateMapEntry } from "../../ui/UiRuntime";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Raw f.a(int,int,int,boolean) footprint availability check. */
export function canPlaceFootprint(rt: LegacyRuntimeState, map: Int8Array[], x: number, y: number, type: number, requireTerrainClass: boolean): boolean {
  return canPlaceLegacyFootprint({
    map,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    occupancyClass: (cellX, cellY) => rt.occupancyClass(cellX, cellY),
  }, x, y, type, requireTerrainClass);
}

/** Complete structural b.d() spatial pass over the raw entity bank and layers. */
export function runSpatialPass(rt: LegacyRuntimeState, 
  callbacks: Omit<LegacySpatialPassInput, "state" | "packedBytes" | "packedOffsets" | "layers">,
): void {
  runLegacySpatialPass({
    ...callbacks,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    layers: rt.mainArrays.aInt,
    onPrimarySpatialUpdate: callbacks.onPrimarySpatialUpdate ?? ((x, y, span) => {
      markLegacySpatialRecord({
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        layers: rt.mainArrays.aInt,
        layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
        mapHeight: rt.game.mapHeight,
      }, x, y, span);
    }),
    // BUG FIX (2026-09-04): was left unwired on the stated grounds that
    // the building half "has no confirmed b.S layer source". That premise
    // was wrong -- b.a(int,int,int,int) (offset 43..54) funnels into the
    // very same b.d(int,int,int) row writer b.a(int,int,int) uses, so it
    // marks layer b.S, i.e. the identical LEGACY_SPATIAL_LAYER_INDEX.
    onRectSpatialUpdate: callbacks.onRectSpatialUpdate ?? ((x, y, width, height) => {
      markLegacySpatialRect({
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        layers: rt.mainArrays.aInt,
        layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
        mapHeight: rt.game.mapHeight,
      }, x, y, width, height);
    }),
  });
}

/**
 * Exact `final void f.d(int)` record-completion boundary.
 *
 * FIXED (2026-08-20): was reading `game.entityW`/`game.entityQ` (fields
 * only ever written by the dead, unused `selectCurrentEntity`/
 * `LegacyEntityCurrentSelection.ts`, both DELETED 2026-08-25 -- see
 * `docs/unknowns.md`), so rt real side effect (`P:Z=true` when
 * `w===2 && record===q`) never actually fired in live play. Direct
 * bytecode read confirms `w`
 * is `w:B` (#382) and `q` is `q:I` (#356) -- the SAME already-canonical
 * `game.barMode`/`game.qCounter` fields many other already-wired methods
 * use.
 */
export function completeEntityRecord(rt: LegacyRuntimeState, record: number): void {
  const state = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
  completeLegacyEntityRecord(state, record);
  rt.game.pendingP = state.P;
}

/** Execute the proven f.c(int) association cleanup against live entity state. */
/**
 * f.c(int): its reset is always f.a(record, false) (#469). CORRECTED
 * 2026-10-12 (oracle run 11, frame 18108): the callback was optional and
 * h(int)'s call passed none, so a builder reassigned elsewhere left its
 * site's other workers in place.
 */
export function clearEntityRecordTarget(rt: LegacyRuntimeState, id: number): void {
  clearLegacyEntityRecordTarget({
    state: rt.denseState,
    entityId: id,
    onRecordReset: (record, enabled) => {
      rt.filterEntityLifecycle(record, enabled, (row, column) => rt.gridC[row]?.[column] ?? 0);
    },
  });
}

/** Raw mode 4 continuation of b.a(IIII), with private owners as callbacks. */
export function stepAuxiliaryMode4(rt: LegacyRuntimeState, input: Omit<Parameters<typeof stepLegacyAuxiliaryMode4>[0], "dense">): boolean {
  return stepLegacyAuxiliaryMode4({
    ...input,
    dense: rt.denseState,
    onO: input.onO ?? (() => {
      // BUG FIX (2026-09-10): `onBFourByte` was hardcoded to `() => 0`, the
      // last surviving site of the "inlined as a literal 0" retracted
      // premise. It is `b.b(int,int,int,int):byte` (#332), ported 2026-09-04
      // as stepLegacySubsystemScore and already wired correctly at o()'s
      // other call site (see stepLegacySubsystemBVoidO's onScore above).
      //
      // Its result is the entity's step direction: b.o() stores it straight
      // into `dense[808+v]`, and b.u()'s outer gate skips its whole main
      // body -- including `D()`, the move itself -- when `dense[808+id] <= 0`
      // (b-javap.txt offsets 63..78). Returning a literal 0 therefore froze
      // every ordered unit in place: the destination reached
      // `dense[6262+id]`/`dense[6363+id]` and nothing ever stepped toward it.
      stepSubsystemOLower(rt, {
        v: input.v,
        onBFourByte: (x, y, targetX, targetY) =>
          stepLegacySubsystemScore(rt.legacySubsystemScoreInput(input.v), x, y, targetX, targetY),
      });
    }),
    // b.a(int,int,int) (#266) is occupancyCheck. MERGED 2026-10-08 (oracle):
    // a second port, legacyNeighborValue, read packedBytes where the
    // bytecode reads b.a:[B (= f.e, denseState) and skipped the q:B/r:B writes.
    onNeighborMetric: input.onNeighborMetric ?? ((x, y, mode) => rt.occupancyCheck(input.v, x, y, mode)),
  });
}

/** Raw b.e(int) path-table preparation; packed delta reads remain explicit. */
export function preparePathTables(rt: LegacyRuntimeState, input: Omit<LegacyPathEInput, "deltas">): void {
  stepLegacyPathE({ ...input, deltas: rt.subsystemArrays.fByte });
}

export function payEntityCost(rt: LegacyRuntimeState, type: number, flag: boolean, w: number, v: number): boolean {
  const g = rt.game;
  return stepLegacyEntityPayCost(rt.entityCostInput(v), {
    gRows: rt.subsystemArrays.gRows,
    f: { get value() { return g.subsystemFFlag; }, set value(next: boolean) { g.subsystemFFlag = next; } },
    onM: () => stepLegacyEntityMUpdate({
      state: rt.denseState,
      entityId: w,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      raw: { get R() { return g.subsystemR; }, set R(value: number) { g.subsystemR = value; } },
      onChangeType: (id, newType) => { rt.changeEntityType(id, newType); },
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    }),
    onN: () => rt.stepSubsystemN(w, g.bTeam),
    onRecordFinish: (record) => rt.completeEntityRecord(record),
  }, type, flag, w);
}

/**
 * `private void a(int,int,int,byte)` (#283) -- LegacyEntityVacate.ts, the
 * shared vacate/death helper. Wired 2026-09-16; before that every caller
 * had it as a throwing stub or an unset callback, so a villager whose HP
 * reached 0 was never removed.
 *
 * The kind-106 branch's callees: `f.a(int,int,int,byte)` (#299, the
 * remains the animal leaves) and `f.c(int,int,int,int)` (#357, repaint) are
 * wired since 2026-09-27, as is `b.l(int)` (#399, removeAnimal).
 */
export function vacateEntity(rt: LegacyRuntimeState, kind: number, x: number, y: number, id: number): void {
  const arrays = rt.subsystemArrays;
  void arrays;
  const game = rt.game;
  stepLegacyEntityVacate({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortRows: rt.mainArrays.aShort,
    xSlots: game.xSlotTable,
    v: game.bUnit,
    fQ: game.mission,
    scratch: {
      get subsystemGFFlagByte() { return game.subsystemGFFlagByte; },
      set subsystemGFFlagByte(value: number) { game.subsystemGFFlagByte = value; },
    },
    onByteAction: (action, ax, ay, target) => rt.runByteActionQueue(action, ax, ay, target),
    onL: (animal) => rt.removeAnimal(animal),
    onSpatialAction: (mode, ax, ay, value) => { rt.placeGroundSlot(mode, ax, ay, value); },
    onRectMark: (rx, ry, width, height) => rt.repaintRect(rx, ry, width, height),
    onFinalizeEntity: (target) => { rt.finalizeEntity(target); },
    onEntityRemoval: (target, flag) => { rt.stepEntityRemoval(target, flag); },
    onAuxiliary: (first, second, third) => {
      selectLegacyAuxiliaryCandidates({
        p: rt.auxiliaryScratch,
        dense: rt.denseState,
        shortRows: rt.mainArrays.aShort,
      }, rt.auxiliaryQueueState, first, second, third);
    },
    onSceneDispatch: (value) => { rt.runSceneDispatch(value); },
  }, kind, x, y, id);
}

/** `private boolean n()` (#402) for unit `id`: an idle adult's needs. */
export function checkEntityNeeds(rt: LegacyRuntimeState, id: number): boolean {
  const entityAt = (row: number, column: number): number => rt.gridC[row]?.[column] ?? id;
  const subsystemArrays = rt.subsystemArrays;
  const gameState = rt.game;
  return subsystemNOrchestrator(rt, {
    q: rt.game.mission,
    N: rt.game.callToArmsActive,
    L: rt.game.formUpActive,
    u: rt.game.bTeam,
    v: id,
    entityAt,
    onO: () => subsystemPrivateO(rt, id),
    // private boolean a(boolean) (#295), wired 2026-09-15.
    onAFalse: () => entityCourtship(rt, id, false),
    onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
      state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
      team: rt.game.bTeam, entityId: id, kind,
    }),
    onGroupMode: (argument) => rt.subsystemG(id, argument),
    onMove: () => rt.entityMove(1, id, id),
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    // n()'s onEntityActionSearch === private boolean a(int,byte)
    // (dispatchLegacyEntityAction). Fixed 2026-08-22: rt used to
    // call the nearest-building search directly and treat its boolean as
    // the final answer, bypassing dispatchLegacyEntityAction entirely
    // -- changeEntityType(id,87)/subsystemG(id,1) never fired on a
    // found target. n()'s own (action, parameter) args map to
    // a(int,byte)'s (arg1, arg2): arg1 is the nearest-target search's
    // own `target`, arg2 is the byte threaded through to onMove. See
    // docs/unknowns.md's 2026-08-21 entry for the full derivation.
    onEntityActionSearch: (target, moveAction) => dispatchLegacyEntityAction({
      state: rt.denseState,
      id,
      action: moveAction,
      targetSearch: () => {
        const out = { h: false };
        const selected = stepLegacySubsystemNearestBuilding({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          team: rt.game.bTeam,
          entityId: id,
          kind: target,
        }, {}, out);
        return { selected, found: out.h };
      },
      entityAt,
      onAction: (rawId, act) => { rt.changeEntityType(rawId, act); },
      onMode: (mode) => rt.subsystemG(id, mode),
      onMove: (act, moveId) => rt.entityMove(act, moveId, moveId),
    }),
    // b.n()'s own onRawAction/onQueue (offsets ~809/829, invoke
    // #275/#253) -- the SAME two real methods subsystemB's own
    // onRawAction/onQueue below already target (changeEntityType/
    // selectEntityTypeAfterQ), confirmed via direct bytecode read,
    // not just the shared "87" literal.
    onRawAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
    onQueue: () => rt.selectEntityTypeAfterQ(id),
  });
}

/**
 * `private void e(boolean)` (#376, `LegacyAnimalRoam.ts`) -- shared wiring
 * for its three call sites: `a(int,int,byte,int)`'s `e(true)` (a
 * zero-aggression animal fleeing) and `af()`/`ag()`'s `e(false)` (ordinary
 * roaming). `slot` is the ambient `v:I` (#225), an animal slot 0..21.
 */
export function animalRoam(rt: LegacyRuntimeState, slot: number, flag: boolean): void {
  const arrays = rt.subsystemArrays;
  const game = rt.game;
  stepLegacyAnimalRoam({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    gridC: rt.gridC,
    slot,
    sceneQ: game.mission,
    mapWidth: game.mapWidth,
    mapHeight: game.mapHeight,
    E: arrays.bField15,
    scratch: {
      get x() { return game.subsystemX; }, set x(value: number) { game.subsystemX = value; },
      get w() { return game.subsystemW; }, set w(value: number) { game.subsystemW = value; },
      get B() { return arrays.bField8; }, set B(value: number) { arrays.bField8 = value; },
    },
    random: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onFreeCellScan: (mode, scanLimit, x, y) => {
      try {
        rt.checkSpiralPlacementGate(mode, scanLimit, x, y, game.bUnit);
      } catch {
        // af()/ag() both run inside h()'s own exception table.
      }
    },
  }, flag);
}

/**
 * `private void b(int,int,int,int)` (#346) -- shared wiring for its two
 * real call sites: the record allocator's own `onAuxRecord`, and `H()`'s
 * tutorial hook (`stepLegacyEntityMarkerCommit`'s `onAuxRecord`). `id` is
 * the ambient `v:I` (#225) the method's own `a(int,int,int,int)` (#270)
 * call reads.
 */
export function runAuxiliaryPlacement(rt: LegacyRuntimeState, first: number, second: number, x: number, y: number, id: number): void {
  const queue = rt.auxiliaryQueueState;
  placeLegacyAuxiliary({
    eRows: rt.subsystemArrays.eRows,
    fP: rt.auxiliaryScratch,
    fields: queue,
    q: rt.game.mission,
    bFByte: rt.game.subsystemGFFlagByte,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    dense: rt.denseState,
    shortRows: rt.mainArrays.aShort,
    // b(IIII)'s offset 256..260 call is `rt.b(first, second, 1)`
    // -- invokespecial #342, i.e. plain b(III) -- NOT c(boolean) as rt
    // call site's name and the chimera it used to call both suggested
    // (see LegacyAuxiliaryQueue.ts's history docblock). Repointed
    // 2026-08-31.
    onNestedPlacement: (nestedFirst, nestedSecond, nestedThird) => {
      selectLegacyAuxiliaryCandidates({
        p: rt.auxiliaryScratch,
        dense: rt.denseState,
        shortRows: rt.mainArrays.aShort,
      }, rt.auxiliaryQueueState, nestedFirst, nestedSecond, nestedThird);
    },
    // b(IIII)'s offset 175 call: rt.c(false).
    onAuxiliaryTagRefresh: (flag) => rt.pickAdults(flag),
    // Offset 373's `a(IIII)Z` (#270); the real bytecode pops the result.
    // WIRED 2026-09-21 together with the argument-position fix in
    // LegacyAuxiliaryPlacement.ts -- it was silently absent before.
    onFootprintCheck: (mode, span, footX, footY) => rt.checkSpiralPlacementGate(mode, span, footX, footY, id),
    // Offset 421's `f.b(int)` (#343) -- the mission/tutorial script step.
    onRecordFinalize: (value) => { rt.runSceneDispatch(value); },
    // Offset 424..433: retiring the step by pushing f:B past t291[q].
    onStepAdvance: (next) => { rt.game.subsystemGFFlagByte = next; },
  }, first, second, x, y);
}

/**
 * class b's `final void a(int,int,int,byte,byte)` (#307), reached from
 * f.T() (ai 37/45/48) and from b.av()/b.v(). `aw`/`q` are read live from
 * game.* because T() mutates them between calls.
 */
export function batchAllocate(rt: LegacyRuntimeState, count: number, x: number, y: number, team: number, value: number): void {
  const game = rt.game;
  stepLegacyEntityBatchAllocate({
    state: rt.denseState,
    map: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    counters: rt.mainArrays.aShort,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    mapWidth: game.mapWidth,
    mapHeight: game.mapHeight,
    aU: game.subsystemAU,
    subsystemY: game.subsystemY,
    ...rt.recordOptions(),
    saveOffsets: rt.saveOffsets,
    setV: (v: number) => { game.bUnit = v; },
    setLastRecordId: (v: number) => { game.subsystemLastRecordId = v; },
    // b.a(int,int,int,int) (#270), called as `a(1, 127, x, y)` right
    // after `v:I = 0` (b-javap.txt offsets 32..45 of a(IIIBB)).
    onNearbySearch: (nx, ny) => { rt.checkSpiralPlacementGate(1, 127, nx, ny, 0); },
    // L() (#248): the new unit is handed a weapon from its team's pool.
    // The team is the ambient u:I.
    onEquipIssue: (newId) => stepLegacyEntityEquipIssue({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      v: newId,
      pools: rt.mainArrays.aShort,
      team: game.bTeam,
      onRecordCompletion: (record) => rt.completeEntityRecord(record),
    }),
  }, count, x, y, team, value);
}

/**
 * `private void e(int)` (#374) against the live class-b storage, as #264
 * calls it at its own offset 65..68.
 *
 * `a:I`(#68), `b:I`(#135), `e:I`(#164) and `g:I`(#178) are genuine
 * cross-method fields (`bField68` is read ambiently by #380 and #366; the
 * other three are shared with #265/#380/#264), so their values are copied
 * back out after the call. Seeding is not needed in the other direction --
 * #374 writes all four before its first read of any of them (offsets 2, 61,
 * 102 and 440) -- but the write-back is, and #374's only callee
 * (`checkLegacyCellCompatibility`, #272) touches none of them, so there is
 * no observer mid-call. `c:I`(#147) and `f:I`(#170) really are per-call
 * locals here (both written before read, in #374 and in #380 alike).
 */
export function runPathTables(rt: LegacyRuntimeState, mode: number, entityId: number): void {
  const scalars = rt.subsystemArrays;
  const state = {
    a: scalars.bField68,
    b: scalars.bField135,
    e: scalars.bField164,
    f: 0,
    g: scalars.bField178,
    cCursor: 0,
  };
  stepLegacyPathE({
    mode,
    directionMask: rt.pathDirection.a,
    deltas: scalars.fByte,
    c: scalars.cByte,
    dScratch: scalars.dByte,
    pathData: scalars.d,
    eCounts: scalars.eByte,
    map: rt.gridC,
    // Offsets 121..204 / 506..649: `packedBytes[packedOffsets[0] + offset]`,
    // where the caller has already folded `a:B * 4` into `offset`.
    readPackedDelta: (offset) => rt.packedBytes[(rt.packedOffsets[0] ?? 0) + offset] ?? 0,
    // `invokespecial #272` -- the same `private byte a(int,int,int)` #264
    // and #380 already call. It only ever returns iconst_0/iconst_1.
    onCellValue: (x, y, cellMode) => (checkLegacyCellCompatibility({
      state: rt.denseState,
      // `v:I`(#225), threaded explicitly for the same reason
      // `legacySubsystemScoreInput` threads it -- see its docblock.
      id: entityId,
      team: rt.game.bTeam,
      gridC: rt.gridC,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      visibilityBits: rt.mainArrays.aInt,
    }, x, y, cellMode) ? 1 : 0),
    state,
  });
  scalars.bField68 = state.a;
  scalars.bField135 = state.b;
  scalars.bField164 = state.e;
  scalars.bField178 = state.g;
}

/** `private void b(int,int)` (#333) for entity `id` -- LegacyNearestCandidateSearch.ts. */
export function nearestCandidate(rt: LegacyRuntimeState, id: number, arg1: number, arg2: number): void {
  findLegacyNearestCandidate({
    state: rt.denseState,
    id,
    gridC: rt.gridC,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    checkCompatibility: (x, y, mode) => checkLegacyCellCompatibility({
      state: rt.denseState,
      id,
      team: rt.game.bTeam,
      gridC: rt.gridC,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      saveOffsets: rt.saveOffsets,
      visibilityBits: rt.mainArrays.aInt,
    }, x, y, mode),
  }, arg1, arg2);
}

/**
 * Options for f.a(byte,int,int,int,int,boolean,int) (`placeEntity`), read
 * from the live fields at each call: the player's Build placement and
 * b.g()'s finished-construction call both use them.
 */
/**
 * Options for f.a(byte,int,int,int,int,boolean,int) (placeEntity). The
 * fields are read live when the placement runs, as the original reads its
 * own fields (T() changes q:B before placing). 2026-09-27: every placement
 * site shares rt (there were four copies), and the two callbacks below
 * are wired.
 */
export function buildingPlacementOptions(rt: LegacyRuntimeState) {
  const g = rt.game;
  const runtime = rt;
  return {
    auxiliaryIndex: 0,
    // See LegacyEntityPlacement.ts's own docblock (qCounter/qByte) for the frameS/qByte/qCounter bug fix.
    get frameS() { return g.cSInt; },
    get qByte() { return g.mission; },
    get qCounter() { return g.qCounter; },
    get teamZeroSlotValue() { return runtime.mainArrays.r[g.menuCursor] ?? 0; },
    get teamOneSlotValue() { return g.bUnit; },
    // Offset 1035 of f.a(BIIIIZI)B: [14]/[20] are skipped while f.s:Z holds (same fix as above).
    get suppressCounters() { return g.cameraSFlag; },
    // Offsets 87..115 / 694..722: when team 0 is out of slots, s:I = 100,
    // l(-1), u[0] = 0 and the a(10, 0, 0, 0) notice.
    onCapacityFailure: (_kind: "thirty-slots" | "ten-slots", team: number) => {
      if (team !== 0) return;
      g.cSInt = 100;
      rt.stepLegacyL(-1);
      rt.mainArrays.uBytes[0] = 0;
      rt.runByteActionQueue(10, 0, 0, 0);
    },
    // Offsets 361 / 426: f.c(int,int,int,int), the dirty-rect repaint.
    onFootprintMarked: (x: number, y: number, width: number, height: number) => rt.repaintRect(x, y, width, height),
    onTenSlotAllocate: (id: number) => subsystemTenSlotAllocate(rt, id),
    // BUG FIX (2026-08-24): rt.type===2 call site is #476 (final void
    // a(int)), not #563 -- confirmed via direct bytecode read (offset
    // 1075..1086 gates the SAME invokevirtual #476 on local2===2, the
    // "type" param). releaseTen (#563) has exactly one real call site,
    // inside c(int,boolean), not here.
    onTenSlotRelease: (id: number) => subsystemTenSlotReleaseEntity(rt, id),
    onTeamZeroSubsystem: (x: number, y: number, value: number) => {
      markLegacySpatialRecord({
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        layers: rt.mainArrays.aInt,
        layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
        mapHeight: rt.game.mapHeight,
      }, x, y, value);
    },
    onTeamZeroReset: (mode: number, x: number, y: number, flags: number) => rt.runByteActionQueue(mode, x, y, flags),
  };
}

/**
 * `b.g()` -- LegacySubsystemBuildingEconomy.ts. b's `u/v/z/x/A/C` scratch
 * fields are shared with the callees (ac/ad/aa/ab/ae and the entity loop),
 * so the loop reads and writes them through accessors on the live fields.
 */
export function stepBuildingEconomy(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const arrays = rt.subsystemArrays;
  const scratch: LegacyBuildingScratch = {
    get u() { return g.bTeam; }, set u(value) { g.bTeam = value; },
    get v() { return g.bUnit; }, set v(value) { g.bUnit = value; },
    get z() { return g.subsystemEntityZ; }, set z(value) { g.subsystemEntityZ = value; },
    get x() { return g.subsystemX; }, set x(value) { g.subsystemX = value; },
    get A() { return g.subsystemA; }, set A(value) { g.subsystemA = value; },
    get C() { return arrays.bField10; }, set C(value) { arrays.bField10 = value; },
  };
  // f.j:[[B (#194) row 4: action cycle length per mode.
  const cycleLengths = rt.packedData?.byteTables?.[4] ?? new Int8Array(256);
  const common = { state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, scratch };
  stepLegacySubsystemBuildingEconomy({
    ...common,
    simulationCounter: g.missionFrame,
    ax: {
      dShort: arrays.dShort,
      saveOffsets: rt.saveOffsets,
      sectionOffsets: rt.sectionOffsets,
      gameL: g.lInt,
    },
    fRows: arrays.fRows,
    gRows: arrays.gRows,
  }, {
    onN: () => runSubsystemN(rt),
    onFilterWorkers: (record) => rt.filterEntityLifecycle(record, true, (row, column) => rt.gridC[row]?.[column] ?? 0),
    onAd: () => stepLegacySubsystemTrainingComplete({
      state: rt.denseState,
      buildingId: g.bUnit,
      gRows: arrays.gRows,
      subsystemX: g.subsystemX,
      onEnqueueEffect: (record, mode) => enqueueLegacyEffectSlot(rt.mainArrays.e, record, mode),
      onRecordCompletion: (record) => rt.completeEntityRecord(record),
    }),
    onAa: () => stepLegacySubsystemAa({
      ...common,
      cycleLengths,
      onAb: (worker) => stepLegacySubsystemAb({
        ...common,
        cycleLengths,
        fRows: arrays.fRows,
        gRows: arrays.gRows,
        // b.a:[[S (#63) is f.a:[[S, copied in b.a(f).
        shortRows: rt.mainArrays.aShort,
        onChangeType: (id, type) => { rt.changeEntityType(id, type); },
        // a(2828[w], false, w) with v:I = the record -- the builder takes its materials.
        onActionCheck: (type, flag, worker) => rt.payEntityCost(type, flag, worker, g.bUnit),
        f: { get value() { return g.subsystemFFlag; }, set value(next: boolean) { g.subsystemFFlag = next; } },
      }, worker),
    }),
    onAc: () => stepLegacySubsystemTrainingCount({
      state: rt.denseState,
      team: g.bTeam,
      buildingId: g.bUnit,
      // b.C:I (#10) is shared with g()/aa(): g() zeroes it, aa() counts the
      // record's workers into it, ac() continues from there.
      scratch,
    }),
    // f.a((byte)u, 9237, 8383, 8444, 1, true, v) -- placeEntity; result popped.
    onAllocate: (team, type, x, y, replaced) => {
      rt.placeEntity(rt.gridC, team, type, x, y, 1, true, replaced, rt.buildingPlacementOptions());
    },
    onEnqueueEffect: (record, mode) => enqueueLegacyEffectSlot(rt.mainArrays.e, record, mode),
    onAe: () => stepLegacySubsystemAe({
      ...common,
      gridC: rt.gridC,
      fN: g.callToArmsActive,
      qByte: g.subsystemBQByte,
      fQ: g.mission,
      jobTable: rt.subsystemArrays.j,
    }),
  });
}

/**
 * f.d(int) offsets 988..1947, right after the sparse groups: the save
 * keeps only the -111..-122 cells, so the load writes everything else back
 * into c:[[B (gridC). PORTED 2026-09-27 -- it was missing, so after a load
 * no unit, animal or building was on the grid (units vanished from the
 * screen and could not be picked).
 */
export function rebuildGridAfterLoad(rt: LegacyRuntimeState): void {
  const e = rt.denseState;
  const a = rt.packedBytes;
  const s = rt.packedOffsets;
  const c = rt.gridC;
  const f = rt.mainArrays.f4; // f.f:[[B (#291)
  const set = (y: number, x: number, value: number) => {
    const row = c[y];
    if (row && x >= 0 && x < row.length) row[x] = value;
  };
  // The cell a moving unit is stepping into is reserved (-128) while it is
  // less than half way through the step, if that cell is still free.
  const reserveStep = (x: number, y: number, dir: number, frame: number, span: number) => {
    if ((frame & 15) >= Math.trunc(((a[s[15] + (dir & 1) * 9 + span] ?? 0) + 1) / 2)) return;
    const ny = y + (a[s[1] + 8 + dir] ?? 0);
    const nx = x + (a[s[1] + dir] ?? 0);
    if ((c[ny]?.[nx] ?? 1) === 0) set(ny, nx, -128);
  };

  for (let i = 0; i < 30; i += 1) { // 988..1058
    const kind = f[0][i] ?? 0;
    if (kind !== 0) set(f[3][i] ?? 0, f[2][i] ?? 0, kind > 30 ? -126 : -123);
  }
  for (let i = 0; i < 50; i += 1) { // 1061..1124
    if ((e[RES_KIND + i] ?? 0) >= 6) set(e[RES_Y + i] ?? 0, e[RES_X + i] ?? 0, toJavaByte(-61 - i));
  }
  for (let i = 1; i <= 100; i += 1) { // 1127..1459, units
    if ((e[UNIT_HP + i] ?? 0) === 0) continue;
    e[808 + i] = 0;
    if ((e[UNIT_SLOT + i] ?? 0) >= 0) continue;
    set(e[UNIT_Y + i] ?? 0, e[i] ?? 0, i);
    if (((e[UNIT_MODE + i] ?? 0) & 255) > 7) continue;
    reserveStep(e[i] ?? 0, e[UNIT_Y + i] ?? 0, e[UNIT_DIRECTION + i] ?? 0, e[1111 + i] ?? 0,
      (e[UNIT_SPEED + i] ?? 0) - (e[7777 + i] ?? 0));
  }
  for (let i = 0; i < 22; i += 1) { // 1462..1794, animals
    e[9689 + i] = 0;
    if ((e[ANIMAL_HP + i] ?? 0) === 0) continue;
    set(e[ANIMAL_Y + i] ?? 0, e[ANIMAL_X + i] ?? 0, 101 + i);
    if (((e[9557 + i] ?? 0) & 255) > 7) continue;
    reserveStep(e[ANIMAL_X + i] ?? 0, e[ANIMAL_Y + i] ?? 0, e[9491 + i] ?? 0, e[9623 + i] ?? 0,
      a[s[179] + (e[ANIMAL_KIND + i] ?? 0)] ?? 0);
  }
  for (let i = 1; i <= 60; i += 1) { // 1797..1947, building footprints
    if ((e[BLD_HP + i] ?? 0) === 0) continue;
    const kind = e[BLD_KIND + i] ?? 0;
    const rows = a[s[138] + 130 + kind] ?? 0;
    const cols = a[s[138] + 104 + kind] ?? 0;
    for (let r = 0; r < rows; r += 1) {
      for (let col = 0; col < cols; col += 1) set((e[BLD_Y + i] ?? 0) + r, (e[BLD_X + i] ?? 0) + col, toJavaByte(-i));
    }
  }
}

/** Shared input for the map overview's C()/D()/e(int,int) (LegacyMapOverview.ts). */
export function mapOverviewInput(rt: LegacyRuntimeState): LegacyMapOverviewInput {
  const g = rt.game;
  return {
    graphics: rt.offscreenTargets?.graphics ?? [],
    images: rt.offscreenTargets?.images ?? [],
    imageSlots: g.frameImageSlots,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: rt.packedData?.shortTables ?? [],
    byteTables: rt.packedData?.byteTables ?? [],
    colors: rt.mainArrays.bColors,
    gridC: rt.gridC,
    gridB: rt.gridB,
    dense: rt.denseState,
    occupancyClass: (x, y) => rt.occupancyClass(x, y),
    drawSprite: (graphicsIndex, record, x, y) => {
      const graphics = rt.offscreenTargets?.graphics[graphicsIndex as 0 | 1 | 2 | 3];
      if (!graphics || !rt.packedData) return;
      new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      }).drawSprite(record, x, y);
    },
    mapWidth: g.mapWidth,
    mapHeight: g.mapHeight,
    W: g.exitPrepWInt,
    X: g.exitPrepXInt,
    aL: g.exitPrepALInt,
    af: g.columnScrollDelta,
    ag: g.rowScrollDelta,
    size: g.mapOverviewSize,
  };
}

/**
 * Execute the confirmed f.g(byte) map-entry phases against rt raw runtime.
 *
 * This remains an explicit public entry point for tooling and tests; the
 * default f.am(T=0) bridge also reaches it through the proven g(byte) call.
 * The three callbacks mirror private f.aM(), f.aN(), and f.aO() in order;
 * stepLegacyMapEntry supplies the original broad Exception boundary.
 */
export function stepMapEntry(rt: LegacyRuntimeState, q: number, placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
  stepStateMapEntry(rt, q, {
    onAM: () => rt.resetMapEntryAllocation(q),
    onAN: () => { rt.loadMap(q); },
    onAO: () => {
      const mapState: LegacyAOMapState = {
        q: rt.game.mission,
        C: rt.game.cursorTargetColumn,
        D: rt.game.cursorTargetRow,
        y: 0, A: 0, I: 0, J: 0, K: 0, L: 0, z: 0, B: 0,
      };
      stepLegacyAOMap({
        state: mapState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        aShort: rt.mainArrays.aShort,
        onAP: () => rt.runAP(placementCallbacks),
        // BUG FIX (2026-08-18): same two-way state.I/K sync as
        // stepEntityCoordinateUpdate's own onViewportNormalize -- push the
        // freshly-computed mapState.I/K into game.cameraColumn/KByte BEFORE
        // calling aK() (so it clamps the real fresh position, not
        // whatever game.cameraColumn/KByte held before rt call started), then
        // pull the clamped result back out afterward so stepLegacyAOMap's
        // own post-callback `state.J = state.I; state.L = state.K;`
        // (offset 118..131) reads the clamped value, not the stale one.
        onViewportNormalize: () => {
          rt.game.cameraColumn = mapState.I;
          rt.game.cameraRow = mapState.K;
          rt.normalizeEntityViewport();
          mapState.I = rt.game.cameraColumn;
          mapState.K = rt.game.cameraRow;
        },
        onSpatialPass: () => rt.runSpatialPass({}),
      });
      // BUG FIX (2026-08-18): mapState.y/A (f.y:B/#387, f.A:B/#34) used to
      // be written back into the same stale viewportC/viewportD fields
      // fixed above, instead of the real yByte/AByte fields those
      // constant-pool indices actually name -- and mapState.z/B (f.z:B/
      // #390, f.B:B/#37) were never written back at all. Confirmed via
      // direct bytecode read of aO() itself (offsets 134..150).
      rt.game.cursorColumn = mapState.y;
      rt.game.cursorRow = mapState.A;
      rt.game.zByte = mapState.z;
      rt.game.BByte = mapState.B;
      rt.game.cameraColumn = mapState.I;
      rt.game.JByte = mapState.J;
      rt.game.cameraRow = mapState.K;
      // BUG FIX (2026-09-09): was `rt.game.selectedId = mapState.L`. `aO()`
      // writes #72 (`L:B`, UPPERCASE -- bytecode/f-javap.txt offsets 108
      // and 131, the saved-camera-row half of the `J:B = I:B; L:B = K:B`
      // re-save that follows `aK()`), and #72 is tracked as
      // `game.cameraSavedKByte`. `game.selectedId` is `f.l:B` (#337, LOWERCASE
      // l) -- a completely different field. So map entry both failed to
      // save the camera row AND corrupted the lowercase field with it.
      // This is the SAME trap already fixed once in
      // `stepEntityCoordinateUpdate` (2026-08-31); it survived here.
      // Directly observable: after `stepMapEntry(0)` the port left
      // `J === I === 15` but `L === 0` while `K === 5`, even though
      // offsets 118..131 make `J === I` and `L === K` unconditionally.
      // `aD()`'s Q=28 branch then restores `K:B = L:B`, so the wrong `L`
      // moved the camera to row 0 on every real map entry.
      rt.game.cameraSavedKByte = mapState.L;
    },
  });
}

/** Raw f.aM() allocation reset wired to the existing field-shaped arrays. */
export function resetMapEntryAllocation(rt: LegacyRuntimeState, q: number): void {
  const state = {
    uFlag: rt.game.boxSelecting,
    tFlag: rt.game.inputT,
    F: rt.game.selectionGroup,
    LFlag: rt.game.formUpActive,
    NFlag: rt.game.callToArmsActive,
    FFlag: rt.game.entityFocusFlag,
    KFlag: rt.game.choosingChief,
    X: rt.game.exitPrepXInt,
    W: rt.game.exitPrepWInt,
    aL: rt.game.exitPrepALInt,
    uByte: rt.game.uByte,
    ay: rt.game.ayByte,
    kFlag: rt.game.kResetFlag,
    cInt: rt.game.missionFrame,
    h: rt.game.tailHCounter,
  };
  resetLegacyAM({
    state,
    dense: rt.denseState,
    denseLimit: rt.denseState.length,
    aRows: rt.mainArrays.aByte,
    // aM() offsets 130..148 clear f.u:[B (#371), not b.h:[B. CORRECTED
    // 2026-10-12 (oracle run 12, play7 frame 21693).
    u: rt.mainArrays.uBytes,
    c3: rt.game.teamMarkerTable,
    entitySlots: rt.mainArrays.e[0],
    intLayers: rt.mainArrays.aInt[0],
    bytePlanes: rt.mainArrays.aByte3,
    f4: rt.mainArrays.f4,
    bPlanes: rt.game.xSlotTable,
    // f.aM() clears the separately allocated f.c[96][96] and f.b[96][96]
    // planes.  They are the runtime gridC/gridB buffers, not f.h/f.i
    // (which are the independently allocated 13x101 tables).
    map: rt.gridC,
    bMap: rt.gridB,
    g: rt.mainArrays.g,
    gRows: rt.mainArrays.g.length,
    gCols: rt.mainArrays.g[0]?.length ?? 0,
    shortRows: rt.mainArrays.aShort,
    // Offsets 463..466: the pools are kept while s:Z (#365, cameraSFlag --
    // set by S()/U() around scripted scenes) is on. Was a constant false
    // until 2026-09-27, so a scene's map reload wiped them.
    sFlag: rt.game.cameraSFlag,
    // aM() offset 524: t() (#649), clear f.d:[[B row 0. Wired 2026-09-27.
    onT: () => rt.stepLegacySceneAnimatedSlotClear(),
    onBankReset: () => {
      rt.subsystemArrays.initializeOriginal();
      // b.a() offsets 126..164: f.t[0..2] = 0 -- f.t:[B (#368) is game.subsystemT,
      // which b.h() reads. MERGED 2026-10-10 (oracle run 9, frame 21693): b.a()
      // cleared an unread twin (subsystemArrays.t), so the animal counts carried
      // over into the next map.
      rt.game.subsystemT.fill(0);
      // b.a() offset 43: f.a:Lc;.a() -- missing until 2026-10-10 (oracle run 7, frame 21232).
      stepLegacyClassCReset(rt.resourceTables);
      rt.game.subsystemRByte = q === 2 || q === 4 ? -128 : 0; // b.R:B (#48)
      // BUG FIX (2026-08-25): b.f:B#167/b.I:B#23/
      // b.Q:B#46 are the canonical game.* fields, not subsystemArrays.
      rt.game.subsystemGFFlagByte = 0;
      rt.game.subsystemGCurrentI = q === 2 ? 3 : 0;
      rt.game.subsystemBQByte = -1;
      // b.a() offsets 67..79 and 116..123: O:B = aR:I = P:B = -1.
      rt.game.subsystemOByte = -1;
      rt.game.subsystemAR = -1;
      rt.game.subsystemP = -1;
      // b.a() offset 361: j() fills f.f:[B, the per-kind max level f.ac() offers UPGRADE below.
      // Missing until 2026-10-16 (oracle, f.f set at frame 95): it stayed 0 in a new game, so no
      // building ever showed UPGRADE until a save was loaded. aM() has already zeroed f.c
      // (state.cInt, written back to game.missionFrame only afterwards); with the old count the q=2 time
      // unlocks fired on a map reload (play26 frame 72053).
      rt.runSubsystemJ(q, state.cInt);
      // b.a() offsets 364..383, its last write: G:I = a:[S][219] + f.q:B*4.
      // Missing until 2026-10-08 (oracle), so at()'s table base stayed 0.
      rt.game.subsystemGBase = (rt.packedOffsets[219] ?? 0) + q * 4; // b.a:[S] is f.a:[S] (packedOffsets)
    },
    // f.aM()'s own call to private void i() (#610, offset 590, right
    // after the b.a():V bank reset and right before kFlag=true --
    // CORRECTION 2026-08-22: was wired to the unrelated
    // resetInputTransientState(); see docs/unknowns.md).
    onInputReset: () => resetLegacyZI(rt.game),
  });
  // Every scalar aM() writes (offsets 0..12, 529..595). u:Z/t:Z/L:Z/X/W/aL/h
  // were never written back, and N:Z (#81) went to the unrelated nFlag,
  // until 2026-10-10 (oracle run 7, frame 21232).
  rt.game.boxSelecting = state.uFlag;
  rt.game.inputT = state.tFlag;
  rt.game.selectionGroup = state.F;
  rt.game.formUpActive = state.LFlag;
  rt.game.callToArmsActive = state.NFlag;
  rt.game.exitPrepXInt = state.X;
  rt.game.exitPrepWInt = state.W;
  rt.game.exitPrepALInt = state.aL;
  rt.game.tailHCounter = state.h;
  rt.game.entityFocusFlag = state.FFlag;
  rt.game.choosingChief = state.KFlag;
  rt.game.uByte = state.uByte;
  rt.game.ayByte = state.ay;
  rt.game.kResetFlag = state.kFlag; // f.k:Z (#332); state.KFlag above is K:Z
  rt.game.missionFrame = state.cInt;
}

/** Raw tiles plus the first f.aN() overlay pass, ready for later consumers. */
export function decodeMap(rt: LegacyRuntimeState, mapIndex: number, onSpecialTile?: (type: number, x: number, y: number, parameter: number) => void): LegacyRawMap & LegacyMapOverlay {
  const raw = applyLegacyTerrainAdjustment(rt.decodeRawMap(mapIndex), (mask, divisor) =>
    rt.randomRemainder(mask, divisor),
  );
  // f.aN() derives the active map dimensions before writing the map grid;
  // keep the same dimensions live for f.c/f.d consumers and footprint gates.
  // f.c:S (#254) / f.d:S (#266) -- the LOGICAL dimensions, which for q === 0
  // and q === 5 differ from the decode stride. See LegacyRawMap's docblock.
  rt.game.mapWidth = raw.logicalWidth;
  rt.game.mapHeight = raw.logicalHeight;
  if (!rt.packedData) throw new Error("/pd0 data has not been attached to runtime state");
  const specialTiles: LegacySpecialTile[] = [];
  const overlay = buildLegacyMapOverlay({
    width: raw.width,
    height: raw.height,
    tiles: raw.tiles,
    tileFlags: rt.packedData.shortTables[9],
    tileKinds: rt.packedData.byteTables[16],
    mapIndex,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    onSpecialTile: (type, x, y, parameter) => specialTiles.push({ type, x, y, parameter }),
  });
  for (const tile of specialTiles) {
    allocateLegacySpecialTile(rt.denseState, (x, y, value) => {
      if (y >= 0 && y < raw.height && x >= 0 && x < raw.width) overlay.values[y * raw.width + x] = value;
    }, tile);
    onSpecialTile?.(tile.type, tile.x, tile.y, tile.parameter);
  }
  applyLegacyMapNeighborPass(raw.width, raw.logicalHeight, raw.logicalWidth, raw.tiles, overlay.values, rt.denseState);
  projectLegacyMapGrids(raw, overlay, rt.gridB, rt.gridC);
  const result = { ...raw, ...overlay };
  rt.activeMap = { ...raw, overlay: overlay.values };
  return result;
}

/** Decode and retain one original map for the later f.o() render/update path. */
export function loadMap(rt: LegacyRuntimeState, mapIndex: number, onSpecialTile?: (type: number, x: number, y: number, parameter: number) => void): LegacyRenderableMap {
  decodeMap(rt, mapIndex, onSpecialTile);
  if (!rt.activeMap) throw new Error("map decode did not produce an active map");
  return rt.activeMap;
}

/**
 * Execute the bytecode-backed a(IIIIB) -> p()/q() lifecycle with an
 * evidence-backed raw field view. The caller-owned view is intentional until
 * every original scalar alias is proven against LegacyGameState.
 */
export function runProjectionLifecycle(rt: LegacyRuntimeState, input: LegacyProjectionLifecycleInput): ReturnType<typeof runLegacyProjectionLifecycle> {
  const result = runLegacyProjectionLifecycle({
    ...input,
    onQ: (state) => {
      rt.game.applyProjectionPreparation(state);
      input.onQ(state);
    },
  });
  rt.game.applyProjectionPreparation(result);
  return result;
}
