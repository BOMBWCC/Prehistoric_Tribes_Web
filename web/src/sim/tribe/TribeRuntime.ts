import type { LegacyRuntimeState } from "../../core/LegacyRuntimeState";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import { stepLegacyClassCReset } from "../../platform/LegacyResourceTables";
import { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { stepLegacyEntityGPrefix } from "../units/LegacyEntityGPrefix";
import { stepLegacyEntityHPrefix } from "../units/LegacyEntityHPrefix";
import { stepLegacyEntityHActionBranch } from "../units/LegacyEntityHActionBranch";
import { stepLegacyD as stepLegacyFD } from "../../ui/LegacyFrameProgressionScan";
import { resetLegacyZI } from "../../ui/LegacyZI";
import { enqueueLegacyEffectSlot } from "../../render/LegacyEffectSlotScan";
import { legacySubsystemDecision } from "./LegacySubsystemDecision";
import { allocateLegacySubsystemRecord } from "./LegacySubsystemRecord";
import { selectLegacyAuxiliaryCandidates, restoreLegacyAuxiliary } from "../world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "../units/LegacyEntityIUpdate";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "./LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "./LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "./LegacySubsystemTail";
import { stepLegacySubsystemWorkerDispatch } from "./LegacySubsystemWorkerDispatch";
import { stepLegacyEntityIFinalize } from "../units/LegacyEntityIFinalize";
import { checkLegacyEntityAffordable } from "../units/LegacyEntityResourceCost";
import { stepLegacySubsystemVoidN } from "./LegacySubsystemVoidN";
import { stepLegacySubsystemAq } from "./LegacySubsystemAq";
import { stepLegacySubsystemAr } from "./LegacySubsystemAr";
import { stepLegacySubsystemAs } from "./LegacySubsystemAs";
import { stepLegacySubsystemAv } from "./LegacySubsystemAv";
import { stepLegacySubsystemAw } from "./LegacySubsystemAw";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "./LegacySubsystemAt";
import { stepLegacySubsystemLowerO } from "./LegacySubsystemLowerO";
import { stepLegacySubsystemNearestBuilding } from "./LegacySubsystemNearestBuilding";
import { stepLegacySubsystemAk } from "./LegacySubsystemAk";
import { stepLegacySubsystemAl } from "./LegacySubsystemAl";
import { stepLegacySubsystemH } from "./LegacySubsystemH";
import { legacySubsystemNGate } from "./LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "./LegacySubsystemNDecision";
import { stepLegacySubsystemNOrchestrator, type LegacySubsystemNOrchestratorInput } from "./LegacySubsystemNOrchestrator";
import { stepLegacySubsystemBDecision, type LegacySubsystemBDecisionInput } from "./LegacySubsystemBDecision";
import { checkLegacyResourceNodeGate } from "../world/LegacyResourceNodeGate";
import { stepLegacyEntityOccupantCare } from "../units/LegacyEntityOccupantCare";
import { stepLegacyEntityRecordRecovery } from "../units/LegacyEntityRecordRecovery";
import { stepLegacySubsystemBBoolean } from "./LegacySubsystemBBoolean";
import { legacySubsystemBEntryGate } from "./LegacySubsystemBEntryGate";
import { stepLegacySubsystemBActivityPrefix, type LegacySubsystemBActivityPrefixInput } from "./LegacySubsystemBActivityPrefix";
import { selectLegacySubsystemBAction, type LegacySubsystemBActionSelectorInput } from "./LegacySubsystemBActionSelector";
import { stepLegacySubsystemBFinalPrefix, type LegacySubsystemBFinalPrefixInput } from "./LegacySubsystemBFinalPrefix";
import { stepLegacySubsystemB, type LegacySubsystemBInput } from "./LegacySubsystemBOrchestrator";
import { stepLegacySubsystemAj } from "./LegacySubsystemAj";
import { stepLegacySubsystemAm } from "./LegacySubsystemAm";
import { stepLegacySubsystemN } from "./LegacySubsystemN";
import { stepLegacySubsystemBBoolean2 } from "./LegacySubsystemBBoolean2";
import { stepLegacyEntityMarkerCommit } from "../units/LegacyEntityMarkerCommit";
import { stepLegacyAnimalHitReaction } from "../units/LegacyAnimalHitReaction";
import { stepLegacyEntityScreenIndex } from "../units/LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "../units/LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "../units/LegacyEntitySpotAlert";
import { computeLegacySubsystemPairScore } from "./LegacySubsystemScore";
import { stepLegacySubsystemClampBounds } from "./LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup } from "./LegacySubsystemNearbyMarkerLookup";
import { stepLegacySubsystemEntityUpdateTail } from "./LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "./LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "./LegacySubsystemEntityDisplace";
import { stepLegacySubsystemRecordWorkerLevel } from "./LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "./LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "./LegacySubsystemUnitTraining";
import { stepLegacySubsystemAf } from "./LegacySubsystemAf";
import { stepLegacySubsystemAg } from "./LegacySubsystemAg";
import { stepLegacySubsystemAh } from "./LegacySubsystemAh";
import { stepLegacySubsystemAi } from "./LegacySubsystemAi";
import { stepLegacySubsystemEntityTrainingSlot } from "./LegacySubsystemEntityTrainingSlot";
import { stepLegacySubsystemO } from "./LegacySubsystemO";
import { triggerLegacyEntityMove } from "../units/LegacyEntityMoveTrigger";
import { stepLegacySubsystemT } from "./LegacySubsystemT";
import { stepLegacySubsystemNPrivateO } from "./LegacySubsystemNPrivateO";
import { stepLegacyEntityStatusGuard } from "../units/LegacyEntityStatusGuard";
import { stepLegacyEntityActionCommit } from "../units/LegacyEntityActionCommit";
import { stepLegacyEntityFollowup } from "../units/LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "./LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "./LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityCWatch } from "../units/LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "../units/LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "../units/LegacyEntityOccupantCheck";
import { stepLegacySubsystemAn } from "./LegacySubsystemAn";
import { checkLegacySpiralPlacementGate } from "../world/LegacySpiralPlacementGate";
import { stepLegacySubsystemP } from "./LegacySubsystemP";
import { stepLegacySubsystemBVoidO } from "./LegacySubsystemBVoidO";
import { stepLegacySubsystemScore } from "./LegacySubsystemScore";
import { syncLegacySubsystemBCoordinate } from "./LegacySubsystemBCoordinateSync";
import { stepLegacyEntityRecordCancel } from "../units/LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "../../ui/LegacyZB2";
import { allocateLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlotEntity, releaseLegacySubsystemBEntitySlot } from "./LegacySubsystemBTenSlot";
import { indexLegacyEntityRecord } from "../world/LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "../units/LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "../units/LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "../units/LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "../units/LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "../units/LegacyEntityESelection";
import { checkLegacyEntityRecord } from "../units/LegacyEntityRecordCheck";
import { stepLegacyEntityAssociationCleanup } from "../units/LegacyEntityAssociationCleanup";
import { calculateLegacyEntityM } from "../units/LegacyEntityMCalculation";
import { stepLegacySubsystemEntityTransform } from "./LegacySubsystemEntityTransform";
import { filterLegacyEntityLifecycle } from "../units/LegacyEntityLifecycleFilter";
import { transferLegacyEntityAction } from "../units/LegacyEntityActionTransfer";
import { stepLegacySubsystemOLower } from "./LegacySubsystemOLower";
import { stepLegacyAj } from "../../ui/LegacyStateMachine";
import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { liveView } from "../../core/LegacyRuntimeState";
import { T_BUILDING_MAX_LEVEL, T_TYPE_JOB, T_UPGRADE_UNLOCK_KIND, T_UPGRADE_UNLOCK_RANGE, T_UPGRADE_UNLOCK_TIME } from "../../core/DataTables";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Raw b.s() prepass used by the original b.e() update. */
export function runSubsystemPrepass(rt: LegacyRuntimeState, 
  frame: number,
  q: number,
  bByte: number,
  lFlag: boolean,
  callbacks: Omit<LegacySubsystemPrepassInput, "frame" | "q" | "bByte" | "lFlag" | "packedBytes" | "packedOffsets" | "mainShort">,
): void {
  runLegacySubsystemPrepass({
    ...callbacks,
    frame,
    q,
    bByte,
    lFlag,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    mainShort: rt.mainArrays.aShort,
  });
}

/** Raw b.e() outer entity loop; private entity methods remain callbacks. */
export function runSubsystemEntityLoop(rt: LegacyRuntimeState, 
  frame: number,
  q: number,
  bByte: number,
  scheduler: { kByte: number },
  callbacks: Omit<LegacySubsystemEntityLoopInput, "state" | "mainShort" | "packedBytes" | "packedOffsets" | "frame" | "q" | "bByte" | "scheduler"> = {},
): void {
  runLegacySubsystemEntityLoop({
    ...callbacks,
    state: rt.denseState,
    mainShort: rt.mainArrays.aShort,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    frame,
    q,
    bByte,
    scheduler,
  });
}

/** Raw private b.o() state writes; b(IIII)B remains an explicit callback. */
export function stepSubsystemOLower(rt: LegacyRuntimeState, input: Omit<Parameters<typeof stepLegacySubsystemOLower>[0], "dense" | "flags">): void {
  stepLegacySubsystemOLower({
    ...input,
    dense: rt.denseState,
    flags: rt.subsystemArrays.aFlags,
  });
}

/**
 * `final void c()` (bytecode/b-javap.txt offsets 0..117), class `b`'s own
 * team-1..50 sweep: reuses the shared `v:I`(#225) loop register (same
 * pattern as `subsystemBTeamSweep`), AND-masks `dense[7979+id]` with 159,
 * and conditionally calls `private void a(int,boolean)`(#278) with
 * `arg2` hardcoded `false` (offset 100, a literal `iconst_0`).
 * CORRECTION (2026-08-22): `a(int,boolean)`(#278) is now fully ported
 * (`LegacySubsystemBCoordinateSync.ts`) and called directly here -- its
 * own `arg2` branch (an inner call to the large, ~50-call-site,
 * not-yet-ported `a(int,byte)`(#275)) stays unreachable via rt call
 * site since `arg2` is always `false`, exposed only as an optional
 * `onSpawnMark` callback.
 */
export function subsystemBC(rt: LegacyRuntimeState): void {
  const dense = rt.denseState;
  for (let id = 1; id <= 50; id += 1) {
    dense[UNIT_FLAGS + id] = (dense[UNIT_FLAGS + id] ?? 0) & 159;
    if ((dense[UNIT_HP + id] ?? 0) > 0 && (dense[UNIT_TYPE + id] ?? 0) === 69 && (dense[UNIT_ORDER + id] ?? 0) === 0) {
      syncLegacySubsystemBCoordinate({
        dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      }, id, false);
    }
  }
}

/**
 * Execute the confirmed outer b.g()/b.e() update order used by f.j().
 *
 * b.h() and the entity-private movement/combat calls are intentionally left
 * as raw callback boundaries until their bytecode consumers are mapped.
 *
 * WIRED (2026-08-24): `selectEntityUpdateCandidates`'s `onCleanup` --
 * see `LegacyEntityUpdateSelection.ts`'s own docblock for the bug rt
 * fixed (the gate conditions were previously inverted/mis-scoped, and
 * never wired to any real caller, so it shipped silently broken). The
 * real bytecode's `f.a(id,true)` is the already-ported/wired
 * `filterEntityLifecycle` (same `readEntityCell` used at its other real
 * call site above); `b.ad()` is the already-ported `cleanupEntityUpdate`.
 *
 * WIRED (2026-08-24): `onEntityReset`/`onEntityFinalize` (`f.a(id,0)`/
 * `f.d(id)`) -- both targets were already ported/wired elsewhere and
 * just needed reuse here: `f.a(int,int)`(#477) is `enqueueLegacyEffectSlot`
 * (same `mainArrays.e`/`e:[[B]`#280 table `stepEntityRemoval` already
 * enqueues into above); `f.d(int)` is `stepLegacyFD`
 * (`LegacyFrameProgressionScan.ts`'s `stepLegacyD`, imported aliased,
 * same helper already wired at rt file's `onSlotAction`/offset-100
 * call sites).
 */
export function stepSubsystemFrame(rt: LegacyRuntimeState): void {
  rt.selectEntityUpdateCandidates(rt.game.missionFrame, {
    onCleanup: (id, associationIndex) => {
      rt.filterEntityLifecycle(id, true, (row, column) => rt.gridC[row]?.[column] ?? 0);
      rt.cleanupEntityUpdate(id, associationIndex, {
        onEntityReset: (entityId, mode) => {
          enqueueLegacyEffectSlot(rt.mainArrays.e, entityId, mode);
        },
        onEntityFinalize: (entityId) => {
          const dState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
          stepLegacyFD(entityId, dState);
          rt.game.pendingP = dState.P;
        },
      });
    },
  });
  // b.K:B (#28), live: a():Z resets it mid-loop (offset 654). FIXED 2026-10-09 (oracle run 5,
  // frame 12810): a snapshot written back after the loop undid every reset, so K stayed 50 and
  // b.a(byte,int,int) raised prompts the original holds back while K < 50.
  const arrays = rt.subsystemArrays;
  const scheduler = { get kByte() { return arrays.bField28; }, set kByte(value: number) { arrays.bField28 = value; } };
  // e()'s own exception table (offsets 0..832 -> 833, pop;return) wraps
  // the ENTIRE method -- confirmed via direct bytecode read (2026-08-27).
  // This matters because b.t()'s onEntityTargetStep callback can reach a
  // confirmed-guaranteed-throw (subsystemEntityTransform, only when an
  // entity's mode is exactly 2 -- see LegacyEntityActionCommit.ts's own
  // docblock) that is NOT locally caught inside t() itself, so it
  // propagates here. Faithfully reproducing e()'s own catch means one
  // mode===2 entity anywhere in the roster aborts the REST of rt
  // tick's entity loop (every entity after it in iteration order), not
  // just that one entity -- matched with a try/catch at rt exact
  // scope, not the broader f.j()-level catch four other confirmed-throw
  // instances rt session relied on.
  try {
    runSubsystemEntityLoop(rt, 
      rt.game.missionFrame,
    rt.game.mission,
    // f.b:B (b's #138, f's #243 -- levelBByte). CORRECTED 2026-10-14: subsystemModeByte, never written.
    rt.game.difficulty,
    scheduler,
    {
      // b.e()'s own u:I maintenance -- see LegacySubsystemEntityLoop.ts's
      // note at rt callback's call site.
      onTeamStart: (team) => { rt.game.bTeam = team; },
      onV: (v) => { rt.game.bUnit = v; },
      readV: () => rt.game.bUnit,
      onTeamOneAuxiliary: () => { subsystemTeamOneAiMuster(rt); },
      // b.e()'s offset-31 `a(0)` (#281, stepLegacySubsystemWorkerDispatch),
      // result popped. WIRED 2026-09-22 -- the last of e()'s four unwired
      // calls; the method itself was already ported for y()/ap().
      onWorkerDispatchPass: (argument) => {
        stepLegacySubsystemWorkerDispatch({
          state: rt.denseState,
          fields: liveView<{ v: number }>(rt.game, { v: "bUnit" }),
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          team: rt.game.bTeam,
          aRows: rt.mainArrays.aByte3,
          bRows: rt.game.xSlotTable,
          onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
          onN: (entityId) => rt.stepSubsystemN(entityId, rt.game.bTeam),
        }, argument);
      },
      // b.e()'s offset-256 `h()`, WIRED 2026-09-22 -- a villager noticing an
      // enemy marker within its sight, and the "stop and look" animation
      // whose `true` return holds the unit for the rest of the tick.
      onEntityTimingCheck: (id) => stepLegacyEntitySpotAlert({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        v: id,
        team: id <= 50 ? 0 : 1,
        frame: rt.game.missionFrame,
        markerTable: rt.game.teamMarkerTable,
        jRow4: (index) => rt.packedData?.byteTables?.[4]?.[index] ?? 0,
        scratch: rt.spotAlertScratch(),
        onSpiralGate: (mode, scanLimit, x, y) => {
          try {
            rt.checkSpiralPlacementGate(mode, scanLimit, x, y, id);
          } catch {
            // e()'s own exception table covers rt call.
          }
        },
      }),
      // b.e()'s offset-311 `B()`, WIRED 2026-09-22 -- it picks the thought
      // bubble LegacyEntityOverlayDraw draws as sprite 77 + dense[3333+id].
      // Unwired, villagers only ever showed the few icons k() and i() set.
      onPeriodicEntityAction: (id) => stepLegacyEntityMoodPick({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        saveOffsets: rt.saveOffsets,
        v: id,
        random: (mask, divisor) => rt.randomRemainder(mask, divisor),
      }),
      // b.e()'s offset-752 `T()`, WIRED 2026-09-22 -- it rebuilds the
      // on-screen entity index (gridG plus the dense[6060] chain) that
      // LegacySecondaryCellChain.ts walks. Nothing had ever produced it.
      onFinalScriptedPass: () => stepLegacyEntityScreenIndex({
        state: rt.denseState,
        gridG: rt.gridG,
        viewportI: rt.game.cameraColumn,
        viewportK: rt.game.cameraRow,
        viewportO: rt.game.viewColumns,
        viewportP: rt.game.viewRows,
      }),
      onTeamEnd: (team) => { subsystemUnitTraining(rt, team); },
      onPrepass: () => {
        runSubsystemPrepass(rt, 
          rt.game.missionFrame,
          rt.game.mission,
          // b.s() offsets 87..90: f.b:B (levelBByte). CORRECTED 2026-10-14: subsystemModeByte.
          rt.game.difficulty,
          // b.s() offset 30 reads f.L:Z (#33), FORM UP. CORRECTED 2026-10-13
          // (oracle run 14, play11 frame 48344): it read subsystemLFlag, a
          // twin nothing wrote, so the b() sweep never ran during FORM UP.
          rt.game.formUpActive,
          {
            // b.s() offset 7: c.b() -- the floating +n/-n texts. Wired 2026-09-28.
            onResourceTick: () => rt.geometry.stepFloatingTexts(rt.game.missionFrame),
            fByte: rt.game.subsystemGFFlagByte,
            onFReset: () => { rt.subsystemArrays.bField16 = 0; },
            // BUG FIX (2026-09-04): b.s()'s `(f.c & 3) === 0` guard calls
            // `b.d()` (offset 22, invokevirtual #368) -- the every-4th-
            // frame fog/vision recompute, and the ONLY per-frame producer
            // of `mainArrays.aInt`. It was never wired here, so after
            // d797a4b wired the one-shot U()-entry pass, the layers still
            // went empty again the moment anything reset them and never
            // came back: occupancyClass() read 2 (fully unexplored) for
            // every tile of every map, so f.u() filled the whole visible
            // window with the class-2 solid black fog rect and drew no
            // terrain or entity sprite at all. Live-confirmed before the
            // fix: `runSpatialPass` called 0 times across 5 ticks with 9
            // live entities on the map, both int layers all-zero.
            onSpatialPass: () => rt.runSpatialPass({}),
            // b.s()'s `f.L && (f.c&63)===2` guard calls b's own `final
            // void b()` (offset 51, invokevirtual #338 "Method b:()V" --
            // the ONLY no-arg void-returning `b()` in class b, distinct
            // from the `private boolean b()` overload) -- the SAME
            // method already ported and wired elsewhere as
            // `subsystemBTeamSweep`.
            onEntityGuardPass: () => rt.subsystemBTeamSweep(),
          },
        );
      },
      onEntityStatusCheck: (id) => stepLegacyEntityStatusGuard({
        fields: liveView<{ B: number }, LegacySubsystemArrays>(rt.subsystemArrays, { B: "bField8" }),
        onFBump: () => { rt.subsystemArrays.bField16 += 1; },
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortTableB: rt.saveOffsets,
        gridC: rt.gridC,
        id,
        team: id <= 50 ? 0 : 1,
        frame: rt.game.missionFrame,
        subsystemGFFlagByte: rt.game.subsystemGFFlagByte,
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        fQByte: rt.game.mission,
        bShort: rt.saveOffsets,
        shortTableBOffsets: rt.sectionOffsets,
        outerLoopLFlag: rt.game.formUpActive,
        onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
        // b.a():Z offsets 652..654 -- K:B (#28) reset, now modelled; see
        // LegacySubsystemArrays.bField28's own docblock.
        onSchedulerReset: () => { rt.subsystemArrays.bField28 = 0; },
        // a(int,int,int,byte) (#283) -- s()/q()/r() reach it through here, so
        // a unit whose HP hits 0 actually leaves the map. Wired 2026-09-16.
        onVacate: (kind, vx, vy, target) => rt.vacateEntity(kind, vx, vy, target),
        // f.b(byte) (#348) at ages 12 and 35: re-roll e[2727+id] for the
        // new life stage. Wired 2026-09-27 (ported, never connected).
        onLevelMilestone: (id) => indexLegacyEntityRecord(rt.entityRecordLifecycleInput(), id),
        // a()'s periodic V() (#258, housing) and W() (happiness drift). Both
        // were unwired until 2026-09-18, so no villager ever got a home and
        // happiness never moved from its birth value -- see
        // LegacyEntityHousing.ts / LegacyEntityHappiness.ts.
        onV: (target) => stepLegacyEntityHousing({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          pool: rt.mainArrays.aShort,
          id: target,
          team: target <= 50 ? 0 : 1,
        }),
        onW: (target) => {
          const game = rt.game;
          stepLegacyEntityHappiness({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            id: target,
            team: target <= 50 ? 0 : 1,
            frame: game.missionFrame,
            fQ: game.mission,
            bShort: rt.saveOffsets,
            shortTableBOffsets: rt.sectionOffsets,
            scratch: { get w() { return game.subsystemW; }, set w(value) { game.subsystemW = value; } },
          });
        },
        // a()'s periodic X() and Y() (the 8080 crowding counter), wired
        // 2026-09-20 -- see LegacyEntityCrowdStress.ts. X() decays 8080 while
        // the unit holds its own cell and raises it (clamped to 30) while it
        // does not; at 30 it sets 7979 bit 2, whose icon f.q() draws as
        // sprite record 73, and Y() then spreads +8 onto adult neighbours.
        onX: (target) => stepLegacyEntityCrowdDecay({
          state: rt.denseState,
          entityId: target,
          gridC: rt.gridC,
          mapWidth: rt.game.mapWidth,
          mapHeight: rt.game.mapHeight,
        }),
        onY: (target) => stepLegacyEntityCrowdSpread({
          state: rt.denseState,
          entityId: target,
          gridC: rt.gridC,
          mapWidth: rt.game.mapWidth,
          mapHeight: rt.game.mapHeight,
        }),
        // a(int,int) (#294) -- r()'s own hunger/tiredness penalty and regen
        // ticks; unwired until 2026-09-16, so starving villagers took no damage.
        onRandomAction: (target, delta) => { rt.entityHealthDelta(target, delta); },
        // a()'s dying branch (offsets 17..105): once 3030 reaches the death
        // animation's own length (f.j[4][2929 & 255]), m(int) (#400) clears the
        // corpse; R() (#254) runs while 5959 is positive. Wired 2026-09-16.
        animationLimit: rt.packedData?.byteTables?.[4]?.[(rt.denseState[UNIT_MODE + id] ?? 0) & 255],
        onLifecycle: (target) => { rt.entityDeathCleanup(target); },
        onFinal: (target) => {
          stepLegacySubsystemEntityPaceAccum({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            id: target,
            team: target <= 50 ? 0 : 1,
            randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            // S()'s own a(IIIIIIII) (#298) -- WIRED 2026-09-22, see
            // entityStrikeGate. The original discards its result too.
            onQueueAction: (...args) => { rt.entityStrikeGate(target, ...args); },
          });
        },
        // q()'s onA (private void A()) -- see subsystemEntityAAlert's own docblock.
        onA: (targetId) => rt.subsystemEntityAAlert(targetId),
        onMove: (act, moveId) => rt.entityMove(act, moveId, moveId),
      }),
      onEntityTargetStep: (id) => {
        // b.e() invokes b.t(id) after the status guard. `onPositionProbe`
        // (b.a(int,int,boolean)/subsystemEntityTransform) is RETRACTED-
        // PREMISE, FULLY PORTED 2026-09-07 (see subsystemEntityTransform's
        // own docblock) -- real bytecode offsets 108..115 call
        // `a(dense[3131+id], dense[3232+id], true)` then immediately read
        // `l:B`(#199), which is exactly what `subsystemEntityTransform`
        // now returns directly.
        rt.stepEntityTarget(id, {
          u: rt.game.bTeam,
          // t() reads b.m:B (#202) and f.N:Z -- CORRECTED 2026-09-14, was
          // the never-written subsystemModeByte and the unrelated nFlag.
          m: () => rt.game.subsystemMByte,
          kByte: scheduler.kByte,
          fN: rt.game.callToArmsActive,
          onPositionProbe: (x, y) => rt.subsystemEntityTransform(id, x, y, true),
          onAction: (byteValue, enabled) => {
            const jRows = rt.packedData?.byteTables;
            if (!jRows) return false;
            return stepLegacyEntityActionCommit({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              gridC: rt.gridC,
              jRows,
              entityId: id,
              actionCode: byteValue,
              allowRestart: enabled,
              onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
              // b.i(0) (#391) after the 83/84 -> 85 and 79 -> 80 type
              // changes. Wired 2026-09-27 (stepEntityIUpdate has been live
              // since 08-31; the "no-op" note here predated it).
              onIUpdate: (arg) => rt.stepEntityIUpdate(id, arg, id <= 50 ? 0 : 1),
            });
          },
          // BUG FIX (2026-09-10): b.t()'s three remaining callbacks were
          // never wired, and all three targets were already ported.
          // b-javap.txt, b.t():
          //   offset 521  `a(III)I`  #266 -- the occupancy/distance probe,
          //               called `a(e[0+v], e[101+v], 0)`.
          //   offset 545  `g(I)V`    #384 -- with a literal 1, on the
          //               type-4 branch's "arrived" path.
          //   offset 572  `a(IB)V`   #275 -- `a(v, 87)`, the entity type
          //               change, on that branch's "still far" path.
          //   offset 628  `g(I)V`    #384 -- the method's own tail,
          //               `g(e[6161+v] == 2 ? 0 : 2)`, reached on every
          //               path that does not return earlier.
          // That tail is the one that matters: `g(int)` is what turns a
          // pending order into movement -- its offsets 0..52 rewrite
          // `e[6161+v]` (2 -> 1, anything else > 1 -> 0), the very field
          // b.t()'s own entry gate reads. With onModeDispatch inert, an
          // ordered unit sat at `e[6161+id] == 2` forever: b.t() entered
          // every tick, ran to its tail, and dropped the dispatch on the
          // floor, so nothing ever advanced the order.
          onDistanceProbe: (x, y, arg3) => rt.occupancyCheck(id, x, y, arg3),
          onModeDispatch: (mode) => rt.subsystemG(id, mode),
          onByteDispatch: (targetId, value) => { rt.changeEntityType(targetId, value); },
        });
      },
      onEntityDecisionCheck: (id) => rt.stepEntityDecisionCheck(id),
      onEntityLoopTail: (id, team) => subsystemEntityLoopTail(rt, id, team),
      onEntityCoreUpdate: (id, team) => {
        // b.e() reaches b.v() after the decision branch.  The f.j[][] table
        // is the 25-row /pd0 byte-table family; bind it only when the
        // original packed resource has been attached.
        const jRows = rt.packedData?.byteTables;
        if (!jRows) return;
        const readPacked = (table: number, index: number): number =>
          rt.packedBytes[(rt.packedOffsets[table] ?? 0) + index] ?? 0;
        const entityCoreRaw = { d: false };
        rt.stepEntityCoreUpdate(id, {
          raw: entityCoreRaw,
          readJ: (row, index) => jRows[row]?.[index] ?? 0,
          readTable39: (index) => readPacked(39, index),
          readTable138: (index) => readPacked(138, index),
          onW: () => rt.stepEntityWUpdate(id, {
            team,
            mainShort: rt.mainArrays.aShort,
            jRows,
            // b.w()'s onC (private void c(int,int,int)) -- fully
            // rederived 2026-09-07, see LegacyEntityCWatch.ts's own
            // docblock. Its gate call (`a(IIIIIIII)Z` #298, 1436 bytes)
            // used to be omitted here -- treated as returning false, the
            // honest "not examined" default. WIRED 2026-09-22 as
            // `LegacyEntityStrikeGate.ts`: that method is where a blow
            // actually lands, so leaving it out meant no hit ever
            // resolved and a unit sent at a rival by H() chased it
            // forever, which in turn locked the needs system out (see
            // that file's own docblock).
            onC: (x, y, value) => stepLegacyEntityCWatch({
              dense: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              id,
              x,
              y,
              value,
              u: rt.game.bTeam,
              kBytes: rt.game.subsystemKBytes,
              subsystemX: rt.game.subsystemX,
              onGate: (...args) => rt.entityStrikeGate(id, ...args),
            }),
            // b.w()'s onAction (private void a(byte,byte,int,int)) -- see
            // LegacyEntityActionScoreGate.ts's own docblock for the full chain.
            // RESTORED (2026-09-07): rt used to drop the caller's 3rd/4th
            // args (action/mode) entirely -- they're real params the ported
            // method now reads (see that file's docblock).
            onAction: (x, y, action, mode) => stepLegacyEntityActionScoreGate({
              dense: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              saveOffsets: rt.saveOffsets,
              sectionOffsets: rt.sectionOffsets,
              id,
              x,
              y,
              entityB: rt.subsystemArrays.bField8,
              action,
              mode,
              hTable: rt.secondaryCellHTable,
              iTable: rt.secondaryCellITable,
              bScalars: rt.subsystemArrays,
            }),
            // b.w()'s onJ (private void J(), #246) -- see subsystemEntityJTrigger's own docblock.
            onJ: () => rt.subsystemEntityJTrigger(id),
          }),
          // v() offset 327 invokes `d():Z` (#369) -- see
          // LegacyEntityDPredicate.ts for the 2026-09-17 wiring fix.
          onD: () => stepLegacyEntityDPredicate({
            state: rt.denseState,
            entityId: id,
            z: rt.game.subsystemEntityZ,
            b: rt.subsystemArrays.bField8,
            cBytes: rt.resourceTables.rowFByte,
            readPacked: (row, index) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0,
            onI: (argument) => rt.stepEntityIUpdate(id, argument, rt.game.bTeam),
            onG: (argument) => rt.subsystemG(id, argument),
            onPStep: () => rt.stepSubsystemP(id),
            onP: () => stepLegacySubsystemEntityRevertIdle(rt.denseState, id),
            onVacate: (kind, x, y, target) => rt.vacateEntity(kind, x, y, target),
          }),
          onFilterWorkers: (record) => rt.filterEntityLifecycle(record, false, (row, column) => rt.gridC[row]?.[column] ?? 0),
          // private void x(): the worker leaves its record -- rewritten 2026-09-15.
          onX: () => {
            stepLegacyEntityAssociationCleanup({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              gridC: rt.gridC,
              entityId: id,
              fields: liveView<{ x: number }>(rt.game, { x: "subsystemX" }),
              team: rt.game.bTeam,
              fP: rt.game.persistedPByte,
              fQ: rt.game.mission,
              mapWidth: rt.game.mapWidth,
              mapHeight: rt.game.mapHeight,
              onRecordWorkerLevel: (record) => stepLegacySubsystemRecordWorkerLevel(rt.denseState, record, rt.game.bTeam),
              onGate: (mode, scanLimit, x, y) => {
                rt.checkSpiralPlacementGate(mode, scanLimit, x, y, id, (occupant) => checkLegacyEntityOccupant({
                  state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, id,
                }, occupant));
              },
              onP: () => stepLegacySubsystemEntityRevertIdle(rt.denseState, id),
              onSelectionRelease: (entityId) => rt.releaseEntitySelection(entityId),
              onAuxiliary: (first, second, third) => {
                selectLegacyAuxiliaryCandidates({
                  p: rt.auxiliaryScratch,
                  dense: rt.denseState,
                  shortRows: rt.mainArrays.aShort,
                }, rt.auxiliaryQueueState, first, second, third);
              },
              onSceneDispatch: (value) => { rt.runSceneDispatch(value); },
              // f.p:B (#353); persistedPByte is the copy al() and the RMS record use.
              onFP: (value) => { rt.game.persistedPByte = value; },
              onNeeds: () => rt.checkEntityNeeds(id),
              onQ: () => rt.selectEntityTypeAfterQ(id),
              onPStep: () => rt.stepSubsystemP(id),
              onOccupancy: (x, y, layer) => {
                rt.game.subsystemEntityZ = rt.occupancyCheck(id, x, y, layer);
              },
              onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
              randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            });
          },
          onE: () => {
            return stepLegacyEntityESelection({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              entityId: id,
              readStatus: () => rt.entityModeValue(id),
              readRecordCheck: (record) => checkLegacyEntityRecord({
                state: rt.denseState,
                packedBytes: rt.packedBytes,
                packedOffsets: rt.packedOffsets,
                entityId: id,
                record,
                readCell: (row, column) => rt.gridC[row]?.[column] ?? 0,
                // c(int) -> d(int): a(int,int,boolean) (#273), then m:B (#202).
                readM: () => rt.game.subsystemMByte,
                onEntityTransform: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); },
                // b.Q() (#253) when d(int) is false.
                onQ: () => { rt.selectEntityTypeAfterQ(id); },
              }),
              // Offsets 460..468 and 566, wired 2026-09-27.
              readSecondaryCheck: (kind) => stepLegacySubsystemNearestBuilding({
                state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
                team: id <= 50 ? 0 : 1, entityId: id, kind,
              }),
              onG: (value) => rt.subsystemG(id, value),
              onQ: () => { rt.selectEntityTypeAfterQ(id); },
            });
          },
          onY: () => {
            // b.y() (WIRED 2026-08-31, see LegacyEntityFollowup.ts's own
            // docblock for the full re-derivation, including two
            // previously-uncaught bugs fixed in the same pass). `entityCoreRaw`
            // is the SAME `d:Z`-tracking object v() itself uses -- y() is
            // called with whatever `d` v() left it at, and reads/writes it
            // through rt shared reference, matching the single real
            // instance field both methods operate on.
            // b.z:I, live: y()'s callees (i(int) -> scene dispatch, entityAp) write it too.
            const game = rt.game;
            const followupZ = { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } };
            stepLegacyEntityFollowup({
              state: rt.denseState,
              entityId: id,
              readPacked,
              raw: entityCoreRaw,
              z: followupZ,
              bValue: rt.subsystemArrays.bField8,
              readCell: (row, column) => rt.gridC[row]?.[column] ?? 0,
              // v = a(v) (#281): the dispatch borrows v:I and hands back its argument.
              onWorkerDispatch: (arg) => {
                rt.game.bUnit = stepLegacySubsystemWorkerDispatch({
                  state: rt.denseState,
                  fields: liveView<{ v: number }>(rt.game, { v: "bUnit" }),
                  packedBytes: rt.packedBytes,
                  packedOffsets: rt.packedOffsets,
                  gridC: rt.gridC,
                  team,
                  aRows: rt.mainArrays.aByte3,
                  bRows: rt.game.xSlotTable,
                  onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
                  onN: (entityId) => rt.stepSubsystemN(entityId, team),
                }, arg);
              },
              // z = a(x, y, 0) (#266) -- persisted at once, p() runs right after.
              onOccupancy: (x, y, layer) => {
                const z = rt.occupancyCheck(id, x, y, layer);
                rt.game.subsystemEntityZ = z;
                return z;
              },
              onP: () => rt.stepSubsystemP(id),
              // y() offset 240: b(e[3939+v] - 28, true, v) (#344), the
              // afford check. Wired 2026-09-27 (was left inert).
              onType84Action: (action, flag, unit) =>
                checkLegacyEntityAffordable(rt.entityCostInput(id), action, flag, unit),
              onEntityProbe: () => {
                // i()/j() share the SAME S:I(#51, game.subsystemS)
                // cross-call scratch -- see both files' own docblocks.
                const game = rt.game;
                // b.f:Z (#172) is shared by i()Z, j()Z, K() and others -- read/write it live.
                const fShared = { get value() { return game.subsystemFFlag; }, set value(next: boolean) { game.subsystemFFlag = next; } };
                const sScratch = { value: rt.game.subsystemS };
                const result = stepLegacySubsystemEntityProbe({
                  state: rt.denseState,
                  packedBytes: rt.packedBytes,
                  packedOffsets: rt.packedOffsets,
                  saveOffsets: rt.saveOffsets,
                  shortRows: rt.mainArrays.aShort,
                  entityId: id,
                  team,
                  // R:I (#49) is rewritten by J() before i()Z's offset 746 reads it.
                  // CORRECTED 2026-09-15: a snapshot gave i()Z the previous unit's R.
                  get rValue() { return game.subsystemR; },
                  // A:I (#7) is rewritten by l() before i()Z's type-70/71 branch reads it.
                  get aValue() { return game.subsystemA; },
                  s: sScratch,
                  f: fShared,
                  // private boolean l() (#398), wired 2026-09-14.
                  onL: () => checkLegacyEntityModeListed(rt.denseState, rt.packedBytes, rt.packedOffsets, id, {
                    get A() { return game.subsystemA; }, set A(value: number) { game.subsystemA = value; },
                  }),
                  // private boolean a(int,boolean,int) (#292), wired 2026-09-15.
                  onCheckTargetKind: (type, flag, entityId) => rt.payEntityCost(type, flag, entityId, entityId),
                  // private boolean a(byte,byte,byte,byte) (#293): skill growth, wired 2026-09-15.
                  onCheckQuad: (attr, chance, cap, step) => rt.gainEntitySkill(id, attr, chance, cap, step),
                  // private boolean b(int,int) (#347): a worker's record skills, wired 2026-09-15.
                  onCheckSlotProgress: (kind, level) => rt.gainEntitySlotSkills(id, kind, level),
                  // private void j(int) (#394), wired 2026-09-21 --
                  // LegacyEntityOccupantCare.ts. i():Z calls it with 0 (the
                  // rest branch) when the unit's mode is 117.
                  onJInt: (arg) => stepLegacyEntityOccupantCare({
                    state: rt.denseState,
                    v: id,
                    scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                    onHealthDelta: (target, delta) => { rt.entityHealthDelta(target, delta); },
                  }, arg),
                  // private boolean k() (#396), wired 2026-09-15.
                  onKPredicate: () => rt.stepEntityKPredicate(id, team),
                  // private void I() (#245), wired 2026-09-15.
                  onIFinalize: () => stepLegacyEntityIFinalize({
                    state: rt.denseState,
                    packedBytes: rt.packedBytes,
                    packedOffsets: rt.packedOffsets,
                    gridC: rt.gridC,
                    id,
                    onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
                    // f(boolean) (#382), ported 2026-09-22; rt I() site was
                    // missed and still threw until 2026-09-23.
                    onF: (flag) => rt.entityProduceItem(id, team, flag),
                    onN: () => rt.stepSubsystemN(id, team),
                    onAn: () => stepSubsystemAnFor(rt, id),
                  }),
                  onJ: () => rt.subsystemEntityJTrigger(id),
                  onAssociationScan: () => stepLegacySubsystemEntityAssociationScan({
                    state: rt.denseState,
                    packedBytes: rt.packedBytes,
                    packedOffsets: rt.packedOffsets,
                    saveOffsets: rt.saveOffsets,
                    gRows: rt.subsystemArrays.gRows,
                    mainShort: rt.mainArrays.aShort,
                    entityId: id,
                    team,
                    zValue: rt.game.subsystemEntityZ,
                    aValue: rt.game.subsystemA,
                    s: sScratch,
                    f: fShared,
                    // K() (#247), WIRED 2026-09-23 -- see entityTypeReaction.
                    onK: () => rt.entityTypeReaction(id, team),
                    onCheckSlotProgress: (kind, level) => rt.gainEntitySlotSkills(id, kind, level),
                    // private void j(int) (#394), wired 2026-09-21 -- same
                    // method and same scratch as i():Z's own call above.
                    onJInt: (arg) => stepLegacyEntityOccupantCare({
                      state: rt.denseState,
                      v: id,
                      scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                      onHealthDelta: (target, delta) => { rt.entityHealthDelta(target, delta); },
                    }, arg),
                    onCheckQuad: (attr, chance, cap, step) => rt.gainEntitySkill(id, attr, chance, cap, step),
                    onN: () => rt.stepSubsystemN(id, team),
                  }),
                });
                rt.game.subsystemS = sScratch.value;
                return result;
              },
              // i(int):V (#391) -- WIRED 2026-08-31. The previous port
              // (stepLegacyEntityIUpdate) was carrying four real bugs and
              // had never had a live caller; see LegacyEntityIUpdate.ts's
              // own docblock for the full re-derivation. `value` is y()'s
              // own z:I, exactly as its offset-579 call site passes it.
              onEntityI: (value) => { rt.stepEntityIUpdate(id, value, team); },
            });
          },
        });
      },
    },
    );
  } catch {
    // e()'s own exception table (offsets 0..832 -> 833, pop;return) --
    // see the docblock above rt try block for the full derivation.
  }
  // b's u/v/w, live (2026-09-23): the animal loop's e(boolean) writes w
  // and the loop counter is v, so a copy written back afterwards was wrong.
  const hRaw = liveView<{ u: number; v: number; w: number }>(rt.game, {
    u: "bTeam", v: "bUnit", w: "subsystemW",
  });
  stepLegacySubsystemH({
    state: rt.denseState,
    bBytes: rt.packedBytes,
    bShorts: rt.packedOffsets,
    frame: rt.game.missionFrame,
    q: rt.game.mission,
    fT: rt.game.subsystemT,
    raw: hRaw,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    // final boolean a(int,int,int,int) (#270, checkLegacySpiralPlacementGate)
    // -- the SAME gate already wired at an()'s onLargeGate and
    // LegacyFPairCommand.ts's onFootprintProbe. b.h()'s own exception
    // table (offset 0..658, basically the whole method) swallows any
    // throw from mode=1 accepting a candidate, matching rt try/catch.
    onFootprint: (mode, scanLimit, x, y) => {
      try {
        // mode=1 here, so onOccupantCheck (mode===0-only) is irrelevant.
        // The gate's ambient v:I is h()'s own, which offset ~350 has just
        // set to 0 -- so the free cell lands in dense[3131]/[3232], exactly
        // where the spawn reads it. CORRECTED 2026-09-23 (was the stale
        // game.bUnit, writing the cell to some other unit).
        rt.checkSpiralPlacementGate(mode, scanLimit, x, y, hRaw.v);
      } catch {
        // Matches b.h()'s own confirmed exception table.
      }
    },
    // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
    // already-wired helper stepSubsystemStateCommand's own onT (T()'s
    // ai===45 branch, via onSubsystemRecordAllocate) uses.
    onSubsystemRecord: (first, x, y, counterIndex) => {
      rt.allocateSubsystemRecord(rt.gridC, first, x, y, counterIndex, {
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        counters: rt.game.subsystemT,
        q: rt.game.mission,
      });
    },
    // b.h()'s own offset 637..642 (private void af(); private void ah()),
    // called together for each scratch slot with dense[9513+slot]>0.
    // Both sit inside h()'s own exception table (offset 0..658, the
    // whole method), matching the try/catch here. ag() is now fully
    // rederived (2026-09-07, LegacySubsystemAg.ts -- its own
    // RETRACTED-PREMISE field, b:[[[B]#134, is real, not permanently
    // null). Verified live (2026-08-29, debug runtime): also caught a
    // real, un-forced `neighborValue` bounds error when a scratch
    // slot's own position (dense[9359/9381+slot]) hasn't been
    // initialized by whatever real producer normally sets it first --
    // confirms rt try/catch is load-bearing, not just theoretical.
    onTailMaintenance: (slot) => {
      // Offsets 604..655: the loop counter IS b's v:I, which af()/ah() and
      // the #270 gate (mode 6) read as the current animal. FIXED 2026-09-23.
      rt.game.bUnit = slot;
      try {
        const game = rt.game;
        stepLegacySubsystemAf({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
          slot,
          frame: rt.game.missionFrame,
          sceneQ: rt.game.mission,
          subsystemFByte: rt.game.subsystemGFFlagByte,
          jRow4: (index) => rt.packedData?.byteTables?.[4]?.[index] ?? 0,
          randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
          // af()'s offset-302 `a(IIIIIIII)` (#298) -- the animal striking a
          // villager. WIRED 2026-09-22 alongside c()'s own gate; it was the
          // other unwired half of combat. `p3` is the literal 2 af() passes,
          // which is what lets a wild animal hit either team.
          onQueueAction8: (...args) => { rt.entityStrikeGate(slot, ...args); },
          // af()'s `a(int,int,byte,int)` (#289) -- the wounded animal's own
          // reaction, WIRED 2026-09-22 (LegacyAnimalHitReaction.ts). Its
          // t181 aggression lookup is where the boar's counter-attack and
          // the deer's flight part company. `e(boolean)` (#376), the flight
          // half, is 308 javap lines and stays an explicit seam.
          onFinishSlot: (targetX, targetY, targetId, arg4) => stepLegacyAnimalHitReaction({
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            slot,
            // e(true) -- the flight half, WIRED 2026-09-22.
            onFlee: (flag) => rt.animalRoam(slot, flag),
          }, targetX, targetY, targetId, arg4),
          // af()'s offset-470 `e(boolean)` (#376), WIRED 2026-09-22.
          onAnimReset: (flag) => rt.animalRoam(slot, flag),
          onFootprintGate: (mode, scanLimit, x, y) => {
            try {
              // Same ambient-v reasoning as onFootprint above (b.h()'s
              // af()/ah() have no explicit id parameter either).
              return rt.checkSpiralPlacementGate(mode, scanLimit, x, y, rt.game.bUnit);
            } catch {
              return false;
            }
          },
          neighborValue: (x, y, mode) => rt.occupancyCheck(slot, x, y, mode),
          onAg: () => {
            stepLegacySubsystemAg({
              state: rt.denseState,
              packedBytes: rt.packedBytes,
              packedOffsets: rt.packedOffsets,
              localFlags: rt.game.subsystemBLocalFlags,
              gridC: rt.gridC,
              candidateCells: rt.subsystemArrays.b,
              slot,
              frame: rt.game.missionFrame,
              // b.z:I (#234) is class b's own scalar int field, NOT a
              // dense[] offset -- FIXED 2026-09-07 (was reading
              // rt.denseState[234], an unrelated dense-array cell).
              zValue: rt.game.subsystemEntityZ,
              // ag()'s offset-242 `e(boolean)` (#376), WIRED 2026-09-22.
              onAnimReset: (flag) => rt.animalRoam(slot, flag),
              // `private byte a(int,int,int,int,int,int)` (#268) -- ported
              // 2026-09-08 as computeLegacySubsystemPairScore but never
              // wired at THIS call site, so it returned 0 through the `?? 0`
              // default. Its result is `dense[9689+v]`, the size of the
              // candidate-cell bucket ag() then walks: a 0 meant
              // `9711 < 9689` was never true, the walking branch never ran,
              // and animals stood still. WIRED 2026-09-22.
              onFinishBucketAssign: (a1, a2, a3, a4, a5, a6) => computeLegacySubsystemPairScore(
                rt.legacySubsystemScoreInput(slot), a1, a2, a3, a4, a5, a6,
              ),
              onAi: () => stepLegacySubsystemAi({
                state: rt.denseState,
                packedBytes: rt.packedBytes,
                packedOffsets: rt.packedOffsets,
                slot,
                sceneQ: rt.game.mission,
                randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
                x: { get value() { return game.subsystemX; }, set value(v: number) { game.subsystemX = v; } },
              }),
            });
          },
        });
        stepLegacySubsystemAh({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          slot,
        });
      } catch {
        // Matches b.h()'s own confirmed exception table.
      }
    },
  });
  // Offset 604 resets v:I for the animal loop, which leaves it at 22.
  rt.game.bUnit = 22;
  const tail = {
    lByte: rt.subsystemArrays.bField32,
    kByte: rt.subsystemArrays.bField28,
  };
  // b.i()'s post-loop t()/u()/v() (offsets 397..432). RETRACTED
  // 2026-09-23: these were left unwired on the premise that u()/v()'s
  // c(boolean) calls throw on a permanently-null b:[S] (#132); that field
  // is saveOffsets and is live. Ported as LegacySubsystemT/U/V.ts.
  stepLegacySubsystemI({
    state: rt.denseState,
    bBytes: rt.packedBytes,
    bShorts: rt.packedOffsets,
    frame: rt.game.missionFrame,
    q: rt.game.mission,
    tail,
    onT: () => rt.subsystemT(),
    onU: () => rt.missionScriptU(),
    onV: () => rt.missionScriptV(),
    setV: (v) => { rt.game.bUnit = v; },
    // Wired 2026-09-27: i() offset 347, aj() offsets 113/209 call
    // f.c(int,int,int,int) (the repaint), am() offset 285 a(int,byte).
    onRepairCell: (x, y, width, height) => rt.repaintRect(x, y, width, height),
    onAj: (index) => {
      stepLegacySubsystemAj({
        state: rt.denseState,
        bBytes: rt.packedBytes,
        bShorts: rt.packedOffsets,
        index,
        onCellUpdate: (x, y, width, height) => rt.repaintRect(x, y, width, height),
        onAm: () => {
          stepLegacySubsystemAm({
            state: rt.denseState,
            bBytes: rt.packedBytes,
            bShorts: rt.packedOffsets,
            aM: index,
            fields: liveView<{ u: number; v: number }>(rt.game, { u: "bTeam", v: "bUnit" }),
            onEntityAction: (id, type) => { rt.changeEntityType(id, type); },
            onN: (id, team) => { rt.stepSubsystemN(id, team); },
          });
        },
      });
    },
    // b.ak(): the win/lose check. `u` is f.u:B (game.uByte), NOT b.u:I --
    // CORRECTED 2026-09-24 (it never started the countdown).
    onAk: () => {
      stepLegacySubsystemAk(Object.assign(
        liveView<{ u: number; fByte: number }>(rt.game, { u: "uByte", fByte: "subsystemGFFlagByte" }),
        {
          q: rt.game.mission,
          dense: rt.denseState,
          shortRows: rt.mainArrays.aShort,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          onMapSession: () => rt.stepLegacyC(),
        },
      ));
    },
    onAl: () => {
      const alState = {
        pByte: rt.game.persistedPByte,
        q: rt.game.mission,
        bG: rt.subsystemArrays.bgByte,
        bF: rt.game.subsystemGFFlagByte,
        fK: rt.game.choosingChief,
        fF: rt.game.entityFocusFlag,
        // al() reads f.N:Z (outerLoopNFlag) -- CORRECTED 2026-09-14, was nFlag.
        fN: rt.game.callToArmsActive,
        J: rt.subsystemArrays.bJByte,
        cByte: rt.game.missionFrame,
        aQ: rt.subsystemArrays.bAQ,
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortRows: rt.mainArrays.aShort,
        onSubsystemAction: (first: number, second: number, mode: number) => {
          // b.al() invokes b(0,0,3).  This is the same b.b(III) queue
          // already used by the f.aP(second == -2) path; the bytecode
          // proves firstFlag=false for rt call site.
          if (mode !== 3) return;
          selectLegacyAuxiliaryCandidates({
            p: rt.auxiliaryScratch,
            dense: rt.denseState,
            shortRows: rt.mainArrays.aShort,
          }, rt.auxiliaryQueueState, first, second, mode);
        },
        onStateCommand: (value: number) => {
          rt.stepSubsystemStateCommand(value);
        },
      };
      stepLegacySubsystemAl(alState);
      rt.subsystemArrays.bgByte = alState.bG;
      rt.subsystemArrays.bJByte = alState.J;
      rt.subsystemArrays.bAQ = alState.aQ;
    },
    // b.i() calls b.j() after its ak/al gates. The raw b.j() table
    // reconstruction is already ported; keep rt confirmed call live
    // while b.ak()/b.al() remain explicit callback seams.
    onJ: () => { rt.runSubsystemJ(rt.game.mission); },
    // b.i()'s own tail: b.b(0,0,3) -- the exact same b.b(III) queue
    // onAl's onSubsystemAction above already wires (same reasoning:
    // firstFlag=false, mode=3). f.b(int) is runSceneDispatch, already
    // ported/wired elsewhere (onBByte) -- confirmed same target via
    // matching bytecode offsets (17347..17572).
    onSubsystemB: (first, second, mode) => {
      if (mode !== 3) return;
      selectLegacyAuxiliaryCandidates({
        p: rt.auxiliaryScratch,
        dense: rt.denseState,
        shortRows: rt.mainArrays.aShort,
      }, rt.auxiliaryQueueState, first, second, mode);
    },
    onFByte: (value) => { rt.runSceneDispatch(value); },
  });
  rt.subsystemArrays.bField32 = tail.lByte;
}

/** private void an() (#321) for unit `id`. */
export function stepSubsystemAnFor(rt: LegacyRuntimeState, id: number): void {
  stepLegacySubsystemAn({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    grid: rt.gridC,
    id,
    onOccupantCheck: (occupant) => checkLegacyEntityOccupant({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id,
    }, occupant),
    onBBoolean: () => subsystemBBoolean(rt, id, false),
    onRawAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
    // private void N() -- derived 2026-08-21, see LegacySubsystemN.ts's
    // own docblock. g(int)/O() reuse the already-ported/wired
    // subsystemG/stepLegacySubsystemO* chain (same shape as the other
    // real N() caller, f.am()'s own onN, below).
    onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
    onGroupMode: (mode) => rt.subsystemG(id, mode),
    // The gate (#270, ~1900 instructions) -- restored 2026-09-07 (see
    // LegacySpiralPlacementGate.ts's own docblock). an()'s call site
    // uses mode=0/scanLimit=19 (both literal constants in the original
    // bytecode); every known caller including rt one discards the
    // boolean result. an()'s own bytecode has no local catch around
    // rt call, so -- matching the original -- none is added here
    // either; a real out-of-range table-53 read propagates up the same
    // call chain the original's NPE/AIOOBE would have.
    onLargeGate: (x, y) => {
      rt.checkSpiralPlacementGate(0, 19, x, y, id, (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant));
    },
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
  });
}

/** `private boolean o()` (#406) for unit `id` -- LegacySubsystemNPrivateO.ts. */
export function subsystemPrivateO(rt: LegacyRuntimeState, id: number): boolean {
    const jRows = rt.packedData?.byteTables;
    if (!jRows) return false;
    const arrays = rt.subsystemArrays;
    const game = rt.game;
    return stepLegacySubsystemNPrivateO({
  state: rt.denseState,
  id,
  cRows: rt.subsystemArrays.cRows,
  gridC: rt.gridC,
  jRows,
  // b.x:I (#230) lives on `game` as subsystemX, not on subsystemArrays;
  // o() writes it and at()/g()/ab()/i(int) read it, so it round-trips.
  scratch: {
    get bField10(): number { return arrays.bField10; },
    set bField10(v: number) { arrays.bField10 = v; },
    get x(): number { return game.subsystemX; },
    set x(v: number) { game.subsystemX = v; },
  },
  onAction: (rawId, action) => { rt.changeEntityType(rawId, action); },
  onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
  onGroupMode: (targetId, argument) => rt.subsystemG(targetId, argument),
  onD: (targetId, argument) => rt.subsystemD(targetId, argument),
  // f's own `final void a(int,boolean)` (b's constant pool #286,
  // f-javap.txt:20621..20766) -- WIRED 2026-09-20. It was left unwired as
  // "undocumented", but it is the same method already ported as
  // `filterEntityLifecycle` (`filterLegacyEntityLifecycle` +
  // `transferLegacyEntityAction`) and wired at b.g()'s and v()'s own call
  // sites. o() calls it as `f.a(c[5][x], true)` right after the couple
  // claims the hut, to move that record's listed units out of the way.
  onEntityLinkTrigger: (record, flag) =>
    rt.filterEntityLifecycle(record, flag, (row, column) => rt.gridC[row]?.[column] ?? 0),
    });
}

/** Raw b.k() decision; the caller supplies the original b-side fields. */
export function subsystemDecision(rt: LegacyRuntimeState, fields: {
  readonly fV: number;
  readonly fN: boolean;
  readonly fL: boolean;
  readonly bO: number;
  readonly bK: number;
  readonly bN: number;
  readonly fQ: number;
}): number {
  return legacySubsystemDecision({
    ...fields,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Exact deterministic prefix of b.n(); later action branches remain separate ports. */
export function subsystemNGate(rt: LegacyRuntimeState, fields: {
  readonly q: number;
  readonly N: boolean;
  readonly L: boolean;
  readonly u: number;
  readonly v: number;
}): boolean {
  return legacySubsystemNGate({ ...fields, state: rt.denseState });
}

/** Bytecode-backed b.n() decision prefix; b.c[][] lookup and private callees stay injectable. */
export function subsystemNDecision(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemNDecisionInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemNDecision({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Bytecode-order b.n() entry composition; private O()/a(false) remain callbacks. */
export function subsystemNOrchestrator(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemNOrchestratorInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemNOrchestrator({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Exact b() continuation after its private n() call; unresolved b-side callees remain callbacks. */
export function subsystemBDecision(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBDecisionInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemBDecision({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/**
 * Exact private boolean b(boolean) -- fully rederived 2026-09-07, see
 * LegacySubsystemBBoolean.ts's own docblock. `onC` (`c(byte)` #360) is
 * left unwired -- that callee is a separate, unexamined method (see that
 * file's docblock). `onG` wires the real `g(2)` call through the
 * already-ported `subsystemG`.
 */
export function subsystemBBoolean(rt: LegacyRuntimeState, id: number, arg: boolean): boolean {
  return stepLegacySubsystemBBoolean({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    arrays: rt.subsystemArrays,
    v: id,
    arg,
    onG: () => rt.subsystemG(id, 2),
    // private boolean c(byte) (#360), wired 2026-09-21 together with the
    // b.i() stage fix that finally gives `9933 + slot` real values: it is
    // the "does rt bush still look harvestable?" test b(boolean) asks
    // about every resource-node slot it scans. See LegacyResourceNodeGate.ts.
    onC: (value) => checkLegacyResourceNodeGate({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      tableOffsets: rt.packedOffsets,
      v: id,
    }, value),
  });
}

/**
 * `b.e()`'s own tail after `v()` (`onEntityCoreUpdate`), offsets 328..731
 * (bytecode/b-javap.txt:8076). Two parts:
 *  1. offset 328..696: `b:Z = 1`, then, behind the gate (`5050 == 0`,
 *     adult, type not 50/105), `a:Z` = "the unit may act on a marker"
 *     (offsets 403..684), `b:Z = 0` and `p()` (result popped). Both flags
 *     are read downstream: `p()` takes `b:Z` and its `H()` branches on
 *     `a:Z`. CORRECTED 2026-10-09 (oracle run 5, frame 12284): neither
 *     flag was written here (they were thought to have no observable
 *     effect), so a villager far from camp who spotted a raider joined
 *     the call-up instead of turning back into a type-59 idler.
 *  2. offset 697..731 (only reached when the gate above does NOT pass, or
 *     after `p()`'s crash would have happened): `u()`
 *     (`LegacySubsystemEntityUpdateTail.ts`), then -- only when
 *     `dense[5959+id]>0` -- `R()` (`LegacySubsystemEntityPaceAccum.ts`).
 */
export function subsystemEntityLoopTail(rt: LegacyRuntimeState, id: number, team: number): void {
  const game = rt.game;
  const dense = rt.denseState;
  const type = dense[UNIT_TYPE + id] ?? 0;
  const arrays = rt.subsystemArrays;
  arrays.bField137 = true; // b:Z, offset 328
  if ((dense[5050 + id] ?? 0) === 0 && (dense[UNIT_AGE + id] ?? 0) >= 12 && type !== 50 && type !== 105) {
    const t = (row: number, index: number) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0;
    // Offsets 404..513: an ordered unit (6161 != 0) on a turn its team does not own still counts
    // only when it is a walking (1) unit at the end of its route, crowded (z/10 > B) and busy.
    const order = dense[UNIT_ORDER + id] ?? 0;
    let a = true;
    if (order !== 0 && (game.subsystemGCurrentI & (team + 1)) === 0) {
      a = order === 1 &&
        (dense[808 + id] ?? 0) <= (dense[707 + id] ?? 0) &&
        Math.trunc(game.subsystemEntityZ / 10) > rt.subsystemArrays.bField8 &&
        ((dense[UNIT_MODE + id] ?? 0) & 255) > 7;
    }
    // Offsets 516..609: off its own cell, only a kind-16 worker with a live 6565 slot.
    if (a && (rt.gridC[dense[UNIT_Y + id] ?? 0]?.[dense[id] ?? 0] ?? 0) !== id) {
      a = t(41, type) === 16 && t(18, dense[UNIT_HELD_ITEM + id] ?? 0) > 0;
    }
    // Offsets 612..676: not while 7979 bit 1 is set; a child (type <= 9) only if t27 bit 2 is clear.
    if (a) a = ((dense[UNIT_FLAGS + id] ?? 0) & 2) === 0 && (type > 9 || (t(27, type) & 4) === 0);
    arrays.bField73 = a; // a:Z, offset 684
    arrays.bField137 = false; // b:Z, offset 689
    // p()'s boolean result is popped (offset 696).
    subsystemMarkerScan(rt, id, team);
  }

  const tailInput = {
    state: dense,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    gridC: rt.gridC,
    id,
    team,
    onN: () => rt.stepSubsystemN(id, team),
    onF: () => rt.entityMoveCancel(id),
    // f.c(x,y,1,1) (#357) -- the dirty-rectangle repaint, WIRED 2026-09-23.
    onMarkVisible: (x: number, y: number, w: number, h: number) => rt.repaintRect(x, y, w, h),
    // z and R live: onP -> p() -> N() writes z (entityAp) and can write
    // R (the #270 gate's mode 7). FIXED 2026-09-23 (were snapshots).
    z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
    bValue: rt.subsystemArrays.bField8,
    // Offsets 337..345 decrement `R:B`(#48), not `Q:B`(#46) -- see the
    // 2026-09-10 correction in LegacySubsystemEntityUpdateTail.ts.
    rByte: { get value() { return game.subsystemRByte; }, set value(v: number) { game.subsystemRByte = v; } },
    scalars: rt.subsystemArrays,
    // c()'s (#356) own inputs, restored 2026-09-10 along with the method
    // itself -- see LegacySubsystemEntityPathStep.ts's retraction note.
    route: rt.subsystemArrays.a,
    saveOffsets: rt.saveOffsets,
    visibilityBits: rt.mainArrays.aInt,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    fogClass: (x: number, y: number) => rt.occupancyClass(x, y),
    onP: () => rt.stepSubsystemP(id),
    // `private void a(byte)` (#285), c()'s offset-594 friendly-unit
    // displacement -- ported 2026-09-14, see LegacySubsystemEntityDisplace.ts.
    // Its two callees run for the OCCUPANT (the original switches v:I to it
    // at offset 11), so both receive that id rather than `id`.
    onDisplace: (occupant: number) => stepLegacySubsystemEntityDisplace({
      state: dense,
      id,
      gridC: rt.gridC,
      scalars: rt.subsystemArrays,
      onActionCommit: (target, actionCode) => {
        const jRows = rt.packedData?.byteTables;
        if (!jRows) return false;
        return stepLegacyEntityActionCommit({
          state: dense,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          jRows,
          entityId: target,
          actionCode,
          allowRestart: false,
          onChangeType: (targetId, type) => { rt.changeEntityType(targetId, type); },
          onIUpdate: (arg) => rt.stepEntityIUpdate(target, arg, target <= 50 ? 0 : 1),
        });
      },
      onMoveApply: (target) => stepLegacySubsystemEntityMoveApply({
        state: dense,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        gridC: rt.gridC,
        id: target,
        onF: () => rt.entityMoveCancel(target),
      }),
    }, occupant),
  };
  stepLegacySubsystemEntityUpdateTail(tailInput);

  if ((dense[5959 + id] ?? 0) > 0) {
    stepLegacySubsystemEntityPaceAccum({
      state: dense,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id,
      team,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      onQueueAction: (...args) => { rt.entityStrikeGate(id, ...args); },
    });
  }
}

/**
 * `b.e()`'s own offset 734..737 (private void Z()), fired once per team
 * right after that team's entity loop finishes (`onTeamEnd`). Ported
 * (`LegacySubsystemUnitTraining.ts`) and tested previously but never
 * wired into the live loop until now. Composes with `G()`
 * (`LegacySubsystemEntityTrainingSlot.ts`, its own `onG` target) and the
 * class-f viewport bounds check (`isInView`, the same
 * `IByte`/`KByte`/`viewportO`/`viewportP` fields
 * `LegacyCellCompatibilityCheck.ts`'s own class-f `a(int,int):boolean`
 * derivation already established).
 *
 * Verified live in-browser (2026-08-29, debug runtime): with a
 * training-eligible team-0 building slot and no interfering entities,
 * `onTeamEnd` fires once per team per tick, `Z()` allocates a new record
 * and links it into the building's `dense[8993]` chain, and `G()` runs
 * to completion with zero errors, assigning a real formation slot.
 * (Verifying with the debug map's default entity roster present also
 * surfaced two confirmed-guaranteed-throw paths from earlier sessions --
 * `p()`'s crash gate and `subsystemEntityAAlert`'s -- firing readily on
 * default entity state, and a separate, genuinely uncaught bug in the
 * (since-retired) `queueLegacyAuxiliary` chimera (`gRows` under-sized at
 * 3 rows, needs 4) that predated rt change and was flagged separately
 * at the time. **MOOT as of 2026-08-31**: `queueLegacyAuxiliary` was a
 * chimera of `b(III)` and `c(boolean)` and has been deleted -- see
 * `LegacyAuxiliaryQueue.ts`'s history docblock -- so rt specific
 * `gRows` sizing complaint no longer applies to any live call path.)
 */
export function subsystemUnitTraining(rt: LegacyRuntimeState, team: number): void {
  stepLegacySubsystemUnitTraining({
    state: rt.denseState,
    team,
    mainShort: rt.mainArrays.aShort,
    // t[a_s[275 + f.b] + f.q] and t[a_s[212 + f.b] + f.q] (f.b:B, levelBByte, picks the row).
    // CORRECTED 2026-10-14: both added the never-written subsystemModeByte to the row's offset.
    populationThreshold: rt.packedBytes[
      (rt.packedOffsets[275 + rt.game.difficulty] ?? 0) + rt.game.mission
    ] ?? 0,
    teamOneFlags: Math.trunc(
      (rt.packedBytes[
        (rt.packedOffsets[212 + rt.game.difficulty] ?? 0) + rt.game.mission
      ] ?? 0) / 4,
    ),
    sceneGateActive: rt.game.mission === 3,
    subsystemQByte: rt.game.subsystemBQByte,
    isInView: (x, y) =>
      x >= rt.game.cameraColumn - 1 && x <= rt.game.cameraColumn + rt.game.viewColumns &&
      y >= rt.game.cameraRow - 1 && y <= rt.game.cameraRow + rt.game.viewRows,
    onG: (newEntityId) => stepLegacySubsystemEntityTrainingSlot({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      entityId: newEntityId,
      randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      fields: liveView<{ x: number; y: number }>(rt.game, { x: "subsystemX", y: "subsystemY" }),
      owners: rt.subsystemArrays.i,
    }),
    allocateRecord: (allocTeam, x, y, type, flags) =>
      rt.allocateRecord(rt.gridC, allocTeam, x, y, type, flags, rt.recordOptions()),
  });
}

/**
 * Exact private void b(boolean) (bytecode/b-javap.txt offsets 0..226) --
 * a DIFFERENT method from `private boolean b(boolean)` (#339,
 * `subsystemBBoolean`/`LegacySubsystemBBoolean.ts`), distinguished only
 * by return type (void vs boolean), a real overload collision. Own
 * caller: `b.U()` (`subsystemU`, below), called unconditionally as
 * `b(true)` at its very start. Scans the current team's 30-slot
 * partition (`s:I` from `u:I*30+1` to `(u:I+1)*30`; `u:I`/#222 is the
 * SAME already-tracked `game.bTeam` field rt project's
 * `changeEntityType`/`subsystemNOrchestrator` wiring already reads as
 * "team" -- confirmed via those call sites, not re-derived), and for
 * each slot whose type matches (`dense[8749+s]===11`) or when `arg` is
 * true, walks a linked list (`dense[8993+s]`, chained via
 * `dense[4545+t]`) looking for the current entity id (`v:I`, the SAME
 * `id` rt whole call chain already threads through). On a match,
 * marks the entity as associated with that slot (dense 4444/4747) and
 * syncs its position from the raw x/y fields (dense 3131/3232 <-
 * 0/101). Fully self-contained -- no further private calls.
 */
export function subsystemBVoid(rt: LegacyRuntimeState, id: number, arg: boolean): void {
  const dense = rt.denseState;
  const team = rt.game.bTeam;
  for (let s = team * 30 + 1; s <= (team + 1) * 30; s += 1) {
    if ((dense[BLD_KIND + s] ?? 0) === 11 || arg) {
      if ((dense[BLD_WORKERS + s] ?? 0) >= 1) {
        let t = dense[BLD_WORKER_HEAD + s] ?? 0;
        while (t > 0) {
          if (t === id) {
            dense[UNIT_RECORD + id] = s;
            dense[UNIT_WORK_TARGET + id] = -s;
            dense[UNIT_TARGET_X + id] = dense[0 + id] ?? 0;
            dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;
            return;
          }
          t = dense[UNIT_NEXT_WORKER + t] ?? 0;
        }
      }
    }
  }
}

/**
 * Exact private void U() (bytecode/b-javap.txt offsets 0..555) --
 * `stepLegacyEntityGPrefix`'s `onU` target (fires when `readEntityCell`
 * doesn't match the current entity). Calls `b(true)` (`subsystemBVoid`,
 * above) unconditionally, then:
 *  - offsets 5..171: a gated slot reset (`dense[4646+id]===1 &&
 *    dense[8749+assoc]===8 && dense[8627+assoc]===0`) writing type/mode/
 *    timer onto the associated slot's owner (dense 2828/2929/3030).
 *  - offsets 172..416: an UNCONDITIONAL store to `dense[2929+id]`
 *    (only the SOURCE table pair is gated, never whether the store
 *    happens) -- a three-way condition (`dense[1414+id]>=12 &&
 *    dense[8749+assoc]<12 && (dense[8627+assoc]!==0 || table41===12)`)
 *    picks packed tables 176/177, otherwise 173/174. CRITICAL: the
 *    stack-traced bytecode shows rt is a NESTED lookup, not a sum of
 *    four terms -- `packedBytes[packedOffsets[173] +
 *    packedBytes[packedOffsets[174] + dense[8749+assoc]] +
 *    dense[4646+id]]` (176/177 mirrors rt exactly), confirmed by a
 *    manual JVM-stack simulation of offsets 285..416, not assumed.
 *  - offsets 417..445: unconditional `dense[3030+id]=0`,
 *    `dense[1313+id]=-3`.
 *  - offsets 446..463: `f.d(dense[4444+id])`, already-ported as
 *    `stepLegacyFD`/`LegacyFrameProgressionScan.ts` (trivial, previously
 *    ported-but-unwired).
 *  - offsets 466..514: position-sync (dense 3131/3232 <- 0/101).
 *  - offsets 515..555: `changeEntityType(id, 59)`, gated on
 *    `packedBytes[packedOffsets[39]+dense[2828+id]] !== 2` (an
 *    `if_icmpeq 555` SKIP-when-equal branch -- the call fires on
 *    NOT-equal, the opposite of a naive reading of the comparison).
 * Fully self-contained -- no unexplored dependencies.
 */
export function subsystemU(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  rt.subsystemBVoid(id, true);

  const assoc = dense[UNIT_RECORD + id] ?? 0;
  if ((dense[UNIT_SLOT + id] ?? 0) === 1) {
    if ((dense[BLD_KIND + assoc] ?? 0) === 8 && (dense[BLD_WORK + assoc] ?? 0) === 0) {
      const owner = dense[BLD_OWNER + assoc] ?? 0;
      dense[UNIT_TYPE + owner] = 57;
      dense[UNIT_MODE + owner] = 105;
      dense[3030 + owner] = 0;
    }
  }

  let useTable176 = false;
  if ((dense[UNIT_AGE + id] ?? 0) >= 12 && (dense[BLD_KIND + assoc] ?? 0) < 12) {
    if ((dense[BLD_WORK + assoc] ?? 0) !== 0) {
      useTable176 = true;
    } else {
      const table41 = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0;
      if (table41 === 12) useTable176 = true;
    }
  }
  if (useTable176) {
    const inner = rt.packedBytes[(rt.packedOffsets[177] ?? 0) + (dense[BLD_KIND + assoc] ?? 0)] ?? 0;
    dense[UNIT_MODE + id] = rt.packedBytes[(rt.packedOffsets[176] ?? 0) + inner + (dense[UNIT_SLOT + id] ?? 0)] ?? 0;
  } else {
    const inner = rt.packedBytes[(rt.packedOffsets[174] ?? 0) + (dense[BLD_KIND + assoc] ?? 0)] ?? 0;
    dense[UNIT_MODE + id] = rt.packedBytes[(rt.packedOffsets[173] ?? 0) + inner + (dense[UNIT_SLOT + id] ?? 0)] ?? 0;
  }

  dense[3030 + id] = 0;
  dense[UNIT_TIMER + id] = -3;

  const fDState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
  stepLegacyFD(dense[UNIT_RECORD + id] ?? 0, fDState);
  rt.game.pendingP = fDState.P;

  dense[UNIT_TARGET_X + id] = dense[0 + id] ?? 0;
  dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;

  if ((rt.packedBytes[(rt.packedOffsets[39] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0) !== 2) {
    rt.changeEntityType(id, 59);
  }
}

/**
 * Exact `final void b()` (bytecode/b-javap.txt offsets 0..251) -- a
 * team-1..50 sweep (loop variable REUSES `v:I`/#225, the SAME shared
 * "current entity" register `subsystemU`/`subsystemBVoid`/`subsystemG`
 * all thread through; safe here since the method fully overwrites it
 * for the duration of its own loop). Own callers: `f.X()`'s `s:I===100`
 * branch (`stepLegacyX`, two call sites), which sets `outerLoopNFlag`/
 * `outerLoopLFlag` (f.N:Z/#81, f.L:Z/#73) right before each call --
 * confirmed via direct bytecode read (`getfield #37`/`#33` inside rt
 * method resolve to the SAME two fields `stepLegacyX` already tracks,
 * NOT the unrelated `game.nFlag`, which turned
 * out to be a separate pre-existing misidentification -- see rt
 * method's caller-site fix and `docs/unknowns.md` for the full trace).
 * For each id 1..50, unless `!f.N`, computes a nested packed-table
 * lookup (`packedBytes[packedOffsets[100] + packedBytes[packedOffsets[41]
 * + dense[2828+id]]]` plus the same shape read at `dense[6464+id]`) and
 * gates on the sum exceeding 1, `dense[6565+id]!==9`, and at least one of
 * three per-id thresholds exceeding 4; when reached (or when `f.N` was
 * already true, skipping straight in), ORs `dense[7979+id]` with 96
 * unless `f.L` is set AND bit 64 is already present (in which case the
 * id is skipped entirely, no write).
 */
export function subsystemBTeamSweep(rt: LegacyRuntimeState): void {
  const dense = rt.denseState;
  // b.b() loops on the field v:I (offsets 1..248) and leaves it at 51 (2026-10-09).
  rt.game.bUnit = 51;
  for (let id = 1; id <= 50; id += 1) {
    let reachedLGate = rt.game.callToArmsActive;
    if (!reachedLGate) {
      const table41A = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0;
      const value1 = rt.packedBytes[(rt.packedOffsets[100] ?? 0) + table41A] ?? 0;
      const table41B = rt.packedBytes[(rt.packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_JOB_TYPE + id] ?? 0)] ?? 0;
      const value2 = rt.packedBytes[(rt.packedOffsets[100] ?? 0) + table41B] ?? 0;
      reachedLGate = (value1 + value2) > 1
        && (dense[UNIT_HELD_ITEM + id] ?? 0) !== 9
        && ((dense[UNIT_MELEE_SKILL + id] ?? 0) > 4 || (dense[UNIT_RANGED_SKILL + id] ?? 0) > 4 || (dense[UNIT_SCOUT_SKILL + id] ?? 0) > 4);
    }
    if (!reachedLGate) continue;

    if (rt.game.formUpActive && ((dense[UNIT_FLAGS + id] ?? 0) & 64) !== 0) continue;
    dense[UNIT_FLAGS + id] = (dense[UNIT_FLAGS + id] ?? 0) | 96;
  }
}

/**
 * Exact private void k(int) (bytecode/b-javap.txt offsets 0..131,
 * constant pool #397). Genuinely uses `b:[[B`(#129, confirmed via the
 * constructor's `rt.b = fInstance.c:[[B`(#140) aliasing to be the
 * SAME field as `f.c:[[B`, i.e. `rt.gridC` -- correctly derived.
 * RETRACTED (2026-09-07): a 2026-08-24 note here declared rt method
 * unreachable, because its only caller `d(int,int)`(#367, `subsystemD`
 * below) was believed to throw before either of its two calls to it.
 * `d(int,int)` does not throw -- its `c:[[B]`(#143) is allocated by
 * `f.g()` (see LegacySubsystemBTenSlot.ts) -- so rt method is live, and
 * `subsystemD` now really does call it twice.
 */
export function subsystemK(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  if (dense[UNIT_CARRY_KIND + id] === 15) dense[UNIT_CARRY_AMOUNT + id] = 0;
  // offsets 26..38: `if (dense[2828+id] < 109) goto 131 (return)` -- the rest
  // of the method only runs for a courting unit (109/110/111). CORRECTED
  // 2026-09-20: rt comparison was inverted here, so a partner leaving the
  // hut kept type 111 forever (it walks around as a permanent "zombie" and
  // never works again), while ordinary units got reset instead.
  if ((dense[UNIT_TYPE + id] ?? 0) < 109) return;
  if ((rt.gridC[dense[UNIT_Y + id] ?? 0]?.[dense[id] ?? 0] ?? 0) === id) {
    dense[UNIT_TARGET_X + id] = dense[id] ?? 0;
    dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;
    rt.changeEntityType(id, 69);
  } else {
    dense[UNIT_ORDER + id] = 3;
    rt.changeEntityType(id, 87);
  }
}

/**
 * Exact private void d(int,int) (bytecode/b-javap.txt offsets 0..224,
 * constant pool #367), `b.g(int)`'s own `onD` target (fires when
 * `argument<3`).
 *
 * The 2026-08-24 correction that rt method uses `c:[[B]`(#143), NOT the
 * adjacent `k(int)`'s `b:[[B]`(#129)/`gridC`, still stands and was
 * re-verified. What did not stand is the second half of that note, which
 * concluded #143 was believed permanently null (RETRACTED 2026-09-07 -- it is not) and replaced the body with a
 * guard-then-throw: `f.g()` allocates it as `byte[6][10]`
 * (bytecode/f-javap.txt offset 590..594). Fully ported 2026-09-04 as
 * `releaseLegacySubsystemBEntitySlot`, including the `argument` parameter
 * the throwing version dropped.
 */
export function subsystemD(rt: LegacyRuntimeState, id: number, argument: number): void {
  releaseLegacySubsystemBEntitySlot(rt.subsystemArrays.cRows, rt.denseState, id, argument, {
    onK: (target) => rt.subsystemK(target),
  });
}

/**
 * `private void r()` (#412) with its `ap()` (#323) / `ao()` (#322) tail --
 * `LegacyEntityRecordRecovery.ts`, wired 2026-09-21. `q()` calls it when the
 * unit's record counter has run out; `ap()` reassigns the ambient `v:I`
 * (game.bUnit) exactly as the original does.
 */
export function subsystemRecordRecovery(rt: LegacyRuntimeState, id: number): void {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  stepLegacyEntityRecordRecovery({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    v: id,
    onGroupMode: (argument) => rt.subsystemG(id, argument),
    onQ: () => rt.selectEntityTypeAfterQ(id),
    onBVoid: (flag) => rt.subsystemBVoid(id, flag),
    onChangeType: (target, type) => { rt.changeEntityType(target, type); },
    onIUpdate: (argument) => rt.stepEntityIUpdate(id, argument, game.bTeam),
    flags: {
      get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
      get b() { return arrays.bField137; }, set b(value: boolean) { arrays.bField137 = value; },
    },
    onPBoolean: () => subsystemMarkerScan(rt, id, game.bTeam),
    onAp: () => rt.entityAp(id),
  });
}

/**
 * `private boolean p()` (#409, `LegacySubsystemBBoolean2.ts`) plus its
 * `H()` (#244, `LegacyEntityMarkerCommit.ts`) commit half -- shared by all
 * three of `p()`'s call sites. The original discards `p()`'s result at two
 * of them; rt returns it for the third (`r()`'s own `type <= 9 && p()`
 * short-circuit).
 */
export function subsystemMarkerScan(rt: LegacyRuntimeState, id: number, team: number): boolean {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  const dense = rt.denseState;
  const scratch = {
    get y() { return arrays.bField232; }, set y(value: number) { arrays.bField232 = value; },
    get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
    get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
    get B() { return game.subsystemB; }, set B(value: number) { game.subsystemB = value; },
    get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
    get f() { return game.subsystemFFlag; }, set f(value: boolean) { game.subsystemFFlag = value; },
    get zInt() { return game.subsystemEntityZ; }, set zInt(value: number) { game.subsystemEntityZ = value; },
    get D() { return arrays.bField13; }, set D(value: number) { arrays.bField13 = value; },
    get F() { return arrays.bField17; }, set F(value: number) { arrays.bField17 = value; },
  };

  return stepLegacySubsystemBBoolean2({
    state: dense,
    entityId: id,
    sceneQ: game.mission,
    fByte: game.subsystemGFFlagByte,
    team,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays,
    bFlag: arrays.bField137,
    aFlag: { get value() { return arrays.bField73; }, set value(next: boolean) { arrays.bField73 = next; } },
    zInt: game.subsystemEntityZ,
    bValue: rt.subsystemArrays.bField8,
    bByte: { get value() { return game.subsystemB; }, set value(next: number) { game.subsystemB = next; } },
    onH: () => stepLegacyEntityMarkerCommit({
      state: dense,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      gridC: rt.gridC,
      v: id,
      team,
      sceneQ: game.mission,
      fByte: game.subsystemGFFlagByte,
      IByte: game.subsystemGCurrentI,
      bValue: () => rt.subsystemArrays.bField8,
      nFlag: game.callToArmsActive,
      dShort: arrays.dShort,
      scratch,
      onCoordinateSync: (target, flag) => syncLegacySubsystemBCoordinate({
        dense, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        // a(int,boolean) offset 286: a(id, 69) (#275), wired 2026-09-27.
        onSpawnMark: (unit) => rt.changeEntityType(unit, 69),
      }, target, flag),
      onChangeType: (target, type) => { rt.changeEntityType(target, type); },
      onGroupMode: (argument) => rt.subsystemG(id, argument),
      onOccupancy: (x, y, mode) => rt.occupancyCheck(id, x, y, mode),
      onPVoid: () => rt.stepSubsystemP(id),
      onIUpdate: (argument) => rt.stepEntityIUpdate(id, argument, team),
      onMoveTrigger: (action, target, id2) => rt.entityMove(action, target, id2),
      onByteAction: (type, x, y, value) => rt.runByteActionQueue(type, x, y, value),
      // `private void a(byte,byte,byte)` (#291, b-javap.txt:31910): three
      // instructions -- the same bounding box b(byte,byte,byte) computes,
      // `aj:I = u:I`, then the marker scan again with D:B as its mode.
      onMarkerRescan: (x, y, range) => subsystemMarkerRescan(rt, id, x, y, range),
      onAuxRecord: (first, second, x, y) => rt.runAuxiliaryPlacement(first, second, x, y, id),
    }),
  });
}

/** b's `private boolean t()` (#417) -- LegacySubsystemT.ts. */
export function subsystemT(rt: LegacyRuntimeState): boolean {
  const game = rt.game;
  const arrays = rt.subsystemArrays;
  return stepLegacySubsystemT({
    state: rt.denseState,
    gridC: rt.gridC,
    teamMarkerTable: game.teamMarkerTable,
    aShort: rt.mainArrays.aShort,
    frame: game.missionFrame,
    mapWidth: game.mapWidth,
    mapHeight: game.mapHeight,
    q: game.mission,
    fByte: game.subsystemGFFlagByte,
    uByte: game.uByte,
    bField28: arrays.bField28,
    kFlag: { get value() { return game.choosingChief; }, set value(v: boolean) { game.choosingChief = v; } },
    scratch: {
      get u() { return game.bTeam; }, set u(v: number) { game.bTeam = v; },
      get v() { return game.bUnit; }, set v(x: number) { game.bUnit = x; },
      get w() { return game.subsystemW; }, set w(v: number) { game.subsystemW = v; },
      get A() { return game.subsystemA; }, set A(v: number) { game.subsystemA = v; },
      get C() { return arrays.bField10; }, set C(v: number) { arrays.bField10 = v; },
      get D() { return arrays.bField12; }, set D(v: number) { arrays.bField12 = v; },
    },
    onPrompt: (ap, am, an) => rt.entityActionPrompt(ap, am, an),
  });
}

/**
 * `private void a(byte,byte,byte)` (#291, b-javap.txt:31910) -- three
 * instructions: the bounding box `b(byte,byte,byte)` computes, `aj:I = u:I`,
 * then the marker scan again with `D:B` as its mode. Shared by `H()`'s
 * offset-1198 rescan and the strike gate's offset-609 record wake-up.
 */
export function subsystemMarkerRescan(rt: LegacyRuntimeState, id: number, x: number, y: number, range: number): void {
  const arrays = rt.subsystemArrays;
  const bounds = stepLegacySubsystemClampBounds(x, y, range);
  arrays.bField115 = bounds.an;
  stepLegacySubsystemNearbyMarkerLookup({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays,
    bounds,
    layer: rt.game.bTeam,
    entityId: id,
    refX: x,
    refY: y,
    mode: arrays.bField13,
    threshold: range,
  });
}

/** b.a(byte) (#475) over the f:[[B] table f.g() allocates as fRows (2x10). */
export function subsystemTenSlotAllocate(rt: LegacyRuntimeState, id: number): boolean {
  return allocateLegacySubsystemBTenSlot(rt.subsystemArrays.fRows, rt.denseState, id);
}

/** b.c(int) (#563) over the same fRows table. */
export function subsystemTenSlotRelease(rt: LegacyRuntimeState, id: number): void {
  releaseLegacySubsystemBTenSlot(rt.subsystemArrays.fRows, id);
}

/** b.a(int) (#476) over the c:[[B] table f.g() allocates as cRows (6x10). */
export function subsystemTenSlotReleaseEntity(rt: LegacyRuntimeState, id: number): void {
  releaseLegacySubsystemBTenSlotEntity(rt.subsystemArrays.cRows, rt.denseState, id, {
    onD: (entityIndex, argument) => rt.subsystemD(entityIndex, argument),
  });
}

/**
 * Exact private void g(int) (bytecode/b-javap.txt offsets 0..317),
 * `stepLegacySubsystemBDecision`'s `onGroupMode` target. `onD` wired for
 * real (`subsystemD`, above).
 *
 * `onCalculateM`/`readL` -- RETRACTED-PREMISE, FULLY PORTED 2026-09-07.
 * `onCalculateM` maps to `b.a(int,int,boolean)`/`subsystemEntityTransform`
 * (see that method's own docblock), previously believed a 100%-guaranteed
 * throw; it is not. Offset 204..297: `g(int)` calls `a(x,y,flag)` then
 * immediately reads `l:B`(#199), exactly what `subsystemEntityTransform`
 * now returns directly -- `onCalculateM`'s own return value is still
 * discarded (matches the real bytecode's void call), `readL` is the
 * separate follow-up field read. `g(int)` itself has its OWN exception
 * table (offsets 0..164/165..311/312..317, all -> a `pop;return` handler
 * at 318) wrapping rt entire call -- confirmed by reading the raw
 * javap output directly, not assumed. Modeled with a local try/catch
 * here to match, regardless of whether anything inside actually throws.
 *
 * `onQ` -- `private void Q()` (#253, offset 274, the SAME already-ported
 * `selectEntityTypeAfterQ` every other `onQueue` call site in rt file
 * uses) -- now wired for real too (reachable once `onCalculateM` no
 * longer throws first).
 *
 * `onAByteIntInt` (`a:(BII)V` #274) and `onH` (`private void h(int)`
 * #388, ~521 raw instructions) remain deliberately unwired: both are
 * separate, not-yet-examined methods out of scope for rt pass -- left
 * as an explicit unported boundary rather than guessed, following rt
 * codebase's convention for unported callees.
 *
 * `onU` -- `private void U()` (offsets 0..555, `subsystemU`, below) --
 * is now ALSO wired (fires when `readEntityCell` doesn't match the
 * current entity, an earlier branch unrelated to the `onCalculateM`
 * chain above).
 */
/**
 * private void N() (offsets 0..874) -- shared by both of its real
 * callers, an()'s own onN and f.am()'s own onN(id,team) (a completely
 * unrelated subsystem). Extracted 2026-08-21 to avoid a third copy when
 * wiring p()'s own onN. See LegacySubsystemN.ts's own docblock.
 */
export function stepSubsystemN(rt: LegacyRuntimeState, id: number, team: number): void {
  stepLegacySubsystemN({
    state: rt.denseState,
    id,
    team,
    gridC: rt.gridC,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    cRows: rt.subsystemArrays.cRows,
    scratch: rt.subsystemArrays,
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    onGate: (mode, scanLimit, originX, originY) => rt.checkSpiralPlacementGate(
      mode, scanLimit, originX, originY, id,
      (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant),
    ),
    onGroupMode: (argument) => rt.subsystemG(id, argument),
    onChangeEntityType: (rawId, action) => { rt.changeEntityType(rawId, action); },
    // private void O() (#251), rewritten 2026-09-15 -- see LegacySubsystemO.ts.
    onOther: (otherId, otherTeam) => stepLegacySubsystemO({
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      id: otherId,
      team: otherTeam,
      xSlots: rt.game.xSlotTable,
      orders: rt.mainArrays.aByte3,
      fRows: rt.mainArrays.f4,
      // ap() (#323), ported 2026-09-21; rt O() site was missed and still
      // threw until 2026-09-23. O()'s ambient v:I is the unit it handles.
      onAp: () => rt.entityAp(otherId),
      onA: (kind) => stepLegacySubsystemNearestBuilding({
        state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        team: otherTeam, entityId: otherId, kind,
      }),
      onG: (argument) => rt.subsystemG(otherId, argument),
    }),
  });
}

export function stepSubsystemP(rt: LegacyRuntimeState, id: number): void {
  stepLegacySubsystemBVoidO({
    state: rt.denseState,
    id,
    localFlags: rt.game.subsystemBLocalFlags,
    // Same #332 wiring as the onO call site above; see its comment.
    onScore: (a, b, c, d) => stepLegacySubsystemScore(rt.legacySubsystemScoreInput(id), a, b, c, d),
  });
  stepLegacySubsystemP({
    state: rt.denseState,
    id,
    team: rt.game.bTeam,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // #266's own inputs, wired 2026-09-10 when p()'s deliberate
    // guaranteed-throw stub for it was retracted -- see LegacySubsystemP.ts.
    saveOffsets: rt.saveOffsets,
    qrFields: rt.subsystemArrays,
    localFlags: rt.game.subsystemBLocalFlags,
    bThreshold: rt.subsystemArrays.bField8,
    fNFlag: rt.game.callToArmsActive,
    qByte: rt.game.subsystemBQByte,
    fQByte: rt.game.mission,
    fByte: rt.game.subsystemGFFlagByte,
    onNearestCandidate: (arg1, arg2) => rt.nearestCandidate(id, arg1, arg2),
    onN: () => rt.stepSubsystemN(id, rt.game.bTeam),
    onGate: (mode, scanLimit, originX, originY) => rt.checkSpiralPlacementGate(
      mode, scanLimit, originX, originY, id,
      (occupant) => checkLegacyEntityOccupant({
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        id,
      }, occupant),
    ),
    randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
  });
}

/**
 * `private void h(int)` (#388), both halves: `LegacyEntityHPrefix.ts`
 * (offsets 0..162) and `LegacyEntityHActionBranch.ts` (163..534), which have
 * been ported and tested since 2026-08-18 and never wired.
 *
 * They were left unwired on a premise that is now retracted.
 * docs/parity-checklist.md's `b.g(int)` row still records it verbatim:
 * "`onCalculateM` maps to `b.a(int,int,boolean)`, the SAME method confirmed
 * a 100%-guaranteed throw ... since rt call happens BEFORE
 * `readL`/`onQ`/`onAByteIntInt`/`onH` in the bytecode's own instruction
 * order, none of them can ever execute either ... `private void h(int)`
 * (#388, ~521 raw instructions) does not need to be derived at all --
 * provably dead code, not merely deferred."
 *
 * `b.a(int,int,boolean)` is `subsystemEntityTransform`, and its
 * guaranteed-throw premise was RETRACTED and the method fully ported on
 * 2026-09-07. So `h(int)` is not dead: it is the live movement path. The
 * 2026-09-07 sweep cleared 27 `throw` sites of rt family but not rt one,
 * because here the premise justified an unwired callback rather than a
 * throw.
 *
 * Field sources read from b.h(int)'s own bytecode rather than assumed:
 * `k1`/`k2` are `k:[B`(#196) indices 1/2, `m` is `m:B`(#202), `fN` is
 * `f.N:Z`, and `K` is `b.K:B`(#28), the entity loop's own scheduler byte.
 * CORRECTED 2026-09-14: `m` was read from `subsystemModeByte` (never
 * written, so always 0) and `fN` from the unrelated `game.nFlag`.
 */
export function subsystemH(rt: LegacyRuntimeState, id: number, argument: number): void {
  const k = rt.game.subsystemKBytes;
  // m:B (#202) has one writer, a(int,int,boolean) (subsystemEntityTransform).
  const m = rt.game.subsystemMByte;
  stepLegacyEntityHPrefix({ state: rt.denseState, entityId: id, argument, k2: k[2] ?? 0, m });
  stepLegacyEntityHActionBranch({
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    entityId: id,
    argument,
    k1: k[1] ?? 0,
    k2: k[2] ?? 0,
    m,
    // f.N:Z (#81 in f) -- outerLoopNFlag, not the unrelated game.nFlag.
    fN: rt.game.callToArmsActive,
    K: rt.subsystemArrays.bField28,
    mapWidth: rt.game.mapWidth,
    readEntityCell: (row, column) => rt.gridC[row]?.[column] ?? id,
    onFC: (entityId) => rt.clearEntityRecordTarget(entityId),
    onChangeType: (entityId, type) => { rt.changeEntityType(entityId, type); },
    onNearestCandidate: (arg1, arg2) => rt.nearestCandidate(id, arg1, arg2),
  });
}

export function subsystemG(rt: LegacyRuntimeState, id: number, argument: number): void {
  try {
    stepLegacyEntityGPrefix({
      state: rt.denseState,
      entityId: id,
      argument,
      partition: rt.game.bTeam,
      currentI: rt.game.subsystemGCurrentI,
      // f.q:B (#211) is game.mission; the separate subsystemGFQByte had no writer (removed 2026-09-14).
      fQ: rt.game.mission,
      fFlag: rt.game.subsystemGFFlagByte,
      readEntityCell: (row, column) => rt.gridC[row]?.[column] ?? id,
      onD: (entityId, arg) => rt.subsystemD(entityId, arg),
      onU: () => rt.subsystemU(id),
      onCalculateM: (x, y, flag) => { rt.subsystemEntityTransform(id, x, y, flag); return 0; },
      readL: () => rt.subsystemArrays.bField199,
      onQ: () => rt.selectEntityTypeAfterQ(id),
      // Both wired 2026-09-10 -- see subsystemH's docblock for why they were
      // not. `a(byte,int,int)` (#274) is the already-ported
      // triggerLegacyEntityMove that the status guard's own onMove uses.
      onAByteIntInt: (value, entityId, second) => rt.entityMove(value, entityId, second),
      onH: (arg) => rt.subsystemH(id, arg),
    });
  } catch {
    // g(int)'s own exception table (offsets 0..317 -> 318, pop;return)
    // -- see the docblock above for the full derivation.
  }
}

/**
 * Team 1's "muster and deploy" AI cluster (aq()/ar()/as()/av()/aw()/
 * at()/o(int)), wired into b.e()'s real `if (team===1) aq();` call site
 * (`onTeamOneAuxiliary`, `LegacySubsystemEntityLoop.ts`). No try/catch
 * needed here specifically -- rt whole callback runs INSIDE
 * `stepSubsystemFrame()`'s existing try/catch around
 * `runSubsystemEntityLoop(...)`, which already matches `b.e()`'s own
 * real exception table (offsets 0..832 -> 833) that rt call chain
 * (none of aq()/as()/at() have their own exception tables) propagates
 * into on at()'s confirmed guaranteed throw.
 *
 * `private int a(int,int,int)` (#266, as()/aw()'s shared "occupancy
 * check") is now wired for real -- confirmed a guaranteed throw (same
 * permanently-null `b:[S]`#132 as elsewhere rt session; see
 * `LegacySubsystemEntityOccupancyCheck.ts`) except for a narrow escape
 * (`dense[4444+v] < -1`), so both call sites can genuinely crash rt
 * whole cluster for a tick, caught by the same outer handler noted
 * above.
 *
 * `f.b(int,boolean):V` (#353, ar()'s building-order action) is ALSO now
 * wired for real: direct bytecode read confirms its very first action
 * unconditionally calls `b.b(byte)`, already confirmed a guaranteed
 * throw from earlier work rt session (`LegacySubsystemBFreeList.ts`,
 * via the SAME `g:[[B]`#176 permanently-null field `g()` hit) -- no new
 * derivation needed, just wiring.
 *
 * `av()`'s rally broadcast (#307) is class b's OWN sibling method
 * `a(IIIBB)`, the same one f.T() calls (`batchAllocate`). RETRACTED
 * 2026-09-23: it was a separate duplicate port (LegacySubsystemRallySpawn)
 * that never ran L() or the #270 free-cell search; now shared.
 *
 * `o(int)`'s own gate (#288, `rt.a(6)`) is ALSO now wired for real --
 * unlike every other helper in rt cluster, it does NOT touch any
 * confirmed-null field; it's genuine "find the nearest eligible
 * building and clamp the entity's target onto its footprint" logic
 * (`LegacySubsystemNearestBuilding.ts`). Every cross-method helper rt
 * cluster depends on is now either wired for real or a confirmed
 * guaranteed throw -- none remain as invented no-op stubs.
 */
export function subsystemTeamOneAiMuster(rt: LegacyRuntimeState): void {
  const g = rt.game;

  const onLowerO = (entityId: number) => {
    stepLegacySubsystemLowerO(
      { state: rt.denseState, gridC: rt.gridC, entityId, arg: -1 },
      {
        onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        onCheckGate: (kind) =>
          stepLegacySubsystemNearestBuilding(
            { state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, team: 1, entityId, kind },
            { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
          ),
        onGroupMode: (id, argument) => rt.subsystemG(id, argument),
      },
    );
  };

  const onAt = (entityId: number, aT: number) => {
    stepLegacySubsystemAt(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        entityId,
        qByte: g.subsystemBQByte,
        mByte: g.subsystemM,
        aT,
        gBase: g.subsystemGBase,
        gridC: rt.gridC,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        saveOffsets: rt.saveOffsets,
        // b.x:I (#230) / b.w:I (#228) -- cross-method scratch fields, not
        // per-call locals (see LegacySubsystemAt.ts's own docblock and
        // 2d38a12's o() fix for the same class of bug). Live-bound to
        // `game.subsystemX`/`game.subsystemW` so writes persist for the
        // other 8+ methods that read them.
        scratch: {
          get x(): number { return g.subsystemX; },
          set x(v: number) { g.subsystemX = v; },
          get w(): number { return g.subsystemW; },
          set w(v: number) { g.subsystemW = v; },
        },
      },
      {
        onLowerO: () => onLowerO(entityId),
        onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        // final boolean a(int) (#288) -- the SAME gate onLowerO's own
        // onCheckGate calls; at()'s Block E is a second real call site
        // for it (see LegacySubsystemAt.ts's docblock for the
        // correction to LegacySubsystemNearestBuilding.ts's "only one
        // call site" claim).
        onCheckGate: (kind) =>
          stepLegacySubsystemNearestBuilding(
            { state: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, team: 1, entityId, kind },
            { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
          ),
        // private void au() (#328), ported 2026-09-28.
        onAu: () => { const runtime = rt; stepLegacySubsystemAu({
          state: rt.denseState,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          gridC: rt.gridC,
          v: entityId,
          sceneQ: g.mission,
          scratch: {
            get C(): number { return runtime.subsystemArrays.bField10; }, set C(value: number) { runtime.subsystemArrays.bField10 = value; },
            get D(): number { return runtime.subsystemArrays.bField12; }, set D(value: number) { runtime.subsystemArrays.bField12 = value; },
          },
          onChangeEntityType: (id, type) => { rt.changeEntityType(id, type); },
        }); },
      },
    );
  };

  const onAv = () => {
    const result = stepLegacySubsystemAv(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        team: 1,
        aInt: g.subsystemA,
        mByte: g.subsystemM,
        rByte: g.subsystemRByte,
        nByte: g.subsystemNByte,
        oByte: g.subsystemOByte,
        gByte: rt.subsystemArrays.bgByte,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        fields: liveView<{ x: number; y: number; z: number; aU: number; v: number }>(g, {
          x: "subsystemX", y: "subsystemY", z: "subsystemEntityZ", aU: "subsystemAU", v: "bUnit",
        }),
      },
      {
        onClamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        onRandomA: (mask, divisor) => rt.randomRemainder(mask, divisor),
        // b.a(IIIBB) #307 -- the same method T() reaches via onBCreate.
        onRallyBroadcast: (count, x, y, team, role) => { rt.batchAllocate(count, x, y, team, role); },
      },
    );
    g.subsystemRByte = result.rByte;
    g.subsystemNByte = result.nByte;
    g.subsystemOByte = result.oByte;
  };

  const onAw = () => {
    const result = stepLegacySubsystemAw(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        gridC: rt.gridC,
        team: 1,
        nByte: g.subsystemNByte,
        oByte: g.subsystemOByte,
        aR: g.subsystemAR,
        sceneQ: g.mission,
        simulationCounter: g.missionFrame,
      },
      {
        onCheckOccupancy: (id, x, y, arg) =>
          rt.occupancyCheck(id, x, y, arg),
      },
    );
    g.subsystemOByte = result.oByte;
  };

  const onAs = () => {
    const result = stepLegacySubsystemAs(
      {
        state: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        jobTable: rt.subsystemArrays.j,
        team: 1,
        aQ: rt.subsystemArrays.bAQ,
        fByte: g.subsystemGFFlagByte,
        mByte: g.subsystemM,
        sceneQ: g.mission,
        fBByte: g.difficulty,
        simulationCounter: g.missionFrame,
        fields: liveView<{ O: number; aR: number; v: number; w: number; Q: number }>(g, { O: "subsystemOByte", aR: "subsystemAR", v: "bUnit", w: "subsystemW", Q: "subsystemBQByte" }),
      },
      {
        onRandomA: (mask, divisor) => rt.randomRemainder(mask, divisor),
        onAt,
        onAv,
        onAw,
        onGroupMode: (id, argument) => rt.subsystemG(id, argument),
        onCheckOccupancy: (id, x, y, arg) =>
          rt.occupancyCheck(id, x, y, arg),
      },
    );
    rt.subsystemArrays.bAQ = result.aQ;
    g.subsystemAU = result.aU;
  };

  const placementOptions = rt.buildingPlacementOptions();

  stepLegacySubsystemAq(
    {
      state: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      mainShort: rt.mainArrays.aShort,
      gridC: rt.gridC,
      // f.a:[[[B (#74 via b, #132 in f) is mainArrays.aByte3 and f.b:[[[B (#139 via b,
      // #237 in f) is xSlotTable; the separate scoutMemory/buildingQueue copies were
      // never read by anything else (merged 2026-09-14).
      scoutMemory: rt.mainArrays.aByte3,
      buildingQueue: g.xSlotTable,
      freeSlotTable: rt.mainArrays.f4,
      team: 1,
      fByte: g.subsystemGFFlagByte,
      qByte: g.subsystemBQByte,
      rByte: g.subsystemRByte,
      sceneQ: g.mission,
      simulationCounter: g.missionFrame,
    },
    {
      onPrologue: (m, a) => { g.subsystemM = m; g.subsystemA = a; },
      // private void n(int) (#404), b-javap offsets 0..193: v = 0, w = a table
      // row picked at random, then a(1, 127, x, y) (#270) puts a free cell near
      // a random point of that row's rectangle into dense[3131]/[3232] (v = 0).
      // Ported 2026-10-13 (oracle run 13, play10 frame 30713): was unwired.
      onN: (arg) => {
        const t = (index: number) => rt.packedBytes[index] ?? 0;
        const q = g.mission;
        const row = (rt.packedOffsets[arg + 1] ?? 0) + q;
        g.bUnit = 0;
        g.subsystemW = (rt.packedOffsets[arg] ?? 0) +
          (t(row) + rt.randomRemainder(255, t(row + 1) - t(row))) * 4;
        const w = g.subsystemW;
        const x = t(w) + rt.randomRemainder(65535, t(w + 2) - t(w) + 1);
        const y = t(w + 1) + rt.randomRemainder(65535, t(w + 3) - t(w + 1) + 1);
        rt.checkSpiralPlacementGate(1, 127, x, y, g.bUnit);
      },
      onAr: () => {
        const result = stepLegacySubsystemAr(
          {
            state: rt.denseState,
            packedBytes: rt.packedBytes,
            packedOffsets: rt.packedOffsets,
            gridC: rt.gridC,
            pByte: g.subsystemP,
            sceneQ: g.mission,
            simulationCounter: g.missionFrame,
          },
          {
            // f.b(int,boolean) (#353), the whole method. FIXED 2026-10-07:
            // only its opening b.b(byte) ran here, so 8627 was never set;
            // ar() re-picks any record with 8627 == 0, re-inserted the same
            // team-1 records into g[0] every pass until all 20 slots were
            // full, after which no upgrade/repair could be queued and g()
            // threw (and aborted) on every record with 8627 != 0.
            onBuildingAction: (id: number, flag: boolean) => {
              stepLegacyZB2(
                { dense: rt.denseState, gRows: rt.subsystemArrays.gRows, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets },
                id,
                flag,
                {
                  onReleaseTenEntity: (target) => subsystemTenSlotReleaseEntity(rt, target),
                  onRecordCancel: (node, owner) => stepLegacyEntityRecordCancel(
                    rt.denseState, rt.gridC, node, owner, false, false, (record) => rt.completeEntityRecord(record),
                  ),
                },
              );
            },
            onV: (value) => { g.bUnit = value; },
            onPlaceEntity: (team, type, x, y, flags, specialPlacement, existingId) =>
              rt.placeEntity(rt.gridC, team, type, x, y, flags, specialPlacement, existingId, placementOptions),
          },
        );
        g.subsystemP = result.pByte;
      },
      onAs,
    },
  );
}

/**
 * Exact private void a(int,int,boolean) (bytecode/b-javap.txt offsets
 * 0..429) -- `b.t()`'s `onPositionProbe` target (`LegacyEntityTargetStep.ts`),
 * entry point for `calculateLegacyEntityM` (offsets 54..429,
 * `LegacyEntityMCalculation.ts`).
 *
 * **RETRACTED-PREMISE (2026-08-18/08-27), FULLY PORTED (2026-09-07)**:
 * rt method was believed a 100%-unconditional guaranteed throw because
 * `e(int,int,int)` unconditionally dereferences `b:[S]` (#132), and that
 * field was believed permanently null. It is not -- `e.f()` allocates it
 * (`new short[570]`) and `b.a(f)` copies it in (bytecode/b-javap.txt:550);
 * it is rt port's `saveOffsets`, already live throughout the rest of
 * rt codebase. All three methods in the cluster (`a(int,int,boolean)`,
 * `c(int,int,int,int)` #355, `e(int,int,int)` #379) are now ported for
 * real in `LegacySubsystemEntityTransform.ts` -- see that file's own
 * docblock for the full field-identity derivation and control flow.
 *
 * Porting the entry point for real also surfaced 3 real bugs in the
 * `calculateLegacyEntityM` core itself (a wrong table base for 5 of 6
 * lookups, a swapped `currentK===4` selector, a missing `k3`-gate around
 * the second `m` assignment) -- see that file's own corrected docblock.
 * That code had never been exercised end to end before, since the entry
 * point above always threw before reaching it.
 *
 * No exception table exists in rt method, `c(IIII)`, or `e(III)`
 * (confirmed -- none of the three has a local `Exception table:` in the
 * raw javap output), so a genuinely unreachable read here (e.g. `e()`'s
 * `idiv`-by-zero) still propagates to whichever caller's own exception
 * table catches it -- same as the other four call sites rt method has
 * (`t()`, `g(int)`, `d(int)`, `stepLegacySubsystemBDecision`), each of
 * which already has (or is wrapped in) its own real exception scope.
 *
 * Returns `l:B` (#199) directly -- the two real callers that read it
 * right after calling rt method (`g(int)`'s `readL`, `t()`'s
 * `onPositionProbe`) can just use the return value instead of a second
 * field read.
 */
export function subsystemEntityTransform(rt: LegacyRuntimeState, id: number, x: number, y: number, flag: boolean): number {
  const scratch = {
    bField197: rt.subsystemArrays.bField197,
    bField199: rt.subsystemArrays.bField199,
    mByte: rt.game.subsystemMByte,
  };
  const l = stepLegacySubsystemEntityTransform({
    dense: rt.denseState,
    gridC: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    visibilityBits: rt.mainArrays.aInt,
    k: rt.game.subsystemKBytes,
    id,
    x,
    y,
    flag,
    team: rt.game.bTeam,
    fQ: rt.game.mission,
    scratch,
    // b.a:[[S (#63) is f.a:[[S; read by private byte a() (#276).
    shortRows: rt.mainArrays.aShort,
  });
  rt.subsystemArrays.bField197 = scratch.bField197;
  rt.subsystemArrays.bField199 = scratch.bField199;
  rt.game.subsystemMByte = scratch.mByte;
  return l;
}

/**
 * `b.w()`'s `onJ` target: private void J() (#246), bytecode/b-javap.txt
 * offsets 0..723 (line 24999).
 *
 * RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07). The
 * 2026-08-20 throw was built on `b.b:[S]` (#132, rt port's
 * `saveOffsets`) being permanently null -- disproven the same day as
 * rt project's other "permanently null field" claims (`e.f()`
 * allocates it, `b.a(f)` copies it in; see `docs/unknowns.md`'s
 * 2026-09-04 entries). The method really is pure field arithmetic --
 * zero `invoke*` anywhere in its 723 raw offsets, confirmed -- but that
 * arithmetic is real, working per-entity scratch computation, not a
 * crash. Full instruction-by-instruction trace:
 *
 *  1. offset 0..2: `A:I`(#7, `game.subsystemA`) = 1.
 *  2. offset 5..41: `type = dense[2828+id]`; if
 *     `(packedBytes[packedOffsets[27]+type] & 32) === 0`, `A = -1`.
 *  3. offset 42..116: `t35 = packedBytes[packedOffsets[35]+type]`;
 *     `x1 = dense[saveOffsets[t35]+id]`;
 *     `t36 = packedBytes[packedOffsets[36]+type]`;
 *     `C:I`(#10) `= (x1+t36) * A`.
 *  4. offset 119..331: re-reads `x3 = packedBytes[packedOffsets[35]+type]`
 *     (index 35 again, recomputed rather than cached -- reproduced as a
 *     second read, not reused). If `x3 in [69,74]` AND `team===0`
 *     (`u:I`#222, `game.bTeam`): reads `idx17 =
 *     mainArrays.aShort[0][17]`, and if BOTH `dense[id]-dense[idx17]`
 *     and `dense[101+id]-dense[101+idx17]` are in `[-4,4]`,
 *     `C = Math.trunc(C*3/2)` (`idiv` truncates toward zero).
 *  5. offset 334..459: `x6 = packedBytes[packedOffsets[33]+type]`. If
 *     `x6 > 0`: `dense[saveOffsets[x6]+id] += C` (byte-narrowed, i2b).
 *     Else: `mainArrays.aShort[team][-x6] += C` (short-narrowed, i2s).
 *  6. offset 460..462: `A = 1` (unconditional reset).
 *  7. offset 465..499: same mask-check shape as step 2 but bit `16`
 *     against `packedOffsets[27]+type`: if the bit is 0, `A = -1`.
 *  8. offset 502..603: `x8 = packedBytes[packedOffsets[34]+type]`. If
 *     `x8 >= 0`: `C = x8`. Else: `C = dense[saveOffsets[-x8]+id]`.
 *  9. offset 606..668: `x9 = packedBytes[packedOffsets[31]+type]`;
 *     `off = saveOffsets[x9] + dense[3838+id]`;
 *     `dense[off] += C*A` (byte-narrowed).
 *  10. offset 669..723: `subsystemR`(#49, `game.subsystemR`) `=
 *      dense[off]` -- re-reads `off` the same way and picks up the
 *      value step 9 JUST wrote there.
 *
 * `C:I`(#10) is genuine cross-method scratch -- ~48 references spread
 * across ~10 other, not-yet-ported methods in rt class (confirmed via
 * `grep -n "#10 " bytecode/b-javap.txt`) -- so it's modeled as a real
 * field, `LegacySubsystemArrays.bField10`, not a local; see that file's
 * own docblock for the field. `id` stands in for the ambient `v:I`
 * (#225) rt ported method reads directly, same convention as rt
 * file's `subsystemEntityAAlert` below.
 *
 * REACHABILITY CORRECTION (2026-09-07): the 2026-08-20/29 chain
 * ("J() always throws" -> "i()'s offset 196..1028 is unreachable" ->
 * "j():Z's only call site is unreachable" -> "K() is unreachable") was
 * entirely downstream of the SAME retracted premise as rt method's
 * own old throw. With J() no longer throwing, `i()`'s call to it
 * (offset 192-195, `LegacySubsystemEntityProbe.ts`) returns normally
 * like any other call, so `i()`'s offset 196..1028 -- including
 * `j():Z`'s only call site in the class (offset 595) -- IS reachable,
 * and so is `K()` (`j()`'s only caller). Neither `j()` nor `K()` is
 * (re-)ported here: both already have complete, tested implementations
 * in `LegacySubsystemEntityAssociationScan.ts`/
 * `LegacySubsystemEntityTypeReaction.ts` ("ported anyway, fully
 * derived, for the record" per their own docblocks, written back when
 * they were believed unreachable) -- rt fix just makes those existing
 * ports actually reachable. NOTE: `LegacySubsystemEntityProbe.ts`'s own
 * docblock still asserts the old "everything past offset 196 in i() is
 * provably 100% UNREACHABLE" conclusion and needs the same correction;
 * left as-is here (out of rt file's scope) but flagged for follow-up.
 */
export function subsystemEntityJTrigger(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  const { packedBytes, packedOffsets, saveOffsets } = rt;
  const arrays = rt.subsystemArrays;
  const aShort = rt.mainArrays.aShort;
  const type = dense[UNIT_TYPE + id] ?? 0;

  const g = rt.game;
  g.subsystemA = 1;
  if (((packedBytes[(packedOffsets[27] ?? 0) + type] ?? 0) & 32) === 0) g.subsystemA = -1;

  const t35 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
  const x1 = dense[(saveOffsets[t35] ?? 0) + id] ?? 0;
  const t36 = packedBytes[(packedOffsets[36] ?? 0) + type] ?? 0;
  arrays.bField10 = (x1 + t36) * g.subsystemA;

  const x3 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
  if (x3 >= 69 && x3 <= 74 && rt.game.bTeam === 0) {
    const idx17 = aShort[0]?.[17] ?? 0;
    const d1 = (dense[id] ?? 0) - (dense[idx17] ?? 0);
    const d2 = (dense[UNIT_Y + id] ?? 0) - (dense[UNIT_Y + idx17] ?? 0);
    if (d1 >= -4 && d1 <= 4 && d2 >= -4 && d2 <= 4) {
      arrays.bField10 = Math.trunc((arrays.bField10 * 3) / 2);
    }
  }

  const team = rt.game.bTeam;
  const x6 = packedBytes[(packedOffsets[33] ?? 0) + type] ?? 0;
  if (x6 > 0) {
    const off = (saveOffsets[x6] ?? 0) + id;
    dense[off] = (dense[off] ?? 0) + arrays.bField10;
  } else {
    const row = aShort[team];
    if (row) {
      const idx = -x6;
      row[idx] = (row[idx] ?? 0) + arrays.bField10;
    }
  }

  g.subsystemA = 1;
  if (((packedBytes[(packedOffsets[27] ?? 0) + type] ?? 0) & 16) === 0) g.subsystemA = -1;

  const x8 = packedBytes[(packedOffsets[34] ?? 0) + type] ?? 0;
  if (x8 >= 0) {
    arrays.bField10 = x8;
  } else {
    arrays.bField10 = dense[(saveOffsets[-x8] ?? 0) + id] ?? 0;
  }

  const x9 = packedBytes[(packedOffsets[31] ?? 0) + type] ?? 0;
  const off = (saveOffsets[x9] ?? 0) + (dense[3838 + id] ?? 0);
  dense[off] = (dense[off] ?? 0) + arrays.bField10 * g.subsystemA;
  g.subsystemR = dense[off] ?? 0;
}

/**
 * `subsystemB`'s own `onA` target: private void A() (bytecode/b-javap.txt
 * offsets 0..903, line 16568), fired right after `legacySubsystemBEntryGate`
 * returns true.
 *
 * RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07). The
 * 2026-08-20 throw was built on `b.b:[S]` (#132, `saveOffsets`) being
 * permanently null -- disproven (`e.f()` allocates it, `b.a(f)` copies
 * it in; see `docs/unknowns.md`'s 2026-09-04 entries). Zero `invoke*`
 * in the whole method except one static helper -- `private static int
 * b(int,int,int)` (#334, bytecode/b-javap.txt:7562..7575): `arg0<arg1 ?
 * arg1 : arg0>=arg2 ? arg2 : arg0`, i.e. `clamp(value,min,max)` --
 * inlined below rather than left a callback, matching rt file's own
 * `Math.max(min, Math.min(max, value))` idiom for the SAME helper used
 * elsewhere in rt class (e.g. `onClamp` in the `onAv`/`aq()` wiring
 * above). Full instruction-by-instruction trace:
 *
 *  1. offset 0..38 (already ported, unchanged):
 *     `dense[2222+id] = packedBytes[packedOffsets[41]+dense[6464+id]]`.
 *  2. offset 39..97: seed four scratch slots --
 *     `for (i=0;i<4;i++) dense[saveOffsets[23+i]+id] = 9 + (i>>1)`
 *     (writes 9,9,10,10 into slots 23..26).
 *  3. offset 97..329: for `i` from 2 down to 0, scans `j` in `[25,26]`
 *     (in that order) comparing
 *     `lhs = dense[saveOffsets[packedBytes[packedOffsets[107]+dense[saveOffsets[j]+id]]]+id]`
 *     against `rhs = dense[saveOffsets[packedBytes[packedOffsets[107]+i]]+id]`;
 *     on the first `j` where `lhs<=rhs`, shifts
 *     `dense[saveOffsets[26..j+1]+id]` each one slot toward 26 (evicting
 *     slot 26), writes `i` into `dense[saveOffsets[j]+id]`, and stops
 *     scanning `j` for rt `i` (bytecode jumps straight to the `i--`
 *     step, offset 316) -- if no `j` matches, `i` is silently dropped
 *     (not inserted anywhere).
 *  4. offset 329..377: `dense[1818+id] = clamp(dense[1818+id], 3 +
 *     Math.trunc(dense[1616+id]/2), 7)` (`idiv` truncates toward zero).
 *  5. offset 378..424: `dense[4949+id] = clamp(dense[4949+id],
 *     dense[1818+id]+1, 9)` -- reads the JUST-updated `dense[1818+id]`
 *     from step 4.
 *  6. offset 425..777: for `i` from 3 to 8, scans `j` in `[23,24]`. Same
 *     `lhs`/`rhs` formula as step 3 but the CONTINUE condition is
 *     inverted (`lhs<rhs` to proceed to the candidate checks below, vs
 *     step 3's `lhs<=rhs` to insert immediately) -- if `lhs>=rhs`, tries
 *     the next `j`. On a candidate `j`: if `i === dense[2525+id]` or
 *     `i === dense[2626+id]`, rt `i` is abandoned entirely (no
 *     insert, straight to `i++`). Otherwise computes `valE =
 *     packedBytes[packedOffsets[108]+i]`, `valF = dense[2222+id]`,
 *     `cmpVal = (valF<8 && valF>0) ? 7 : valF`; if `valE === cmpVal`,
 *     rt `i` is likewise abandoned. Otherwise shifts
 *     `dense[saveOffsets[24..j+1]+id]` and inserts `i` at
 *     `dense[saveOffsets[j]+id]`, then stops scanning `j` for rt `i`
 *     (mirrors step 3's insert-and-break, over slots 23..24, with the
 *     two extra exclusion checks). If `j` exhausts `[23,24]` without a
 *     match, `i` is dropped like step 3.
 *  7. offset 777..903: `for (j=23;j<=26;j++)`: `valG =
 *     dense[saveOffsets[j]+id]`; if `valG>8`, `dense[saveOffsets[j]+id]
 *     = -1`; else `dense[saveOffsets[j]+id] =
 *     packedBytes[packedOffsets[108]+valG]` (self-referential lookup,
 *     reads the SAME slot it's about to overwrite).
 *
 * `I:I`(#24)/`J:I`(#27)/`K:I`(#29) are real object fields, also
 * read/written by `private void B()` (the very next method in the
 * class, not ported -- confirmed via `grep -n "#24 "` etc spilling past
 * rt method's own line range) -- but every access within `A()` itself
 * writes each one before it's ever read, so they're modeled as ordinary
 * locals (`i`/`j`/`k`) here; `B()`'s own use of their possibly-stale
 * post-`A()` values is `B()`'s concern, not modeled by rt port.
 */
export function subsystemEntityAAlert(rt: LegacyRuntimeState, id: number): void {
  const dense = rt.denseState;
  const { packedBytes, packedOffsets, saveOffsets } = rt;
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

  dense[2222 + id] = packedBytes[
    (packedOffsets[T_TYPE_JOB] ?? 0) + (dense[UNIT_JOB_TYPE + id] ?? 0)
  ] ?? 0;

  for (let i = 0; i < 4; i += 1) {
    dense[(saveOffsets[23 + i] ?? 0) + id] = 9 + (i >> 1);
  }

  for (let i = 2; i >= 0; i -= 1) {
    for (let j = 25; j <= 26; j += 1) {
      const slotType = dense[(saveOffsets[j] ?? 0) + id] ?? 0;
      const lhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + slotType] ?? 0] ?? 0) + id] ?? 0;
      const rhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + i] ?? 0] ?? 0) + id] ?? 0;
      if (lhs <= rhs) {
        for (let k = 26; k > j; k -= 1) {
          dense[(saveOffsets[k] ?? 0) + id] = dense[(saveOffsets[k - 1] ?? 0) + id] ?? 0;
        }
        dense[(saveOffsets[j] ?? 0) + id] = i;
        break;
      }
    }
  }

  dense[1818 + id] = clamp(dense[1818 + id] ?? 0, 3 + Math.trunc((dense[UNIT_RANGED_SKILL + id] ?? 0) / 2), 7);
  dense[UNIT_VISION + id] = clamp(dense[UNIT_VISION + id] ?? 0, (dense[1818 + id] ?? 0) + 1, 9);

  for (let i = 3; i < 9; i += 1) {
    for (let j = 23; j <= 24; j += 1) {
      const slotType = dense[(saveOffsets[j] ?? 0) + id] ?? 0;
      const lhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + slotType] ?? 0] ?? 0) + id] ?? 0;
      const rhs = dense[(saveOffsets[packedBytes[(packedOffsets[107] ?? 0) + i] ?? 0] ?? 0) + id] ?? 0;
      if (lhs >= rhs) continue;
      if (i === (dense[2525 + id] ?? 0) || i === (dense[2626 + id] ?? 0)) break;
      const valE = packedBytes[(packedOffsets[108] ?? 0) + i] ?? 0;
      const valF = dense[2222 + id] ?? 0;
      const cmpVal = valF < 8 && valF > 0 ? 7 : valF;
      if (valE === cmpVal) break;
      for (let k = 24; k > j; k -= 1) {
        dense[(saveOffsets[k] ?? 0) + id] = dense[(saveOffsets[k - 1] ?? 0) + id] ?? 0;
      }
      dense[(saveOffsets[j] ?? 0) + id] = i;
      break;
    }
  }

  for (let j = 23; j <= 26; j += 1) {
    const off = (saveOffsets[j] ?? 0) + id;
    const valG = dense[off] ?? 0;
    dense[off] = valG > 8 ? -1 : (packedBytes[(packedOffsets[108] ?? 0) + valG] ?? 0);
  }
}

/** Exact b() offset-0 entry gate; frame/id/team are kept explicit to avoid Q-field aliasing. */
export function subsystemBEntryGate(rt: LegacyRuntimeState, frame: number, id: number, team: number): boolean {
  return legacySubsystemBEntryGate({ frame, id, team, state: rt.denseState });
}

/** Exact b() offsets 59..253 prefix; the private m()/o() calls remain callback seams. */
export function subsystemBActivityPrefix(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBActivityPrefixInput, "state">,
): ReturnType<typeof stepLegacySubsystemBActivityPrefix> {
  return stepLegacySubsystemBActivityPrefix({ ...fields, state: rt.denseState });
}

/** Exact b() dispatch at 533..614; n()/an() remain injectable callbacks. */
export function subsystemBActionSelector(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBActionSelectorInput, "state">,
): void {
  selectLegacySubsystemBAction({ ...fields, state: rt.denseState });
}

/** Exact b() tail gate through p(); cell and occupancy lookups remain callbacks. */
export function subsystemBFinalPrefix(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBFinalPrefixInput, "state">,
): void {
  stepLegacySubsystemBFinalPrefix({ ...fields, state: rt.denseState });
}

/** Compose the currently ported b() segments in original bytecode order. */
export function subsystemB(rt: LegacyRuntimeState, 
  fields: Omit<LegacySubsystemBInput, "state" | "packedBytes" | "packedOffsets">,
): boolean {
  return stepLegacySubsystemB({
    ...fields,
    state: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** b.n() (LegacySubsystemVoidN.ts): rebuild the per-team zone lists. */
export function runSubsystemN(rt: LegacyRuntimeState): void {
  stepLegacySubsystemVoidN({
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    saveOffsets: rt.saveOffsets,
    gridC: rt.gridC,
    arrays: rt.subsystemArrays,
  });
}

/** Exact b.j() post-load counter/table reconstruction. */
export function runSubsystemJ(rt: LegacyRuntimeState, q = rt.game.mission, c = rt.game.missionFrame): void {
  const table113 = rt.packedOffsets[T_BUILDING_MAX_LEVEL] + (q < 4 ? 0 : q === 4 ? 12 : 24);
  for (let index = 0; index < 12; index += 1) {
    rt.mainArrays.f[index] = rt.packedBytes[table113 + index] ?? 0;
  }
  rt.subsystemArrays.bJCursor = 0;
  if (q > 4) return;

  const rangeBase = rt.packedOffsets[T_UPGRADE_UNLOCK_RANGE] + q;
  let cursor = rt.packedBytes[rangeBase] ?? 0;
  const end = rt.packedBytes[rangeBase + 1] ?? cursor;
  while (cursor < end) {
    const threshold = rt.packedBytes[rt.packedOffsets[T_UPGRADE_UNLOCK_TIME] + cursor] ?? 0;
    if (c >= threshold * 100) {
      const index = rt.packedBytes[rt.packedOffsets[T_UPGRADE_UNLOCK_KIND] + cursor] ?? -1;
      if (index >= 0 && index < rt.mainArrays.f.length) {
        rt.mainArrays.f[index] = (rt.mainArrays.f[index] + 1) & 0xff;
      }
    } else {
      break;
    }
    cursor += 1;
  }
  rt.subsystemArrays.bJCursor = cursor;
}

export function stepSubsystemStateCommand(rt: LegacyRuntimeState, value: number): void {
  // stateCommandState is live (see its docblock): no copy in or out.
  const state = rt.stateCommandState;

  rt.stepStateTransitionCommand({
    state,
    // BUG FIX (2026-08-31): `i()` (#610) is `b(int)`'s own unconditional
    // first instruction (offset 0..1 of every call, positive or negative
    // arg) -- was never wired on rt call path at all (only the
    // now-dead `runSceneDispatch` called `resetLegacyZI` directly).
    onReset: () => resetLegacyZI(rt.game),
    onS: () => {
      rt.stepStateS({
        state,
        aFlags: rt.game.selectionFlags,
        onAJ: () => {
          const ajState = {
            uFlag: rt.game.boxSelecting, F: rt.game.selectionGroup, k: rt.game.kByte,
            E: rt.game.ECounter, D: rt.game.DCounter, C: rt.game.CCounter, B: rt.game.BCounter,
          };
          stepLegacyAj(ajState);
          rt.game.boxSelecting = ajState.uFlag;
          rt.game.selectionGroup = ajState.F;
          rt.game.kByte = ajState.k;
          rt.game.ECounter = ajState.E;
          rt.game.DCounter = ajState.D;
          rt.game.CCounter = ajState.C;
          rt.game.BCounter = ajState.B;
        },
        onInputReset: () => rt.stepLegacySceneAnimatedSlotClear(),
        onCSelector: (value) => rt.selectResourceSection(value),
        // f.O() (~142 lines), called when aP:I===1. UNIFICATION (2026-08-31):
        // previously left unwired here (deferred, matching a note that
        // rt call path's traced args never hit aP===1) while the
        // now-deleted duplicate `stepLegacyS`/`runSceneDispatch` DID wire
        // it (`stepLegacyO`, already fully ported and used elsewhere by
        // the "K"/"M" handlers' own onO). Wiring it here too now that rt
        // is the ONLY S() path any caller reaches, positive or negative.
        onO: () => rt.stepLegacyO(),
        onSelectionSync: (first, second, third, fourth) => rt.runSelectionFlagsRefresh(first, second, third, fourth),
      });
    },
    onT: () => {
      // T()'s aw/q/bF are live fields (game.levelAwByte/qByte and b.f:B,
      // game.subsystemGFFlagByte). MERGED 2026-09-23: b.f:B -- the
      // mission-script step -- had three unsynced copies (rt one was
      // game.subsystemFByte; U()/ak()/al()/the save record used
      // subsystemArrays.bFByte), so the script read one and advanced
      // another.
      //
      // BUG FIX (2026-08-31): aw/q/bF used to be a plain copy-in/copy-out
      // snapshot (read from game.* before stepStateT ran, written back to
      // game.* only after it returned). Real bytecode `putfield`s write
      // the instance field immediately, so if a LATER call in the same
      // branch throws (e.g. ai===48's onMapLoad -- loadMap() genuinely
      // throws when no /ma resource is attached), the real game still
      // keeps every field write that happened before the throw; the
      // batched copy-out lost all of them. Surfaced by
      // verify-scene-dispatch-branches.mjs's ai===48 case once rt
      // became the ONLY T() path (previously masked because the deleted
      // duplicate `stepLegacyTAi48` wrote game.* directly with no
      // batching). Fixed by making aw/q/bF live accessors straight onto
      // game.* instead of a snapshot -- each write is now visible
      // immediately, matching bytecode field-mutation semantics exactly.
      const runtime = rt;
      const tState = {
        ai: state.ai,
        get aw() { return runtime.game.levelAwByte; },
        set aw(value: number) { runtime.game.levelAwByte = value; },
        get q() { return runtime.game.mission; },
        set q(value: number) { runtime.game.mission = value; },
        get bF() { return runtime.game.subsystemGFFlagByte; },
        set bF(value: number) { runtime.game.subsystemGFFlagByte = value; },
        p: state.p,
      };
      // Live q:B matters here: T() sets q (offsets 480/502) before its
      // placements (bug fixed 2026-08-31, now covered by the shared getters).
      const placementOptions = rt.buildingPlacementOptions();
      rt.stepStateT({
        state: tState,
        onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
        onSubsystemL: () => rt.stepLegacyBL(),
        onSubsystemM: () => rt.stepLegacyBM(),
        onRecordCommand: (first, second, third) => rt.stepLegacyD3(first, second, third),
        onEntityCreate: (team, x, y, type, flags) => {
          rt.allocateRecord(rt.gridC, team, x, y, type, flags, rt.recordOptions());
        },
        // NOTE (2026-08-25, resolved 2026-08-31): rt rebuilds live
        // aw/q on every onBCreate call rather than snapshotting one
        // `batchOptions` up front. Confirmed via bytecode (f-javap.txt
        // offsets 131..259, T()'s ai===37 branch) that aw:B is mutated
        // BETWEEN the b.a(IIIBB) invocations and each call reads b's own
        // live field state, so a stale single snapshot would be wrong.
        // The duplicate hand-written T() port (stepLegacyTAi37/38/48,
        // which DID snapshot once) has since been deleted -- rt is now
        // the only implementation, and it uses the confirmed-correct
        // live-rebuild approach.
        onBCreate: (count, x, y, type, value) => {
          try {
            rt.batchAllocate(count, x, y, type, value);
          } catch { /* f.ak() catches rt, matching the original */ }
        },
        onPlace: (team, type, x, y, flags, special, existingId) => {
          rt.placeEntity(rt.gridC, team, type, x, y, flags, special, existingId, placementOptions);
        },
        onMapReset: (q) => { rt.resetMapEntryAllocation(q); },
        onMapLoad: (q) => { rt.loadMap(q); },
        onResourceReset: () => {
          try { stepLegacyClassCReset(rt.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
        },
        // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
        // already-wired helper stepLegacySubsystemH's own onSubsystemRecord
        // uses.
        onSubsystemRecordAllocate: (first, x, y, counterIndex) => {
          rt.allocateSubsystemRecord(rt.gridC, first, x, y, counterIndex, {
            randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
            counters: rt.game.subsystemT,
            q: rt.game.mission,
          });
        },
      });
      // No write-back needed: aw/q/bF above are now live game.* accessors.
    },
    onU: () => {
      rt.stepStateU({
        state,
        frame: rt.game.missionFrame,
        // Wired 2026-09-27: ai == 26 runs f.c() (offset 22) and ai == 28
        // clears one b.d:[S entry (offset 105).
        onMapSession: () => rt.stepLegacyC(),
        onShortWrite: (index, value) => { rt.subsystemArrays.dShort[index] = value; },
        onScriptTimer: (value) => { rt.subsystemArrays.bField16 = value; },
        // BUG FIX (2026-09-04): U()'s very first bytecode instruction
        // (f-javap.txt offset 0..4, before any of its selector branches)
        // is `rt.a.d()` -- a full b.d() spatial pass -- but rt
        // callback was entirely missing from rt call site (LegacyStateU
        // .ts's `onSubsystemReset?.()` silently no-op'd every call). b.d()
        // is the ONLY place in the whole game that ever writes the
        // fog/vision bitmap (`mainArrays.aInt`, f.a:[[[I) for team-0
        // units/buildings -- with rt never wired, occupancyClass() read
        // 2 (fully unexplored) for every tile on every map, forever,
        // which blocks every entity-branch sprite draw in
        // LegacyGameplayCellLoop.ts (positive branch requires
        // occupancyClass===0; the negative branch's and tail's own first
        // gates both no-op when occupancyClass>=2). Wired to
        // `runSpatialPass`, whose default `onPrimarySpatialUpdate` now
        // targets the real `mainArrays.aInt` (see that field's own
        // docblock for the `intLayers` alias bug fixed alongside rt).
        // FOLLOW-UP (2026-09-04): rt U()-entry call is a one-shot; the
        // per-frame producer is b.s()'s `(f.c & 3) === 0` -> b.d(), which
        // was still unwired at the `runSubsystemPrepass` call site until
        // the fix recorded there. `onRectSpatialUpdate` (the building-
        // footprint half) is wired too now -- b.a(IIII) shares b.d(III)
        // with b.a(III), so it marks the same layer.
        onSubsystemReset: () => rt.runSpatialPass({}),
        // Offset 43: `ao == 9` -> b.f(), the end-of-event party restore.
        onSpecialGuard: () => restoreLegacyAuxiliary({
          dense: rt.denseState,
          shortRows: rt.mainArrays.aShort,
          auxiliaryRows: rt.subsystemArrays.eRows,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          saveOffsets: rt.saveOffsets,
        }, rt.auxiliaryQueueState),
        onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
        // U()'s advance branch sets Q = 28 and calls f.b(ai) at once; the
        // live bag makes that write visible to the recursive call.
        onB: (next) => rt.stepSubsystemStateCommand(next),
        onRecordCommand: (first, second, third) => rt.stepLegacyD3(first, second, third),
        onResourceReset: () => {
          try { stepLegacyClassCReset(rt.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
        },
        onViewportNormalize: () => rt.normalizeEntityViewport(),
        onSelectionFlags: (flags) => {
          rt.runSelectionFlagsRefresh(
            flags[0] ?? false, flags[1] ?? false, flags[2] ?? false, flags[3] ?? false,
            flags[4] ?? false, flags[5] ?? false, flags[6] ?? false, flags[7] ?? false, flags[8] ?? false,
          );
        },
      });
    },
    onRecordAction: (first, second) => rt.stepEntityCoordinateUpdate(first, second),
  }, value);

}
