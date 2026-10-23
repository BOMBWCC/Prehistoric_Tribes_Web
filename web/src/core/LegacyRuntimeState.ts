import { hdArt } from "../render/HdArt";
import type { AnchorValue } from "../platform/anchors";
import type { DrawableImage } from "../platform/Image";
import { stepLegacySubsystemEntityRevertIdle } from "../sim/tribe/LegacySubsystemEntityRevertIdle";
import type { PackedData } from "../platform/PackedData";
import type { DelimitedTable } from "../platform/DelimitedResource";
import { EntityBank, F_E_LENGTH } from "../platform/EntityBank";
import { LegacyRenderTargets } from "../render/LegacyRenderTargets";
import { LegacyGameState } from "./LegacyGameState";
import { stepLegacyGameplayTick } from "./LegacyGameplayTick";
import { stepLegacyGameplayInput } from "../ui/LegacyGameplayInput";
import { stepLegacyGameplayCommand } from "../ui/LegacyGameplayCommand";
import type { ImagePack } from "../platform/ImagePack";
import type { Graphics } from "../platform/Graphics";
import { LegacyResourceTables, selectLegacyResourceSection, stepLegacyClassCReset } from "../platform/LegacyResourceTables";
import { LegacyGeometryDecoder } from "../text/LegacyGeometryDecoder";
import { LegacyGeometryRenderer } from "../text/LegacyGeometryRenderer";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "../text/LegacyZGeometryBridge";
import { composeLegacyC, emitLegacyCRenderRow, type LegacyCRenderExtras, type LegacyCCompositionState, type LegacyCDrawCommand, type LegacyCZh } from "../text/LegacyCComposition";
import { scanLegacyZElementPrefix, type LegacyZElementScanCallbacks, type LegacyZElementScanState } from "../render/LegacyZElementScan";
import { stepLegacyZKText, type LegacyZKTextCallbacks, type LegacyZKTextState } from "../text/LegacyZKText";
import { stepLegacyZKind3, type LegacyZKind3Callbacks, type LegacyZKind3State } from "../render/LegacyZKind3";
import { stepLegacyZKind4, type LegacyZKind4Callbacks, type LegacyZKind4State } from "../render/LegacyZKind4";
import { stepLegacyZKind2, type LegacyZKind2State } from "../render/LegacyZKind2";
import { stepLegacyZSubrecordDraw, type LegacyZSubrecordDrawCallbacks } from "../render/LegacyZSubrecordDraw";
import { drawLegacyPackedSpritePrimitive, type LegacyPackedSpritePrimitiveCallbacks } from "../render/LegacyPackedSpritePrimitive";
import { LegacyInputState } from "./LegacyInputState";
import { LegacyMainArrays } from "./LegacyMainArrays";
import { LegacySubsystemArrays } from "./LegacySubsystemArrays";
import { runLegacySpatialPass, type LegacySpatialPassInput } from "../sim/world/LegacyBSpatialPass";
import { decodeLegacyMapTiles, type LegacyRawMap } from "../sim/world/LegacyMapRleDecoder";
import type { AResourceDiagnostic, AResourcePrefixReplay, MaResource } from "../platform/BinaryResource";
import { applyLegacyMapNeighborPass, buildLegacyMapOverlay, type LegacyMapOverlay } from "../render/LegacyMapOverlay";
import { projectLegacyMapGrids } from "../render/LegacyMapGridProjection";
import { allocateLegacySpecialTile, type LegacySpecialTile } from "../sim/world/LegacySpecialTileAllocator";
import { legacyOccupancyClass } from "../sim/world/LegacyOccupancyClass";
import { legacyEntityPartition } from "../sim/world/LegacyEntityPartition";
import { drawLegacyMapOverview, stepLegacyMapOverviewScroll, type LegacyMapOverviewInput } from "../render/LegacyMapOverview";
import { stepLegacyEntityGPrefix } from "../sim/units/LegacyEntityGPrefix";
import { stepLegacyEntityHPrefix } from "../sim/units/LegacyEntityHPrefix";
import { stepLegacyEntityHActionBranch } from "../sim/units/LegacyEntityHActionBranch";
import { stepLegacyD as stepLegacyFD } from "../ui/LegacyFrameProgressionScan";
import { LegacyRandom, legacyRandomRemainder } from "../platform/LegacyRandom";
import { OriginalMidiPlayer, type MidiResource } from "../platform/Audio";
import { applyLegacyTerrainAdjustment } from "../sim/world/LegacyTerrainAdjustment";
import { LegacyProgressStore } from "../save/LegacyProgressStore";
import type { RmsGameplayRecord, SparseLocationGroup } from "../save/RmsGameplayRecord";
import { acceptLegacyNumericValue, type LegacyNumericSequenceState } from "./LegacyNumericSequence";
import { allocateLegacyRecord, type LegacyRecordAllocatorInput } from "../sim/world/LegacyRecordAllocator";
import { runLegacyL, runLegacyM } from "../sim/tribe/LegacySubsystemLifecycle";
import { stepLegacyEntityBatchAllocate } from "../sim/units/LegacyEntityBatchAllocate";
import { stepLegacyFrame, type LegacyFrameStepInput } from "./LegacyFrameStep";
import { stepLegacyFrameDispatch, type LegacyFrameDispatchInput } from "../ui/LegacyFrameDispatch";
import { stepLegacyGFrame } from "../ui/LegacyGFrame";
import { LegacyOffscreenTargets } from "../render/LegacyOffscreenTargets";
import { LegacyPackedSpriteRenderer } from "../render/LegacyPackedSpriteRenderer";
import { drawLegacy1137Composition } from "../render/Legacy1137Composition";
import { ZH_LANGUAGE, ZH_LANGUAGE_NAME, ZhPainter, ZhStrings, paintZhLine, tokenizeZh, tokensWidth, wrapZh, type ZhPaint, type ZhToken, type ZhTranslationFile } from "../text/LegacyZhText";
import { prepareLegacyImageHelperInvocation } from "../render/LegacyImageHelperInvocation";
import { drawLegacyFrameCommand } from "../render/LegacyFrameCommandDraw";
import { stepLegacyFrameCommandChanged, type LegacyZAdChangeState } from "../ui/LegacyFrameCommandChanged";
import { applyLegacyFrameGeometry, deriveLegacyFrameLayout } from "../render/LegacyFrameLayout";
import { stepLegacyZTransition } from "../ui/LegacyZTransition";
import { stepLegacyZAi } from "../ui/LegacyZAi";
import { stepLegacyZAh } from "../ui/LegacyZAh";
import { stepLegacyZAj } from "../ui/LegacyZAj";
import { stepLegacyZAe } from "../ui/LegacyZAe";
import { stepLegacyZAf } from "../ui/LegacyZAf";
import { resetLegacyZI } from "../ui/LegacyZI";
import { stepLegacyZAb } from "../ui/LegacyZAb";
import { stepLegacyZAc } from "../ui/LegacyZAc";
import { stepLegacyZAd } from "../ui/LegacyZAd";
import { stepLegacyZAa } from "../ui/LegacyZAa";
import { drawLegacy1010 } from "../render/Legacy1010Renderer";
import { LEGACY_DEFAULT_MAP_VIEWPORT, renderLegacyMap, type LegacyMapRedrawRange, type LegacyMapViewport, type LegacyRenderableMap } from "../render/LegacyMapRenderer";
import { runLegacyProjectionLifecycle, type LegacyProjectionLifecycleInput } from "../render/LegacyProjectionLifecycle";
import { consumeLegacyZCommand, type LegacyZCommandConsumerCallbacks } from "../ui/LegacyZCommandConsumer";
import { dispatchLegacyZ, type LegacyZDispatchCallbacks } from "../ui/LegacyZDispatch";
import { stepLegacySimpleFrameHandler, type LegacySimpleFrameState } from "../ui/LegacySimpleFrameHandlers";
import { stepLegacyP, type LegacyPState } from "../render/LegacyGameplayPaintTriggers";
import { stepLegacyCameraFollow, type LegacyCameraFollowState } from "../render/LegacyCameraFollow";
import { stepLegacyCameraScroll, type LegacyCameraScrollState, type LegacyCameraScrollViewport } from "../render/LegacyCameraScroll";
import { stepLegacyCameraLetterbox, stepLegacyCameraCursor, classifyLegacyCameraCell, type LegacyCameraFrameLetterboxState, type LegacyCameraFrameCursorState } from "../render/LegacyCameraFrame";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122, isLegacyMarkerIdInRangeMinus110to61 } from "../render/LegacyEntityClassifiers";
import { stepLegacyGameplayOuterLoop, type LegacyGameplayOuterLoopViewport, type LegacyGameplayOuterLoopState } from "../render/LegacyGameplayOuterLoop";
import { stepLegacyAnimatedSlotScan } from "../render/LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan, isLegacyWithinViewport, enqueueLegacyEffectSlot } from "../render/LegacyEffectSlotScan";
import { stepLegacyCRect } from "../render/LegacyEffectRectMark";
import { dispatchLegacyGameplayCellBody, type LegacyGameplayCellBodyState } from "../render/LegacyGameplayCellBodyDispatch";
import { markLegacyEntityFootprint, LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, type LegacyEntityFootprintMarkState } from "../sim/units/LegacyEntityFootprintMark";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch } from "../render/LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "../render/LegacyMapMarkerDetail";
import { stepLegacyEntityAction, type LegacyEntityActionState } from "../render/LegacyEntityAction";
import { stepLegacyGameplayFramePrep, type LegacyGameplayFramePrepState } from "../render/LegacyGameplayFramePrep";
import { stepLegacySecondaryCellChain, type LegacySecondaryCellChainState } from "../render/LegacySecondaryCellChain";
import { decayLegacyMapMarkerDenseState, stepLegacyMapMarkerScan, type LegacyMapMarkerScanState } from "../render/LegacyMapMarkerScan";
import { stepLegacyMFrame, type LegacyMFrameCommand, type LegacyMFrameState } from "../ui/LegacyMFrame";
import { legacySubsystemDecision } from "../sim/tribe/LegacySubsystemDecision";
import { setLegacyEntityMode, type LegacyEntityModeInput } from "../sim/units/LegacyEntityMode";
import { canPlaceLegacyFootprint } from "../sim/world/LegacyFootprintCheck";
import { allocateLegacySubsystemRecord, type LegacySubsystemRecordInput } from "../sim/tribe/LegacySubsystemRecord";
import {
  selectLegacyAuxiliaryCandidates,
  refreshLegacyAuxiliaryTag, restoreLegacyAuxiliary,
  type LegacyAuxiliaryQueueState,
} from "../sim/world/LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "../sim/units/LegacyEntityIUpdate";
import { writeLegacyEntityLinkByte } from "../sim/units/LegacyEntityLinkByte";
import { placeLegacyAuxiliary } from "../sim/world/LegacyAuxiliaryPlacement";
import { placeLegacyEntity, type LegacyEntityPlacementInput } from "../sim/units/LegacyEntityPlacement";
import { stepLegacyZL, type LegacyZLState } from "../ui/LegacyZL";
import { selectLegacyEntityUpdateCandidates, type LegacyEntityUpdateSelectionInput } from "../sim/units/LegacyEntityUpdateSelection";
import { cleanupLegacyEntityUpdate, type LegacyEntityUpdateCleanupInput } from "../sim/units/LegacyEntityUpdateCleanup";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "../sim/tribe/LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "../sim/tribe/LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "../sim/tribe/LegacySubsystemTail";
import { stepLegacySubsystemBuildingEconomy, type LegacyBuildingScratch } from "../sim/tribe/LegacySubsystemBuildingEconomy";
import { stepLegacySubsystemAa } from "../sim/tribe/LegacySubsystemAa";
import { stepLegacySubsystemAb } from "../sim/tribe/LegacySubsystemAb";
import { stepLegacySubsystemAe } from "../sim/tribe/LegacySubsystemAe";
import { stepLegacySubsystemWorkerDispatch } from "../sim/tribe/LegacySubsystemWorkerDispatch";
import { stepLegacyEntityWorkDeposit } from "../sim/units/LegacyEntityWorkDeposit";
import { stepLegacyEntityModeSelect } from "../sim/units/LegacyEntityModeSelect";
import { stepLegacyEntityIFinalize } from "../sim/units/LegacyEntityIFinalize";
import { stepLegacyEntityKPredicate } from "../sim/units/LegacyEntityKPredicate";
import { stepLegacyEntityVacate } from "../sim/units/LegacyEntityVacate";
import { stepLegacyEntityHealthDelta } from "../sim/units/LegacyEntityHealthDelta";
import { releaseLegacyEntityHome, stepLegacyEntityDeathCleanup } from "../sim/units/LegacyEntityDeathCleanup";
import { checkLegacyEntityAffordable, stepLegacyEntityPayCost } from "../sim/units/LegacyEntityResourceCost";
import { stepLegacyEntitySkillGain, stepLegacyEntitySlotSkillGain } from "../sim/units/LegacyEntitySkillGain";
import { stepLegacyEntityCourtship } from "../sim/units/LegacyEntityCourtship";
import { stepLegacyEntityMUpdate } from "../sim/units/LegacyEntityMUpdate";
import { stepLegacySubsystemTrainingCount } from "../sim/tribe/LegacySubsystemTrainingCount";
import { stepLegacySubsystemTrainingComplete } from "../sim/tribe/LegacySubsystemTrainingComplete";
import { stepLegacySubsystemVoidN } from "../sim/tribe/LegacySubsystemVoidN";
import { stepLegacySubsystemAq } from "../sim/tribe/LegacySubsystemAq";
import { stepLegacySubsystemAr } from "../sim/tribe/LegacySubsystemAr";
import { stepLegacySubsystemAs } from "../sim/tribe/LegacySubsystemAs";
import { stepLegacySubsystemAv } from "../sim/tribe/LegacySubsystemAv";
import { stepLegacySubsystemAw } from "../sim/tribe/LegacySubsystemAw";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "../sim/tribe/LegacySubsystemAt";
import { stepLegacySubsystemLowerO } from "../sim/tribe/LegacySubsystemLowerO";
import { stepLegacySubsystemEntityOccupancyCheck } from "../sim/tribe/LegacySubsystemEntityOccupancyCheck";
import { stepLegacySubsystemNearestBuilding } from "../sim/tribe/LegacySubsystemNearestBuilding";
import { stepLegacySubsystemBM } from "../sim/tribe/LegacySubsystemBM";
import { stepLegacySubsystemAk } from "../sim/tribe/LegacySubsystemAk";
import { stepLegacySubsystemAl } from "../sim/tribe/LegacySubsystemAl";
import { stepLegacySubsystemH } from "../sim/tribe/LegacySubsystemH";
import { legacySubsystemNGate } from "../sim/tribe/LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "../sim/tribe/LegacySubsystemNDecision";
import { stepLegacySubsystemNOrchestrator, type LegacySubsystemNOrchestratorInput } from "../sim/tribe/LegacySubsystemNOrchestrator";
import { stepLegacySubsystemBDecision, type LegacySubsystemBDecisionInput } from "../sim/tribe/LegacySubsystemBDecision";
import { checkLegacyResourceNodeGate } from "../sim/world/LegacyResourceNodeGate";
import { stepLegacyEntityOccupantCare } from "../sim/units/LegacyEntityOccupantCare";
import { stepLegacyEntityRecordDoorRetarget } from "../sim/units/LegacyEntityRecordDoorRetarget";
import { stepLegacyEntityAo, stepLegacyEntityAp, stepLegacyEntityRecordRecovery } from "../sim/units/LegacyEntityRecordRecovery";
import { stepLegacySubsystemBBoolean } from "../sim/tribe/LegacySubsystemBBoolean";
import { legacySubsystemBEntryGate } from "../sim/tribe/LegacySubsystemBEntryGate";
import { stepLegacySubsystemBActivityPrefix, type LegacySubsystemBActivityPrefixInput } from "../sim/tribe/LegacySubsystemBActivityPrefix";
import { selectLegacySubsystemBAction, type LegacySubsystemBActionSelectorInput } from "../sim/tribe/LegacySubsystemBActionSelector";
import { stepLegacySubsystemBFinalPrefix, type LegacySubsystemBFinalPrefixInput } from "../sim/tribe/LegacySubsystemBFinalPrefix";
import { stepLegacySubsystemB, type LegacySubsystemBInput } from "../sim/tribe/LegacySubsystemBOrchestrator";
import { stepLegacySubsystemAj } from "../sim/tribe/LegacySubsystemAj";
import { stepLegacySubsystemAm } from "../sim/tribe/LegacySubsystemAm";
import { stepLegacySubsystemN } from "../sim/tribe/LegacySubsystemN";
import { stepLegacySubsystemBBoolean2 } from "../sim/tribe/LegacySubsystemBBoolean2";
import { stepLegacyEntityMarkerCommit } from "../sim/units/LegacyEntityMarkerCommit";
import { stepLegacyEntityStrikeGate } from "../sim/units/LegacyEntityStrikeGate";
import { stepLegacyAnimalHitReaction } from "../sim/units/LegacyAnimalHitReaction";
import { stepLegacyAnimalRoam } from "../sim/units/LegacyAnimalRoam";
import { stepLegacyEntityEquipIssue } from "../sim/units/LegacyEntityEquipIssue";
import { stepLegacyEntityAbduction } from "../sim/units/LegacyEntityAbduction";
import { stepLegacyEntityProduceItem } from "../sim/units/LegacyEntityProduceItem";
import { stepLegacyEntitySelectionDrop } from "../ui/LegacyEntitySelectionDrop";
import { stepLegacyEntityScreenIndex } from "../sim/units/LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "../sim/units/LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "../sim/units/LegacyEntitySpotAlert";
import { stepLegacySubsystemEntityTypeReaction } from "../sim/tribe/LegacySubsystemEntityTypeReaction";
import { computeLegacySubsystemPairScore } from "../sim/tribe/LegacySubsystemScore";
import { stepLegacySubsystemEntityTransformC } from "../sim/tribe/LegacySubsystemEntityTransform";
import { stepLegacySubsystemClampBounds } from "../sim/tribe/LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup } from "../sim/tribe/LegacySubsystemNearbyMarkerLookup";
import { stepLegacySubsystemEntityUpdateTail } from "../sim/tribe/LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "../sim/tribe/LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "../sim/tribe/LegacySubsystemEntityDisplace";
import { stepLegacySubsystemEntityMoveCancel, stepLegacySubsystemRecordWorkerLevel } from "../sim/tribe/LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "../sim/tribe/LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "../sim/tribe/LegacySubsystemUnitTraining";
import { stepLegacySubsystemAf } from "../sim/tribe/LegacySubsystemAf";
import { stepLegacySubsystemAg } from "../sim/tribe/LegacySubsystemAg";
import { stepLegacySubsystemAh } from "../sim/tribe/LegacySubsystemAh";
import { stepLegacySubsystemAi } from "../sim/tribe/LegacySubsystemAi";
import { stepLegacyCursorHover } from "../ui/LegacyCursorHover";
import { stepLegacySubsystemEntityTrainingSlot } from "../sim/tribe/LegacySubsystemEntityTrainingSlot";
import { stepLegacySubsystemO } from "../sim/tribe/LegacySubsystemO";
import { dispatchLegacyEntityAction } from "../sim/units/LegacyEntityActionDispatch";
import { triggerLegacyEntityMove } from "../sim/units/LegacyEntityMoveTrigger";
import { stepLegacySubsystemT } from "../sim/tribe/LegacySubsystemT";
import { stepLegacySubsystemU } from "../sim/tribe/LegacySubsystemU";
import { stepLegacySubsystemV } from "../sim/tribe/LegacySubsystemV";
import { stepLegacySubsystemNPrivateO } from "../sim/tribe/LegacySubsystemNPrivateO";
import { stepLegacyEntityStatusGuard } from "../sim/units/LegacyEntityStatusGuard";
import { readLegacyEntityModeValue } from "../sim/units/LegacyEntityModeValue";
import { stepLegacyEntityTarget, type LegacyEntityTargetStepInput } from "../sim/units/LegacyEntityTargetStep";
import { stepLegacyEntityActionCommit } from "../sim/units/LegacyEntityActionCommit";
import { finalizeLegacyEntitySelection, releaseLegacyEntitySelection } from "../ui/LegacyEntitySelectionRelease";
import { stepLegacyEntityCoordinateUpdate } from "../ui/LegacyEntityCoordinateUpdate";
import { stepLegacyEntityCoreUpdate, type LegacyEntityCoreUpdateInput } from "../sim/units/LegacyEntityCoreUpdate";
import { stepLegacyEntityFollowup } from "../sim/units/LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "../sim/tribe/LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "../sim/tribe/LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityWUpdate, type LegacyEntityWUpdateInput } from "../sim/units/LegacyEntityWUpdate";
import { stepLegacyEntityCWatch } from "../sim/units/LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "../sim/units/LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "../sim/units/LegacyEntityOccupantCheck";
import { stepLegacySubsystemAn } from "../sim/tribe/LegacySubsystemAn";
import { checkLegacySpiralPlacementGate } from "../sim/world/LegacySpiralPlacementGate";
import { stepLegacySubsystemP } from "../sim/tribe/LegacySubsystemP";
import { stepLegacySubsystemBVoidO } from "../sim/tribe/LegacySubsystemBVoidO";
import { stepLegacySubsystemScore, type LegacySubsystemScoreInput } from "../sim/tribe/LegacySubsystemScore";
import { classifyLegacySubsystemB } from "../sim/tribe/LegacySubsystemBClassify";
import { syncLegacySubsystemBCoordinate } from "../sim/tribe/LegacySubsystemBCoordinateSync";
import { stepLegacyEntityRecordCancel } from "../sim/units/LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "../ui/LegacyZB2";
import { allocateLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlotEntity, releaseLegacySubsystemBEntitySlot } from "../sim/tribe/LegacySubsystemBTenSlot";
import { findLegacyNearestCandidate } from "../sim/world/LegacyNearestCandidateSearch";
import { checkLegacyCellCompatibility } from "../sim/world/LegacyCellCompatibilityCheck";
import { initializeLegacyEntityRecord, indexLegacyEntityRecord } from "../sim/world/LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "../sim/units/LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "../sim/units/LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "../sim/units/LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "../sim/units/LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "../sim/units/LegacyEntityESelection";
import { checkLegacyEntityRecord } from "../sim/units/LegacyEntityRecordCheck";
import { completeLegacyEntityRecord } from "../sim/units/LegacyEntityRecordCompletion";
import { stepLegacyEntityAssociationCleanup } from "../sim/units/LegacyEntityAssociationCleanup";
import { changeLegacyEntityType, stepLegacySubsystemC, type LegacyEntityTypeChangeInput } from "../sim/units/LegacyEntityTypeChange";
import { scanLegacyEntityTargets, type LegacyEntityTargetScanInput, type LegacyEntityTargetScanResult } from "../sim/units/LegacyEntityTargetScan";
import { promoteLegacyEntityMode, selectLegacyEntityTypeAfterQ } from "../sim/units/LegacyEntityModePromotion";
import { calculateLegacyEntityM, type LegacyEntityMCalculationInput } from "../sim/units/LegacyEntityMCalculation";
import { stepLegacySubsystemEntityTransform } from "../sim/tribe/LegacySubsystemEntityTransform";
import { clearLegacyEntityRecordTarget } from "../sim/units/LegacyEntityRecordTargetClear";
import { filterLegacyEntityLifecycle } from "../sim/units/LegacyEntityLifecycleFilter";
import { finalizeLegacyEntity } from "../sim/world/LegacyEntityFinalize";
import { transferLegacyEntityAction } from "../sim/units/LegacyEntityActionTransfer";
import { stepLegacyStateU, type LegacyStateUInput } from "../ui/LegacyStateU";
import { stepLegacyStateTransitionCommand, type LegacyStateTransitionCommandInput } from "../ui/LegacyStateTransitionCommand";
import { stepLegacyStateS, type LegacyStateSInput } from "../ui/LegacyStateS";
import { stepLegacyStateT, type LegacyStateTInput } from "../ui/LegacyStateT";
import { stepLegacyFPairCommand, type LegacyFPairCommandInput } from "../ui/LegacyFPairCommand";
import { markLegacySpatialRecord, markLegacySpatialRect } from "../sim/world/LegacySpatialRecordUpdate";
import { stepLegacySpriteLayerLoop } from "../render/LegacySpriteLayerLoop";
import { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } from "../render/LegacySpriteLayerPredicates";
import { stepLegacyEntityOverlayDraw } from "../render/LegacyEntityOverlayDraw";
import { drawLegacyCScan } from "../text/LegacyCScanDraw";
import { applyLegacyAuxiliaryModeWrites, type LegacyAuxiliaryModeWriteResult } from "../sim/world/LegacyAuxiliaryModeWrites";
import { stepLegacyAuxiliaryModes67, type LegacyAuxiliaryModes67Input } from "../sim/world/LegacyAuxiliaryModes67";
import { stepLegacyAuxiliaryMode4 } from "../sim/world/LegacyAuxiliaryMode4";
import { stepLegacySubsystemOLower } from "../sim/tribe/LegacySubsystemOLower";
import { legacyPathCellPredicate } from "../sim/world/LegacyPathCellPredicate";
import { prepareLegacyPath, type LegacyPathPreparationInput } from "../sim/world/LegacyPathPreparation";
import { setLegacyPathDirection, type LegacyPathDirectionState } from "../sim/world/LegacyPathDirection";
import { stepLegacyPathE, type LegacyPathEInput } from "../sim/world/LegacyPathE";
import { stepLegacyByteActionQueue } from "../ui/LegacyByteActionQueue";
import { stepLegacySelectionFlags } from "../ui/LegacySelectionFlags";
import { beginLegacyEntityAction, stepLegacyAk, stepLegacyAl, stepLegacyAm, stepLegacyAn, stepLegacyAo, stepLegacyAp, stepLegacyAq, stepLegacyAr, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv, stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA, stepLegacyAd, stepLegacyAB, stepLegacyAC, stepLegacyAe, stepLegacyAi, stepLegacyAf, stepLegacyAg, stepLegacyAh, stepLegacyAj, stepLegacyAKViewport, stepLegacyAL, resetLegacyAM, stepLegacyAOMap, stepLegacyMapEntry, stepLegacyAPPrefix, stepLegacyAQAudio, stepLegacyASAudioWait, type LegacyAkCallbacks, type LegacyAmInput, type LegacyAnInput, type LegacyAoInput, type LegacyAoState, type LegacyApInput, type LegacyApState, type LegacyAqState, type LegacyArInput, type LegacyAuInput, type LegacyAwState, type LegacyAdInput, type LegacyAbInput, type LegacyAcInput, type LegacyAbState, type LegacyAcState, type LegacyAeInput, type LegacyAeState, type LegacyAiInput, type LegacyAfState, type LegacyGroupKeyState, type LegacyAjState, type LegacyAKViewportState, type LegacyALState, type LegacyAmResetInput, type LegacyAOMapInput, type LegacyAOMapState, type LegacyAPPrefixInput, type LegacyAQAudioInput, type LegacyAdState, type LegacyAnState, type LegacyMapEntryCallbacks } from "../ui/LegacyStateMachine";
import { ANIMAL_HP, ANIMAL_KIND, ANIMAL_X, ANIMAL_Y, BLD_HP, BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y, RES_KIND, RES_X, RES_Y, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HAPPINESS, UNIT_HELD_ITEM, UNIT_HP, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SLOT, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "./DenseLayout";
import { runSubsystemEntityLoop, runSubsystemJ, runSubsystemN, runSubsystemPrepass, stepSubsystemAnFor, stepSubsystemFrame, stepSubsystemN, stepSubsystemOLower, stepSubsystemP, stepSubsystemStateCommand, subsystemB, subsystemBActionSelector, subsystemBActivityPrefix, subsystemBBoolean, subsystemBC, subsystemBDecision, subsystemBEntryGate, subsystemBFinalPrefix, subsystemBTeamSweep, subsystemBVoid, subsystemD, subsystemDecision, subsystemEntityAAlert, subsystemEntityJTrigger, subsystemEntityLoopTail, subsystemEntityTransform, subsystemG, subsystemH, subsystemK, subsystemMarkerRescan, subsystemMarkerScan, subsystemNDecision, subsystemNGate, subsystemNOrchestrator, subsystemPrivateO, subsystemRecordRecovery, subsystemT, subsystemTeamOneAiMuster, subsystemTenSlotAllocate, subsystemTenSlotRelease, subsystemTenSlotReleaseEntity, subsystemU, subsystemUnitTraining } from "../sim/tribe/TribeRuntime";
import { changeEntityType, entityActionPrompt, entityAp, entityCourtship, entityDeathCleanup, entityHealthDelta, entityModeValue, entityMove, entityMoveCancel, entityPartition, entityProduceItem, entityRecordLifecycleInput, entityStrikeGate, entityTypeReaction, finalizeEntity, gainEntitySkill, gainEntitySlotSkills, placeEntity, selectEntityTypeAfterQ, selectEntityUpdateCandidates, stepEntityAction, stepEntityActionConfirmation, stepEntityCoordinateUpdate, stepEntityCoreUpdate, stepEntityDecisionCheck, stepEntityIUpdate, stepEntityKPredicate, stepEntityRemoval, stepEntityTarget, stepEntityWUpdate } from "../sim/units/UnitRuntime";
import { drawFrameCommandPrimitive, drawImageHelper, drawMapMarker, drawPackedComposite, drawPackedSpritePrimitive, renderCRow, renderGameplayTo, renderMap, stepCameraCursor, stepCameraFollow, stepCameraFrame, stepCameraScroll, stepGameplayFramePrep, stepGameplayOuterLoop, stepGameplayPaintComposite, stepGameplayPaintHud, stepLegacyC2, stepZSubrecordDraw } from "../render/RenderRuntime";
import { acceptNumericSequence, normalizeEntityViewport, projectRawKeyPressed, projectRawKeyReleased, runByteActionQueue, runSelectionFlagsRefresh, stepDefaultAo, stepFrame, stepFrameDispatch, stepFrameSelectionTransition, stepFrameSelectionTransitionInner, stepGameplayFrame, stepGameplayZAe, stepGameplayZAf, stepLegacyA2, stepLegacyBL, stepLegacyBM, stepLegacyC, stepLegacyD, stepLegacyD3, stepLegacyE, stepLegacyE3, stepLegacyExitPreparation, stepLegacyF, stepLegacyL, stepLegacyO, stepLegacySceneAnimatedSlotClear, stepLegacyX, stepStateAOMap, stepStateAPPrefix, stepStateAQAudio, stepStateAi, stepStateAm, stepStateMachine, stepStateMapEntry, stepStateS, stepStateT, stepStateTransitionCommand, stepStateU } from "../ui/UiRuntime";
import { animalRoam, batchAllocate, buildingPlacementOptions, canPlaceFootprint, checkEntityNeeds, clearEntityRecordTarget, completeEntityRecord, decodeMap, loadMap, mapOverviewInput, nearestCandidate, payEntityCost, preparePathTables, rebuildGridAfterLoad, resetMapEntryAllocation, runAuxiliaryPlacement, runPathTables, runProjectionLifecycle, runSpatialPass, stepAuxiliaryMode4, stepBuildingEconomy, stepMapEntry, vacateEntity } from "../sim/world/WorldRuntime";
import { hydrateGameplayRecord, loadGameplayFromStore, recordOptions, saveGameplayToStore, saveOriginalResourceAction, snapshotGameplayRecord } from "../save/SaveRuntime";
import { T_MAP_SIZE } from "./DataTables";

/**
 * b.S:B (#50, byte) -- the layer selector `markLegacySpatialRecord`
 * (`LegacySpatialRecordUpdate.ts`, b's `final void a(int,int,int)`) reads to
 * pick which of `mainArrays.aInt`'s 2 layers to OR bits into. BUG FIX
 * (2026-09-04): every call site used to pass `layerIndex: this.game.S` --
 * but `game.S` is bound to a DIFFERENT field, `b.S:I` (#51, an unrelated int
 * loop counter used inside K(), see LegacyGameState.ts's own docblock) -- a
 * genuine case-variant twin collision (same pattern as `v:B`#376 vs
 * `v:I`#375 elsewhere in this codebase). Exhaustively grepped every
 * `putfield`/`getfield #50` in b-javap.txt: exactly one write anywhere in
 * the whole class (`final void a()`'s entity-slot reset, offset 25..27,
 * unconditional `S=1`) and exactly one read (inside the very method this
 * constant feeds, offset 108) -- so #50 is a true post-init constant for
 * the entire game, not live state worth threading through `game.*`. Live-
 * confirmed: forcing this to 1 on a fresh boot and re-running the spatial
 * pass flips `occupancyClass()` from 1 (explored, never-visible) to 0
 * (visible) at every tile a team-0 unit's reveal radius already covered.
 */
export const LEGACY_SPATIAL_LAYER_INDEX = 1;

/**
 * A state bag whose properties read and write another object's fields directly. The
 * original's fields are instance fields: a nested call's write is visible at
 * once and survives the caller. Copying them into a bag and writing the bag
 * back afterwards silently undid those nested writes (the unclosable Q=20
 * prompt, the camera snapping back, the chief-pick cursor stuck on 0), so
 * wrappers whose callbacks reach other methods use this instead.
 */
export function liveView<S, T extends object = LegacyGameState>(target: T, map: { readonly [K in keyof S]: keyof T }): S {
  const view = {} as Record<string, unknown>;
  const fields = target as unknown as Record<string, unknown>;
  for (const [key, field] of Object.entries(map) as [string, string][]) {
    Object.defineProperty(view, key, {
      get: () => fields[field],
      set: (value: unknown) => { fields[field] = value; },
      enumerable: true,
    });
  }
  return view as S;
}

/**
 * Allocation-level mirror of the arrays created by f.g().
 *
 * This class intentionally exposes original array shapes rather than semantic
 * game objects. The bytecode proves the shapes and element types, but does not
 * yet prove whether an individual field is a unit, building, resource, or AI
 * value. Keeping the raw containers here makes later method ports auditable.
 */
type StateCommandBag = {
  ai: number; ak: number; aj: number; oInt: number; oByte: number; v: number; vInt: number; q: number;
  aT: number; aS: number; aR: number; al: number; am: number; an: number; I: number; J: number; K: number;
  Q: number; H: boolean; Z: number; ao: number; JFlag: boolean; aP: number; R: number; s: boolean;
  aw: number; bF: number; u: number; pByte: number; bI: number; bG: number; bJ: number; L: number;
  A: boolean; dFlags: boolean[]; p: Int8Array;
};

/** The parameters of a moved runtime function after its leading `rt`. */
type RtArgs<F> = F extends (rt: LegacyRuntimeState, ...args: infer A) => unknown ? A : never;

export class LegacyRuntimeState {
  readonly renderTargets = new LegacyRenderTargets();
  readonly game = new LegacyGameState();
  readonly input = new LegacyInputState({
    onSelectionKey: (value) => acceptNumericSequence(this, value),
    onKeyPressed: (value) => this.projectRawKeyPressed(value),
    onKeyReleased: (value) => projectRawKeyReleased(this, value),
    // f.j:B (#325): keyPressed/keyReleased zero the idle counter h() bumps and
    // ae() reads. The input layer kept its own never-read copy until 2026-10-08.
    onIdleReset: () => { this.game.jByte = 0; },
    nFlag: () => this.game.nFlag,
    onStar: () => { this.game.staticL = true; },
    onHash: () => { this.game.staticM = true; },
    onDigitLatch: (value, holdW) => {
      this.game.digitKey = value;
      if (holdW) this.game.wFlag = true;
    },
    onDigitRelease: () => { this.game.wFlag = false; },
    // keyReleased(int) offset 226..230: p:Z(#351)=true when the repeat-guard
    // is held. stepLegacyGameplayTick's own pFlag block (already wired to
    // resetLegacyZI via onI) consumes it on the next tick -- see f.h()'s
    // offset 660..674.
    onPendingRelease: () => { this.game.pFlag = true; },
  });
  readonly progressStore = new LegacyProgressStore();
  /** f's constructor uses new java.util.Random(1). */
  readonly random = new LegacyRandom(1);
  /** Development-only trace of the latest table-driven f.ao() call. */
  readonly aoTrace = { count: 0, inputQ: -1, inputZ: -1, value: -1, outputQ: -1 };
  /** Exact f.b[6] MIDI selection table initialized by e.c(). */
  readonly audioTable = new Int8Array([0, 1, 2, 3, 4, 4]);
  midiResource?: MidiResource;
  midiPlayer?: OriginalMidiPlayer;
  progressStoreLoaded = false;
  readonly imageGroups: (ImagePack | undefined)[] = [undefined, undefined, undefined];
  readonly resourceTables = new LegacyResourceTables();
  /** Exact f.g() allocation shapes; semantics remain unresolved. */
  readonly mainArrays = new LegacyMainArrays();
  /** f.a:[[I (#136): f.G()'s int[3][4] cloud x/y/variant table. */
  // Row 0 IS game.a0 (f.a:[[I [0]): run() seeds a0[3] = -1000 to make G()'s
  // first pass roll all four clouds. MERGED 2026-10-08 (oracle): the two
  // separate arrays meant G() never saw the -1000.
  readonly gGeometry = [this.game.a0, new Int32Array(4), new Int32Array(4)];
  readonly subsystemArrays = new LegacySubsystemArrays();
  /**
   * The two fields `private void a(int,int)` (#271, `LegacyPathDirection.ts`)
   * writes and `private void e(int)` (#374, `LegacyPathE.ts`) reads back:
   * `b.a:B`(#71), the 3-bit direction mask, and `b.c:[B`(#146), the two step
   * counts (`new byte[2]`, allocated by `f.g()` at f-javap.txt offset
   * 494..497). Every one of #71's 13 and #146's 14 constant-pool references
   * across class b falls inside those two methods, so one holder per runtime
   * reproduces both exactly -- `c` is the same `Int8Array` as
   * `subsystemArrays.cByte`, not a copy. Declared after `subsystemArrays`
   * because the field initializer reads it.
   */
  readonly pathDirection: LegacyPathDirectionState = { a: 0, c: this.subsystemArrays.cByte };
  /** Raw f.m(int) sequence state; the five values come from f.g() bytecode. */
  readonly numericSequence: LegacyNumericSequenceState = {
    i: new Int32Array(6),
    j: new Int32Array([56, 55, 51, 57, 49]),
    aShort0: this.mainArrays.aShort[0],
    ae: false,
    af: false,
    ag: false,
    u: 0,
    q: 0,
  };
  /** Independent raw field bank for f.aD(); f.b is already used by loop state. */
  /**
   * f.ad()'s fields, LIVE since 2026-09-23: its Q == 19 branch calls Y() (the
   * camera pan, which writes I/K/y/A) and the copy-out used to undo it.
   */
  readonly adState: LegacyAdState = Object.assign(
    liveView<Omit<LegacyAdState, "selection">>(this.game, {
      Q: "screen", q: "mission", s: "sByte", t: "tByte", T: "actionT", R: "R", vInt: "vInt", vByte: "loopMode", H: "H",
      b: "difficulty", c: "progressC", A: "cursorRow", cFlag: "cFlag", y: "cursorColumn", z: "zByte", B: "BByte",
      I: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte", AFlag: "AFlag",
    }),
    { selection: this.game.selectionFlags },
  );
  /** Raw render-dispatch fields used by f.m() after f.ak(). */
  readonly frameDispatchState: LegacyFrameDispatchInput["state"] = Object.assign(
    // N is N:B (#79), the same field as game.targetSlot. CORRECTED
    // 2026-10-01: it was a private copy, so a(BII)'s target switch and
    // F()'s `N = c[1]` never reached m()/c(int,int)/u(), and vice versa.
    liveView<Pick<LegacyFrameDispatchInput["state"], "N">>(this.game, { N: "targetSlot" }),
    {
      missionFrame: -1, screen: 14, H: true, c1: 1,
      // f.b:[Z] (#234). CORRECTED 2026-09-30: this was a private array, so
      // F()'s Q 18/24/32 branches set b[11]/b[13]/b[16]/b[17] where the frame
      // command never looked, and the intro cutscene page was never drawn.
      flags: this.game.frameFlags,
    },
  );
  /** f.H/I/J/K/L/N()'s fields, LIVE since 2026-09-23 (onPrimitive writes vInt, onU writes A:Z). */
  readonly simpleFrameState: LegacySimpleFrameState = Object.assign(
    liveView<Omit<LegacySimpleFrameState, "flags" | "k">>(this.game, {
      Q: "screen", H: "H", I: "I", J: "J", ab: "abFlag", x: "xInt", vInt: "vInt", m: "mByte", aP: "aPInt", cFlag: "cFlag", AFlag: "AFlag",
    }),
    { flags: this.game.frameFlags, k: this.game.zlKBytes },
  );
  readonly mFrameState: LegacyMFrameState = {
    H: true,
    I: false,
    m: 0,
    flags: this.game.frameFlags,
    d: this.game.oElementRecordInts,
    a: new Int16Array(312),
    bytes: new Int8Array(0),
  };
  readonly framePrimitives: Array<readonly [number, number, number]> = [];
  readonly frameProjections: Array<readonly [number, number, number, number]> = [];
  readonly frameHelperCalls: Array<Readonly<Record<string, number | string>>> = [];
  /**
   * Not in the original: the rows f.c(III) last laid out (offscreen y of each, the Q they were drawn
   * for), so touch input (src/TouchControls.ts) can map a tap to a row of a vertical menu.
   */
  readonly touchMenuRows: number[] = [];
  /** Not in the original: called when the enemy or an animal lands a blow on the tribe, with the
   *  map cell (phase 3 alerts, Alerts.ts). */
  onTribeAttacked?: (x: number, y: number) => void;
  /** Not in the original: each message f.a(byte,byte,byte,byte) queues (type, cell, value), for the
   *  phase 3 notices (Alerts.ts). */
  onMessage?: (type: number, x: number, y: number, value: number) => void;
  touchMenuQ = -1;
  /** Not in the original: x of the last number the bottom bar (record 1010) drew, -1 for none. */
  touchBarNumberX = -1;
  readonly offscreenTargets = typeof document === "undefined" ? undefined : new LegacyOffscreenTargets();
  /**
   * f.an() (Back key) fields, live since 2026-09-27. Only Q/R/H/vInt used to
   * be synced: U and V were stuck at 5 and 4 (so Back on the mission-select
   * screen Q = V did nothing unless V was 4), aa:I was a private 0, and the
   * T/Z/P/I/S/m/ac writes were dropped.
   */
  readonly anState: LegacyAnState = Object.assign(
    liveView<Omit<LegacyAnState, "selection">>(this.game, {
      Q: "screen", U: "U", H: "H", P: "pendingP", I: "I", vInt: "vInt", T: "actionT", V: "progressV",
      Z: "Z", aaInt: "aaInt", mByte: "mByte", R: "R", S: "S", ac: "acFlag",
      y: "cursorColumn", z: "zByte", A: "cursorRow", B: "BByte", IByte: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte",
    }),
    { selection: [] as boolean[] },
  );
  /** Runtime mirror for the confirmed f.a(20,1,0) -> f.ap() path. */
  readonly entityActionState: LegacyApState = Object.assign(
    // f.a(byte,byte,byte)/f.ap() fields. Everything but ap/m/e is a
    // live game field (2026-09-23): ap()'s callees -- l(-1), ah(), the
    // selection release, f(int,int) -- write w, P, I/K and friends directly.
    // am:B (#208) / an:B (#210) are live since 2026-10-02: c()'s aD 12 reads
    // am for the prompt's portrait, so a private copy drew the previous
    // speaker's face under the prompt speaker's name.
    liveView<Omit<LegacyApState, "ap" | "m" | "e">>(this.game, {
      w: "barMode", KFlag: "choosingChief", Q: "screen", U: "U", z: "zByte", y: "cursorColumn", B: "BByte", A: "cursorRow",
      J: "JByte", I: "cameraColumn", L: "cameraSavedKByte", K: "cameraRow", P: "pendingP", o: "oInt", ac: "acFlag",
      am: "am", an: "an",
    }),
    { ap: 0, m: 0, e: 0 },
  );
  /**
   * f.ao()/f.ar()'s field bank. The synced fields are LIVE game fields since
   * 2026-09-23 (ap(), b(int) and aM() -- called from inside ao()/ar() --
   * write them, and ao()'s copy-out used to undo those writes). Every field
   * is live since 2026-09-27 (aa/l/camera were private copies).
   */
  readonly aoState: LegacyAoState = liveView<LegacyAoState>(this.game, {
    Q: "screen", R: "R", H: "H", vInt: "vInt", V: "progressV", r: "progressR", q: "mission", T: "actionT",
    Z: "Z", mByte: "mByte", s: "sByte", eByte: "eByte", af: "numericAf", c: "missionFrame", pByte: "persistedPByte",
    aaInt: "aaInt",
    // l:I (#334), the tips toggle as() flips (Z == 3); a private 0 until
    // 2026-09-27, so the Options switch never reached game.lInt or the save.
    lInt: "lInt",
    // Q=19's camera save z=y/B=A/J=I/L=K (offsets 111..136); these were
    // private zeros until 2026-09-27, so the save never reached the game.
    y: "cursorColumn", z: "zByte", A: "cursorRow", B: "BByte", I: "cameraColumn", J: "JByte", K: "cameraRow", L: "cameraSavedKByte",
  });
  maResource?: MaResource;
  languageResources?: {
    readonly s: DelimitedTable;
    readonly t: DelimitedTable;
    readonly d0: DelimitedTable;
  };
  /** All five JAR languages' /s, /t, /d0 (index = f.a:B), for the Q14 choice. */
  languageTables?: readonly { readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable }[];
  /** f.a:B (static), the language c.b() loads from; ZH_LANGUAGE (5) is the added Chinese. */
  language = 0;
  zhStrings: ZhStrings | null = null;
  readonly zhPainter = new ZhPainter();
  /** Set while the language is Chinese: c.b(IIIIIII)'s Chinese wrap. */
  zhCompose: LegacyCZh | null = null;

  // f's buffers aliased by b.a(f); sizes are established by e/f bytecode.
  readonly packedBytes = new Int8Array(17638);
  readonly packedOffsets = new Int16Array(312);
  readonly geometry = new LegacyGeometryDecoder(this.packedBytes, this.packedOffsets, this.resourceTables, {
    // c.a(IIIII) for record 97 calls f.a(III) (#439) twice: the tribe emblems beside SCORE.
    onRecord97: (firstRecord, firstX, secondRecord, secondX, y) => {
      if (!this.offscreenTargets || !this.packedData) return;
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: this.packedData.shortTables,
        byteTables: this.packedData.byteTables,
        imageGroups: this.imageGroups,
        graphics: this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3],
        an: this.game.anInt,
      });
      packed.drawComposite(firstRecord, firstX, y);
      packed.drawComposite(secondRecord, secondX, y);
    },
  });
  readonly geometryRenderer = new LegacyGeometryRenderer(
    this.packedBytes,
    this.packedOffsets,
    this.resourceTables,
    () => this.geometry.activeRows,
  );
  /** f.a:[[Image][2][0] after c(byte) (#558) replaced it; undefined = pi8's own entry 0. */
  pi8Slot0: DrawableImage | undefined;
  /** Not in the original: the text record the last f.a(BII) compose drew (after c.g's section
   *  offset for records >= 71), read by the HD story / dialogue pages (StoryHud). */
  shownTextRecord = -1;
  /** Not in the original: what the selected-unit panel (frame command 4) drew last -- its pictures
   *  (composite ids, text "") and numbers (asset -1) at their frame positions -- for the HD
   *  villager panel (Hud.ts); `drawingVillagerPanel` while that command's rows run. */
  villagerPanel: { asset: number; text: string; x: number; y: number }[] = [];
  villagerPanelDraft: { asset: number; text: string; x: number; y: number }[] = [];
  drawingVillagerPanel = false;
  /** Not in the original: the /pi8 picture the last c(byte) chose (the story picture). */
  shownPicture = 0;
  /** Raw c.b()/c.a(Graphics,int) row-composition state. */
  readonly cComposition: LegacyCCompositionState = {
    g: new Int16Array(64), h: new Int16Array(64), r: 0, s: 0, t: 0, q: 0, p: 0,
    u: 0, v: 0, w: 0, y: 0,
  };
  /** Exact f.b[S] table loaded from the five trailing /a sections. */
  readonly saveOffsets = new Int16Array(570);
  readonly sectionOffsets = new Int16Array(5);
  readonly denseState = new Int8Array(F_E_LENGTH);
  /** f.p[40], used as the scratch record by b.b(int,int,int). */
  readonly auxiliaryScratch = new Int8Array(40);
  /** Raw f.P() state, the correct/complete replacement for simpleFrameState's `case "P"`. */
  /**
   * f.P()'s fields, LIVE since 2026-09-23: its onGameplayDraw reaches
   * stepEntityAction (writes an) and stepEntityRemoval (writes A:Z), which
   * the copy-out used to undo.
   */
  readonly pFrameState: LegacyPState = Object.assign(
    liveView<Omit<LegacyPState, "entityScanFlags" | "packedBytes" | "packedOffsets" | "dense" | "p">>(this.game, {
      needsFullReset: "H", followFlag: "AFlag", an: "an", ao: "ao", aR: "aR", JFlag: "jSceneFlag", jFlag: "jFlag", aP: "aPInt",
      aQ: "aQ", aS: "aS", targetSlot: "targetSlot", bc: "bc", bd: "bd", be: "be", bf: "bf", c: "cFlag",
      am: "am", al: "al", phase: "animPhase",
    }),
    {
      entityScanFlags: this.game.frameFlags, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
      dense: this.denseState, p: this.auxiliaryScratch,
    },
  );
  /** Shared raw f.S/f.T/f.U state used by the f.b(int) command boundary. */
  /**
   * f.b(int)/S()/T()/U()'s shared field bag. LIVE since 2026-09-23: it used
   * to be a snapshot copied in and out around stepSubsystemStateCommand,
   * which U()'s recursive onB re-entered (the inner call re-read stale game
   * values into the outer's bag), which T()'s own live writes (b.f:B = 6 on
   * ai 48) were overwritten by, and whose J/H were written back without
   * ever being read in.
   */
  readonly stateCommandState: StateCommandBag = (() => {
    const bag = liveView<Omit<StateCommandBag, "bG" | "bJ" | "dFlags" | "p">, LegacyGameState>(this.game, {
      ai: "ai", ak: "akByte", aj: "ajByte", oInt: "oInt", oByte: "oByte", v: "loopMode", vInt: "vInt",
      q: "mission", aT: "aTInt", aS: "aS", aR: "aR", al: "al", am: "am", an: "an", I: "cameraColumn", J: "JByte",
      K: "cameraRow", Q: "screen", H: "H", Z: "Z", ao: "ao", JFlag: "jSceneFlag", aP: "aPInt", R: "R",
      s: "cameraSFlag", aw: "levelAwByte", bF: "subsystemGFFlagByte", u: "uByte", pByte: "persistedPByte",
      bI: "subsystemGCurrentI", L: "cameraSavedKByte", A: "AFlag",
    });
    Object.defineProperties(bag, Object.getOwnPropertyDescriptors(
      liveView<Pick<StateCommandBag, "bG" | "bJ">, LegacySubsystemArrays>(this.subsystemArrays, { bG: "bgByte", bJ: "bJByte" }),
    ));
    return Object.assign(bag as StateCommandBag, {
      dFlags: Array.from({ length: 9 }, () => false),
      p: this.auxiliaryScratch,
    });
  })();
  /** Mutable b.b(III)/b.c(boolean) shared scratch state; field names remain raw. */
  readonly auxiliaryQueueState: LegacyAuxiliaryQueueState = { O: 0, N: 0, G: 0, eFlag: false, H: 0 };
  activeMap?: LegacyRenderableMap;

  // CORRECTED (2026-09-07): these are `f.b:[[B]`/`f.c:[[B]`, allocated by
  // `e.i()` (bytecode/e-javap.txt offset 22..45, two back-to-back
  // `new byte[96][96]`), NOT `f.g()` as this comment used to say -- f.g()
  // allocates a different set of fields entirely (g:[[B]/h:[[B]/i:[[B]/
  // a:[[[I]/a:[[Z], see their own docblocks). gridB in particular is also
  // `LegacySpiralPlacementGate.ts`'s mode-4 terrain grid (b's own #133
  // reference to the same field).
  readonly gridB = byteGrid(96, 96);
  readonly gridC = byteGrid(96, 96);
  /** f.g:[[B (#300) -- distinct secondary per-cell grid f.u()'s outer loop reads/clears. */
  readonly gridG = byteGrid(96, 96);
  /**
   * f.a:[[Z] (#129) -- `new boolean[P:B + 3][O:B]`, sized from `f.P:B`/
   * `f.O:B` (#87/#83).
   *
   * ANSWERED (2026-09-09), correcting this note twice over. It used to say
   * the allocation lives in f's CONSTRUCTOR and that both sizes "default 0
   * until whatever sets the real viewport size runs, so the original's own
   * effective size at startup is unclear". Both halves were wrong:
   *  - offsets 60..75 are in `private void g()`, not the constructor
   *    (`putfield #129` appears exactly once in all of f-javap.txt, at
   *    line 1041, inside `g()` which starts at line 1004);
   *  - the viewport size is set by `e.c()` offsets 16..44 across the
   *    `a:Lf;` back-reference (`O:B = 11`, `P:B = 18` -- see
   *    `applyLegacyFrameGeometry`), and `e` is constructed by `f.f()`
   *    before `g()` runs, so `g()` reads real values, not zeros.
   * The original allocation is therefore 21x11, not an unclear size.
   * Sized generously here (64x64) rather than reproducing that exactly; `LegacyEffectRectMark.ts`'s
   * own `stepLegacyCRect` only ever writes/reads within `[originRow,
   * originRow+height)`/`[originColumn, originColumn+width)`, well inside
   * this bound for any viewport size seen so far.
   */
  readonly effectRectBoolGrid: boolean[][] = Array.from({ length: 64 }, () => new Array(64).fill(false));
  /**
   * f.g:[B] (#298) -- `new byte[11]` per the constructor (bytecode/f-javap.txt
   * offsets 132..137). Scratch buffer `private void a(int,byte)`'s
   * arg2!=0 path writes into via the `e[4545+n]`/`e[4646+n]` linked-list
   * walk; read back by the not-yet-ported `a(IBBIIB)` detail-draw method.
   * Distinct from `gridG` (f.g:[[B] #300) above -- same first letter,
   * different array shape and constant-pool index.
   */
  readonly entityMarkerG = new Int8Array(11);
  /** f.h:[B] (#307) -- `new byte[11]`, same allocation/clear site as entityMarkerG; read by `LegacyMapMarkerDetail.ts`. */
  readonly entityMarkerH = new Int8Array(11);
  /** f.i:[B] (#314) -- `new byte[11]`, same allocation/clear site as entityMarkerG; read by `LegacyMapMarkerDetail.ts`. */
  readonly entityMarkerI = new Int8Array(11);
  // f.a:[[S] (#131) is mainArrays.aShort. A second copy here (`markerStatScratch`) took the
  // building-loss, kill-count and map-marker writes until 2026-10-09 (oracle run 5, frame 12796).
  /**
   * f.h:[[B] (#308) / f.i:[[B] (#315) -- read by `LegacySecondaryCellChain.ts`
   * (f.i(int)); distinct from `entityMarkerH` (#307, a 1D array) and
   * `f.h:I` (#311, `tailHCounter`) despite sharing the letter. Sized
   * `new byte[13][101]` at their one allocation site (private void g(),
   * offset 24..47). **CORRECTED (2026-09-07)**: the 2026-08-22
   * "PROVABLY ALWAYS ZERO -- no bastore site exists anywhere" claim only
   * grepped class f's own bytecode. Class b writes both fields via its
   * `a:Lf;` back-reference (#60), under its own constant-pool indices
   * (#185/#190) -- `private void a(byte,byte,int,int)`
   * (`LegacyEntityActionScoreGate.ts`, restored 2026-09-07 from a retracted
   * "always throws" premise) writes `h[ay][id]`/`i[ay][id]` for `ay` in
   * `[0, dense[5959+id]]` every time it fires. Now wired as mutable
   * `hTable`/`iTable` params to that port.
   */
  readonly secondaryCellHTable = Array.from({ length: 13 }, () => new Int8Array(101));
  readonly secondaryCellITable = Array.from({ length: 13 }, () => new Int8Array(101));
  // BUG FIX (2026-09-04): a redundant, never-connected duplicate of
  // `mainArrays.aInt` (f.a:[[[I, #128 in f's own pool / #72 as read via b's
  // `a:Lf;` back-reference) used to live here as its own field
  // (`intLayers`), allocated separately by `intLayers2x3x96()`. Every call
  // site that touched it (`runSpatialPass`'s b.d() port,
  // `markLegacySpatialRecord`'s b.a(III) port, and
  // `legacyPathCellPredicate`'s occupancy check) has its own docblock
  // explicitly citing "f.a[2][3][96]" as the target -- the SAME array
  // `legacyOccupancyClass()`/`markLegacyEntityFootprint` already read/write
  // via `mainArrays.aInt`. Two separate JS objects meant the vision/fog
  // bitmap b.d() writes into was never the one occupancyClass() reads,
  // so no tile was ever revealed (see docs/unknowns.md's 2026-09-07 entry).
  // All former `this.intLayers` sites now read `this.mainArrays.aInt`
  // directly; the field and its allocator are deleted, not aliased.
  readonly boolLayers = boolLayers2x3x96();

  readonly packedData?: PackedData;

  // b's fixed-capacity allocation tables share the same f.e buffer.
  readonly entities = new EntityBank(this.denseState);

  /** Read-only raw state snapshot for development parity inspection. */
  debugSnapshot(): Readonly<Record<string, unknown>> {
    return {
      Q: this.game.screen,
      vByte: this.game.loopMode,
      vInt: this.game.vInt,
      H: this.game.H,
      U: this.game.U,
      R: this.game.R,
      S: this.game.S,
      c: this.game.missionFrame,
      b: this.game.b,
      aOffsets: {
        149: this.packedOffsets[T_MAP_SIZE],
        153: this.packedOffsets[153],
        197: this.packedOffsets[197],
        248: this.packedOffsets[248],
        280: this.packedOffsets[280],
      },
      map: { width: this.game.mapWidth, height: this.game.mapHeight },
      framePrimitiveCount: this.framePrimitives.length,
    };
  }

  /** Raw f.a(int,int) class lookup over the two confirmed bit planes. */
  occupancyClass(x: number, y: number): number {
    return legacyOccupancyClass(this.mainArrays.aInt, x, y);
  }

  /**
   * Execute the proven c.a(IIIII) geometry call from a Z element callback.
   * The arguments remain raw until f.a(byte,int,int) is mapped.
   */
  applyZFiveIntGeometry(x: number, mode: number, width: number, record: number, value: number): number {
    return applyLegacyZFiveIntGeometry(this.geometry, x, mode, width, record, value);
  }

  /** Execute the proven c.a(IIIIIII) segmented geometry call from Z. */
  applyZSevenIntGeometry(x: number, mode: number, width: number, first: number, second: number, third: number, value: number): void {
    applyLegacyZSevenIntGeometry(this.geometry, x, mode, width, first, second, third, value);
  }

  /** Expand one localized c.a[1]/c.b[1] record through c.b(IIIIIII). */
  composeC(x: number, y: number, width: number, height: number, record: number, align: number, value: number): void {
    composeLegacyC(this.cComposition, this.packedBytes, this.packedOffsets, this.resourceTables.byteViews, this.resourceTables.offsetViews, x, y, width, height, record, align, value, this.resourceTables.sectionArg, this.zhCompose);
  }

  /** c.a(Graphics,int)'s stats numbers, RNG and icons. */
  cRenderExtras(): LegacyCRenderExtras {
    return {
      onNumber: (x, y, width, text, value) => { this.geometry.queueTextWithWidth(x, y, width, text, value); },
      random: (mask, divisor) => this.randomRemainder(mask, divisor),
      pools: this.mainArrays.aShort,
      onIcon: (record, x, y) => drawPackedComposite(this, record, x, y),
    };
  }


  /**
   * Run the proven Z-element scan and bind its selection callbacks to c's
   * composition/render phases in the original offset-959 -> offset-1010 order.
   */
  scanZElement(
    state: Omit<LegacyZElementScanState, "packedBytes" | "packedOffsets" | "byteRows" | "shortRows">,
    aD: number,
    xOffset: number,
    yOffset: number,
    callbacks: LegacyZElementScanCallbacks = {},
    onDraw?: (command: LegacyCDrawCommand) => void,
    zCommandCallbacks: LegacyZCommandConsumerCallbacks = {},
  ): boolean {
    const data = this.packedData;
    if (!data) throw new Error("Packed /pd0 data is not loaded");
    return scanLegacyZElementPrefix({
      ...state,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      byteRows: data.byteTables,
      shortRows: data.shortTables,
    }, aD, xOffset, yOffset, {
      ...callbacks,
      onDispatch: (subtype, entry) => {
        callbacks.onDispatch?.(subtype, entry);
        this.dispatchZCommand(subtype, entry, zCommandCallbacks);
      },
      onSelectionCompose: (x, y, width, height, value, style, mode) => {
        callbacks.onSelectionCompose?.(x, y, width, height, value, style, mode);
        this.composeC(x, y, width, height, value, style, mode);
      },
      onSelectionRender: (rowStart) => {
        callbacks.onSelectionRender?.(rowStart);
        renderCRow(this, rowStart, onDraw);
      },
    });
  }

  /**
   * Exact f.d(int,int) dispatch boundary. Kind 1 delegates to f.j(int);
   * kind 0 only updates the proven composite-position registers. The
   * remaining kind-2 branch stays explicit through the caller callback.
   */
  dispatchZCommand(kind: number, command: number, callbacks: LegacyZCommandConsumerCallbacks & LegacyZDispatchCallbacks = {}): void {
    dispatchLegacyZ({
      aI: this.game.frameCommandAI,
      aJ: this.game.frameCommandAJ,
      aK: this.game.frameCommandAK,
      aG: this.game.frameCommandAG,
      aH: this.game.frameCommandAH,
    }, kind, command, {
      onComposite: (index, x, y) => {
        callbacks.onComposite?.(index, x, y);
        this.game.frameCommandAG = x;
        this.game.frameCommandAH = y;
      },
      onCommand: (value) => {
        callbacks.onCommand?.(value);
        this.consumeFrameCommand(value, callbacks);
      },
      onUnportedBranch: callbacks.onUnportedBranch,
    });
  }

  /** Run f.k(int) with the proven /a offset and dense-state sources. */
  stepZKText(state: LegacyZKTextState, command: number, callbacks: Omit<LegacyZKTextCallbacks, "readAdvance" | "readMode" | "languageBase" | "commandStyle"> = {}): void {
    const data = this.packedData;
    if (!data) throw new Error("Packed /pd0 data is not loaded");
    stepLegacyZKText(state, command, {
      ...callbacks,
      // a_s[126] / a_s[127] are packedOffsets (#138), the category's field
      // base is b:[S (#245, saveOffsets). Was read from saveOffsets[126/127].
      readAdvance: (aF, language) => {
        const category = this.packedBytes[(this.packedOffsets[126] ?? 0) + aF] ?? -1;
        if (category === -1) return undefined;
        return (this.denseState[(this.saveOffsets[category] ?? 0) + language] ?? 0)
          + (this.packedBytes[(this.packedOffsets[127] ?? 0) + aF] ?? 0);
      },
      readMode: (language) => this.denseState[UNIT_CARRY_KIND + language] ?? 0,
      languageBase: () => this.mainArrays.aShort[0]?.[16] ?? 0,
      commandStyle: (value) => ((data.byteTables[3]?.[value] ?? 0) & 0xff) >> 6,
    });
  }

  /** Run f.d(3,command), binding its proven aI<=2 branch to f.k(int). */
  stepZKind3(state: LegacyZKind3State, command: number, language: number, callbacks: LegacyZKind3Callbacks = {}, onKText?: LegacyZKTextCallbacks["onText"]): void {
    stepLegacyZKind3(state, command, {
      ...callbacks,
      onK: (value) => {
        callbacks.onK?.(value);
        const textState = { aF: state.aF, aI: state.aI, aJ: state.aJ, aK: state.aK, l: language };
        this.stepZKText(textState, value, { onText: onKText });
        state.aF = textState.aF;
      },
    });
  }

  /** f.d(4,row): a command row's clip rect (LegacyZKind4.ts). */
  stepZKind4(state: Omit<LegacyZKind4State, "byteRows">, callbacks: LegacyZKind4Callbacks = {}): void {
    const data = this.packedData;
    if (!data) throw new Error("Packed /pd0 data is not loaded");
    stepLegacyZKind4({ ...state, byteRows: data.byteTables }, callbacks);
  }

  stepZSubrecordDraw(...args: RtArgs<typeof stepZSubrecordDraw>): ReturnType<typeof stepZSubrecordDraw> {
    // The HD wide view (render/HdArt.ts): a sub-record frame with an HD picture draws that.
    if (hdArt.active && hdArt.drawEffect(this, args[0], args[1], args[2], args[3])) return;
    return stepZSubrecordDraw(this, ...args);
  }




  /**
   * Consume one original f.j(int) command using the raw f field bank. The
   * caller-owned aliases are intentional until bytecode proves the live
   * producers of `as/ad/q/aJ/aK`.
   */
  consumeFrameCommand(command: number, callbacks: LegacyZCommandConsumerCallbacks = {}): void {
    consumeLegacyZCommand({
      r: this.mainArrays.r,
      // CORRECTED (2026-09-14): f.j(int) reads `as:B` #219, `ad:B` #186 and
      // `q:I` #356 -- the same instance fields Z()/ae() (frameLayoutAS),
      // a(ZZZZZZZZZ) (selectionAd, its only writer) and qCounter already model.
      // The old frameCommandAs/Ad/Q placeholders had no writer at all, so
      // `ad != 6` always held and the Build cost float read column r-6+20.
      as: this.game.menuCursor,
      ad: this.game.selectionAd,
      q: this.game.qCounter,
      e: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      jTables: Array.from(this.packedData?.byteTables ?? []),
      // f.d:[I (#275, offsets 443/482): the HUD slot y table, oElementRecordInts -- 1107 sets
      // d[8] = -20 to lift the cost panel. CORRECTED 2026-10-15 (pixel comparison, play26 frame
      // 40000): this passed gGeometry[0], so the panel never moved up.
      d: this.game.oElementRecordInts,
      aF: this.game.frameCommandAF,
      aI: this.game.frameCommandAI,
      aJ: this.game.frameCommandAJ,
      aK: this.game.frameCommandAK,
    }, command, callbacks);
  }

  projectRawKeyPressed(...args: RtArgs<typeof projectRawKeyPressed>): ReturnType<typeof projectRawKeyPressed> { return projectRawKeyPressed(this, ...args); }



  /** Raw c.a(x,y,mode,String,style) text-to-geometry entry point. */
  queueGeometryText(x: number, mode: number, text: string, style: number): number {
    return this.geometry.queueText(x, mode, text, style);
  }

  canPlaceFootprint(...args: RtArgs<typeof canPlaceFootprint>): ReturnType<typeof canPlaceFootprint> { return canPlaceFootprint(this, ...args); }

  /** Raw f.b(int,int,int,int) auxiliary 22-slot record initializer. */
  allocateSubsystemRecord(
    map: Int8Array[],
    first: number,
    x: number,
    y: number,
    counterIndex: number,
    input: Omit<LegacySubsystemRecordInput, "state" | "map" | "packedBytes" | "packedOffsets">,
  ): number {
    return allocateLegacySubsystemRecord({
      ...input,
      state: this.denseState,
      map,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    }, first, x, y, counterIndex);
  }

  /** f.aP() (#497): the q-selected placement table, with the live wiring. */
  runAP(placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
    stepStateAPPrefix(this, {
      ...placementCallbacks,
      // Live: aP() writes aw itself (the old inline snapshot dropped it).
    state: liveView<LegacyAPPrefixInput["state"]>(this.game, { q: "mission", bByte: "difficulty", awByte: "levelAwByte" }),
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortRows: this.mainArrays.aShort,
      onDenseWrite: placementCallbacks.onDenseWrite ?? ((index, value) => {
        if (index >= 0 && index < this.denseState.length) this.denseState[index] = value;
      }),
      onPlaceFive: placementCallbacks.onPlaceFive ?? ((team, type, x, y, flags, specialPlacement, existingId) => {
        this.placeEntity(this.gridC, team, type, x, y, flags, specialPlacement, existingId, this.buildingPlacementOptions());
      }),
      onCreateRecord: placementCallbacks.onCreateRecord ?? ((team, x, y, type, flags) => {
        this.allocateRecord(this.gridC, team, x, y, type, flags, this.recordOptions());
      }),
      // Offset 328 of aP() is `invokevirtual #540`, f's own b(IIII)V -- the 22-slot animal
      // record -- as b(1, row2, row3, row0). FIXED 2026-10-14 (oracle run 15, play20 frame
      // 62619, mission 4's 14 animals): this ran b.b(IIII), the mission-script step.
      onAuxRecord: placementCallbacks.onAuxRecord ?? ((first, x, y, counterIndex) => {
        this.allocateSubsystemRecord(this.gridC, first, x, y, counterIndex, {
          randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
          counters: this.game.subsystemT,
          q: this.game.mission,
        });
      }),
    });
  }

  stepLegacyC(...args: RtArgs<typeof stepLegacyC>): ReturnType<typeof stepLegacyC> { return stepLegacyC(this, ...args); }

  runSpatialPass(...args: RtArgs<typeof runSpatialPass>): ReturnType<typeof runSpatialPass> { return runSpatialPass(this, ...args); }

  selectEntityUpdateCandidates(...args: RtArgs<typeof selectEntityUpdateCandidates>): ReturnType<typeof selectEntityUpdateCandidates> { return selectEntityUpdateCandidates(this, ...args); }

  /** Raw b.ad() cleanup for a selected entity-update association. */
  cleanupEntityUpdate(
    id: number,
    associationIndex: number,
    callbacks: Omit<LegacyEntityUpdateCleanupInput, "state" | "subsystemG" | "id" | "associationIndex"> = {},
  ): void {
    cleanupLegacyEntityUpdate({
      ...callbacks,
      state: this.denseState,
      subsystemG: this.subsystemArrays.gRows,
      id,
      associationIndex,
    });
  }



  stepEntityTarget(...args: RtArgs<typeof stepEntityTarget>): ReturnType<typeof stepEntityTarget> { return stepEntityTarget(this, ...args); }

  stepEntityCoreUpdate(...args: RtArgs<typeof stepEntityCoreUpdate>): ReturnType<typeof stepEntityCoreUpdate> { return stepEntityCoreUpdate(this, ...args); }

  completeEntityRecord(...args: RtArgs<typeof completeEntityRecord>): ReturnType<typeof completeEntityRecord> { return completeEntityRecord(this, ...args); }

  stepEntityWUpdate(...args: RtArgs<typeof stepEntityWUpdate>): ReturnType<typeof stepEntityWUpdate> { return stepEntityWUpdate(this, ...args); }

  changeEntityType(...args: RtArgs<typeof changeEntityType>): ReturnType<typeof changeEntityType> { return changeEntityType(this, ...args); }


  /**
   * `final boolean a(int,int,int,int)` (#270, the ~1900-instruction spiral
   * placement gate) -- shared wiring for all six call sites
   * (`an()`'s onLargeGate, `h()`'s onFootprint, `af()`'s onFootprintGate,
   * `N()`'s onGate x2, `f.b(int,int)`'s onFootprintProbe). Extracted
   * 2026-09-07 when the method was restored from its retracted "every mode
   * throws" premise (see `LegacySpiralPlacementGate.ts`'s own docblock) --
   * every one of those six sites needs the same dense/packedBytes/
   * saveOffsets/gridB/gridC/cRows/entityB/ae wiring, only mode/scanLimit/
   * origin/onOccupantCheck differ per call.
   */
  checkSpiralPlacementGate(
    mode: number,
    scanLimit: number,
    originX: number,
    originY: number,
    id: number,
    onOccupantCheck?: (cellValue: number) => boolean,
  ): boolean {
    const game = this.game;
    const queue = this.auxiliaryQueueState;
    return checkLegacySpiralPlacementGate({
      mode,
      scanLimit,
      originX,
      originY,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      gridC: this.gridC,
      gridB: this.gridB,
      cRows: this.subsystemArrays.cRows,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      id,
      entityB: this.subsystemArrays.bField8,
      ae: this.subsystemArrays.bField105,
      onOccupantCheck,
      onO: () => stepLegacySubsystemBVoidO({
        state: this.denseState,
        id,
        localFlags: this.game.subsystemBLocalFlags,
        // b.b(int,int,int,int):byte (#332), o()'s offset-100 tail. Ported
        // 2026-09-04 as stepLegacySubsystemScore; it used to be inlined here
        // as a literal 0 on a retracted premise. Its own two callees (#267/
        // #268) are now ported for real too (2026-09-08,
        // LegacySubsystemScore.ts) -- see that file's own docblock. #264/
        // #366 (onPairSetup/onDCall) are ALSO now real calls (2026-09-08,
        // LegacySubsystemPairSetup.ts) -- #264 is the only writer of the
        // shared loop bound `c:B`/bField144, so the #267/#268 loops are no
        // longer a guaranteed no-op. #265/#380 (onFlagToggle/onFCall) remain
        // callbacks (a separate, concurrent port owns those two methods).
        onScore: (a, b, c, d) => stepLegacySubsystemScore(this.legacySubsystemScoreInput(id), a, b, c, d),
      }),
      onOccupancyCheck: (x, y, arg3) => this.occupancyCheck(id, x, y, arg3),
      onGroupMode: (entityId, argument) => this.subsystemG(entityId, argument),
      bScalars: this.subsystemArrays,
      scratchB: { get value() { return game.subsystemB; }, set value(v: number) { game.subsystemB = v; } },
      team: game.bTeam,
      // mode 6 (af()'s animal scan): `id` is the animal slot.
      onHitReaction: (x, y, target, arg4) => stepLegacyAnimalHitReaction({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        slot: id,
        onFlee: (flag) => this.animalRoam(id, flag),
      }, x, y, target, arg4),
      onRepaint: (x, y, w, h) => this.repaintRect(x, y, w, h),
      rByte: { get value() { return game.subsystemRByte; }, set value(v: number) { game.subsystemRByte = v; } },
      fP: this.auxiliaryScratch,
      oCounter: { get value() { return queue.O; }, set value(v: number) { queue.O = v; } },
    });
  }

  stepEntityIUpdate(...args: RtArgs<typeof stepEntityIUpdate>): ReturnType<typeof stepEntityIUpdate> { return stepEntityIUpdate(this, ...args); }

  /** Execute the proven a(int) 30-slot target scan against the live entity bank. */
  scanEntityTargets(
    id: number,
    targetType: number,
    partition: number,
    onBestTarget?: LegacyEntityTargetScanInput["onBestTarget"],
  ): LegacyEntityTargetScanResult {
    return scanLegacyEntityTargets({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      partition,
      entityId: id,
      targetType,
      onBestTarget,
    });
  }

  /** Proven b.P() mode write against the live entity bank. */
  promoteEntityMode(id: number, status: number): number {
    return promoteLegacyEntityMode(this.denseState, id, status);
  }

  selectEntityTypeAfterQ(...args: RtArgs<typeof selectEntityTypeAfterQ>): ReturnType<typeof selectEntityTypeAfterQ> { return selectEntityTypeAfterQ(this, ...args); }

  /** Proven b.m calculation core; callers supply the original k[] snapshot. */
  calculateEntityM(input: Omit<LegacyEntityMCalculationInput, "state" | "packedBytes" | "packedOffsets">): number {
    return calculateLegacyEntityM({
      ...input,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  clearEntityRecordTarget(...args: RtArgs<typeof clearEntityRecordTarget>): ReturnType<typeof clearEntityRecordTarget> { return clearEntityRecordTarget(this, ...args); }

  /** Compose the proven f.a(int,boolean) filter with its a(IIZZ) action boundary. */
  filterEntityLifecycle(
    id: number,
    enabled: boolean,
    readEntityCell: (row: number, column: number) => number,
    callbacks: {
      readonly onRecordCompletion?: (record: number) => void;
      readonly onLifecycleReset?: (record: number, enabled: boolean) => void;
    } = {},
  ): void {
    filterLegacyEntityLifecycle({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      entityId: id,
      enabled,
      onAction: (record, entityId, first, second) => {
        transferLegacyEntityAction({
          state: this.denseState,
          entityId: record,
          record: entityId,
          moveFlag: first !== 0,
          resetFlag: second !== 0,
          readEntityCell,
          onRecordCompletion: callbacks.onRecordCompletion,
          onLifecycleReset: callbacks.onLifecycleReset,
        });
      },
    });
  }

  finalizeEntity(...args: RtArgs<typeof finalizeEntity>): ReturnType<typeof finalizeEntity> { return finalizeEntity(this, ...args); }

  entityModeValue(...args: RtArgs<typeof entityModeValue>): ReturnType<typeof entityModeValue> { return entityModeValue(this, ...args); }

  placeEntity(...args: RtArgs<typeof placeEntity>): ReturnType<typeof placeEntity> { return placeEntity(this, ...args); }

  /** Exact f.a(int,int) RNG helper; caller supplies the original mask/divisor. */
  randomRemainder(mask: number, divisor: number): number {
    return legacyRandomRemainder(this.random, mask, divisor);
  }

  /** Raw mode 1..4 coordinate-write segment of b.a(IIII). */
  applyAuxiliaryModeWrites(input: Omit<Parameters<typeof applyLegacyAuxiliaryModeWrites>[0], "dense" | "packedOffsets">): LegacyAuxiliaryModeWriteResult {
    return applyLegacyAuxiliaryModeWrites({
      ...input,
      dense: this.denseState,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Raw mode 6/7 gate segment of b.a(IIII), with opaque owners as callbacks. */
  stepAuxiliaryModes67(input: Omit<LegacyAuxiliaryModes67Input, "dense" | "packedBytes" | "packedOffsets">): boolean {
    return stepLegacyAuxiliaryModes67({
      ...input,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }



  /** Full raw b.a(IIIII) path preparation; a(II) and a(III)B stay callbacks. */
  preparePath(input: Omit<LegacyPathPreparationInput, "f" | "g">): void {
    prepareLegacyPath({
      ...input,
      f: this.subsystemArrays.fByte,
      g: this.subsystemArrays.g,
    });
  }

  /** Raw b.a(II) direction mask/delta helper. */
  preparePathDirection(state: LegacyPathDirectionState, dx: number, dy: number): void {
    setLegacyPathDirection(state, dx, dy);
  }

  /** Raw b.a(III):byte path-cell predicate; u/v remain explicit raw fields. */
  pathCellPredicate(x: number, y: number, mode: number, u: number, v: number): number {
    return legacyPathCellPredicate({
      map: this.gridC,
      packedBytes: this.packedBytes,
      shortOffsets: this.packedOffsets,
      state: this.denseState,
      u,
      v,
      occupancyBits: this.mainArrays.aInt,
    }, x, y, mode);
  }


  /**
   * Compose the proven a(II) -> b.e(int) -> a(IIIII) path-preparation chain
   * against the live b storage.  Packed delta reads and a(III)B remain
   * explicit because their scalar owner is not yet proven at this caller.
   */
  preparePathLive(input: {
    readonly arg1: number;
    readonly arg2: number;
    readonly arg3: number;
    readonly arg4: number;
    readonly mode: number;
    readonly readPackedDelta: (offset: number) => number;
    readonly onCellValue: (x: number, y: number, mode: number) => number;
  }): { readonly directionMask: number; readonly directionDeltas: Int8Array; readonly transitionCount: number } {
    const direction = { a: 0, c: new Int8Array(2) };
    const pathState = { d: 0, c: 0, b: 0, e: 0 };
    const tableState = { a: 0, b: 0, e: 0, f: 0, g: 0, cCursor: 0 };
    prepareLegacyPath({
      ...input,
      pathData: this.subsystemArrays.d,
      eRows: this.subsystemArrays.e,
      eValues: this.subsystemArrays.eByte,
      f: this.subsystemArrays.fByte,
      g: this.subsystemArrays.g,
      h: this.subsystemArrays.h,
      map: this.gridC,
      mapMirror: this.gridB,
      state: pathState,
      onRelativePreparation: (dx, dy) => setLegacyPathDirection(direction, dx, dy),
      onE: (mode) => stepLegacyPathE({
        mode,
        directionMask: direction.a,
        deltas: this.subsystemArrays.fByte,
        c: direction.c,
        dScratch: this.subsystemArrays.dByte,
        pathData: this.subsystemArrays.d,
        eCounts: this.subsystemArrays.eByte,
        map: this.gridC,
        readPackedDelta: input.readPackedDelta,
        onCellValue: input.onCellValue,
        state: tableState,
      }),
      onCellValue: input.onCellValue,
    });
    return {
      directionMask: direction.a,
      directionDeltas: new Int8Array(direction.c),
      transitionCount: pathState.c,
    };
  }

  recordOptions(...args: RtArgs<typeof recordOptions>): ReturnType<typeof recordOptions> { return recordOptions(this, ...args); }

  allocateRecord(
    map: Int8Array[],
    team: number,
    x: number,
    y: number,
    type: number,
    flags: number,
    options: Omit<LegacyRecordAllocatorInput, "state" | "map" | "packedBytes" | "packedOffsets" | "counters" | "randomRemainder">,
  ): number {
    return allocateLegacyRecord({
      ...options,
      state: this.denseState,
      map,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      counters: this.mainArrays.aShort,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
    }, team, x, y, type, flags);
  }

  stepFrame(...args: RtArgs<typeof stepFrame>): ReturnType<typeof stepFrame> { return stepFrame(this, ...args); }

  /**
   * private void j() (#613): h() runs it for v == 1, and Q() runs it during
   * cutscenes (v == 0) once aR > 0 -- which is how the world keeps moving
   * behind a dialogue. Shared by both call sites since 2026-10-08 (oracle).
   */
  stepOriginalJ(): void {
    this.stepFrame({
      map: this.gridC,
      // f.j() offset 134: f.c(int,int,int,int), the repaint of a cleared
      // -114..-116 cell. Wired 2026-09-27.
      repairCell: (x, y, width, height) => this.repaintRect(x, y, width, height),
      // f.j() offsets 143..167: `if (P && w != 4 && w != 3) Z();`
      // (invokespecial #428). WIRED 2026-09-14: LegacyFrameStep already
      // called `flushPending?.()` and cleared P afterwards, but no caller
      // ever supplied it, so Z() never ran from here. That is what kept the
      // Build submenu empty: af()'s `r[as] == 10` branch only sets flag 6
      // and P, relying on this call to rebuild r[] from table 137.
      flushPending: () => { this.stepFrameSelectionTransition(); },
      // b.g()/b.e()/b.h()/b.i(), all four originally wrapped in ONE
      // shared try/catch inside f.j() itself (confirmed via direct
      // bytecode read, f-javap.txt offsets 0..28 -> 31, pop) -- which
      // is exactly this stepFrame() call's own try/catch around
      // updateSubsystem(), so it doesn't need a second one here.
      // b.g() (LegacySubsystemBuildingEconomy.ts) calls b.n()
      // (LegacySubsystemVoidN.ts) whenever game.missionFrame%10===0.
      // RETRACTED (2026-09-04/05): n() is NOT a guaranteed throw (its
      // own c:[[[B]#151 field is not permanently null -- see that
      // file's own docblock); it now runs its real spatial-hash
      // rebuild every 10th tick instead of skipping e()/h()/i()
      // (stepSubsystemFrame()) for that tick. RETRACTED (2026-09-07):
      // the line that used to be here ("every other tick, g() absorbs
      // its own separate b.ax() throw internally") is also gone --
      // ax() is not a guaranteed throw (see LegacySubsystemAx.ts) and
      // now runs for real every tick.
      updateSubsystem: () => {
        stepBuildingEconomy(this);
        this.stepSubsystemFrame();
      },
    });
  }

  stepGameplayFrame(...args: RtArgs<typeof stepGameplayFrame>): ReturnType<typeof stepGameplayFrame> { return stepGameplayFrame(this, ...args); }

  stepGameplayZAe(...args: RtArgs<typeof stepGameplayZAe>): ReturnType<typeof stepGameplayZAe> { return stepGameplayZAe(this, ...args); }

  /** `f.aJ():V` (UPPERCASE, constant-pool #491, `stepLegacyAj`), reused by `af()`'s several branches. */
  runAjUpper(): void {
    const g = this.game;
    const ajState = {
      uFlag: g.boxSelecting, F: g.selectionGroup, k: g.kByte,
      E: g.ECounter, D: g.DCounter, C: g.CCounter, B: g.BCounter,
    };
    stepLegacyAj(ajState);
    g.boxSelecting = ajState.uFlag;
    g.selectionGroup = ajState.F;
    g.kByte = ajState.k;
    g.ECounter = ajState.E;
    g.DCounter = ajState.D;
    g.CCounter = ajState.C;
    g.BCounter = ajState.B;
  }

  subsystemBC(...args: RtArgs<typeof subsystemBC>): ReturnType<typeof subsystemBC> { return subsystemBC(this, ...args); }

  stepGameplayZAf(...args: RtArgs<typeof stepGameplayZAf>): ReturnType<typeof stepGameplayZAf> { return stepGameplayZAf(this, ...args); }

  stepFrameSelectionTransition(...args: RtArgs<typeof stepFrameSelectionTransition>): ReturnType<typeof stepFrameSelectionTransition> { return stepFrameSelectionTransition(this, ...args); }


  /**
   * Exact `private void a(boolean×9)` (constant pool #464) -- the REAL
   * method `stepLegacySelectionFlags` models. CORRECTION (2026-08-18):
   * a docblock here previously claimed this was `a(boolean,boolean,
   * boolean,boolean)` (#434) -- that IS a real, separate method, but
   * direct bytecode read confirms it's a trivial 4-arg convenience
   * wrapper (`iload_1..4; iconst_0×5; invokespecial #464`) that just
   * calls THIS 9-arg method with the last 5 args hardcoded false. Every
   * call site through 2026-08-18 only ever passed 4 args (defaulting the
   * rest to false via the JS default params, matching the wrapper's own
   * behavior) until `f.W()`'s `staticL` branch (`onSelectionPreset`) was
   * traced and found to call the 9-arg form DIRECTLY with `fifth=true`
   * (`iconst_1,0,0,0,1,0,0,0,0`) -- a real, non-default value the 4-arg
   * wrapper can never produce, requiring this signature to actually
   * expose all 9 params, not just 4.
   */
  /**
   * f.ai()'s own a(ZZZZZZZZZ) (#464, offset 145: a villager item turns the
   * unit panel on) and a(ZZZZ) (#434, offset 170). WIRED 2026-10-08: both
   * ai() call sites passed no callbacks, so browsing VILLAGERS never showed
   * the browsed villager's panel.
   */
  aiFlagCallbacks() {
    return {
      onNineFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
        this.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
      onFourFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean) => this.runSelectionFlagsRefresh(a, b, c, d),
    };
  }

  runSelectionFlagsRefresh(...args: RtArgs<typeof runSelectionFlagsRefresh>): ReturnType<typeof runSelectionFlagsRefresh> { return runSelectionFlagsRefresh(this, ...args); }

  stepLegacySceneAnimatedSlotClear(...args: RtArgs<typeof stepLegacySceneAnimatedSlotClear>): ReturnType<typeof stepLegacySceneAnimatedSlotClear> { return stepLegacySceneAnimatedSlotClear(this, ...args); }

  stepLegacyBL(...args: RtArgs<typeof stepLegacyBL>): ReturnType<typeof stepLegacyBL> { return stepLegacyBL(this, ...args); }

  stepLegacyBM(...args: RtArgs<typeof stepLegacyBM>): ReturnType<typeof stepLegacyBM> { return stepLegacyBM(this, ...args); }

  stepEntityRemoval(...args: RtArgs<typeof stepEntityRemoval>): ReturnType<typeof stepEntityRemoval> { return stepEntityRemoval(this, ...args); }

  /**
   * Exact final void b(int) (bytecode/f-javap.txt offsets 0..417, the FULL
   * method -- both signs of `value` and their shared offset-54 tail).
   *
   * UNIFICATION (2026-08-31): this method used to be a second, incomplete
   * port of `f.b(int)` -- only its own S()/T() dispatch for non-negative
   * `value` (offsets 0..~54), immediately `return`ing on negative `value`
   * with the comment "negative branch: unrelated, not ported". That was
   * itself already corrected once (see the 2026-08-31 commit routing
   * `ao()`'s `onB(-1)` to `stepSubsystemStateCommand` instead), but this
   * method's OWN body still duplicated S()/T() via a second, independently
   * bytecode-derived set of helpers (`stepLegacyS`, `stepLegacyTAi3/37/38/
   * 45/48`) that wrote into `game.*` fields, while `stepSubsystemStateCommand`
   * -- reachable only from `ao()`'s onB and from `stepStateU`'s own
   * recursive `onB` -- used `stepLegacyStateS`/`stepLegacyStateT` writing
   * into the separate `stateCommandState` bag. Same real fields (`ai:B`
   * #200, `aj:B` #202, `ak:B` #204, etc.), two storage locations that never
   * saw each other's writes: this method's own positive calls (S()'s own
   * `ak=0`/`aj=pageCount` reset) landed in `game.akByte`/`game.ajByte`,
   * while `ao()`'s negative paging calls read/wrote `stateCommandState.ak`/
   * `.aj` -- so the page counter `ao()` paged against was permanently stuck
   * at its zero default, `ak===aj-1` never held, and `U()` (which fires the
   * `Q` transition once paging completes) never ran. This is why Q=18
   * paged forever. Re-deriving `stepLegacyS` against the real bytecode
   * while investigating also turned up an independent real bug in it (an
   * inverted condition AND a missing `ao:B` field write at offsets 83..127
   * -- see the deleted method's git history), so it was not even a
   * faithful duplicate, just a duplicate.
   *
   * Now delegates entirely to `stepSubsystemStateCommand`, the complete,
   * single, bytecode-faithful port (`LegacyStateTransitionCommand.ts` +
   * `LegacyStateS.ts` + `LegacyStateT.ts` + `LegacyStateU.ts`, all writing
   * through the shared `stateCommandState` bag which `stepSubsystemStateCommand`
   * syncs in/out of `game.*` around the call) -- the exact same pattern
   * `ao()`'s onB already established. All of this method's own real
   * callers (`am()`'s `onBByte`, `i()`'s and `b.i()`'s own `onFByte`,
   * `aq()`'s `onEntitySignal`) only ever pass non-negative `value`, so this
   * change is purely additive for them (they now also get the previously-
   * missing offset-54+ shared tail and the ai===45 bugfix below), while
   * `ao()`'s own onB(-1) is unaffected (same underlying function either way).
   */
  runSceneDispatch(value: number): void {
    this.stepSubsystemStateCommand(value);
  }


  stepLegacyD3(...args: RtArgs<typeof stepLegacyD3>): ReturnType<typeof stepLegacyD3> { return stepLegacyD3(this, ...args); }

  stepLegacyO(...args: RtArgs<typeof stepLegacyO>): ReturnType<typeof stepLegacyO> { return stepLegacyO(this, ...args); }

  stepLegacyL(...args: RtArgs<typeof stepLegacyL>): ReturnType<typeof stepLegacyL> { return stepLegacyL(this, ...args); }

  stepLegacyX(...args: RtArgs<typeof stepLegacyX>): ReturnType<typeof stepLegacyX> { return stepLegacyX(this, ...args); }

  stepLegacyD(...args: RtArgs<typeof stepLegacyD>): ReturnType<typeof stepLegacyD> { return stepLegacyD(this, ...args); }

  stepLegacyE(...args: RtArgs<typeof stepLegacyE>): ReturnType<typeof stepLegacyE> { return stepLegacyE(this, ...args); }

  stepLegacyA2(...args: RtArgs<typeof stepLegacyA2>): ReturnType<typeof stepLegacyA2> { return stepLegacyA2(this, ...args); }

  stepLegacyF(...args: RtArgs<typeof stepLegacyF>): ReturnType<typeof stepLegacyF> { return stepLegacyF(this, ...args); }

  stepLegacyC2(...args: RtArgs<typeof stepLegacyC2>): ReturnType<typeof stepLegacyC2> { return stepLegacyC2(this, ...args); }


  /** Exact f.h() maintenance call: f.a(100,0,0,0). */
  stepByteActionQueueMaintenance(): void {
    this.runByteActionQueue(100, 0, 0, 0);
  }

  runByteActionQueue(...args: RtArgs<typeof runByteActionQueue>): ReturnType<typeof runByteActionQueue> { return runByteActionQueue(this, ...args); }

  stepSubsystemFrame(...args: RtArgs<typeof stepSubsystemFrame>): ReturnType<typeof stepSubsystemFrame> { return stepSubsystemFrame(this, ...args); }

  /**
   * b.e()'s decision-check step: composes the currently-ported b()
   * segments (extracted from stepSubsystemFrame's onEntityDecisionCheck
   * callback so it can be exercised directly, e.g. by
   * verify-subsystem-b-wiring.mjs).
   *
   * onRawAction/onQueue (2026-08-18): traced to b.a(int,byte) (void,
   * offset 5985..6092) and b.Q() (offset 0..39) via raw bytecode -- both
   * already ported (LegacyEntityTypeChange.ts/changeEntityType,
   * LegacyEntityModePromotion.ts/selectEntityTypeAfterQ) but never wired
   * to a live caller until now.
   *
   * onBBoolean (2026-08-18, continued; fully rederived 2026-09-07): traced
   * to b.b(boolean) (offset 0..364) -- ported as stepLegacySubsystemBBoolean,
   * a real closest-scored-candidate scan over dense's 9833/9733/9783
   * scratch table. See LegacySubsystemBBoolean.ts's own docblock for the
   * full derivation.
   *
   * onGroupMode (2026-08-18, continued): traced to b.g(int) (offset
   * 0..317) -- already ported as stepLegacyEntityGPrefix, now wired via
   * `subsystemG` (own doc below); its `onD` sub-callback is also newly
   * ported+wired for real (`subsystemD`/`subsystemK`, b.d(int,int) and
   * b.k(int)).
   *
   * onEntityTransform (2026-08-18, RETRACTED-PREMISE 2026-09-07): traced
   * to `b.a(int,int,boolean)`/`subsystemEntityTransform`, previously
   * believed a 100%-unconditional guaranteed throw -- it is not, see that
   * method's own corrected docblock. Now wired for real; args forwarded.
   */
  /**
   * `private boolean a(int,boolean,int)` (#292) with its check b(int,boolean,int)
   * (#344) -- LegacyEntityResourceCost.ts. `v` is b.v:I at the call site: the
   * record for ab(), the unit itself for i()Z. V:I/W:I are written before they
   * are read inside one call, so each call gets fresh ones.
   */
  entityCostInput(v: number) {
    return {
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      team: this.game.bTeam,
      v,
      pool: this.mainArrays.aShort,
      dShort: this.subsystemArrays.dShort,
      scratch: { V: 0, W: 0 },
      onNotify: () => this.runByteActionQueue(9, 0, 0, 0),
      R: (() => { const g = this.game; return { get value() { return g.subsystemR; }, set value(v: number) { g.subsystemR = v; } }; })(),
    };
  }

  payEntityCost(...args: RtArgs<typeof payEntityCost>): ReturnType<typeof payEntityCost> { return payEntityCost(this, ...args); }

  gainEntitySlotSkills(...args: RtArgs<typeof gainEntitySlotSkills>): ReturnType<typeof gainEntitySlotSkills> { return gainEntitySlotSkills(this, ...args); }

  gainEntitySkill(...args: RtArgs<typeof gainEntitySkill>): ReturnType<typeof gainEntitySkill> { return gainEntitySkill(this, ...args); }


  /**
   * b.l(int) (#399, bytecode/b-javap.txt 33922, offsets 0..340): take animal
   * `a` off the map -- free the step cell it reserved (-128) while less than
   * half way through a step, clear its own cell and e[9513+a], and count its
   * species f.t[e[9469+a]] down when that index is below t202[q]. Ported
   * 2026-09-27 for vacate (kind 106) and b.l()/b.m()'s 22-animal pass.
   * Offset 20 compares e[9623+a] unmasked (the load rebuild masks it).
   */
  removeAnimal(a: number): void {
    const e = this.denseState;
    const t = (row: number, index: number) => this.packedBytes[(this.packedOffsets[row] ?? 0) + index] ?? 0;
    const c = this.gridC;
    const dir = e[9491 + a] ?? 0;
    if (((e[9557 + a] ?? 0) & 255) <= 7 &&
        (e[9623 + a] ?? 0) < Math.trunc((t(15, (dir & 1) * 9 + t(179, e[ANIMAL_KIND + a] ?? 0)) + 1) / 2)) {
      const ny = (e[ANIMAL_Y + a] ?? 0) + t(1, 8 + dir);
      const nx = (e[ANIMAL_X + a] ?? 0) + t(1, dir);
      if (c[ny]?.[nx] === -128) c[ny]![nx] = 0;
    }
    const row = c[e[ANIMAL_Y + a] ?? 0];
    if (row) row[e[ANIMAL_X + a] ?? 0] = 0;
    e[ANIMAL_HP + a] = 0;
    const species = e[9469 + a] ?? 0;
    if (species < t(202, this.game.mission)) {
      const counts = this.game.subsystemT; // f.t:[B (#368)
      counts[species] = counts[species]! - 1;
    }
  }

  /**
   * b.a(int,int,int) (#266) -- LegacySubsystemEntityOccupancyCheck.ts, with
   * its q:B/r:B (#212/#215) writes landing in subsystemArrays for d(int).
   */
  occupancyCheck(id: number, x: number, y: number, arg3: number): number {
    return stepLegacySubsystemEntityOccupancyCheck(
      this.denseState, this.packedBytes, this.packedOffsets, this.saveOffsets, id, x, y, arg3, this.subsystemArrays,
    );
  }

  /**
   * f.a(int,int,int,int) (#301, bytecode/f-javap.txt 6923, offsets 0..85):
   * the first free slot of f.d:[[B (row 0 == 0, 40 slots) gets row 1 = 0,
   * row 0 = frame record, row 2 = offset, row 6 = kind, row 5 = target;
   * f.r() (LegacyAnimatedSlotScan.ts) animates and draws it. Full: nothing.
   */
  allocateEffectSlot(target: number, kind: number, offset: number, frame: number): void {
    const d = this.mainArrays.d;
    for (let slot = 0; slot < 40; slot += 1) {
      if ((d[0]![slot] ?? 0) !== 0) continue;
      d[1]![slot] = 0;
      d[0]![slot] = toJavaByte(frame);
      d[2]![slot] = toJavaByte(offset);
      d[6]![slot] = toJavaByte(kind);
      d[5]![slot] = toJavaByte(target);
      return;
    }
  }

  /** f.a(int,int,int,byte) (#299) on the live grid -- LegacySpecialTileAllocator.ts. */
  placeGroundSlot(kind: number, x: number, y: number, amount: number): number {
    return allocateLegacySpecialTile(this.denseState, (cx, cy, value) => {
      const row = this.gridC[cy];
      if (row && cx >= 0 && cx < row.length) row[cx] = value;
    }, { type: kind, x, y, parameter: amount });
  }

  vacateEntity(...args: RtArgs<typeof vacateEntity>): ReturnType<typeof vacateEntity> { return vacateEntity(this, ...args); }

  entityDeathCleanup(...args: RtArgs<typeof entityDeathCleanup>): ReturnType<typeof entityDeathCleanup> { return entityDeathCleanup(this, ...args); }

  entityHealthDelta(...args: RtArgs<typeof entityHealthDelta>): ReturnType<typeof entityHealthDelta> { return entityHealthDelta(this, ...args); }

  stepEntityKPredicate(...args: RtArgs<typeof stepEntityKPredicate>): ReturnType<typeof stepEntityKPredicate> { return stepEntityKPredicate(this, ...args); }


  checkEntityNeeds(...args: RtArgs<typeof checkEntityNeeds>): ReturnType<typeof checkEntityNeeds> { return checkEntityNeeds(this, ...args); }

  stepEntityDecisionCheck(...args: RtArgs<typeof stepEntityDecisionCheck>): ReturnType<typeof stepEntityDecisionCheck> { return stepEntityDecisionCheck(this, ...args); }









  subsystemBVoid(...args: RtArgs<typeof subsystemBVoid>): ReturnType<typeof subsystemBVoid> { return subsystemBVoid(this, ...args); }

  subsystemU(...args: RtArgs<typeof subsystemU>): ReturnType<typeof subsystemU> { return subsystemU(this, ...args); }

  subsystemBTeamSweep(...args: RtArgs<typeof subsystemBTeamSweep>): ReturnType<typeof subsystemBTeamSweep> { return subsystemBTeamSweep(this, ...args); }

  subsystemK(...args: RtArgs<typeof subsystemK>): ReturnType<typeof subsystemK> { return subsystemK(this, ...args); }

  subsystemD(...args: RtArgs<typeof subsystemD>): ReturnType<typeof subsystemD> { return subsystemD(this, ...args); }


  animalRoam(...args: RtArgs<typeof animalRoam>): ReturnType<typeof animalRoam> { return animalRoam(this, ...args); }

  runAuxiliaryPlacement(...args: RtArgs<typeof runAuxiliaryPlacement>): ReturnType<typeof runAuxiliaryPlacement> { return runAuxiliaryPlacement(this, ...args); }


  /** b.B:B (#9) / b.z:B (#235) / b.A:B (#6), live, for `h()`'s own writes. */
  spotAlertScratch(): { B: number; z: number; A: number } {
    const game = this.game;
    const arrays = this.subsystemArrays;
    return {
      get B() { return game.subsystemB; }, set B(value: number) { game.subsystemB = value; },
      get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
      get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
    };
  }

  entityRecordLifecycleInput(...args: RtArgs<typeof entityRecordLifecycleInput>): ReturnType<typeof entityRecordLifecycleInput> { return entityRecordLifecycleInput(this, ...args); }


  entityTypeReaction(...args: RtArgs<typeof entityTypeReaction>): ReturnType<typeof entityTypeReaction> { return entityTypeReaction(this, ...args); }

  subsystemT(...args: RtArgs<typeof subsystemT>): ReturnType<typeof subsystemT> { return subsystemT(this, ...args); }

  /**
   * f.c(int,int,int,int) (#357, LegacyEffectRectMark.ts): mark the cells of a
   * rectangle inside the viewport for redraw and set B:Z.
   */
  repaintRect(x: number, y: number, width: number, height: number): void {
    const g = this.game;
    const bounds = { originColumn: g.cameraColumn, originRow: g.cameraRow, columns: g.viewColumns, rows: g.viewRows };
    const rectState = { boolGrid: this.effectRectBoolGrid, originColumn: g.cameraColumn, originRow: g.cameraRow, B: g.cameraBFlag };
    stepLegacyCRect(x, y, width, height, rectState, {
      isBlocked: (bx, by) => isLegacyWithinViewport(bounds, bx, by),
    });
    g.cameraBFlag = rectState.B;
  }

  /** b's `private void c(boolean)` (#361): pick team 0's best adults into e[1..3]. */
  pickAdults(flag: boolean): void {
    refreshLegacyAuxiliaryTag({
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
      auxiliaryRows: this.subsystemArrays.eRows,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
    }, this.auxiliaryQueueState, flag);
  }

  /** b's `private void b(int,int,int)` (#342). */
  auxiliaryCandidates(first: number, second: number, third: number): void {
    selectLegacyAuxiliaryCandidates({
      p: this.auxiliaryScratch,
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
    }, this.auxiliaryQueueState, first, second, third);
  }

  /** b's `private boolean u()` (#419) -- mission 4's script, LegacySubsystemU.ts. */
  missionScriptU(): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    const queue = this.auxiliaryQueueState;
    return stepLegacySubsystemU({
      state: this.denseState,
      aShort: this.mainArrays.aShort,
      aInt: this.mainArrays.aInt,
      eRows: arrays.eRows,
      fP: this.auxiliaryScratch,
      frame: game.missionFrame,
      bField28: arrays.bField28,
      fields: {
        get R() { return game.subsystemRByte; }, set R(v: number) { game.subsystemRByte = v; },
        get f() { return game.subsystemGFFlagByte; }, set f(v: number) { game.subsystemGFFlagByte = v; },
        get N() { return queue.N; }, set N(v: number) { queue.N = v; },
      },
      onAuxiliary: (first, second, third) => this.auxiliaryCandidates(first, second, third),
      onScene: (value) => this.runSceneDispatch(value),
      onPickAdults: (flag) => this.pickAdults(flag),
    });
  }

  /** b's `private boolean v()` (#421) -- the mission script step, LegacySubsystemV.ts. */
  missionScriptV(): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    const queue = this.auxiliaryQueueState;
    return stepLegacySubsystemV({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      aShort: this.mainArrays.aShort,
      eRows: arrays.eRows,
      fP: this.auxiliaryScratch,
      q: game.mission,
      frame: game.missionFrame,
      bField28: arrays.bField28,
      fields: {
        get f() { return game.subsystemGFFlagByte; }, set f(v: number) { game.subsystemGFFlagByte = v; },
        get F() { return arrays.bField16; }, set F(v: number) { arrays.bField16 = v; },
        get N() { return queue.N; }, set N(v: number) { queue.N = v; },
        get I() { return game.subsystemGCurrentI; }, set I(v: number) { game.subsystemGCurrentI = v; },
        get aw() { return game.levelAwByte; }, set aw(v: number) { game.levelAwByte = v; },
      },
      onPlaceStep: (first, second, x, y) => this.runAuxiliaryPlacement(first, second, x, y, game.bUnit),
      onCoordinateSync: (id, flag) => syncLegacySubsystemBCoordinate({
        dense: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
        // a(int,boolean) offset 286: a(id, 69) (#275), wired 2026-09-27.
        onSpawnMark: (unit) => this.changeEntityType(unit, 69),
      }, id, flag),
      onFPair: (x, y) => this.stepFPairCommand({}, x, y),
      onSpawn: (count, x, y, team, value) => this.batchAllocate(count, x, y, team, value),
      onRecord: (team, x, y, type, flags) => {
        this.allocateRecord(this.gridC, team, x, y, type, flags, this.recordOptions());
      },
      onAuxiliary: (first, second, third) => this.auxiliaryCandidates(first, second, third),
      onPickAdults: (flag) => this.pickAdults(flag),
      onScene: (value) => this.runSceneDispatch(value),
    });
  }

  entityMove(...args: RtArgs<typeof entityMove>): ReturnType<typeof entityMove> { return entityMove(this, ...args); }

  entityActionPrompt(...args: RtArgs<typeof entityActionPrompt>): ReturnType<typeof entityActionPrompt> { return entityActionPrompt(this, ...args); }

  batchAllocate(...args: RtArgs<typeof batchAllocate>): ReturnType<typeof batchAllocate> { return batchAllocate(this, ...args); }

  entityAp(...args: RtArgs<typeof entityAp>): ReturnType<typeof entityAp> { return entityAp(this, ...args); }

  entityProduceItem(...args: RtArgs<typeof entityProduceItem>): ReturnType<typeof entityProduceItem> { return entityProduceItem(this, ...args); }

  entityStrikeGate(...args: RtArgs<typeof entityStrikeGate>): ReturnType<typeof entityStrikeGate> { return entityStrikeGate(this, ...args); }





  stepSubsystemN(...args: RtArgs<typeof stepSubsystemN>): ReturnType<typeof stepSubsystemN> { return stepSubsystemN(this, ...args); }

  /**
   * Shared input for `stepLegacySubsystemScore` (b's `b(IIII)` #332, and its
   * four now-ported callees #267/#268/#264/#366) at both of its call sites
   * (`onO`'s inline callback above and `stepSubsystemP` below). `id` is the
   * ambient entity id (`v:I`#225) both #267 and #268 read as `entityId` --
   * passed through explicitly rather than via `game.bUnit`, see
   * LegacySubsystemScore.ts's own docblock for why. `dByte`/`gridC` are
   * #264's own storage (`LegacySubsystemPairSetup.ts`); `bThreshold` is
   * `b.B:I`(#8), #366's threshold, precomputed the same way
   * `LegacySubsystemP.ts`'s own wiring already does.
   */
  legacySubsystemScoreInput(id: number): LegacySubsystemScoreInput {
    return {
      dRows: this.subsystemArrays.dRows,
      localFlags: this.game.subsystemBLocalFlags,
      q: this.game.mission,
      dCube: this.subsystemArrays.d,
      eCube: this.subsystemArrays.e,
      aCube: this.subsystemArrays.a,
      bCube: this.subsystemArrays.b,
      gridB: this.gridB,
      gridC: this.gridC,
      gArr: this.subsystemArrays.g,
      hArr: this.subsystemArrays.h,
      fByte: this.subsystemArrays.fByte,
      eByte: this.subsystemArrays.eByte,
      dByte: this.subsystemArrays.dByte,
      dense: this.denseState,
      entityId: id,
      bThreshold: this.subsystemArrays.bField8,
      bScalars: this.subsystemArrays,
      // #380 (stepLegacySubsystemFCall)'s own needs -- see
      // LegacySubsystemFlagPass.ts, and the identical checkLegacyCellCompatibility
      // wiring already used by stepSubsystemP's onNearestCandidate below.
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      visibilityBits: this.mainArrays.aInt,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      team: this.game.bTeam,
      // #264's own two callees, WIRED 2026-09-10. Both had been ported for
      // weeks and left as unsupplied `?.()` optionals, which is why
      // `eByte`/`fByte` were still all zeros in live play: with `onE` inert,
      // #264 fell straight out at its `if (eByte[g[0]] <= 0) return;` (offset
      // 188..199), so `c:B`(bField144) stayed 0, #332 returned 0, and
      // `dense[808 + id]` -- the step direction `b.u()` gates every move on --
      // was never written. See docs/unknowns.md's 2026-09-10 entry.
      onRelativePreparation: (dx, dy) => setLegacyPathDirection(this.pathDirection, dx, dy),
      onE: (mode) => runPathTables(this, mode, id),
      // d(int) (#366)'s a(int,int,int) (#266) calls, offsets 28 and 434.
      // Wired 2026-09-28: unwired, q:B/r:B stayed 0 and every path candidate
      // was scored by its distance to (0,0).
      onComputeQR: (x, y, arg3) => this.occupancyCheck(id, x, y, arg3),
    };
  }


  /**
   * private void p() (offsets 0..1906). CORRECTION (2026-08-22): `o()`
   * (offset 0..3, `p()`'s own unconditional first call) was ported
   * (`stepLegacySubsystemBVoidO`) but never actually invoked anywhere --
   * the old docblock's "already wired separately" claim was aspirational,
   * not true; confirmed via grep, zero real call sites. Now called here,
   * first, matching the real bytecode order. Wired 2026-08-21 into
   * `private boolean b()`'s own real `onP` boundary. `qByte` (`b.Q:B`#46)
   * and `fByte` (`b.f:B`#167) are shared class-b singleton scratch state,
   * not individually traced beyond their confirmed default (-1/0, from
   * `final void a()`'s entity-slot reset) -- see
   * `game.subsystemBQByte`/`game.subsystemGFFlagByte`'s own docblocks.
   */
  /**
   * `private void F()` (#242) as `D()`'s `onF`, for one entity. Shared by
   * u()'s own D() call and a(byte)'s (#285) D() call for the displaced
   * occupant.
   */
  /** f.h(int) (#390): `f(id); e(id);` -- clear the unit from the player's selection. */
  releaseEntitySelection(entityId: number): void {
    const result = finalizeLegacyEntitySelection({
      id: entityId,
      k: this.game.kByte,
      w: this.game.barMode,
      l: this.game.selectedId,
      q: this.game.qCounter,
      dense: this.denseState,
      onSelectionReset: () => { this.runSelectionFlagsRefresh(true, true, false, false); },
    });
    this.game.kByte = result.k;
    this.game.barMode = result.w;
    this.game.selectedId = result.l;
    releaseLegacyEntitySelection({
      groups: this.mainArrays.aByte,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      id: entityId,
      F: this.game.selectionGroup,
      w: this.game.barMode,
      onModeReset: () => { this.game.barMode = 0; },
      onFReset: () => { this.game.selectionGroup = -1; },
    });
  }

  entityMoveCancel(...args: RtArgs<typeof entityMoveCancel>): ReturnType<typeof entityMoveCancel> { return entityMoveCancel(this, ...args); }

  stepSubsystemP(...args: RtArgs<typeof stepSubsystemP>): ReturnType<typeof stepSubsystemP> { return stepSubsystemP(this, ...args); }

  subsystemH(...args: RtArgs<typeof subsystemH>): ReturnType<typeof subsystemH> { return subsystemH(this, ...args); }

  nearestCandidate(...args: RtArgs<typeof nearestCandidate>): ReturnType<typeof nearestCandidate> { return nearestCandidate(this, ...args); }

  buildingPlacementOptions(...args: RtArgs<typeof buildingPlacementOptions>): ReturnType<typeof buildingPlacementOptions> { return buildingPlacementOptions(this, ...args); }


  subsystemG(...args: RtArgs<typeof subsystemG>): ReturnType<typeof subsystemG> { return subsystemG(this, ...args); }


  subsystemEntityTransform(...args: RtArgs<typeof subsystemEntityTransform>): ReturnType<typeof subsystemEntityTransform> { return subsystemEntityTransform(this, ...args); }

  subsystemEntityJTrigger(...args: RtArgs<typeof subsystemEntityJTrigger>): ReturnType<typeof subsystemEntityJTrigger> { return subsystemEntityJTrigger(this, ...args); }

  subsystemEntityAAlert(...args: RtArgs<typeof subsystemEntityAAlert>): ReturnType<typeof subsystemEntityAAlert> { return subsystemEntityAAlert(this, ...args); }






  /** Raw f.b(int,boolean) entity-mode entry point. */
  setEntityMode(
    id: number,
    enabled: boolean,
    callbacks: Omit<LegacyEntityModeInput, "state" | "packedBytes" | "packedOffsets"> = {},
  ): void {
    setLegacyEntityMode({
      ...callbacks,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    }, id, enabled);
  }

  /** Keep the decoded /pd0 archive available without flattening unrelated tables. */
  withPackedData(data: PackedData): LegacyRuntimeState {
    if (data.shortTables.length !== 11 || data.byteTables.length !== 25) {
      throw new RangeError("/pd0 table count does not match the confirmed f.g layout");
    }
    // e.c() offsets 6..110, the frame-geometry block. Applied here because
    // this is the first call in both boot chains, which matches the real
    // ordering: f.run() offset 1 calls f.f(), f.f() offset 17 does
    // `new e(this)`, and e's constructor calls e.c() at its offset 310 --
    // so e.c() is the very first thing run() causes to happen, ahead of
    // f.g() (offset 5) and the d(0)/d(1)/d(2) record loads (offsets 16..35)
    // that this chain's loadOriginalStartupStores() mirrors. Until
    // 2026-09-09 this block was never ported at all, so `viewportO`/
    // `viewportP` (f.O:B/f.P:B) sat at 0 -- see applyLegacyFrameGeometry's
    // own docblock for why grepping class f alone never turns up a writer.
    applyLegacyFrameGeometry(this.game);
    const layout = deriveLegacyFrameLayout(data.shortTables, data.byteTables);
    this.game.frameLayoutAV = layout.aV;
    this.game.frameLayoutAU = layout.aU;
    return Object.assign(this, { packedData: data });
  }

  hydrateGameplayRecord(...args: RtArgs<typeof hydrateGameplayRecord>): ReturnType<typeof hydrateGameplayRecord> { return hydrateGameplayRecord(this, ...args); }


  snapshotGameplayRecord(...args: RtArgs<typeof snapshotGameplayRecord>): ReturnType<typeof snapshotGameplayRecord> { return snapshotGameplayRecord(this, ...args); }

  loadGameplayFromStore(...args: RtArgs<typeof loadGameplayFromStore>): ReturnType<typeof loadGameplayFromStore> { return loadGameplayFromStore(this, ...args); }


  runSubsystemJ(...args: RtArgs<typeof runSubsystemJ>): ReturnType<typeof runSubsystemJ> { return runSubsystemJ(this, ...args); }

  saveGameplayToStore(...args: RtArgs<typeof saveGameplayToStore>): ReturnType<typeof saveGameplayToStore> { return saveGameplayToStore(this, ...args); }

  /** Replay the confirmed private f.d(0) slot-0 load performed by f.run(). */
  loadProgressFromStore(): LegacyRuntimeState {
    const record = this.progressStore.load();
    this.progressStoreLoaded = record !== undefined;
    if (!record) return this;
    // l:I (#334) is the hint toggle game.lInt; s/t/p:B are sByte/tByte/
    // persistedPByte (their progressL/S/T/P/W mirrors were removed 2026-09-24:
    // the save below wrote those never-updated copies back).
    this.game.lInt = record.l;
    this.game.progressR = record.r;
    this.game.progressV = record.V;
    this.game.progressC = record.c;
    // f.d(0) writes these same decoded values into the live fields used by
    // ao()/au(), not into a detached persistence DTO.
    this.game.actionWFlag = record.W;
    this.game.sByte = record.s;
    this.game.tByte = record.t;
    this.game.persistedPByte = record.p;
    return this;
  }

  /** Mirror f.run(): d(1) only after a missing d(0), then always d(2). */
  loadOriginalStartupStores(): LegacyRuntimeState {
    if (!this.progressStoreLoaded) this.loadGameplayFromStore(1);
    this.loadGameplayFromStore(2);
    return this;
  }

  withImageGroups(pi0: ImagePack, pi9: ImagePack, pi8: ImagePack): LegacyRuntimeState {
    this.imageGroups[0] = pi0;
    this.imageGroups[1] = pi9;
    this.imageGroups[2] = pi8;
    return this;
  }

  withMaResource(resource: MaResource): LegacyRuntimeState {
    this.maResource = resource;
    return this;
  }

  withMidiResource(resource: MidiResource): LegacyRuntimeState {
    this.midiResource = resource;
    return this;
  }

  /** Keep the original c.b(0/1/2) sources available without flattening them. */
  withLanguageResources(s: DelimitedTable, t: DelimitedTable, d0: DelimitedTable): LegacyRuntimeState {
    this.languageResources = { s, t, d0 };
    return this;
  }

  /** Every JAR language set, so the Q14 choice (f.a:B) can switch c.b()'s source. */
  withLanguageTables(tables: readonly { readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable }[]): LegacyRuntimeState {
    this.languageTables = tables;
    return this;
  }

  /** The Chinese strings (docs/translation-zh-CN.json); enables Q14's sixth row. */
  withZhTranslation(file: ZhTranslationFile): LegacyRuntimeState {
    this.zhStrings = new ZhStrings(file);
    // Widths and painting are always available (Q14 shows 中文 in every language); selectLanguage()
    // decides whether records are replaced.
    this.geometry.zh = { tokens: () => null, width: (tokens, font) => tokensWidth(this, font, tokens, (text) => this.zhPainter.measure(text)) };
    this.geometryRenderer.zhPaint = (graphics, imageGroup0, font, tokens, m, n) => paintZhLine(graphics, this.zhPaintBase(imageGroup0), font, tokens, m, n);
    return this;
  }

  /**
   * f.a:B = language (ao()'s Q14 choice). 0..4 switch c.b()'s source to that JAR language;
   * ZH_LANGUAGE keeps language 0's English bytes underneath and draws the Chinese strings.
   */
  selectLanguage(language: number): void {
    this.language = language;
    const zh = language === ZH_LANGUAGE && this.zhStrings ? this.zhStrings : null;
    const tables = this.languageTables?.[zh ? 0 : language];
    if (tables) this.languageResources = tables;
    const translate = (code: number) => this.packedBytes[this.packedOffsets[280] + code] ?? 0;
    if (this.geometry.zh) {
      this.geometry.zh = {
        ...this.geometry.zh,
        tokens: zh ? (record) => { const text = zh.label(record); return text === null ? null : tokenizeZh(text, translate); } : () => null,
      };
    }
    this.zhCompose = zh ? {
      tokens: (record) => { const text = zh.paragraph(record); return text === null ? null : tokenizeZh(text, translate); },
      wrap: (tokens, lineWidth, font) => wrapZh(this, font, tokens, lineWidth, (text) => this.zhPainter.measure(text)),
    } : null;
  }

  zhPaintBase(imageGroup0: ImagePack): ZhPaint {
    return { packedBytes: this.packedBytes, packedOffsets: this.packedOffsets, imageGroup0, painter: this.zhPainter };
  }

  /** Replay one original c.b(index) load through /a[280]'s byte translation table. */
  loadLanguageResource(index: 0 | 1 | 2): LegacyRuntimeState {
    if (!this.languageResources) throw new Error("language resources have not been attached");
    const translationOffset = this.packedOffsets[280];
    // c.b(int) catches both IOException and the broader Exception boundary.
    // With the raw /a[280] value, its version/data copy can exceed c's byte
    // buffer; that failure is swallowed by the original and does not abort f.run().
    try {
      if (index === 0) this.resourceTables.loadTranslatedRecords(0, this.languageResources.s, this.packedBytes, translationOffset, 0);
      else if (index === 1) this.resourceTables.loadTranslatedRecords(1, this.languageResources.t, this.packedBytes, translationOffset, 0);
      else this.resourceTables.loadTranslatedRecords(2, this.languageResources.d0, this.packedBytes, translationOffset, 71);
    } catch {
      // Preserve the original partial writes and continue the bootstrap.
    }
    return this;
  }

  /** Attach only the bytes e.f() provably copies before /a's invalid read. */
  withTableAPrefix(prefix: AResourcePrefixReplay): LegacyRuntimeState {
    this.packedBytes.set(prefix.bytes);
    this.packedOffsets.set(prefix.offsets);
    return this;
  }

  /** Attach the complete `/a` loader result, including f.b[S]'s 570 shorts. */
  withTableA(table: AResourceDiagnostic): LegacyRuntimeState {
    this.withTableAPrefix(table.prefix);
    this.saveOffsets.set(table.shortTableB);
    this.sectionOffsets.set(table.shortTableBOffsets);
    return this;
  }

  /**
   * Exact f.run() state writes after resource bootstrap, before the loop.
   * f.run()'s own offset-101 call to private void i() (#610) -- CORRECTION
   * (2026-08-22): used to call the bytecode-mis-bound
   * initializeLegacyTransientState (5 of its 13 fields pointed at orphaned
   * gFlag/hFlag/fFlag/eFlag/vFlag duplicates instead of the canonical
   * inputLeft/inputRight/inputDown/inputUp/inputV) -- now calls the real,
   * canonical resetLegacyZI directly.
   */
  initializeOriginalLoop(): LegacyRuntimeState {
    this.game.initializeOriginalLoop();
    resetLegacyZI(this.game);
    return this;
  }

  stepStateMachine(...args: RtArgs<typeof stepStateMachine>): ReturnType<typeof stepStateMachine> { return stepStateMachine(this, ...args); }

  /**
   * Default f.am() bridge used by f.ak() for Q=22/23.  The T=0 branch now
   * reaches the proven map-entry chain; the T=1 e(int) action remains an
   * explicit unresolved boundary and therefore returns false without inventing
   * resource semantics.
   */
  stepDefaultAm(): void {
    // Live, not a snapshot (2026-09-23): onBByte's scene dispatch and
    // onWReset write these same fields mid-method.
    const state = liveView<LegacyAmInput["state"]>(this.game, {
      Q: "screen", R: "R", H: "H", T: "actionT", q: "mission", uCounter: "uByte", tByte: "tByte",
      W: "actionWFlag", vInt: "vInt", A: "AFlag", vByte: "loopMode", mByte: "mByte",
    });
    stepStateAm(this, {
      state,
      onGByte: () => false,
      onMapEntry: (q) => this.stepMapEntry(q),
      onResourceAction: (slot) => this.saveOriginalResourceAction(slot),
      onWReset: () => { this.game.actionWFlag = false; },
      // am() offset 240: n().
      onN: () => this.stepCameraScroll(),
      // f.am()'s own onU (f.u()), wired 2026-08-14, same
      // stepGameplayOuterLoop() as R()'s onGameplayDraw and K()'s onU.
      // Unlike R() (which sets targetSlot=0 itself before calling), am()'s
      // bytecode reaches u() with whatever N:B (#79) currently holds --
      // no local write of its own -- so this reads the live game.targetSlot
      // instead of assuming 0 (second pass, 2026-08-14: entity draws now
      // reachable here too, not just classification).
      onU: () => this.stepGameplayOuterLoop(this.offscreenTargets?.graphics[this.game.targetSlot]),
      // f.b(int), wired 2026-08-18: am()'s T===0 branch, when it lands on
      // Q===18, calls f.b(packedBytes[packedOffsets[303]+q]) -- this is
      // T()'s only real caller, and T()'s ai===37 branch is what actually
      // triggers finalizeEntity() automatically (via b.l()). See
      // docs/unknowns.md for the full traced chain.
      onBByte: (value) => { this.runSceneDispatch(value); },
      // T == 0 landing on Q == 18: a(ZZZZ) (#434) at offset 42; wired 2026-09-27.
      onSelectionSync: (a, b, c, d) => { this.runSelectionFlagsRefresh(a, b, c, d); },
      // T == 2 (set by aD()'s Q == 31 branch): f.d(int), load the saved
      // game from slot 1 (q < 7) or 2. WIRED 2026-09-24 -- it was missing, so
      // a saved game could never be loaded back from the menu.
      onD: (slot) => this.loadGameplayFromStore(slot as 1 | 2),
    });
  }

  saveOriginalResourceAction(...args: RtArgs<typeof saveOriginalResourceAction>): ReturnType<typeof saveOriginalResourceAction> { return saveOriginalResourceAction(this, ...args); }

  /**
   * Execute the exact pre-h() private f.aS() phase from run(). Browser timing
   * replaces Thread.yield/sleep; all bytecode-visible state writes remain.
   */
  stepOriginalWaitPhase(): void {
    const fields = this.game.audioWaitFields();
    stepLegacyASAudioWait({
      state: fields,
      onStopWait: () => { /* repaint/yield is supplied by the browser loop */ },
      onAQ: () => this.startOriginalAudio(),
      onSleep: () => { /* fixed loop owns pacing */ },
    });
    this.game.applyAudioWaitFields(fields);
  }

  /** Runtime bridge for the confirmed f.aQ() MIDI track/player lifecycle. */
  startOriginalAudio(): void {
    if (!this.midiResource) return;
    const state = {
      h: this.game.audioH,
      e: this.game.eByte,
      currentTrack: this.game.audioCurrentTrack,
      currentPlayerReady: this.game.playerExists ? 101 : 0,
      currentPlayerTrack: this.game.audioCurrentTrack,
    };
    stepStateAQAudio(this, {
      state,
      // aQ() offset 4: b.k() (#618) sets f.h:B, the track pair aQ() picks
      // from. Ported but never called until 2026-09-27, so h never changed.
      onSubsystemDecision: () => {
        const g = this.game;
        g.audioH = subsystemDecision(this, {
          fV: g.loopMode, fN: g.callToArmsActive, fL: g.formUpActive,
          bO: this.subsystemArrays.bO, bK: this.subsystemArrays.bField28, bN: this.subsystemArrays.bN,
          fQ: g.mission,
        });
        state.h = g.audioH;
      },
      audioTable: this.audioTable,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      onStop: () => {
        this.midiPlayer?.stop();
        this.midiPlayer = undefined;
        this.game.playerExists = false;
      },
      onCreate: (path, type) => {
        const track = Number(path.slice(2));
        if (!Number.isInteger(track) || track < 0 || track >= this.audioTable.length) return;
        this.game.audioCurrentTrack = track;
        this.midiPlayer = new OriginalMidiPlayer(this.midiResource!, type, track);
        this.midiPlayer.start();
        this.game.playerExists = true;
      },
      onSetMode: (value) => { this.game.eByte = value; },
    });
  }

  /**
   * Shared `f.a:Lc;` → `c.a(int)` trigger (constant-pool #459 at every real
   * call site), already fully ported as `selectLegacyResourceSection` and
   * wired via `stepStateS`'s own `onCSelector` (the ONLY `S()` port since
   * the 2026-08-31 duplicate-port unification -- see `runSceneDispatch`'s
   * own docblock) but never exposed as a reusable call for OTHER real
   * `c.a(int)` call sites. Confirmed via direct bytecode read
   * (bytecode/f-javap.txt) that f.ao()'s value===1/3 branches (`onCByte`),
   * f.aq()'s m>0 branch (`onSound`), and f.av() (`onCByte`) all invoke this
   * exact method with different literal arguments (70/74/70+m/75) -- same
   * target, different call sites, matching this project's established
   * "one real method, several differently-named callback call sites"
   * pattern.
   */
  selectResourceSection(value: number): void {
    selectLegacyResourceSection(
      this.resourceTables,
      this.packedBytes,
      this.packedOffsets,
      value,
      () => { this.game.resourceSectionW = -1; },
      // c.b(2) skips a missing resource (null stream, offset 96), which is
      // also what a runtime without language files attached gets.
      () => { if (this.languageResources) this.loadLanguageResource(2); },
    );
  }

  /** aB()/aC(): Q, Z, ab and the dialogue scroll y:I with its Q:Z/R:Z edges. */
  readonly scrollSelectorState = liveView<LegacyAbState & LegacyAcState>(this.game, {
    Q: "screen", Z: "Z", ab: "ab", y: "frameGenCounterY", QFlag: "zAd14QFlag", RFlag: "zAd14RFlag",
  });

  /** c.a(Graphics,int) offsets 780..832: f.Q:Z (at the top) / f.R:Z (at the end). */
  readonly setDialogueEdges = (atTop: boolean, atBottom: boolean): void => {
    this.game.zAd14QFlag = atTop;
    this.game.zAd14RFlag = atBottom;
  };

  mapOverviewInput(...args: RtArgs<typeof mapOverviewInput>): ReturnType<typeof mapOverviewInput> { return mapOverviewInput(this, ...args); }

  drawFrameCommandPrimitive(...args: RtArgs<typeof drawFrameCommandPrimitive>): ReturnType<typeof drawFrameCommandPrimitive> { return drawFrameCommandPrimitive(this, ...args); }

  stepFrameDispatch(...args: RtArgs<typeof stepFrameDispatch>): ReturnType<typeof stepFrameDispatch> { return stepFrameDispatch(this, ...args); }

  applyMFrameCommand(command: LegacyMFrameCommand): void {
    if (command.kind === "primitive") {
      this.framePrimitives.push([command.index, command.x, command.y]);
      this.drawFrameCommandPrimitive(command.index, command.x, command.y);
      return;
    }
    if (!this.offscreenTargets) return;
    if (command.kind === "drawImage") {
      this.offscreenTargets.graphics[command.graphicsIndex].drawImage(
        this.offscreenTargets.images[command.imageIndex], command.x, command.y, command.anchor,
      );
    } else if (command.kind === "drawRegion") {
      this.offscreenTargets.graphics[command.graphicsIndex].drawRegion(
        this.offscreenTargets.images[command.imageIndex],
        command.sx, command.sy, command.width, command.height,
        command.transform, command.x, command.y, command.anchor,
      );
    }
  }

  /**
   * f.aD(), bytecode/f-javap.txt offsets 0..309.
   *
   * BUG FIX (2026-09-09): this bridge used to copy only 6 of
   * `LegacyAdState`'s 21 fields in and the same 6 back out
   * (`Q`/`q`/`R`/`H`/`vInt`/`vByte`). Everything the two branches actually
   * compute landed on the throwaway `this.adState` object and was silently
   * dropped:
   *
   *  - Q=28 (offsets 122..235, the real gameplay-entry branch): `A:Z`(#36)
   *    `= true`, `c:Z`(#261) `= false`, and the four saved-state restores
   *    `y:B=z:B`, `A:B=B:B`, `I:B=J:B`, `K:B=L:B`. Only `v:B = 1` survived,
   *    because `vByte` happened to be one of the six.
   *  - Q=31 (offsets 0..112): `s:B`/`t:B`/`T:B` and the shared tail
   *    `b:B(#243) = c:B(#265)`.
   *
   * `A:Z` is `f.n()`'s one-shot full-redraw trigger, so its loss is exactly
   * why entering a map never redrew the terrain window into the offscreen
   * buffer -- measured live: after `stepDefaultAd()` with Q=28,
   * `adState.AFlag === true` while `game.AFlag` stayed `false`, and
   * `game.cameraColumn`/`KByte` stayed 0 instead of taking `JByte`/
   * `cameraSavedKByte`. See docs/unknowns.md's 2026-09-09 entry.
   *
   * Field identities (constant-pool indices confirmed individually, never
   * by letter): `A:B`#34=`AByte`, `B:B`#37=`BByte`, `y:B`#387=`yByte`,
   * `z:B`#390=`zByte` (the `z=y`/`B=A` save half is at f-javap.txt offsets
   * 311..322 and four other sites), `I:B`#60=`IByte`, `J:B`#65=`JByte`,
   * `K:B`#68=`KByte`, `L:B`#72=`cameraSavedKByte` (NOT `frameLayoutL`, which is
   * the lowercase `l:B`#337 -- the trap this project has already hit once),
   * `c:Z`#261=`cFlag`, `T:B`#103=`actionT`, `s:B`#362/`t:B`#366=
   * `sByte`/`tByte`, `c:B`#265=`progressC` (written by `d(int)`'s record
   * read, only other reader is `e(int)`'s writer), `b:B`#243=`levelBByte`
   * (the byte `aP()` offset 257 reads into create-record coordinates),
   * `a:[Z`#123=`selectionFlags`.
   */
  stepDefaultAd(): void {
    stepLegacyAd({
      state: this.adState,
      // f.aD()'s own call to private void i() (#610, offset 232 -- CORRECTION
      // 2026-08-22: was wired to the unrelated resetInputTransientState(),
      // whose own 17+ fields don't match #610's real 13 at all; see
      // docs/unknowns.md).
      onInputReset: () => resetLegacyZI(this.game),
      onY: () => stepCameraFollow(this),
      // Offset 181, `invokespecial #464 // Method a:(ZZZZZZZZZ)V` -- the
      // same 9-arg method `runSelectionFlagsRefresh` already wraps.
      onSelection: (v) => this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
      // Offset 295, `invokespecial #434 // Method a:(ZZZZ)V` -- confirmed
      // (see runSelectionFlagsRefresh's own docblock) to be a trivial
      // wrapper that calls #464 with the last five arguments hardcoded
      // false, which is exactly this default-parameter call.
      onFourFlags: (v) => this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3]),
      // Offset 250, `invokespecial #407 // Method E:()V`.
      onE: () => this.stepLegacyExitPreparation(),
    });
  }


  readonly cameraScrollState: LegacyCameraScrollState = {
    rowScrollDelta: 0, columnScrollDelta: 0, pixelColumnOffset: 0, pixelRowOffset: 0,
    scrollTargetColumn: 0, scrollTargetRow: 0, followFlag: false, cFlag: false,
    bFlag: false, dFlag: false, aiScratch: 0, sFlag: false,
  };
  // f.O:B / f.P:B (#83/#87), live: e.c() sets 11 x 18 (LegacyFrameLayout) and a(ZZZZZZZZZ) changes
  // P:B with the HUD. Was a {12, 19} placeholder until 2026-10-08 (oracle: al/am off by one).
  readonly cameraScrollViewport: LegacyCameraScrollViewport = (() => {
    const game = this.game;
    return { get columns() { return game.viewColumns; }, get rows() { return game.viewRows; } };
  })();
  readonly aeState: LegacyAeState = {
    F: 0, byteF: 0, uFlag: false, tFlag: false, k: 0, q: 0,
    y: 0, I: 0, A: 0, K: 0, G: 0, HCoord: 0,
  };
  /**
   * Raw f.aE(): the five-tick cooldown timer V()'s `inputT && wByte!==3`
   * branch triggers (see LegacyGameplayInput.ts's `onAE`). Reachable live
   * (2026-08-14) now that `onAE` calls this instead of staying inert --
   * closes out the "aE() caller timing" gap noted in parity-checklist.md.
   * `onFourFlags` (f.a(ZZZZ) #434, offset 48) and `onAI` (f.aI() #490,
   * offset 83) wired 2026-09-27; both were ported but left inert.
   */
  stepAe(): void {
    this.aeState.F = this.game.aeTimerF;
    this.aeState.byteF = this.game.selectionGroup;
    this.aeState.uFlag = this.game.boxSelecting;
    this.aeState.tFlag = this.game.inputT;
    this.aeState.k = this.game.kByte;
    this.aeState.q = this.game.qCounter;
    this.aeState.y = this.game.cursorColumn;
    this.aeState.I = this.game.cameraColumn;
    this.aeState.A = this.game.cursorRow;
    this.aeState.K = this.game.cameraRow;
    this.aeState.G = this.game.boxAnchorColumn;
    this.aeState.HCoord = this.game.boxAnchorRow;
    stepLegacyAe({
      state: this.aeState,
      onFourFlags: (v) => { this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3]); },
      onAI: () => stepLegacyAi({ a4: this.mainArrays.aByte[4]!, dense: this.denseState }),
    });
    this.game.aeTimerF = this.aeState.F;
    this.game.selectionGroup = this.aeState.byteF;
    this.game.boxSelecting = this.aeState.uFlag;
    this.game.inputT = this.aeState.tFlag;
    this.game.kByte = this.aeState.k;
    this.game.qCounter = this.aeState.q;
    this.game.boxAnchorColumn = this.aeState.G;
    this.game.boxAnchorRow = this.aeState.HCoord;
  }
  stepCameraScroll(...args: RtArgs<typeof stepCameraScroll>): ReturnType<typeof stepCameraScroll> { return stepCameraScroll(this, ...args); }

  /** Apply the proven f.an() table/state branches with unresolved callbacks inert. */
  stepDefaultAn(): void {
    this.anState.selection = this.stateCommandState.dFlags; // f.d:[Z] (#267)
    stepLegacyAn({
      state: this.anState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      onDestroy: () => { this.game.b = false; },
      // Wired 2026-09-27 (declared but never passed): l(-1) at Q=25, e(0) at
      // Q=12, and a(ZZZZZZZZZ) restoring the selection at Q=20 -- the same
      // targets ap() uses.
      onRelease: (value) => this.stepLegacyL(value),
      onEZero: () => { this.saveOriginalResourceAction(0); },
      onSelectionSync: (v) => this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
    });
  }

  stepDefaultAo(...args: RtArgs<typeof stepDefaultAo>): ReturnType<typeof stepDefaultAo> { return stepDefaultAo(this, ...args); }

  /** Execute f.ar() against the live f.ao() field bank. */
  stepDefaultArFromAo(): void {
    // Live (2026-09-23): onAM's aM() writes these fields itself.
    const state = Object.assign(
      liveView<Omit<Parameters<typeof stepLegacyAr>[0]["state"], "g">>(this.game, {
        vInt: "vInt", Q: "screen", U: "U", Z: "Z", c: "missionFrame", T: "actionT", q: "mission", R: "R", eByte: "eByte",
        ac: "acFlag", pByte: "persistedPByte", s: "sByte", t: "tByte", H: "H",
      }),
      { g: 0 },
    );
    stepLegacyAr({
      state,
      onDestroy: () => { this.game.b = false; },
      onAM: () => this.resetMapEntryAllocation(this.game.mission),
      onAQ: () => { this.startOriginalAudio(); },
      // v=62 (new game over a saved one: s = -1, t = -2) ends with e(0)
      // (#589, offset 260) -- the progress save, not a map load as this
      // used to say. Wired 2026-09-27, so the reset progress is written.
      onGByte: (slot) => this.saveOriginalResourceAction(slot),
    });
  }

  /** Enter the confirmed f.a(byte,byte,byte) prefix from the live W() path. */
  beginEntityAction(ap: number, am: number, an: number): void {
    const state = this.entityActionState;
    // Body from offset 43 on. The 0..42 entry gate is in
    // entityActionPrompt(); f.W() calls this directly with 20, which the
    // gate always passes. RETRACTED 2026-09-23: f.W() is not the only
    // caller -- b.a(byte,int,int) (#274) and b.t() (#417) call it too.
    // MERGED (2026-08-31): was `this.game.zInt = 0`, a second name for this
    // same real field (#120) -- see `game.Z`'s own docblock.
    this.game.Z = 0; // Z:I (#120), offset 43..45
    this.game.oInt = 0; // o:I (#348), offset 48..50
    beginLegacyEntityAction({
      state,
      ap,
      am,
      an,
      selection: this.game.selectionFlags,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      // final void a(byte,byte,byte)'s own call to private void i() (#610,
      // offset 54), immediately followed (offset 62..83, no branch between
      // them) by v:B=0/H:Z=true/v:I=12+arg1 -- all bundled into this one
      // callback since they're one unbroken run of bytecode.
      onTransientReset: () => {
        resetLegacyZI(this.game);
        this.game.loopMode = 0; // v:B (#376)
        this.game.H = true; // H:Z (#57)
        this.game.vInt = 12 + ap; // v:I (#375)
      },
      onSelectionCopy: (values) => { this.stateCommandState.dFlags.splice(0, 9, ...values); },
      onSelectionApply: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      onAFlag: () => { this.game.AFlag = true; },
    });
  }

  /** f.e(int) (#590): take one unit out of the selection groups. */
  stepSelectionE(id: number): void {
    releaseLegacyEntitySelection({
      groups: this.mainArrays.aByte,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      id,
      F: this.game.selectionGroup,
      w: this.game.barMode,
      onModeReset: () => { this.game.barMode = 0; },
      onFReset: () => { this.game.selectionGroup = -1; },
    });
  }

  /**
   * f.aF() (#487): select every team-0 unit in the window B..E (d(byte)'s
   * double-tap sets it to the viewport). WIRED 2026-09-23.
   */
  selectWindowUnits(): void {
    const a4 = this.mainArrays.aByte[4]!;
    stepLegacyAf({
      state: liveView<LegacyAfState>(this.game, {
        uFlag: "boxSelecting", tFlag: "inputT", F: "selectionGroup", k: "kByte", w: "barMode",
        B: "BCounter", C: "CCounter", D: "DCounter", E: "ECounter",
      }),
      map: this.gridC,
      dense: this.denseState,
      a4,
      onAI: () => stepLegacyAi({ a4, dense: this.denseState }),
      onD: (id) => this.stepLegacyD(id),
    });
  }

  /** f.aG()/f.aH() (#488/#489): keys 7/9 held store the selection as group 2/3, tapped recall it. WIRED 2026-09-23. */
  stepGroupKey(store: boolean): void {
    const state = liveView<LegacyGroupKeyState>(this.game, {
      wFlag: "wFlag", I: "inputI", i: "digitKey", F: "selectionGroup", k: "kByte", w: "barMode",
    });
    const common = {
      state,
      a: this.mainArrays.aByte,
      dense: this.denseState,
      onFourFlags: (v: boolean[]) => this.runSelectionFlagsRefresh(v[0]!, v[1]!, v[2]!, v[3]!),
    };
    if (store) {
      stepLegacyAg({ ...common, onEntityTick: (id) => this.stepSelectionE(id) });
    } else {
      stepLegacyAh({
        ...common,
        onAI: () => stepLegacyAi({ a4: this.mainArrays.aByte[4]!, dense: this.denseState }),
        onJump: (id, offset) => this.stepEntityCoordinateUpdate(id, offset),
      });
    }
  }

  /** f.ah() (#509), LegacyZAh.ts, on the live game fields. */
  stepZAh(): void {
    const g = this.game;
    // Live: the w == 4 path's l(-1) writes P and w itself.
    const ahState = liveView<Parameters<typeof stepLegacyZAh>[0]>(g, {
      K: "choosingChief", P: "pendingP", w: "barMode", k: "kByte", fByte: "selectionGroup",
      l: "selectedId", q: "qCounter", entityFocusFlag: "entityFocusFlag", V: "zAfCursorVFlag",
    });
    stepLegacyZAh(ahState, {
      onL: (value) => this.stepLegacyL(value),
      onSelectionReset: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      onI: () => resetLegacyZI(g),
    });
  }

  /** f.aj() (#511), LegacyZAj.ts: park the selection cursor on the next living unit. */
  stepZAj(): void {
    const g = this.game;
    const ajState = {
      entityFocusFlag: g.entityFocusFlag, as: g.menuCursor, frameLayoutAX: g.frameLayoutAX,
      kByte: g.kByte, frameLayoutL: g.selectedId, pendingP: g.pendingP, dense: this.denseState,
    };
    stepLegacyZAj(ajState);
    g.entityFocusFlag = ajState.entityFocusFlag;
    g.menuCursor = ajState.as;
    g.frameLayoutAX = ajState.frameLayoutAX;
    g.kByte = ajState.kByte;
    g.selectedId = ajState.frameLayoutL;
    g.pendingP = ajState.pendingP;
  }


  normalizeEntityViewport(...args: RtArgs<typeof normalizeEntityViewport>): ReturnType<typeof normalizeEntityViewport> { return normalizeEntityViewport(this, ...args); }

  stepEntityCoordinateUpdate(...args: RtArgs<typeof stepEntityCoordinateUpdate>): ReturnType<typeof stepEntityCoordinateUpdate> { return stepEntityCoordinateUpdate(this, ...args); }

  stepLegacyExitPreparation(...args: RtArgs<typeof stepLegacyExitPreparation>): ReturnType<typeof stepLegacyExitPreparation> { return stepLegacyExitPreparation(this, ...args); }


  stepStateAOMap(...args: RtArgs<typeof stepStateAOMap>): ReturnType<typeof stepStateAOMap> { return stepStateAOMap(this, ...args); }

  stepStateU(...args: RtArgs<typeof stepStateU>): ReturnType<typeof stepStateU> { return stepStateU(this, ...args); }

  stepStateTransitionCommand(...args: RtArgs<typeof stepStateTransitionCommand>): ReturnType<typeof stepStateTransitionCommand> { return stepStateTransitionCommand(this, ...args); }

  /**
   * Runtime owner for the b-side f.b(int) command submission.  The state is
   * shared across calls because f.S() initializes the ai/aj/ak sequence and
   * later negative f.b() commands advance that same sequence.
   */

  stepSubsystemStateCommand(...args: RtArgs<typeof stepSubsystemStateCommand>): ReturnType<typeof stepSubsystemStateCommand> { return stepSubsystemStateCommand(this, ...args); }

  stepStateS(...args: RtArgs<typeof stepStateS>): ReturnType<typeof stepStateS> { return stepStateS(this, ...args); }

  stepStateT(...args: RtArgs<typeof stepStateT>): ReturnType<typeof stepStateT> { return stepStateT(this, ...args); }

  /** Raw final f.b(int,int) port; b.a(III) stays a callback seam. */
  stepFPairCommand(
    input: Omit<LegacyFPairCommandInput, "dense" | "map" | "subsystem" | "packedBytes" | "packedOffsets">,
    x: number,
    y: number,
  ): void {
    const subsystem = { v: this.game.bUnit };
    stepLegacyFPairCommand({
      // b.a(IIII)Z (#270) as b.a(1, 127, x, y) with b.v = 0 (offsets 85..102), so the gate
      // writes the shared dense[3131]/[3232]. CORRECTED 2026-10-14: mode 0 and the record id.
      onFootprintProbe: (mode, value, px, py) => this.checkSpiralPlacementGate(mode, value, px, py, 0),
      // Offset 562: b.a(int,int,int) (#473) = markLegacySpatialRecord, the
      // vision mark for each gathered unit. Wired 2026-09-27.
      onRecordAction: (rx, ry, span) => markLegacySpatialRecord({
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        layers: this.mainArrays.aInt,
        layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
        mapHeight: this.game.mapHeight,
      }, rx, ry, span),
      ...input,
      dense: this.denseState,
      map: this.gridC,
      subsystem,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    }, x, y);
    this.game.bUnit = subsystem.v;
  }


  stepMapEntry(...args: RtArgs<typeof stepMapEntry>): ReturnType<typeof stepMapEntry> { return stepMapEntry(this, ...args); }

  resetMapEntryAllocation(...args: RtArgs<typeof resetMapEntryAllocation>): ReturnType<typeof resetMapEntryAllocation> { return resetMapEntryAllocation(this, ...args); }
  // CLEANUP (2026-08-25): stepStateASAudioWait removed -- zero callers
  // anywhere (confirmed via full-repo grep); the underlying
  // stepLegacyASAudioWait is very much alive, called directly at its own
  // real call site (stepOriginalWaitPhase) rather than through this wrapper.

  /** Decode the confirmed raw `/ma` tile stream for a numeric original map index. */
  decodeRawMap(mapIndex: number): LegacyRawMap {
    if (!this.maResource) throw new Error("/ma resource has not been attached to runtime state");
    return decodeLegacyMapTiles({
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      maBytes: this.maResource.bytes,
      maOffsets: this.maResource.offsets,
    }, mapIndex);
  }


  loadMap(...args: RtArgs<typeof loadMap>): ReturnType<typeof loadMap> { return loadMap(this, ...args); }



  renderGameplayTo(...args: RtArgs<typeof renderGameplayTo>): ReturnType<typeof renderGameplayTo> { return renderGameplayTo(this, ...args); }


  stepGameplayPaintComposite(...args: RtArgs<typeof stepGameplayPaintComposite>): ReturnType<typeof stepGameplayPaintComposite> { return stepGameplayPaintComposite(this, ...args); }


  letterboxState(): LegacyCameraFrameLetterboxState {
    return {
      letterboxFlag: this.game.boxSelecting,
      boxAnchorColumn: this.game.boxAnchorColumn,
      boxAnchorRow: this.game.boxAnchorRow,
      viewportOriginI: this.game.cameraColumn,
      viewportOriginK: this.game.cameraRow,
      scrollY: this.game.cursorColumn,
      scrollA: this.game.cursorRow,
    };
  }


  stepEntityAction(...args: RtArgs<typeof stepEntityAction>): ReturnType<typeof stepEntityAction> { return stepEntityAction(this, ...args); }

  /** class c's final void a(int,int,int) (#445), f.q()'s own scan/draw call. */
  drawCScan(arg1: number, x: number, y: number): void {
    const t = this.resourceTables;
    drawLegacyCScan({
      k: 0, l: 0, m: 0, n: 0, o: 0, b: t.cBByte, c: t.cCByte,
      rowFShort: t.rowFShort, rowDShort: t.rowDShort, rowEShort: t.rowEShort,
      rowDByte: t.rowDByte, rowEByte: t.rowEByte,
      geometryB: t.geometryB, geometryC: t.geometryC,
    }, this.packedBytes, this.packedOffsets, arg1, x, y, {
      onRandomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      onDrawIcon: (sourceX, sourceY, width, height, dx, dy, anchor) => {
        const image = this.imageGroups[0]?.get(26)?.image;
        const target = this.offscreenTargets?.graphics[1];
        if (!image || !target) return;
        try { target.drawRegion(image, sourceX, sourceY, width, height, 0, dx, dy, anchor); }
        catch { /* the #435 helper's own try/catch */ }
      },
    });
  }

  stepGameplayFramePrep(...args: RtArgs<typeof stepGameplayFramePrep>): ReturnType<typeof stepGameplayFramePrep> { return stepGameplayFramePrep(this, ...args); }

  stepGameplayOuterLoop(...args: RtArgs<typeof stepGameplayOuterLoop>): ReturnType<typeof stepGameplayOuterLoop> { return stepGameplayOuterLoop(this, ...args); }

}

function byteGrid(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}

export function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function copyRows<T extends Int8Array | Int16Array | Int32Array>(
  target: T[], source: readonly T[], count: number,
): void {
  if (source.length < count || target.length < count) throw new RangeError("RMS row count mismatch");
  for (let row = 0; row < count; row += 1) {
    if (target[row].length !== source[row].length) throw new RangeError("RMS row length mismatch");
    target[row].set(source[row]);
  }
}

export function cloneRows<T extends Int8Array | Int16Array | Int32Array>(
  source: readonly T[], count: number,
): T[] {
  return source.slice(0, count).map((row) => new (row.constructor as { new (values: ArrayLike<number>): T })(row));
}

export function copyCube(
  target: readonly Int8Array[][],
  source: readonly (readonly Int8Array[])[],
  depth: number,
): void {
  if (target.length < depth || source.length < depth) throw new RangeError("RMS cube depth mismatch");
  for (let layer = 0; layer < depth; layer += 1) copyRows(target[layer], source[layer], source[layer].length);
}

export function cloneCube(
  source: readonly Int8Array[][],
  depth: number,
): Int8Array[][] {
  return source.slice(0, depth).map((layer) => layer.map((row) => new Int8Array(row)));
}

function boolLayers2x3x96(): boolean[][][] {
  return Array.from({ length: 2 }, () =>
    Array.from({ length: 3 }, () => Array.from({ length: 96 }, () => false)),
  );
}
