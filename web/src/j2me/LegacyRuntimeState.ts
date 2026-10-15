import type { AnchorValue } from "./anchors";
import type { DrawableImage } from "./Image";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import type { PackedData } from "./PackedData";
import type { DelimitedTable } from "./DelimitedResource";
import { EntityBank, F_E_LENGTH } from "./EntityBank";
import { LegacyRenderTargets } from "./LegacyRenderTargets";
import { LegacyGameState } from "./LegacyGameState";
import { stepLegacyGameplayTick } from "./LegacyGameplayTick";
import { stepLegacyGameplayInput } from "./LegacyGameplayInput";
import { stepLegacyGameplayCommand } from "./LegacyGameplayCommand";
import type { ImagePack } from "./ImagePack";
import type { Graphics } from "./Graphics";
import { LegacyResourceTables, selectLegacyResourceSection, stepLegacyClassCReset } from "./LegacyResourceTables";
import { LegacyGeometryDecoder } from "./LegacyGeometryDecoder";
import { LegacyGeometryRenderer } from "./LegacyGeometryRenderer";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "./LegacyZGeometryBridge";
import { composeLegacyC, emitLegacyCRenderRow, type LegacyCRenderExtras, type LegacyCCompositionState, type LegacyCDrawCommand, type LegacyCZh } from "./LegacyCComposition";
import { scanLegacyZElementPrefix, type LegacyZElementScanCallbacks, type LegacyZElementScanState } from "./LegacyZElementScan";
import { stepLegacyZKText, type LegacyZKTextCallbacks, type LegacyZKTextState } from "./LegacyZKText";
import { stepLegacyZKind3, type LegacyZKind3Callbacks, type LegacyZKind3State } from "./LegacyZKind3";
import { stepLegacyZKind4, type LegacyZKind4Callbacks, type LegacyZKind4State } from "./LegacyZKind4";
import { stepLegacyZKind2, type LegacyZKind2State } from "./LegacyZKind2";
import { stepLegacyZSubrecordDraw, type LegacyZSubrecordDrawCallbacks } from "./LegacyZSubrecordDraw";
import { drawLegacyPackedSpritePrimitive, type LegacyPackedSpritePrimitiveCallbacks } from "./LegacyPackedSpritePrimitive";
import { LegacyInputState } from "./LegacyInputState";
import { LegacyMainArrays } from "./LegacyMainArrays";
import { LegacySubsystemArrays } from "./LegacySubsystemArrays";
import { runLegacySpatialPass, type LegacySpatialPassInput } from "./LegacyBSpatialPass";
import { decodeLegacyMapTiles, type LegacyRawMap } from "./LegacyMapRleDecoder";
import type { AResourceDiagnostic, AResourcePrefixReplay, MaResource } from "./BinaryResource";
import { applyLegacyMapNeighborPass, buildLegacyMapOverlay, type LegacyMapOverlay } from "./LegacyMapOverlay";
import { projectLegacyMapGrids } from "./LegacyMapGridProjection";
import { allocateLegacySpecialTile, type LegacySpecialTile } from "./LegacySpecialTileAllocator";
import { legacyOccupancyClass } from "./LegacyOccupancyClass";
import { legacyEntityPartition } from "./LegacyEntityPartition";
import { drawLegacyMapOverview, stepLegacyMapOverviewScroll, type LegacyMapOverviewInput } from "./LegacyMapOverview";
import { stepLegacyEntityGPrefix } from "./LegacyEntityGPrefix";
import { stepLegacyEntityHPrefix } from "./LegacyEntityHPrefix";
import { stepLegacyEntityHActionBranch } from "./LegacyEntityHActionBranch";
import { stepLegacyD as stepLegacyFD } from "./LegacyFrameProgressionScan";
import { LegacyRandom, legacyRandomRemainder } from "./LegacyRandom";
import { OriginalMidiPlayer, type MidiResource } from "./Audio";
import { applyLegacyTerrainAdjustment } from "./LegacyTerrainAdjustment";
import { LegacyProgressStore } from "./LegacyProgressStore";
import type { RmsGameplayRecord, SparseLocationGroup } from "./RmsGameplayRecord";
import { acceptLegacyNumericValue, type LegacyNumericSequenceState } from "./LegacyNumericSequence";
import { allocateLegacyRecord, type LegacyRecordAllocatorInput } from "./LegacyRecordAllocator";
import { runLegacyL, runLegacyM } from "./LegacySubsystemLifecycle";
import { stepLegacyEntityBatchAllocate } from "./LegacyEntityBatchAllocate";
import { stepLegacyFrame, type LegacyFrameStepInput } from "./LegacyFrameStep";
import { stepLegacyFrameDispatch, type LegacyFrameDispatchInput } from "./LegacyFrameDispatch";
import { stepLegacyGFrame } from "./LegacyGFrame";
import { LegacyOffscreenTargets } from "./LegacyOffscreenTargets";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { drawLegacy1137Composition } from "./Legacy1137Composition";
import { ZH_LANGUAGE, ZH_LANGUAGE_NAME, ZhPainter, ZhStrings, paintZhLine, tokenizeZh, tokensWidth, wrapZh, type ZhPaint, type ZhToken, type ZhTranslationFile } from "./LegacyZhText";
import { projectLegacyImageHelper } from "./LegacyImageHelperProjection";
import { prepareLegacyImageHelperInvocation } from "./LegacyImageHelperInvocation";
import { drawLegacyFrameCommand } from "./LegacyFrameCommandDraw";
import { stepLegacyFrameCommandChanged, type LegacyZAdChangeState } from "./LegacyFrameCommandChanged";
import { applyLegacyFrameGeometry, deriveLegacyFrameLayout } from "./LegacyFrameLayout";
import { stepLegacyZTransition } from "./LegacyZTransition";
import { stepLegacyZAi } from "./LegacyZAi";
import { stepLegacyZAh } from "./LegacyZAh";
import { stepLegacyZAj } from "./LegacyZAj";
import { stepLegacyZAe } from "./LegacyZAe";
import { stepLegacyZAf } from "./LegacyZAf";
import { resetLegacyZI } from "./LegacyZI";
import { stepLegacyZAb } from "./LegacyZAb";
import { stepLegacyZAc } from "./LegacyZAc";
import { stepLegacyZAd } from "./LegacyZAd";
import { stepLegacyZAa } from "./LegacyZAa";
import { drawLegacy1010 } from "./Legacy1010Renderer";
import { LEGACY_DEFAULT_MAP_VIEWPORT, renderLegacyMap, type LegacyMapViewport, type LegacyRenderableMap } from "./LegacyMapRenderer";
import { runLegacyProjectionLifecycle, type LegacyProjectionLifecycleInput } from "./LegacyProjectionLifecycle";
import { consumeLegacyZCommand, type LegacyZCommandConsumerCallbacks } from "./LegacyZCommandConsumer";
import { dispatchLegacyZ, type LegacyZDispatchCallbacks } from "./LegacyZDispatch";
import { stepLegacySimpleFrameHandler, type LegacySimpleFrameState } from "./LegacySimpleFrameHandlers";
import { stepLegacyP, type LegacyPState } from "./LegacyGameplayPaintTriggers";
import { stepLegacyCameraFollow, type LegacyCameraFollowState } from "./LegacyCameraFollow";
import { stepLegacyCameraScroll, type LegacyCameraScrollState, type LegacyCameraScrollViewport } from "./LegacyCameraScroll";
import { stepLegacyCameraLetterbox, stepLegacyCameraCursor, classifyLegacyCameraCell, type LegacyCameraFrameLetterboxState, type LegacyCameraFrameCursorState } from "./LegacyCameraFrame";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122, isLegacyMarkerIdInRangeMinus110to61 } from "./LegacyEntityClassifiers";
import { stepLegacyGameplayOuterLoop, type LegacyGameplayOuterLoopViewport, type LegacyGameplayOuterLoopState } from "./LegacyGameplayOuterLoop";
import { stepLegacyAnimatedSlotScan } from "./LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan, isLegacyWithinViewport, enqueueLegacyEffectSlot } from "./LegacyEffectSlotScan";
import { stepLegacyCRect } from "./LegacyEffectRectMark";
import { dispatchLegacyGameplayCellBody, type LegacyGameplayCellBodyState } from "./LegacyGameplayCellBodyDispatch";
import { markLegacyEntityFootprint, LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, type LegacyEntityFootprintMarkState } from "./LegacyEntityFootprintMark";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch } from "./LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "./LegacyMapMarkerDetail";
import { stepLegacyEntityAction, type LegacyEntityActionState } from "./LegacyEntityAction";
import { stepLegacyGameplayFramePrep, type LegacyGameplayFramePrepState } from "./LegacyGameplayFramePrep";
import { stepLegacySecondaryCellChain, type LegacySecondaryCellChainState } from "./LegacySecondaryCellChain";
import { decayLegacyMapMarkerDenseState, stepLegacyMapMarkerScan, type LegacyMapMarkerScanState } from "./LegacyMapMarkerScan";
import { stepLegacyMFrame, type LegacyMFrameCommand, type LegacyMFrameState } from "./LegacyMFrame";
import { legacySubsystemDecision } from "./LegacySubsystemDecision";
import { setLegacyEntityMode, type LegacyEntityModeInput } from "./LegacyEntityMode";
import { canPlaceLegacyFootprint } from "./LegacyFootprintCheck";
import { allocateLegacySubsystemRecord, type LegacySubsystemRecordInput } from "./LegacySubsystemRecord";
import {
  selectLegacyAuxiliaryCandidates,
  refreshLegacyAuxiliaryTag, restoreLegacyAuxiliary,
  type LegacyAuxiliaryQueueState,
} from "./LegacyAuxiliaryQueue";
import { stepLegacyEntityIUpdate } from "./LegacyEntityIUpdate";
import { writeLegacyEntityLinkByte } from "./LegacyEntityLinkByte";
import { placeLegacyAuxiliary } from "./LegacyAuxiliaryPlacement";
import { placeLegacyEntity, type LegacyEntityPlacementInput } from "./LegacyEntityPlacement";
import { stepLegacyZL, type LegacyZLState } from "./LegacyZL";
import { selectLegacyEntityUpdateCandidates, type LegacyEntityUpdateSelectionInput } from "./LegacyEntityUpdateSelection";
import { cleanupLegacyEntityUpdate, type LegacyEntityUpdateCleanupInput } from "./LegacyEntityUpdateCleanup";
import { runLegacySubsystemPrepass, type LegacySubsystemPrepassInput } from "./LegacySubsystemPrepass";
import { runLegacySubsystemEntityLoop, type LegacySubsystemEntityLoopInput } from "./LegacySubsystemEntityLoop";
import { stepLegacySubsystemI } from "./LegacySubsystemTail";
import { stepLegacySubsystemBuildingEconomy, type LegacyBuildingScratch } from "./LegacySubsystemBuildingEconomy";
import { stepLegacySubsystemAa } from "./LegacySubsystemAa";
import { stepLegacySubsystemAb } from "./LegacySubsystemAb";
import { stepLegacySubsystemAe } from "./LegacySubsystemAe";
import { stepLegacySubsystemWorkerDispatch } from "./LegacySubsystemWorkerDispatch";
import { stepLegacyEntityWorkDeposit } from "./LegacyEntityWorkDeposit";
import { stepLegacyEntityModeSelect } from "./LegacyEntityModeSelect";
import { stepLegacyEntityIFinalize } from "./LegacyEntityIFinalize";
import { stepLegacyEntityKPredicate } from "./LegacyEntityKPredicate";
import { stepLegacyEntityVacate } from "./LegacyEntityVacate";
import { stepLegacyEntityHealthDelta } from "./LegacyEntityHealthDelta";
import { releaseLegacyEntityHome, stepLegacyEntityDeathCleanup } from "./LegacyEntityDeathCleanup";
import { checkLegacyEntityAffordable, stepLegacyEntityPayCost } from "./LegacyEntityResourceCost";
import { stepLegacyEntitySkillGain, stepLegacyEntitySlotSkillGain } from "./LegacyEntitySkillGain";
import { stepLegacyEntityCourtship } from "./LegacyEntityCourtship";
import { stepLegacyEntityMUpdate } from "./LegacyEntityMUpdate";
import { stepLegacySubsystemTrainingCount } from "./LegacySubsystemTrainingCount";
import { stepLegacySubsystemTrainingComplete } from "./LegacySubsystemTrainingComplete";
import { stepLegacySubsystemVoidN } from "./LegacySubsystemVoidN";
import { stepLegacySubsystemAq } from "./LegacySubsystemAq";
import { stepLegacySubsystemAr } from "./LegacySubsystemAr";
import { stepLegacySubsystemAs } from "./LegacySubsystemAs";
import { stepLegacySubsystemAv } from "./LegacySubsystemAv";
import { stepLegacySubsystemAw } from "./LegacySubsystemAw";
import { stepLegacySubsystemAt, stepLegacySubsystemAu } from "./LegacySubsystemAt";
import { stepLegacySubsystemLowerO } from "./LegacySubsystemLowerO";
import { stepLegacySubsystemEntityOccupancyCheck } from "./LegacySubsystemEntityOccupancyCheck";
import { stepLegacySubsystemNearestBuilding } from "./LegacySubsystemNearestBuilding";
import { stepLegacySubsystemBM } from "./LegacySubsystemBM";
import { stepLegacySubsystemAk } from "./LegacySubsystemAk";
import { stepLegacySubsystemAl } from "./LegacySubsystemAl";
import { stepLegacySubsystemH } from "./LegacySubsystemH";
import { legacySubsystemNGate } from "./LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "./LegacySubsystemNDecision";
import { stepLegacySubsystemNOrchestrator, type LegacySubsystemNOrchestratorInput } from "./LegacySubsystemNOrchestrator";
import { stepLegacySubsystemBDecision, type LegacySubsystemBDecisionInput } from "./LegacySubsystemBDecision";
import { checkLegacyResourceNodeGate } from "./LegacyResourceNodeGate";
import { stepLegacyEntityOccupantCare } from "./LegacyEntityOccupantCare";
import { stepLegacyEntityRecordDoorRetarget } from "./LegacyEntityRecordDoorRetarget";
import { stepLegacyEntityAo, stepLegacyEntityAp, stepLegacyEntityRecordRecovery } from "./LegacyEntityRecordRecovery";
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
import { stepLegacyEntityMarkerCommit } from "./LegacyEntityMarkerCommit";
import { stepLegacyEntityStrikeGate } from "./LegacyEntityStrikeGate";
import { stepLegacyAnimalHitReaction } from "./LegacyAnimalHitReaction";
import { stepLegacyAnimalRoam } from "./LegacyAnimalRoam";
import { stepLegacyEntityEquipIssue } from "./LegacyEntityEquipIssue";
import { stepLegacyEntityAbduction } from "./LegacyEntityAbduction";
import { stepLegacyEntityProduceItem } from "./LegacyEntityProduceItem";
import { stepLegacyEntitySelectionDrop } from "./LegacyEntitySelectionDrop";
import { stepLegacyEntityScreenIndex } from "./LegacyEntityScreenIndex";
import { stepLegacyEntityMoodPick } from "./LegacyEntityMoodPick";
import { stepLegacyEntitySpotAlert } from "./LegacyEntitySpotAlert";
import { stepLegacySubsystemEntityTypeReaction } from "./LegacySubsystemEntityTypeReaction";
import { computeLegacySubsystemPairScore } from "./LegacySubsystemScore";
import { stepLegacySubsystemEntityTransformC } from "./LegacySubsystemEntityTransform";
import { stepLegacySubsystemClampBounds } from "./LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup } from "./LegacySubsystemNearbyMarkerLookup";
import { stepLegacySubsystemEntityUpdateTail } from "./LegacySubsystemEntityUpdateTail";
import { stepLegacySubsystemEntityMoveApply } from "./LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityDisplace } from "./LegacySubsystemEntityDisplace";
import { stepLegacySubsystemEntityMoveCancel, stepLegacySubsystemRecordWorkerLevel } from "./LegacySubsystemEntityMoveCancel";
import { stepLegacySubsystemEntityPaceAccum } from "./LegacySubsystemEntityPaceAccum";
import { stepLegacySubsystemUnitTraining } from "./LegacySubsystemUnitTraining";
import { stepLegacySubsystemAf } from "./LegacySubsystemAf";
import { stepLegacySubsystemAg } from "./LegacySubsystemAg";
import { stepLegacySubsystemAh } from "./LegacySubsystemAh";
import { stepLegacySubsystemAi } from "./LegacySubsystemAi";
import { stepLegacyCursorHover } from "./LegacyCursorHover";
import { stepLegacySubsystemEntityTrainingSlot } from "./LegacySubsystemEntityTrainingSlot";
import { stepLegacySubsystemO } from "./LegacySubsystemO";
import { dispatchLegacyEntityAction } from "./LegacyEntityActionDispatch";
import { triggerLegacyEntityMove } from "./LegacyEntityMoveTrigger";
import { stepLegacySubsystemT } from "./LegacySubsystemT";
import { stepLegacySubsystemU } from "./LegacySubsystemU";
import { stepLegacySubsystemV } from "./LegacySubsystemV";
import { stepLegacySubsystemNPrivateO } from "./LegacySubsystemNPrivateO";
import { stepLegacyEntityStatusGuard } from "./LegacyEntityStatusGuard";
import { readLegacyEntityModeValue } from "./LegacyEntityModeValue";
import { stepLegacyEntityTarget, type LegacyEntityTargetStepInput } from "./LegacyEntityTargetStep";
import { stepLegacyEntityActionCommit } from "./LegacyEntityActionCommit";
import { finalizeLegacyEntitySelection, releaseLegacyEntitySelection } from "./LegacyEntitySelectionRelease";
import { stepLegacyEntityCoordinateUpdate } from "./LegacyEntityCoordinateUpdate";
import { stepLegacyEntityCoreUpdate, type LegacyEntityCoreUpdateInput } from "./LegacyEntityCoreUpdate";
import { stepLegacyEntityFollowup } from "./LegacyEntityFollowup";
import { checkLegacyEntityModeListed, stepLegacySubsystemEntityProbe } from "./LegacySubsystemEntityProbe";
import { stepLegacySubsystemEntityAssociationScan } from "./LegacySubsystemEntityAssociationScan";
import { stepLegacyEntityWUpdate, type LegacyEntityWUpdateInput } from "./LegacyEntityWUpdate";
import { stepLegacyEntityCWatch } from "./LegacyEntityCWatch";
import { stepLegacyEntityActionScoreGate } from "./LegacyEntityActionScoreGate";
import { checkLegacyEntityOccupant } from "./LegacyEntityOccupantCheck";
import { stepLegacySubsystemAn } from "./LegacySubsystemAn";
import { checkLegacySpiralPlacementGate } from "./LegacySpiralPlacementGate";
import { stepLegacySubsystemP } from "./LegacySubsystemP";
import { stepLegacySubsystemBVoidO } from "./LegacySubsystemBVoidO";
import { stepLegacySubsystemScore, type LegacySubsystemScoreInput } from "./LegacySubsystemScore";
import { classifyLegacySubsystemB } from "./LegacySubsystemBClassify";
import { syncLegacySubsystemBCoordinate } from "./LegacySubsystemBCoordinateSync";
import { stepLegacyEntityRecordCancel } from "./LegacyEntityRecordCancel";
import { stepLegacyZB2 } from "./LegacyZB2";
import { allocateLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlot, releaseLegacySubsystemBTenSlotEntity, releaseLegacySubsystemBEntitySlot } from "./LegacySubsystemBTenSlot";
import { findLegacyNearestCandidate } from "./LegacyNearestCandidateSearch";
import { checkLegacyCellCompatibility } from "./LegacyCellCompatibilityCheck";
import { initializeLegacyEntityRecord, indexLegacyEntityRecord } from "./LegacyEntityRecordLifecycle";
import { stepLegacyEntityDPredicate } from "./LegacyEntityDPredicate";
import { stepLegacyEntityHousing } from "./LegacyEntityHousing";
import { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } from "./LegacyEntityCrowdStress";
import { stepLegacyEntityHappiness } from "./LegacyEntityHappiness";
import { stepLegacyEntityESelection } from "./LegacyEntityESelection";
import { checkLegacyEntityRecord } from "./LegacyEntityRecordCheck";
import { completeLegacyEntityRecord } from "./LegacyEntityRecordCompletion";
import { stepLegacyEntityAssociationCleanup } from "./LegacyEntityAssociationCleanup";
import { changeLegacyEntityType, stepLegacySubsystemC, type LegacyEntityTypeChangeInput } from "./LegacyEntityTypeChange";
import { scanLegacyEntityTargets, type LegacyEntityTargetScanInput, type LegacyEntityTargetScanResult } from "./LegacyEntityTargetScan";
import { promoteLegacyEntityMode, selectLegacyEntityTypeAfterQ } from "./LegacyEntityModePromotion";
import { calculateLegacyEntityM, type LegacyEntityMCalculationInput } from "./LegacyEntityMCalculation";
import { stepLegacySubsystemEntityTransform } from "./LegacySubsystemEntityTransform";
import { clearLegacyEntityRecordTarget } from "./LegacyEntityRecordTargetClear";
import { filterLegacyEntityLifecycle } from "./LegacyEntityLifecycleFilter";
import { finalizeLegacyEntity } from "./LegacyEntityFinalize";
import { transferLegacyEntityAction } from "./LegacyEntityActionTransfer";
import { stepLegacyStateU, type LegacyStateUInput } from "./LegacyStateU";
import { stepLegacyStateTransitionCommand, type LegacyStateTransitionCommandInput } from "./LegacyStateTransitionCommand";
import { stepLegacyStateS, type LegacyStateSInput } from "./LegacyStateS";
import { stepLegacyStateT, type LegacyStateTInput } from "./LegacyStateT";
import { stepLegacyFPairCommand, type LegacyFPairCommandInput } from "./LegacyFPairCommand";
import { markLegacySpatialRecord, markLegacySpatialRect } from "./LegacySpatialRecordUpdate";
import { stepLegacySpriteLayerLoop } from "./LegacySpriteLayerLoop";
import { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } from "./LegacySpriteLayerPredicates";
import { stepLegacyEntityOverlayDraw } from "./LegacyEntityOverlayDraw";
import { drawLegacyCScan } from "./LegacyCScanDraw";
import { applyLegacyAuxiliaryModeWrites, type LegacyAuxiliaryModeWriteResult } from "./LegacyAuxiliaryModeWrites";
import { stepLegacyAuxiliaryModes67, type LegacyAuxiliaryModes67Input } from "./LegacyAuxiliaryModes67";
import { stepLegacyAuxiliaryMode4 } from "./LegacyAuxiliaryMode4";
import { stepLegacySubsystemOLower } from "./LegacySubsystemOLower";
import { legacyPathCellPredicate } from "./LegacyPathCellPredicate";
import { prepareLegacyPath, type LegacyPathPreparationInput } from "./LegacyPathPreparation";
import { setLegacyPathDirection, type LegacyPathDirectionState } from "./LegacyPathDirection";
import { stepLegacyPathE, type LegacyPathEInput } from "./LegacyPathE";
import { stepLegacyByteActionQueue } from "./LegacyByteActionQueue";
import { stepLegacySelectionFlags } from "./LegacySelectionFlags";
import { beginLegacyEntityAction, stepLegacyAk, stepLegacyAl, stepLegacyAm, stepLegacyAn, stepLegacyAo, stepLegacyAp, stepLegacyAq, stepLegacyAr, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv, stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA, stepLegacyAd, stepLegacyAB, stepLegacyAC, stepLegacyAe, stepLegacyAi, stepLegacyAf, stepLegacyAg, stepLegacyAh, stepLegacyAj, stepLegacyAKViewport, stepLegacyAL, resetLegacyAM, stepLegacyAOMap, stepLegacyMapEntry, stepLegacyAPPrefix, stepLegacyAQAudio, stepLegacyASAudioWait, type LegacyAkCallbacks, type LegacyAmInput, type LegacyAnInput, type LegacyAoInput, type LegacyAoState, type LegacyApInput, type LegacyApState, type LegacyAqState, type LegacyArInput, type LegacyAuInput, type LegacyAwState, type LegacyAdInput, type LegacyAbInput, type LegacyAcInput, type LegacyAbState, type LegacyAcState, type LegacyAeInput, type LegacyAeState, type LegacyAiInput, type LegacyAfState, type LegacyGroupKeyState, type LegacyAjState, type LegacyAKViewportState, type LegacyALState, type LegacyAmResetInput, type LegacyAOMapInput, type LegacyAOMapState, type LegacyAPPrefixInput, type LegacyAQAudioInput, type LegacyAdState, type LegacyAnState, type LegacyMapEntryCallbacks } from "./LegacyStateMachine";

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
const LEGACY_SPATIAL_LAYER_INDEX = 1;

/**
 * A state bag whose properties read and write another object's fields directly. The
 * original's fields are instance fields: a nested call's write is visible at
 * once and survives the caller. Copying them into a bag and writing the bag
 * back afterwards silently undid those nested writes (the unclosable Q=20
 * prompt, the camera snapping back, the chief-pick cursor stuck on 0), so
 * wrappers whose callbacks reach other methods use this instead.
 */
function liveView<S, T extends object = LegacyGameState>(target: T, map: { readonly [K in keyof S]: keyof T }): S {
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

export class LegacyRuntimeState {
  readonly renderTargets = new LegacyRenderTargets();
  readonly game = new LegacyGameState();
  readonly input = new LegacyInputState({
    onSelectionKey: (value) => this.acceptNumericSequence(value),
    onKeyPressed: (value) => this.projectRawKeyPressed(value),
    onKeyReleased: (value) => this.projectRawKeyReleased(value),
    // f.j:B (#325): keyPressed/keyReleased zero the idle counter h() bumps and
    // ae() reads. The input layer kept its own never-read copy until 2026-10-08.
    onIdleReset: () => { this.game.jByte = 0; },
    nFlag: () => this.game.nFlag,
    onStar: () => { this.game.staticL = true; },
    onHash: () => { this.game.staticM = true; },
    onDigitLatch: (value, holdW) => {
      this.game.iByte = value;
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
  private midiResource?: MidiResource;
  private midiPlayer?: OriginalMidiPlayer;
  private progressStoreLoaded = false;
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
  private readonly pathDirection: LegacyPathDirectionState = { a: 0, c: this.subsystemArrays.cByte };
  /** Raw f.m(int) sequence state; the five values come from f.g() bytecode. */
  private readonly numericSequence: LegacyNumericSequenceState = {
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
  private readonly adState: LegacyAdState = Object.assign(
    liveView<Omit<LegacyAdState, "selection">>(this.game, {
      Q: "Q", q: "qByte", s: "sByte", t: "tByte", T: "actionT", R: "R", vInt: "vInt", vByte: "vByte", H: "H",
      b: "levelBByte", c: "progressC", A: "AByte", cFlag: "cFlag", y: "yByte", z: "zByte", B: "BByte",
      I: "IByte", J: "JByte", K: "KByte", L: "cameraSavedKByte", AFlag: "AFlag",
    }),
    { selection: this.game.selectionFlags },
  );
  /** Raw render-dispatch fields used by f.m() after f.ak(). */
  private readonly frameDispatchState: LegacyFrameDispatchInput["state"] = Object.assign(
    // N is N:B (#79), the same field as game.targetSlot. CORRECTED
    // 2026-10-01: it was a private copy, so a(BII)'s target switch and
    // F()'s `N = c[1]` never reached m()/c(int,int)/u(), and vice versa.
    liveView<Pick<LegacyFrameDispatchInput["state"], "N">>(this.game, { N: "targetSlot" }),
    {
      c: -1, Q: 14, H: true, c1: 1,
      // f.b:[Z] (#234). CORRECTED 2026-09-30: this was a private array, so
      // F()'s Q 18/24/32 branches set b[11]/b[13]/b[16]/b[17] where the frame
      // command never looked, and the intro cutscene page was never drawn.
      flags: this.game.frameFlags,
    },
  );
  /** f.H/I/J/K/L/N()'s fields, LIVE since 2026-09-23 (onPrimitive writes vInt, onU writes A:Z). */
  private readonly simpleFrameState: LegacySimpleFrameState = Object.assign(
    liveView<Omit<LegacySimpleFrameState, "flags" | "k">>(this.game, {
      Q: "Q", H: "H", I: "I", J: "J", ab: "abFlag", x: "xInt", vInt: "vInt", m: "mByte", aP: "aPInt", cFlag: "cFlag", AFlag: "AFlag",
    }),
    { flags: this.game.frameFlags, k: this.game.zlKBytes },
  );
  private readonly mFrameState: LegacyMFrameState = {
    H: true,
    I: false,
    m: 0,
    flags: this.game.frameFlags,
    d: Array.from({ length: 600 }, () => 0),
    a: new Int16Array(312),
  };
  readonly framePrimitives: Array<readonly [number, number, number]> = [];
  readonly frameProjections: Array<readonly [number, number, number, number]> = [];
  readonly frameHelperCalls: Array<Readonly<Record<string, number | string>>> = [];
  readonly offscreenTargets = typeof document === "undefined" ? undefined : new LegacyOffscreenTargets();
  /**
   * f.an() (Back key) fields, live since 2026-09-27. Only Q/R/H/vInt used to
   * be synced: U and V were stuck at 5 and 4 (so Back on the mission-select
   * screen Q = V did nothing unless V was 4), aa:I was a private 0, and the
   * T/Z/P/I/S/m/ac writes were dropped.
   */
  private readonly anState: LegacyAnState = Object.assign(
    liveView<Omit<LegacyAnState, "selection">>(this.game, {
      Q: "Q", U: "U", H: "H", P: "pendingP", I: "I", vInt: "vInt", T: "actionT", V: "progressV",
      Z: "Z", aaInt: "aaInt", mByte: "mByte", R: "R", S: "S", ac: "acFlag",
      y: "yByte", z: "zByte", A: "AByte", B: "BByte", IByte: "IByte", J: "JByte", K: "KByte", L: "cameraSavedKByte",
    }),
    { selection: [] as boolean[] },
  );
  /** Runtime mirror for the confirmed f.a(20,1,0) -> f.ap() path. */
  private readonly entityActionState: LegacyApState = Object.assign(
    // f.a(byte,byte,byte)/f.ap() fields. Everything but ap/m/e is a
    // live game field (2026-09-23): ap()'s callees -- l(-1), ah(), the
    // selection release, f(int,int) -- write w, P, I/K and friends directly.
    // am:B (#208) / an:B (#210) are live since 2026-10-02: c()'s aD 12 reads
    // am for the prompt's portrait, so a private copy drew the previous
    // speaker's face under the prompt speaker's name.
    liveView<Omit<LegacyApState, "ap" | "m" | "e">>(this.game, {
      w: "wByte", KFlag: "kFlag", Q: "Q", U: "U", z: "zByte", y: "yByte", B: "BByte", A: "AByte",
      J: "JByte", I: "IByte", L: "cameraSavedKByte", K: "KByte", P: "pendingP", o: "oInt", ac: "acFlag",
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
  private readonly aoState: LegacyAoState = liveView<LegacyAoState>(this.game, {
    Q: "Q", R: "R", H: "H", vInt: "vInt", V: "progressV", r: "progressR", q: "qByte", T: "actionT",
    Z: "Z", mByte: "mByte", s: "sByte", eByte: "eByte", af: "numericAf", c: "c", pByte: "persistedPByte",
    aaInt: "aaInt",
    // l:I (#334), the tips toggle as() flips (Z == 3); a private 0 until
    // 2026-09-27, so the Options switch never reached game.lInt or the save.
    lInt: "lInt",
    // Q=19's camera save z=y/B=A/J=I/L=K (offsets 111..136); these were
    // private zeros until 2026-09-27, so the save never reached the game.
    y: "yByte", z: "zByte", A: "AByte", B: "BByte", I: "IByte", J: "JByte", K: "KByte", L: "cameraSavedKByte",
  });
  private maResource?: MaResource;
  private languageResources?: {
    readonly s: DelimitedTable;
    readonly t: DelimitedTable;
    readonly d0: DelimitedTable;
  };
  /** All five JAR languages' /s, /t, /d0 (index = f.a:B), for the Q14 choice. */
  private languageTables?: readonly { readonly s: DelimitedTable; readonly t: DelimitedTable; readonly d0: DelimitedTable }[];
  /** f.a:B (static), the language c.b() loads from; ZH_LANGUAGE (5) is the added Chinese. */
  language = 0;
  private zhStrings: ZhStrings | null = null;
  private readonly zhPainter = new ZhPainter();
  /** Set while the language is Chinese: c.b(IIIIIII)'s Chinese wrap. */
  private zhCompose: LegacyCZh | null = null;

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
  private pi8Slot0: DrawableImage | undefined;
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
  private readonly pFrameState: LegacyPState = Object.assign(
    liveView<Omit<LegacyPState, "entityScanFlags" | "packedBytes" | "packedOffsets" | "dense" | "p">>(this.game, {
      needsFullReset: "H", followFlag: "AFlag", an: "an", ao: "ao", aR: "aR", JFlag: "jSceneFlag", jFlag: "jFlag", aP: "aPInt",
      aQ: "aQ", aS: "aS", targetSlot: "targetSlot", bc: "bc", bd: "bd", be: "be", bf: "bf", c: "cFlag",
      am: "am", al: "al", phase: "fCounter",
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
  private readonly stateCommandState: StateCommandBag = (() => {
    const bag = liveView<Omit<StateCommandBag, "bG" | "bJ" | "dFlags" | "p">, LegacyGameState>(this.game, {
      ai: "ai", ak: "akByte", aj: "ajByte", oInt: "oInt", oByte: "oByte", v: "vByte", vInt: "vInt",
      q: "qByte", aT: "aTInt", aS: "aS", aR: "aR", al: "al", am: "am", an: "an", I: "IByte", J: "JByte",
      K: "KByte", Q: "Q", H: "H", Z: "Z", ao: "ao", JFlag: "jSceneFlag", aP: "aPInt", R: "R",
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
  private activeMap?: LegacyRenderableMap;

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
      Q: this.game.Q,
      vByte: this.game.vByte,
      vInt: this.game.vInt,
      H: this.game.H,
      U: this.game.U,
      R: this.game.R,
      S: this.game.S,
      c: this.game.c,
      b: this.game.b,
      aOffsets: {
        149: this.packedOffsets[149],
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
  private cRenderExtras(): LegacyCRenderExtras {
    return {
      onNumber: (x, y, width, text, value) => { this.geometry.queueTextWithWidth(x, y, width, text, value); },
      random: (mask, divisor) => this.randomRemainder(mask, divisor),
      pools: this.mainArrays.aShort,
      onIcon: (record, x, y) => this.drawPackedComposite(record, x, y),
    };
  }

  /** Emit the exact c.a(Graphics,int) drawRegion commands for one row window. */
  renderCRow(rowStart: number, onDraw?: (command: LegacyCDrawCommand) => void): LegacyCDrawCommand[] {
    return emitLegacyCRenderRow(this.cComposition, this.packedBytes, this.packedOffsets, this.resourceTables.byteViews, this.imageGroups[0], rowStart, onDraw, this.setDialogueEdges, this.cRenderExtras());
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
        this.renderCRow(rowStart, onDraw);
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
      readMode: (language) => this.denseState[3535 + language] ?? 0,
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

  /** Resolve the proven f.d(IIII) subrecord and expose its f.a(III) boundary. */
  stepZSubrecordDraw(index: number, x: number, y: number, phase: number, callbacks: LegacyZSubrecordDrawCallbacks = {}): void {
    const data = this.packedData;
    if (!data) throw new Error("Packed /pd0 data is not loaded");
    stepLegacyZSubrecordDraw({ shortRows: data.shortTables, byteRows: data.byteTables }, index, x, y, phase, callbacks);
  }

  /** Execute the proven private f.b(III) image/primitive branch. */
  /**
   * f.b(int,int,int) (#535). This project ports that method TWICE:
   * `LegacyPackedSpritePrimitive.ts` decodes it into callbacks, and
   * `LegacyPackedSpriteRenderer.ts`'s `drawSprite` renders it against a bound
   * Graphics. The renderer is the one that actually puts pixels anywhere.
   *
   * BUG FIX (2026-09-09): this method only called the callback-decoding port,
   * and EVERY call site in the codebase (O()'s two HUD bars at 524/528, the
   * four `onSpriteRecord` seams, and the entity-overlay site) passes no
   * callbacks -- so `f.b(int,int,int)` drew nothing, anywhere, ever. Found
   * while chasing the empty HUD: O() computes
   * `drawPackedSpritePrimitive(524, 0, 22)` and `(528, 0, 310)` with
   * targetSlot 0, which is exactly the two bars paint()'s v==1 tail then blits
   * from offscreen image 0 -- and offscreen 0 stayed blank because these two
   * calls emitted nothing.
   *
   * Now renders through the same `Graphics[N:B] == graphics[targetSlot]` the
   * original writes to, and still runs the decoder so existing callback
   * consumers keep their trace.
   */
  /**
   * a(int,int,int) (#439) into Graphics[N:B]. c(int,int)'s d(IIII) frames and
   * its offset-762 item icon are composites; until 2026-10-01 they went
   * through drawPackedSpritePrimitive (b(III)), so the placement cursor's
   * "!" / arrow drew one stray 8x5 piece.
   */
  private drawPackedComposite(record: number, x: number, y: number): void {
    const data = this.packedData;
    const graphics = this.offscreenTargets?.graphics[this.game.targetSlot as 0 | 1 | 2 | 3];
    if (!data || !graphics) return;
    new LegacyPackedSpriteRenderer({
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      imageGroups: this.imageGroups,
      graphics,
    }).drawComposite(record, x, y);
  }

  drawPackedSpritePrimitive(id: number, x: number, y: number, typeOverride = -1, callbacks: LegacyPackedSpritePrimitiveCallbacks = {}): void {
    const data = this.packedData;
    if (!data) throw new Error("Packed /pd0 data is not loaded");
    drawLegacyPackedSpritePrimitive({ byteRows: data.byteTables, colorRows: data.byteTables, typeOverride }, id, x, y, callbacks);
    const graphics = this.offscreenTargets?.graphics[this.game.targetSlot as 0 | 1 | 2 | 3];
    if (!graphics) return;
    new LegacyPackedSpriteRenderer({
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      imageGroups: this.imageGroups,
      graphics,
    }).drawSprite(id, x, y);
  }

  /** Feed a raw numeric keycode into the original f.m(int) sequence helper. */
  acceptNumericSequence(value: number): void {
    // u:B (#372) is the SAME real field f.j()/f.am()/f.a(BBBB)/f.aM() share
    // (game.uByte); prime it from there so this method's conditional
    // "u = 1" write is a faithful read-modify-write against the live
    // field, not a disconnected shadow copy (merged 2026-08-20).
    this.numericSequence.u = this.game.uByte;
    // q:B (#357) is likewise the SAME field `game.qByte` already tracks
    // pervasively (30+ call sites); prime/write back through it instead of
    // the disconnected `numericQ` shadow (merged 2026-08-20, see
    // docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster").
    this.numericSequence.q = this.game.qByte;
    acceptLegacyNumericValue(this.numericSequence, value);
    this.game.numericAe = this.numericSequence.ae;
    this.game.numericAf = this.numericSequence.af;
    this.game.numericAg = this.numericSequence.ag;
    this.game.uByte = this.numericSequence.u;
    this.game.qByte = this.numericSequence.q;
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
      as: this.game.frameLayoutAS,
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

  /** Raw keyPressed(int) writes outside the input mirror. */
  private projectRawKeyPressed(value: number): void {
    switch (value) {
      case 53:
        // keyPressed offsets 311..343: i, t, n:I += 1 (the double-tap count
        // a(byte,byte) reads; FIXED 2026-10-08, it never counted), and E:B = 0
        // unless u:Z.
        this.game.iFlag = true;
        this.game.inputT = true;
        this.game.nInt += 1;
        if (!this.game.uFlag) this.game.E = 0;
        return;
      case 50: this.game.inputUp = true; return;
      case 56: this.game.inputDown = true; return;
      case 52: this.game.inputLeft = true; return;
      case 54: this.game.inputRight = true; return;
      default: return;
    }
  }

  /** Raw keyReleased(int) writes outside the input mirror. */
  private projectRawKeyReleased(value: number): void {
    switch (value) {
      case 53:
        this.game.inputT = false;
        if (this.game.E < 4) this.game.inputV = true;
        return;
      case 50: this.game.inputUp = false; return;
      case 56: this.game.inputDown = false; return;
      case 52: this.game.inputLeft = false; return;
      case 54: this.game.inputRight = false; return;
      default: return;
    }
  }

  /** Raw f.a(int) entity-table partition lookup; caller meaning is unresolved. */
  entityPartition(id: number): number {
    return legacyEntityPartition(id);
  }

  /** Raw c.a(x,y,mode,String,style) text-to-geometry entry point. */
  queueGeometryText(x: number, mode: number, text: string, style: number): number {
    return this.geometry.queueText(x, mode, text, style);
  }

  /** Raw f.a(int,int,int,boolean) footprint availability check. */
  canPlaceFootprint(map: Int8Array[], x: number, y: number, type: number, requireTerrainClass: boolean): boolean {
    return canPlaceLegacyFootprint({
      map,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      occupancyClass: (cellX, cellY) => this.occupancyClass(cellX, cellY),
    }, x, y, type, requireTerrainClass);
  }

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
  private runAP(placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
    this.stepStateAPPrefix({
      ...placementCallbacks,
      // Live: aP() writes aw itself (the old inline snapshot dropped it).
    state: liveView<LegacyAPPrefixInput["state"]>(this.game, { q: "qByte", bByte: "levelBByte", awByte: "levelAwByte" }),
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
          q: this.game.qByte,
        });
      }),
    });
  }

  /**
   * Exact f.c() (#365, bytecode/f-javap.txt, offsets 0..53): the map widens
   * to its full stored size (c:S = e:S, d:S = f:S -- aN() cut mission 5 to
   * 32 columns less), q moves on, aP() places the new mission's entities and
   * b.G:I = t219 + 4q. b.ak() calls it when mission 5 is won, which is how
   * mission 6 starts on the same, now larger, map. WIRED 2026-09-24; the old
   * port (beginMapSession) had no caller and an invented session byte.
   */
  private stepLegacyC(): void {
    const g = this.game;
    if (this.activeMap) {
      g.mapWidth = this.activeMap.width;
      g.mapHeight = this.activeMap.height;
    }
    g.qByte = toJavaByte(g.qByte + 1);
    this.runAP();
    // b.G:I = f.a:[S][219] + 4q (offsets 31..50). FIXED 2026-10-08 (oracle): wrote an
    // unread `subsystemPointer` copy, from saveOffsets (f.b:[S) instead of packedOffsets.
    g.subsystemGBase = (this.packedOffsets[219] ?? 0) + g.qByte * 4;
  }

  /** Complete structural b.d() spatial pass over the raw entity bank and layers. */
  runSpatialPass(
    callbacks: Omit<LegacySpatialPassInput, "state" | "packedBytes" | "packedOffsets" | "layers">,
  ): void {
    runLegacySpatialPass({
      ...callbacks,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      layers: this.mainArrays.aInt,
      onPrimarySpatialUpdate: callbacks.onPrimarySpatialUpdate ?? ((x, y, span) => {
        markLegacySpatialRecord({
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          layers: this.mainArrays.aInt,
          layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
          mapHeight: this.game.mapHeight,
        }, x, y, span);
      }),
      // BUG FIX (2026-09-04): was left unwired on the stated grounds that
      // the building half "has no confirmed b.S layer source". That premise
      // was wrong -- b.a(int,int,int,int) (offset 43..54) funnels into the
      // very same b.d(int,int,int) row writer b.a(int,int,int) uses, so it
      // marks layer b.S, i.e. the identical LEGACY_SPATIAL_LAYER_INDEX.
      onRectSpatialUpdate: callbacks.onRectSpatialUpdate ?? ((x, y, width, height) => {
        markLegacySpatialRect({
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          layers: this.mainArrays.aInt,
          layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
          mapHeight: this.game.mapHeight,
        }, x, y, width, height);
      }),
    });
  }

  /** Raw b.g() outer candidate gate; movement/combat helpers remain callbacks. */
  selectEntityUpdateCandidates(
    simulationCounter: number,
    callbacks: Omit<LegacyEntityUpdateSelectionInput, "state" | "simulationCounter" | "auxiliaryF" | "subsystemG"> = {},
  ): void {
    selectLegacyEntityUpdateCandidates({
      ...callbacks,
      state: this.denseState,
      simulationCounter,
      auxiliaryF: this.mainArrays.f4,
      subsystemG: this.subsystemArrays.gRows,
    });
  }

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

  /** Raw b.s() prepass used by the original b.e() update. */
  runSubsystemPrepass(
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
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      mainShort: this.mainArrays.aShort,
    });
  }

  /** Raw b.e() outer entity loop; private entity methods remain callbacks. */
  runSubsystemEntityLoop(
    frame: number,
    q: number,
    bByte: number,
    scheduler: { kByte: number },
    callbacks: Omit<LegacySubsystemEntityLoopInput, "state" | "mainShort" | "packedBytes" | "packedOffsets" | "frame" | "q" | "bByte" | "scheduler"> = {},
  ): void {
    runLegacySubsystemEntityLoop({
      ...callbacks,
      state: this.denseState,
      mainShort: this.mainArrays.aShort,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      frame,
      q,
      bByte,
      scheduler,
    });
  }

  /** Raw b.t() target-step gates and fixed state writes; inner helpers are callbacks. */
  stepEntityTarget(
    id: number,
    input: Omit<LegacyEntityTargetStepInput, "state" | "packedBytes" | "saveOffsets" | "packedOffsets" | "id">,
  ) {
    return stepLegacyEntityTarget({
      // Offsets 632..738, t()'s reset path, WIRED 2026-09-23: after clearing
      // the order and parking the target on its own cell the unit gets a new
      // type through Q() (#253) and a(12, v, 0) (#274). Both were ported;
      // neither had ever been connected here.
      onQ: () => this.selectEntityTypeAfterQ(id),
      onTargetDispatch: (action, target, id2) => this.entityMove(action, target, id2),
      ...input,
      state: this.denseState,
      packedBytes: this.packedBytes,
      saveOffsets: this.saveOffsets,
      packedOffsets: this.packedOffsets,
      id,
    });
  }

  /**
   * Raw b.v() entity-core boundary. The f.j[][] table and private w/d/e/y
   * owners remain explicit inputs because their original aliases are not yet
   * proven; this wrapper nevertheless binds the complete confirmed prefix to
   * the live dense state bank.
   */
  stepEntityCoreUpdate(
    id: number,
    input: Omit<LegacyEntityCoreUpdateInput, "state" | "packedBytes" | "packedOffsets" | "entityId">,
  ): boolean {
    return stepLegacyEntityCoreUpdate({
      ...input,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      entityId: id,
    });
  }

  /**
   * Exact `final void f.d(int)` record-completion boundary.
   *
   * FIXED (2026-08-20): was reading `game.entityW`/`game.entityQ` (fields
   * only ever written by the dead, unused `selectCurrentEntity`/
   * `LegacyEntityCurrentSelection.ts`, both DELETED 2026-08-25 -- see
   * `docs/unknowns.md`), so this real side effect (`P:Z=true` when
   * `w===2 && record===q`) never actually fired in live play. Direct
   * bytecode read confirms `w`
   * is `w:B` (#382) and `q` is `q:I` (#356) -- the SAME already-canonical
   * `game.wByte`/`game.qCounter` fields many other already-wired methods
   * use.
   */
  completeEntityRecord(record: number): void {
    const state = { w: this.game.wByte, q: this.game.qCounter, P: this.game.pendingP };
    completeLegacyEntityRecord(state, record);
    this.game.pendingP = state.P;
  }

  /** Raw b.w() state-update prefix with original table/callee seams explicit. */
  stepEntityWUpdate(
    id: number,
    input: Omit<LegacyEntityWUpdateInput, "state" | "packedBytes" | "packedOffsets" | "entityId">,
  ): void {
    stepLegacyEntityWUpdate({
      ...input,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      entityId: id,
    });
  }

  /** Apply the proven b.a(int,byte) type-change side effects to the live bank. */
  changeEntityType(id: number, type: number, onC?: LegacyEntityTypeChangeInput["onC"]): number {
    return changeLegacyEntityType({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortTableB: this.saveOffsets,
      shortTableBOffsets: this.sectionOffsets,
      entityId: id,
      type,
      fields: liveView<{ B: number }, LegacySubsystemArrays>(this.subsystemArrays, { B: "bField8" }),
      // b.C() on the ambient v:I (game.subsystemV) unless a caller supplies its own.
      onC: onC ?? (() => stepLegacySubsystemC({ state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets }, this.game.subsystemV)),
    });
  }


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
  private checkSpiralPlacementGate(
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
      team: game.subsystemU,
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

  /**
   * Run `private void i(int)` (#391, bytecode/b-javap.txt line 13281)
   * against the live entity bank. WIRED 2026-08-31; see
   * LegacyEntityIUpdate.ts's own docblock for the full re-derivation and
   * the four bugs it fixes. `y()`'s convergence tail
   * (LegacyEntityFollowup.ts) is its only live call site so far.
   *
   * All four of the method's cross-call scalars are threaded through the
   * shared `raw` object and written back afterwards. `x:I` is read-only
   * inside `i(int)` itself but IS written by the `onF` stub below, so it
   * still has to round-trip.
   */
  private stepEntityIUpdate(id: number, argument: number, team: number): void {
    const game = this.game;
    // Live (2026-09-23): onFByte's scene dispatch writes p (and can write y),
    // which a snapshot written back afterwards used to undo.
    const raw = liveView<{ x: number; H: number; y: number; p: number }>(this.game, {
      x: "subsystemX", H: "subsystemH", y: "subsystemY", p: "persistedPByte",
    });
    stepLegacyEntityIUpdate({
      state: this.denseState,
      entityId: id,
      argument,
      readPacked: (table, index) =>
        this.packedBytes[(this.packedOffsets[table] ?? 0) + index] ?? 0,
      // b.B:I (#8) has to be re-read on demand: onChangeType below rewrites
      // it as part of b.a(int,byte)'s own body.
      readBValue: () => this.subsystemArrays.bField8,
      qValue: this.game.qByte,
      // b.u:I (#222) -- the team index e()'s own entity loop is currently on.
      uValue: team,
      raw,
      // private boolean f() (#381) -- LegacyEntityWorkDeposit.ts; its false path
      // re-rolls x:I, which the rest of i(int) reads through raw.x.
      onF: () => stepLegacyEntityWorkDeposit({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        entityId: id,
        fRows: this.subsystemArrays.fRows,
        gRows: this.subsystemArrays.gRows,
        // b.C:I (#10) is shared with J()/g()'s loop, so read and write it live.
        scratch: (() => {
          const arrays = this.subsystemArrays;
          return { get C() { return arrays.bField10; }, set C(value: number) { arrays.bField10 = value; } };
        })(),
        onRecordCompletion: (record) => this.completeEntityRecord(record),
        onReroll: () => { raw.x = this.randomRemainder(0xffffff, 100); },
      }),
      // offset 198: b.a(int,byte) (#275), the real entity type change.
      onChangeType: (targetId, type) => { this.changeEntityType(targetId, type); },
      // offset 348: f.a(int,int) (#269) -- `random.nextInt() & mask % divisor`.
      onRandomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      // offset 509: f.a(int,byte) (#277) -- the xSlotTable slot writer.
      onLinkByte: (targetId, value) => {
        writeLegacyEntityLinkByte({
          state: this.denseState,
          entityId: targetId,
          value,
          bCube: this.game.xSlotTable,
        });
      },
      // offset 708: b.b(int,int,int) (#342), called with (id, 0, 1).
      onSubsystemB: (first, second, third) => {
        selectLegacyAuxiliaryCandidates({
          p: this.auxiliaryScratch,
          dense: this.denseState,
          shortRows: this.mainArrays.aShort,
        }, this.auxiliaryQueueState, first, second, third);
      },
      // offset 735: f.b(int) (#343) -- runSceneDispatch, already wired
      // elsewhere as b.i()'s own onFByte.
      onFByte: (value) => { this.runSceneDispatch(value); },
      // private boolean b(int) (#345) with z()/g() -- LegacyEntityModeSelect.ts.
      // It writes H:I/y:I, which the rest of i(int) reads through `raw`.
      onBInt: (value) => stepLegacyEntityModeSelect({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        gridC: this.gridC,
        entityId: id,
        team,
        mapWidth: this.game.mapWidth,
        mapHeight: this.game.mapHeight,
        readBValue: () => this.subsystemArrays.bField8,
        raw,
        scratch: (() => {
          const arrays = this.subsystemArrays;
          return {
            get C() { return arrays.bField10; }, set C(v: number) { arrays.bField10 = v; },
            get D() { return arrays.bField12; }, set D(v: number) { arrays.bField12 = v; },
          };
        })(),
      }, value),
      // offset 140: private void M() (#249) -- an idle villager becomes type 83.
      // WIRED 2026-09-23: it was held back (2026-09-14) because the way back,
      // I() (#245) at i()Z's offset 1024, sat behind unported callbacks
      // (l() #398, a(int,boolean,int) #292, j(int) #394); all are wired now.
      onM: () => stepLegacyEntityMUpdate({
        state: this.denseState,
        entityId: id,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        raw: { get R() { return game.subsystemR; }, set R(value: number) { game.subsystemR = value; } },
        onChangeType: (targetId, newType) => { this.changeEntityType(targetId, newType); },
        randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      }),
    });
  }

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

  /** Proven b.Q() type selection against the live entity bank. */
  selectEntityTypeAfterQ(id: number): number {
    return selectLegacyEntityTypeAfterQ(this.denseState, id, (entityId, type) => {
      this.changeEntityType(entityId, type);
    });
  }

  /** Proven b.m calculation core; callers supply the original k[] snapshot. */
  calculateEntityM(input: Omit<LegacyEntityMCalculationInput, "state" | "packedBytes" | "packedOffsets">): number {
    return calculateLegacyEntityM({
      ...input,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Execute the proven f.c(int) association cleanup against live entity state. */
  /**
   * f.c(int): its reset is always f.a(record, false) (#469). CORRECTED
   * 2026-10-12 (oracle run 11, frame 18108): the callback was optional and
   * h(int)'s call passed none, so a builder reassigned elsewhere left its
   * site's other workers in place.
   */
  clearEntityRecordTarget(id: number): void {
    clearLegacyEntityRecordTarget({
      state: this.denseState,
      entityId: id,
      onRecordReset: (record, enabled) => {
        this.filterEntityLifecycle(record, enabled, (row, column) => this.gridC[row]?.[column] ?? 0);
      },
    });
  }

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

  /**
   * Execute the proven `f.a(byte)` (`LegacyEntityFinalize.ts`), composed
   * from its already-ported/already-wired-elsewhere pieces: `e(int)`
   * (`releaseLegacyEntitySelection`), `f(int)`
   * (`finalizeLegacyEntitySelection`), and `c(int)`
   * (`clearEntityRecordTarget`, whose own `onRecordReset` is `c(int)`'s
   * call into `a(int,boolean)`/`filterEntityLifecycle`). The type=3
   * byte-action-queue insert reuses the same queue arrays
   * `stepByteActionQueueMaintenance`'s type=100 maintenance call reads, so
   * an insert here is genuinely picked up by that already-live per-tick
   * processing. This method's own real callers live in class `b`
   * (bytecode/b-javap.txt), not yet ported -- calling this requires an
   * explicit id from elsewhere until that caller chain is wired.
   */
  finalizeEntity(id: number): void {
    const result = finalizeLegacyEntity({
      dense: this.denseState,
      grid: this.gridC,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      id,
      q: this.game.qCounter,
      entityFocusFlag: this.game.entityFocusFlag,
      entityFocusPFlag: this.game.pendingP,
      cameraSFlag: this.game.cameraSFlag,
      onRelease: (entityId) => {
        releaseLegacyEntitySelection({
          groups: this.mainArrays.aByte,
          dense: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          id: entityId,
          F: this.game.FByte,
          w: this.game.wByte,
          onModeReset: () => { this.game.wByte = 0; },
          onFReset: () => { this.game.FByte = -1; },
        });
      },
      onFinalize: (entityId) => {
        const finalizeResult = finalizeLegacyEntitySelection({
          id: entityId,
          k: this.game.kByte,
          w: this.game.wByte,
          l: this.game.frameLayoutL,
          q: this.game.qCounter,
          dense: this.denseState,
          onSelectionReset: () => { this.runSelectionFlagsRefresh(true, true, false, false); },
        });
        this.game.kByte = finalizeResult.k;
        this.game.wByte = finalizeResult.w;
        this.game.frameLayoutL = finalizeResult.l;
      },
      onRecordClear: (entityId) => { this.clearEntityRecordTarget(entityId); },
      onQueueInsert: (type, x, y, value) => {
        const state = {
          c: this.game.c,
          u: this.game.uByte,
          ay: this.game.ayByte,
          uBytes: this.mainArrays.uBytes,
          kMatrix: this.mainArrays.kMatrix,
          gCounters: this.mainArrays.gCounters,
          selectionFlags: this.game.selectionFlags,
          onSelectionRefresh: (a: boolean, b: boolean, c: boolean, d: boolean) => { this.runSelectionFlagsRefresh(a, b, c, d); },
        };
        stepLegacyByteActionQueue(state, type, x, y, value);
        this.game.ayByte = state.ay;
      },
      onTeamCounter: (teamRowIndex) => {
        const row = this.mainArrays.aShort[teamRowIndex];
        if (row) row[22] = (row[22] ?? 0) + 1;
      },
    });
    this.game.pendingP = result.entityFocusPFlag;
  }

  /** Exact b.b(int) mode-byte helper used by later entity state transitions. */
  entityModeValue(id: number): number {
    return readLegacyEntityModeValue({ state: this.denseState, id });
  }

  /** Raw f.a(byte,int,int,int,int,boolean,int) entity/building placement boundary. */
  placeEntity(
    map: Int8Array[],
    team: number,
    type: number,
    x: number,
    y: number,
    flags: number,
    specialPlacement: boolean,
    existingId: number,
    options: Omit<LegacyEntityPlacementInput, "state" | "map" | "packedBytes" | "packedOffsets" | "mainShort" | "typeZeroRows" | "auxiliarySlots" | "mapWidth" | "mapHeight" | "occupancyClass">,
  ): number {
    return placeLegacyEntity({
      ...options,
      state: this.denseState,
      map,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      mainShort: this.mainArrays.aShort,
      typeZeroRows: this.mainArrays.aByte3,
      auxiliarySlots: this.mainArrays.f4,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      occupancyClass: (cellX, cellY) => this.occupancyClass(cellX, cellY),
    }, team, type, x, y, flags, specialPlacement, existingId);
  }

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

  /** Raw mode 4 continuation of b.a(IIII), with private owners as callbacks. */
  stepAuxiliaryMode4(input: Omit<Parameters<typeof stepLegacyAuxiliaryMode4>[0], "dense">): boolean {
    return stepLegacyAuxiliaryMode4({
      ...input,
      dense: this.denseState,
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
        this.stepSubsystemOLower({
          v: input.v,
          onBFourByte: (x, y, targetX, targetY) =>
            stepLegacySubsystemScore(this.legacySubsystemScoreInput(input.v), x, y, targetX, targetY),
        });
      }),
      // b.a(int,int,int) (#266) is occupancyCheck. MERGED 2026-10-08 (oracle):
      // a second port, legacyNeighborValue, read packedBytes where the
      // bytecode reads b.a:[B (= f.e, denseState) and skipped the q:B/r:B writes.
      onNeighborMetric: input.onNeighborMetric ?? ((x, y, mode) => this.occupancyCheck(input.v, x, y, mode)),
    });
  }

  /** Raw private b.o() state writes; b(IIII)B remains an explicit callback. */
  stepSubsystemOLower(input: Omit<Parameters<typeof stepLegacySubsystemOLower>[0], "dense" | "flags">): void {
    stepLegacySubsystemOLower({
      ...input,
      dense: this.denseState,
      flags: this.subsystemArrays.aFlags,
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

  /** Raw b.e(int) path-table preparation; packed delta reads remain explicit. */
  preparePathTables(input: Omit<LegacyPathEInput, "deltas">): void {
    stepLegacyPathE({ ...input, deltas: this.subsystemArrays.fByte });
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

  /**
   * Raw f.a(byte,byte,byte,byte,byte) entry point. The caller supplies the
   * original f.c map alias and the unresolved lifecycle callbacks explicitly.
   */
  /**
   * Options for the record allocator f.a(byte,byte,byte,byte,byte). Shared by
   * every allocation site since 2026-09-27: only map entry wired the
   * callbacks, so units created later (waves, spawns, scripted recruits)
   * skipped f.g/f.b (1412/1418), the team-0 notice (1473) and the vision
   * mark b.a(III) (1528); those sites also passed P:Z as the F:Z gate.
   */
  private recordOptions() {
    const g = this.game;
    const life = this.entityRecordLifecycleInput();
    return {
      framePending: () => { g.pendingP = true; },
      onRecordInitialized: (id: number) => initializeLegacyEntityRecord(life, id),
      onRecordIndexed: (id: number) => indexLegacyEntityRecord(life, id),
      // f.a(1,x,y,id) -- the SAME stepLegacyByteActionQueue #433 the
      // type=100/5 call sites use (offset 1473 of the record allocator).
      onTeamZeroPlacement: (x: number, y: number, id: number) => this.runByteActionQueue(1, x, y, id),
      // b.a(int,int,int) (#473) = markLegacySpatialRecord.
      onSubsystemPlacement: (x: number, y: number, span: number) => markLegacySpatialRecord({
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        layers: this.mainArrays.aInt,
        layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
        mapHeight: g.mapHeight,
      }, x, y, span),
      frameFlag: g.entityFocusFlag, // F:Z (#49), offset 57
      q: g.qByte,
      aw: g.levelAwByte,
      // Offset 1443 of f.a(BBBBB)B: the [11]/[19] counts are skipped while f.s:Z (a scripted scene
      // sets up the map) holds. FIXED 2026-10-14 (oracle run 15, play20 frame 61981): was false.
      get suppressCounters() { return g.cameraSFlag; },
    };
  }

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

  /** Execute the bytecode-backed f.j() control-flow step against caller-owned map/update hooks. */
  stepFrame(input: Omit<LegacyFrameStepInput, "game">): void {
    stepLegacyFrame({ ...input, game: this.game });
  }

  /**
   * private void j() (#613): h() runs it for v == 1, and Q() runs it during
   * cutscenes (v == 0) once aR > 0 -- which is how the world keeps moving
   * behind a dialogue. Shared by both call sites since 2026-10-08 (oracle).
   */
  private stepOriginalJ(): void {
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
      // (LegacySubsystemVoidN.ts) whenever game.c%10===0.
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
        this.stepBuildingEconomy();
        this.stepSubsystemFrame();
      },
    });
  }

  /**
   * Enter the proven f.j() maintenance step used by the v==1 branch.
   * Entity/subsystem callbacks remain inert until their callers are mapped,
   * but the original map sweep and transition counters are still advanced.
   */
  stepGameplayFrame(): void {
    this.game.resourceByte = (shortOffset, add) => {
      const base = this.packedOffsets[shortOffset] ?? 0;
      return this.packedBytes[base + add] ?? 0;
    };
    stepLegacyGameplayTick(this.game, {
      // f.l(int) (#620), the same method as every other l() call site. Was
      // `mByte = mode` until 2026-10-08 (oracle): h()'s k:Z reset block's l(-1)
      // clobbered m:B and never set Y:I.
      loadMode: (mode) => this.stepLegacyL(mode),
      onI: () => resetLegacyZI(this.game),
      // f.h() owns the v==0 -> f.ak() dispatch in the original run loop.
      // Keep it inside this tick so timing counters and state transitions have
      // the same caller boundary in menu and gameplay states.
      onStateMachine: () => { this.stepStateMachine(); },
      onV: () => {
        stepLegacyGameplayInput(this.game, this.denseState, this.gridC, {
          onW: () => {
            stepLegacyGameplayCommand(this.game, {
              // f.W()'s staticL branch calls a(true,false,false,false,true,
              // false,false,false,false) -- confirmed via direct bytecode
              // read (offsets 18-27, invokespecial #464) -- the SAME
              // 9-arg method already ported as runSelectionFlagsRefresh
              // (extended 2026-08-18 to expose all 9 params for this call).
              onSelectionPreset: () => this.runSelectionFlagsRefresh(true, false, false, false, true),
              onZ: () => { this.stepFrameSelectionTransition(); },
              // f.l(int) is already ported/wired elsewhere as stepLegacyL
              // (LegacyZL.ts, via stepLegacyX's l(-1) calls) -- this is the
              // SAME method, confirmed via bytecode (constant pool #620,
              // `invokespecial #620 // Method l:(I)V`, identical to every
              // other l(-1) call site this session already traced).
              onL: (value) => this.stepLegacyL(value),
              onViewportReset: () => {
                // BUG FIX (2026-08-18): was reading the stale, unverified
                // game.viewportC/viewportD; direct bytecode read of f.W()'s
                // own i===1 branch (offset ~228/254) confirms y:B=C:B/
                // A:B=D:B here too, i.e. cursorTargetColumn/cursorTargetRow.
                this.game.yByte = this.game.cursorTargetColumn;
                this.game.AByte = this.game.cursorTargetRow;
                // f.W(i=1) derives I/K from k[0][0]/k[1][0] before aK().
                this.game.IByte = this.mainArrays.kMatrix[0][0] - this.game.yByte;
                this.game.KByte = this.mainArrays.kMatrix[1][0] - this.game.AByte;
                this.normalizeEntityViewport();
              },
              onEntityActionStart: (ap, am, an) => this.beginEntityAction(ap, am, an),
              onExitPreparation: () => this.stepLegacyExitPreparation(),
              // f.W()'s own last instruction (offset 391) -- found missing
              // entirely (2026-08-22) while auditing this session's other
              // i() (#610) call sites; see LegacyGameplayCommand.ts's own
              // onI docblock.
              onI: () => resetLegacyZI(this.game),
            });
          },
          onAF: () => this.selectWindowUnits(),
          onAE: () => this.stepAe(),
          onAG: () => this.stepGroupKey(true),
          onAH: () => this.stepGroupKey(false),
          onAL: () => {
            const state = { w: this.game.wFlag ? 1 : 0, I: this.game.inputI };
            stepLegacyAL(state);
            this.game.wFlag = state.w !== 0;
            this.game.inputI = state.I;
          },
          onClearSelection: () => { this.game.pendingP = false; },
          onD: (arg) => this.stepLegacyD(arg),
          onE: (arg) => this.stepLegacyE(arg),
          onF: (arg) => this.stepLegacyF(arg),
          onXDispatch: () => this.stepLegacyX(),
          onY: () => this.stepCameraFollow(),
        });
      },
      allocateMaintenanceRecord: () => { this.stepByteActionQueueMaintenance(); },
      // f.h()'s w:B===2||4 gate calls lowercase `ae()` (invokespecial #506,
      // "Method ae:()V", confirmed via direct bytecode read at offset
      // 344-382) -- NOT the unrelated UPPERCASE f.aE() already wired via
      // stepStateAe/onAE above, a case-sensitive collision confirmed
      // separately. See stepGameplayZAe().
      onAe: () => { this.stepGameplayZAe(); },
      // f.k() (#616), the cursor's hover target W:B. Unwired until 2026-10-08
      // (oracle frame 482): a tap next to a villager never selected it.
      onK: () => stepLegacyCursorHover(this.game, this.gridC, this.denseState),
      onFrameUpdate: () => this.stepOriginalJ(),
      // f.h()'s k-reset block -- WIRED (2026-08-24), confirmed via direct
      // bytecode read (offset 593, invokespecial #434 // Method a:(ZZZZ)V):
      // the SAME 4-arg boolean overload already ported as
      // runSelectionFlagsRefresh.
      resetSelection: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      // f.h()'s own aI() call (offset 642, invokespecial #490 // Method
      // aI:()V) -- WIRED (2026-08-24): already ported as stepLegacyAi
      // (stepStateAi's own wrapper) but had zero callers anywhere in the
      // codebase until now. a4 is f.a:[[B](#130) index 4, the SAME field
      // already established as mainArrays.aByte (fixed earlier today for
      // stepLegacyE's own teamEntitySlots duplicate-field bug).
      onFlushPending: () => {
        this.stepStateAi({ a4: this.mainArrays.aByte[4]!, dense: this.denseState });
      },
    });
  }

  /**
   * Runtime owner for the lowercase `f.ae()` dispatcher (`LegacyZAe.ts`).
   * Reuses `stepLegacyZAi`/`stepLegacyZAh` (already fully derived, now
   * wired for the first time via this call) for the `ai()`/`ah()` tail
   * calls. **DOC CORRECTION (2026-08-22)**: `af()` is now fully derived
   * and wired too (`LegacyZAf.ts`, `onAf` below) -- this comment's own
   * "left as a no-op seam until the remaining branches are ported" was
   * stale, left over from before that same-day fix landed.
   */
  private stepGameplayZAe(): void {
    const g = this.game;
    const state = {
      nInt: g.nInt,
      inputLeft: g.inputLeft,
      inputRight: g.inputRight,
      inputUp: g.inputUp,
      inputDown: g.inputDown,
      jByte: g.jByte,
      as: g.frameLayoutAS,
      aX: g.frameLayoutAX,
      aW: g.frameLayoutAW,
      ar: g.frameLayoutAR,
      V: g.zAfCursorVFlag,
      gameplaySFlag: g.gameplaySFlag,
      selectionFlags: g.selectionFlags,
      QFlag: g.zAd14QFlag,
      RFlag: g.zAd14RFlag,
      y: g.frameGenCounterY,
      zlYInt: g.zlYInt,
      s: this.mainArrays.s,
      at: g.frameLayoutAT,
      tiles: this.mainArrays.aByte3,
      zScratchAuByte: g.zScratchAuByte,
      r: this.mainArrays.r,
      iFlag: g.iFlag,
      staticL: g.staticL,
      inputV: g.inputV,
      E: g.E,
      wByte: g.wByte,
      staticM: g.staticM,
    };
    const writeBack = (): void => {
      g.nInt = state.nInt;
      g.frameGenCounterY = state.y;
      g.inputLeft = state.inputLeft;
      g.inputRight = state.inputRight;
      g.inputUp = state.inputUp;
      g.inputDown = state.inputDown;
      g.frameLayoutAS = state.as;
      g.frameLayoutAX = state.aX;
      g.zAfCursorVFlag = state.V;
      g.zlYInt = state.zlYInt;
      g.iFlag = state.iFlag;
      g.staticL = state.staticL;
      g.inputV = state.inputV;
      g.E = state.E;
      g.wByte = state.wByte;
      g.staticM = state.staticM;
    };
    const readIn = (): void => {
      state.nInt = g.nInt;
      state.inputLeft = g.inputLeft;
      state.inputRight = g.inputRight;
      state.inputUp = g.inputUp;
      state.inputDown = g.inputDown;
      state.as = g.frameLayoutAS;
      state.aX = g.frameLayoutAX;
      state.V = g.zAfCursorVFlag;
      state.zlYInt = g.zlYInt;
      state.iFlag = g.iFlag;
      state.staticL = g.staticL;
      state.inputV = g.inputV;
      state.E = g.E;
      state.wByte = g.wByte;
      state.staticM = g.staticM;
    };
    stepLegacyZAe(state, {
      onAi: () => {
        const aiState = {
          flags: g.selectionFlags,
          bFlags: g.frameFlags,
          r: this.mainArrays.r,
          // ai() re-reads ad:B after its a(Z..) calls (offset 190), so live.
          get ad() { return g.selectionAd; },
          as: state.as,
          ar: state.ar,
          aX: state.aX,
          aW: state.aW,
          q: g.qByte,
          l: g.frameLayoutL,
          T: g.frameLayoutT,
          U: g.frameLayoutU,
        };
        stepLegacyZAi(aiState, this.aiFlagCallbacks());
        g.frameLayoutL = aiState.l;
        g.frameLayoutT = aiState.T;
        g.frameLayoutU = aiState.U;
      },
      // l(int) writes w and P directly; same push/pull as onAh/onAf (it was
      // missing here, so ae()'s final writeBack undid l()'s w). 2026-09-23.
      onL: (value) => {
        writeBack();
        this.stepLegacyL(value);
        readIn();
      },
      onAh: () => {
        writeBack();
        this.stepZAh();
        readIn();
      },
      // BUG FIX (2026-09-14): af() and its callees (l(int) in particular)
      // write game.* directly, but this method snapshots those same fields
      // into `state` and wrote the snapshot back after stepLegacyZAe returned.
      // Measured: choosing a building ran l(0) -- d[4]=33 ("place the
      // building."), zlX=w, the four-flag reset -- and set w=3, and then the
      // write-back restored the stale w=2, so placement mode never started.
      // The original has no snapshot: ae(), af() and l() share the instance
      // fields. Push before af(), pull after.
      onAf: () => {
        writeBack();
        this.stepGameplayZAf();
        readIn();
      },
    });
    writeBack();
  }

  /** `f.aJ():V` (UPPERCASE, constant-pool #491, `stepLegacyAj`), reused by `af()`'s several branches. */
  private runAjUpper(): void {
    const g = this.game;
    const ajState = {
      uFlag: g.uFlag, F: g.FByte, k: g.kByte,
      E: g.ECounter, D: g.DCounter, C: g.CCounter, B: g.BCounter,
    };
    stepLegacyAj(ajState);
    g.uFlag = ajState.uFlag;
    g.FByte = ajState.F;
    g.kByte = ajState.k;
    g.ECounter = ajState.E;
    g.DCounter = ajState.D;
    g.CCounter = ajState.C;
    g.BCounter = ajState.B;
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
   * not-yet-ported `a(int,byte)`(#275)) stays unreachable via this call
   * site since `arg2` is always `false`, exposed only as an optional
   * `onSpawnMark` callback.
   */
  private subsystemBC(): void {
    const dense = this.denseState;
    for (let id = 1; id <= 50; id += 1) {
      dense[7979 + id] = (dense[7979 + id] ?? 0) & 159;
      if ((dense[1919 + id] ?? 0) > 0 && (dense[2828 + id] ?? 0) === 69 && (dense[6161 + id] ?? 0) === 0) {
        syncLegacySubsystemBCoordinate({
          dense,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
        }, id, false);
      }
    }
  }

  /**
   * Runtime owner for `private void af()` (`LegacyZAf.ts`). Its sole real
   * caller is `f.ae()`'s `i:Z||static-l:Z` branch (`stepGameplayZAe()`'s
   * `onAf`). `b.b(byte)` (inside `f.b(int,boolean)`, `r[as] in {16,26}`) is
   * left as a documented no-op seam -- see `LegacyZB2.ts`'s own docblock
   * for why. `b.a(int,boolean)` (inside `b.c()`, `r[as] in {14,15}`) is now
   * fully ported and wired -- see `subsystemBC()`'s own docblock.
   */
  private stepGameplayZAf(): void {
    const g = this.game;
    const state = {
      dense: this.denseState,
      r: this.mainArrays.r,
      as: g.frameLayoutAS,
      entityFocusFlag: g.entityFocusFlag,
      kByte: g.kByte,
      frameLayoutAX: g.frameLayoutAX,
      frameLayoutL: g.frameLayoutL,
      V: g.zAfCursorVFlag,
      qCounter: g.qCounter,
      selectionFlags: g.selectionFlags,
      wByte: g.wByte,
      cSInt: g.cSInt,
      pendingP: g.pendingP,
      xMFlag: g.xMFlag,
      xOFlag: g.xOFlag,
      outerLoopLFlag: g.outerLoopLFlag,
      outerLoopNFlag: g.outerLoopNFlag,
      frameLayoutAq: g.frameLayoutAq,
      yByte: g.yByte,
      IByte: g.IByte,
      AByte: g.AByte,
      KByte: g.KByte,
      FByte: g.FByte,
      aByte2d: this.mainArrays.aByte,
      gridC: this.gridC,
      kFlag: g.kFlag,
      aShort: this.mainArrays.aShort,
      gRows: this.subsystemArrays.gRows,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    };
    // BUG FIX (2026-09-14): same stale-snapshot shape as stepGameplayZAe.
    // af()'s callbacks write game.* directly -- l(int) sets w/s/P/M/O,
    // aJ() sets k, f(int,int) moves the camera -- while this method kept
    // copies of those same fields in `state` and wrote them all back after
    // stepLegacyZAf returned. Measured: picking a building ran l(0), which set
    // w=3, and the write-back restored w=2, so placement mode never began.
    // In the original every one of these is a shared instance field, so each
    // callback now sees af()'s current values and af() sees what it left.
    const writeBack = (): void => {
      g.frameLayoutAS = state.as;
      g.entityFocusFlag = state.entityFocusFlag;
      // af() offset 129..131 clears f.K:Z (#69) inside the k===l branch.
      g.kFlag = state.kFlag;
      g.kByte = state.kByte;
      g.frameLayoutAX = state.frameLayoutAX;
      g.frameLayoutL = state.frameLayoutL;
      g.zAfCursorVFlag = state.V;
      g.wByte = state.wByte;
      g.cSInt = state.cSInt;
      g.pendingP = state.pendingP;
      g.xMFlag = state.xMFlag;
      g.xOFlag = state.xOFlag;
      g.outerLoopLFlag = state.outerLoopLFlag;
      g.outerLoopNFlag = state.outerLoopNFlag;
      g.frameLayoutAq = state.frameLayoutAq;
    };
    const readIn = (): void => {
      state.as = g.frameLayoutAS;
      state.entityFocusFlag = g.entityFocusFlag;
      state.kFlag = g.kFlag;
      state.kByte = g.kByte;
      state.frameLayoutAX = g.frameLayoutAX;
      state.frameLayoutL = g.frameLayoutL;
      state.V = g.zAfCursorVFlag;
      state.wByte = g.wByte;
      state.cSInt = g.cSInt;
      state.pendingP = g.pendingP;
      state.xMFlag = g.xMFlag;
      state.xOFlag = g.xOFlag;
      state.outerLoopLFlag = g.outerLoopLFlag;
      state.outerLoopNFlag = g.outerLoopNFlag;
      state.frameLayoutAq = g.frameLayoutAq;
      state.qCounter = g.qCounter;
      state.yByte = g.yByte;
      state.IByte = g.IByte;
      state.AByte = g.AByte;
      state.KByte = g.KByte;
      state.FByte = g.FByte;
    };
    const shared = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A): R => {
      writeBack();
      const result = fn(...args);
      readIn();
      return result;
    };
    stepLegacyZAf(state, {
      onF2: shared((arg1: number, arg2: number) => this.stepEntityCoordinateUpdate(arg1, arg2)),
      onAjUpper: shared(() => this.runAjUpper()),
      onCompleteEntityRecord: shared((record: number) => this.completeEntityRecord(record)),
      resourceByte: (shortOffset, add) => g.resourceByte?.(shortOffset, add) ?? 0,
      onSubsystemBC: shared(() => this.subsystemBC()),
      onReleaseTenEntity: shared((id: number) => this.subsystemTenSlotReleaseEntity(id)),
      onSelectionReset: shared((a: boolean, b: boolean, c: boolean, d: boolean) => this.runSelectionFlagsRefresh(a, b, c, d)),
      onSelectionReset9: shared((a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
        this.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j)),
      onL: shared((value: number) => this.stepLegacyL(value)),
      // Offsets 134..150, after a new chief is picked: b.b(int) (#544, the
      // chief gives up its reserved hut) and d(byte) (#578). WIRED 2026-09-23.
      onSubsystemBB: shared((id: number) => releaseLegacyEntityHome(this.denseState, this.saveOffsets, id)),
      onDByte: shared((value: number) => this.stepLegacyD(value)),
    });
    writeBack();
  }

  /**
   * Runtime owner for the proven common portion of f.Z() and its f.ai() tail.
   *
   * The child builders aa/ab/ac/ad still have unresolved original table
   * aliases, so they remain no-op seams here.  The flag-6 branch, array reset,
   * window sizing, centering, and f.ai() classification are fully backed by
   * bytecode and are intentionally executed on the live frame state.
   *
   * BROAD EXCEPTION BOUNDARY (2026-09-03, added alongside `LegacyZAa.ts`'s
   * `checkArrayIndex` fix for its `au`-scan loop): `f.Z()`'s own
   * disassembly (`bytecode/f-javap.txt`) carries an `Exception table` whose
   * three ranges (0..28, 29..199, 200..348 -- all targeting the same
   * `pop; return` handler) together cover its ENTIRE body, including the
   * `aa()`/`ab()`/`ac()`/`ai()` call cluster this method mirrors -- i.e.
   * real Java silently aborts just this one Z()-step and returns if
   * anything inside throws (`ArrayIndexOutOfBoundsException` included).
   * This method had no equivalent try/catch, so `LegacyZAa.ts`'s new
   * `checkArrayIndex` throw (reproducing a real, previously-implicit JVM
   * bounds check) would have escaped all the way up through
   * `stepGameplayFrame()`'s `stepLegacyGameplayTick` to `main.ts`'s
   * `tick()`, which has no try/catch of its own either -- turning what
   * Java treats as "abort this one Z() step, keep going" into an uncaught
   * exception that kills the whole tick. Wrapping the body here in the
   * matching `try/catch` is not optional scope creep on top of the
   * `au`-loop fix -- without it, that fix would trade an infinite silent
   * hang for a worse, differently-scoped crash than real Java ever
   * produces.
   */
  private stepFrameSelectionTransition(): void {
    try {
      this.stepFrameSelectionTransitionInner();
    } catch {
      // Preserve Z()'s broad exception boundary: abort just this Z()
      // step, exactly like the real `try { aa()/ab()/ac()/...; } catch
      // (Exception e) { }` wrapping its whole body.
    }
  }

  private stepFrameSelectionTransitionInner(): void {
    const raw = {
      ar: this.game.frameLayoutAR,
      at: this.game.frameLayoutAT,
      as: this.game.frameLayoutAS,
      aX: this.game.frameLayoutAX,
      aW: this.game.frameLayoutAW,
      aY: this.game.frameLayoutAY,
      aZ: this.game.frameLayoutAZ,
      l: this.game.frameLayoutL,
    };
    stepLegacyZTransition({
      flags: this.game.selectionFlags,
      // Z() offsets 280..288: `b[ad] = true` -- b:[Z #234, frameFlags.
      bFlags: this.game.frameFlags,
      r: this.mainArrays.r,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      raw,
      qByte: this.game.qByte,
      // BUG FIX (2026-09-14): Z() offset 130 is `getfield #200 // Field ai:B`,
      // the T()/S()/U() scene-dispatch key (game.ai). frameCommandAI is
      // `aI:I` (#157), the f.d(int,int) frame-command field -- a different
      // field that differs only in letter case (class f also has `ai:I` #199).
      // With the wrong twin the count at offsets 117..144,
      // `q > 1 ? 11 : (ai < 18 ? 3 : 6)`, read an int like 534 and built six
      // Build entries where KEmulator shows three (hut, store, kitchen).
      aiByte: this.game.ai,
      pendingP: this.game.pendingP,
      adByte: this.game.selectionAd,
      aU: this.game.frameLayoutAU,
      aV: this.game.frameLayoutAV,
      onAI: () => {
        const game = this.game;
        const aiState = {
          flags: this.game.selectionFlags,
          bFlags: this.game.frameFlags,
          r: this.mainArrays.r,
          get ad() { return game.selectionAd; },
          as: raw.as,
          ar: raw.ar,
          aX: raw.aX,
          aW: raw.aW,
          q: this.game.qByte,
          l: raw.l,
          T: this.game.frameLayoutT,
          U: this.game.frameLayoutU,
        };
        stepLegacyZAi(aiState, this.aiFlagCallbacks());
        // Into `raw`, which the epilogue below writes back. BUG FIX
        // 2026-09-23: writing game.frameLayoutL here was overwritten by that
        // epilogue with Z()'s own `l = 0`, so the chief-pick cursor sat on 0.
        raw.l = aiState.l;
        this.game.frameLayoutT = aiState.T;
        this.game.frameLayoutU = aiState.U;
      },
      onAA: () => {
        // f.aa() is the producer for r[]/s[] later consumed by 1010.
        // 2026-08-21: switched from the mode-0-only fillLegacyZChoiceRows to
        // the full stepLegacyZAa (modes 0/6/8) now that mode 6's k/F/
        // a:[[B]/a:[[S] inputs are resolved -- k=game.kByte(f.k:B #333),
        // F=game.FByte(f.F:B #50), a:[[B]/a:[[S] = mainArrays.aByte/
        // aShort (confirmed via exact constructor allocation sizes 5x50/
        // 2x26). See LegacyZAa.ts's own docblock for the mode-0 formula fix
        // made earlier the same day.
        const aaState = {
          e: this.denseState,
          packed: this.packedBytes,
          packedOffsets: this.packedOffsets,
          tiles: this.mainArrays.aByte3,
          a2dByte: this.mainArrays.aByte,
          a2dShort: this.mainArrays.aShort,
          s: this.mainArrays.s,
          r: this.mainArrays.r,
          // aa() reads q:I (#356, the selected record) and the live ar:B
          // Z() has just reset -- FIXED 2026-10-07: it was given f.q:B (the
          // mission) and the pre-Z() ar snapshot, so the armoury listed five
          // clubs instead of club / spear / net trap.
          q: this.game.qCounter,
          k: this.game.kByte,
          F: this.game.FByte,
          au: 0,
          av: this.game.frameLayoutAv,
          at: raw.at,
          ar: raw.ar,
        };
        stepLegacyZAa(aaState);
        this.game.frameLayoutAv = aaState.av;
        raw.at = aaState.at;
        raw.ar = aaState.ar;
      },
      onAB: () => {
        const abState = {
          e: this.denseState,
          j: this.game.zAbScratch,
          r: this.mainArrays.r,
          q: this.game.qCounter,
          ar: raw.ar,
        };
        stepLegacyZAb(abState);
        raw.ar = abState.ar;
      },
      onAC: () => {
        const acState = {
          e: this.denseState,
          // f.f:[B (#290) is the per-kind max level b.j() fills (mainArrays.f).
          // FIXED 2026-10-07: was a never-written copy, so UPGRADE never showed.
          f: this.mainArrays.f,
          r: this.mainArrays.r,
          q: this.game.qCounter,
          ar: raw.ar,
        };
        stepLegacyZAc(acState);
        raw.ar = acState.ar;
      },
      // f.ad() -- wired 2026-08-21. F/N/L/K/q were already-canonical fields
      // (see docs/code-mapping.md's 2026-08-21 entries); aq is the newly
      // exposed game.frameLayoutAq scratch counter (see its own docblock).
      // The F===true branch really does overwrite aq as a reused loop
      // counter in the original bytecode -- writing it back unconditionally
      // is faithful, not a bug.
      onAD: () => {
        const adState = {
          F: this.game.entityFocusFlag,
          qByte: this.game.qByte,
          N: this.game.outerLoopNFlag,
          L: this.game.outerLoopLFlag,
          K: this.game.kFlag,
          e: this.denseState,
          r: this.mainArrays.r,
          ar: raw.ar,
          aq: this.game.frameLayoutAq,
          aqInt: this.game.projectionAq,
        };
        // Offset 354: a(ZZZZZZZZZ) (#464) -- was left unwired.
        stepLegacyZAd(adState, this.aiFlagCallbacks());
        raw.ar = adState.ar;
        this.game.frameLayoutAq = adState.aq;
        this.game.projectionAq = adState.aqInt;
      },
    });
    this.game.frameLayoutAR = raw.ar;
    this.game.frameLayoutAT = raw.at;
    this.game.frameLayoutAS = raw.as;
    this.game.frameLayoutAX = raw.aX;
    this.game.frameLayoutAW = raw.aW;
    this.game.frameLayoutAY = raw.aY;
    this.game.frameLayoutAZ = raw.aZ;
    this.game.frameLayoutL = raw.l;
  }

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
  private aiFlagCallbacks() {
    return {
      onNineFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
        this.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
      onFourFlagReset: (a: boolean, b: boolean, c: boolean, d: boolean) => this.runSelectionFlagsRefresh(a, b, c, d),
    };
  }

  private runSelectionFlagsRefresh(
    first: boolean, second: boolean, third: boolean, fourth: boolean,
    fifth = false, sixth = false, seventh = false, eighth = false, ninth = false,
  ): void {
    const selectionState = {
      aFlags: this.game.selectionFlags,
      bFlags: this.game.frameFlags,
      uBytes: this.mainArrays.uBytes,
      dBytes: this.game.selectionDBytes,
      recordOf: (ad: number) => this.packedBytes[(this.packedOffsets[195] ?? 0) + ad] ?? 0,
      cInts: this.game.frameRecordInts,
      bInts: this.game.frameRecordHeights,
      bb: this.game.selectionBb,
      ax: this.game.selectionAx,
      // ag:I/P:B/C:Z/K:B/d:S are the camera's own fields; until 2026-10-01
      // this used never-shared selectionAg/P/CFlag/K/DSize copies, so a HUD
      // resize never reached n() (stale HUD pixels stayed on the map).
      ag: this.game.rowScrollDelta,
      ad: this.game.selectionAd,
      ba: this.game.selectionBa,
      P: this.game.viewportP,
      AInt: this.game.selectionAInt,
      CFlag: this.game.cameraCFlag,
      K: this.game.KByte,
      A: this.game.AByte,
      AFlag: this.game.AFlag,
      dSize: this.game.mapHeight,
    };
    stepLegacySelectionFlags(selectionState, first, second, third, fourth, fifth, sixth, seventh, eighth, ninth);
    this.game.selectionBb = selectionState.bb;
    this.game.selectionAx = selectionState.ax;
    this.game.rowScrollDelta = selectionState.ag;
    this.game.selectionAd = selectionState.ad;
    this.game.selectionBa = selectionState.ba;
    this.game.viewportP = selectionState.P;
    this.game.selectionAInt = selectionState.AInt;
    this.game.cameraCFlag = selectionState.CFlag;
    this.game.KByte = selectionState.K;
    this.game.AByte = selectionState.A;
    this.game.AFlag = selectionState.AFlag;
  }

  /** Exact private void t(): clears f.d:[[B]'s (#268) row 0, all 40 slots. */
  private stepLegacySceneAnimatedSlotClear(): void {
    this.mainArrays.d[0]!.fill(0);
  }

  /**
   * Exact private void T()'s `ai===37` branch (bytecode/f-javap.txt
   * offsets 115..272) -- the branch this whole investigation traced
   * `finalizeEntity`'s real automatic trigger through. `b.l()`
   * (`runLegacyL`) fires FIRST, before any of the entity-spawn calls
   * below, so `finalizeEntity` reliably runs even though the batch-
   * allocate calls that follow are confirmed (2026-08-18, see
   * LegacyEntityBatchAllocate.ts's docblock) to throw partway through on
   * their `type===1` calls due to a real, permanently-null-field bug in
   * the original game -- caught by `f.ak()`'s already-modeled try/catch,
   * matching the original's own behavior exactly, not worked around.
   */
  /** b.l(), used by both T()'s ai===37 and ai===38 branches. */
  private stepLegacyBL(): void {
    runLegacyL({
      state: this.denseState,
      // b-javap 49849 offset 23: `f.c(IZ)V` (#364), the record removal
      // (stepEntityRemoval) for records 1..60 -- not f.c(int). CORRECTED
      // 2026-09-29: this cleared unit associations and removed nothing.
      onPrimaryStep: (id, flag) => this.stepEntityRemoval(id, flag),
      onEntityCleanup: (id) => { this.finalizeEntity(id); },
      // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
      onRecordMaintenance: (id) => this.entityDeathCleanup(id),
      onAuxiliaryPass: (index) => this.removeAnimal(index),
    });
  }

  /** b.m(), used by T()'s ai===45 branch. */
  private stepLegacyBM(): void {
    runLegacyM({
      state: this.denseState,
      onEntityCleanup: (id) => { this.finalizeEntity(id); },
      // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
      onRecordMaintenance: (id) => this.entityDeathCleanup(id),
      onAuxiliaryPass: (index) => this.removeAnimal(index),
    });
  }

  /**
   * Exact final void c(int, boolean) (#555, bytecode/f-javap.txt offsets
   * 0..577) -- entity removal/cleanup. Two real callers, both already
   * wired live: `s()`'s (`stepLegacyEffectSlotScan`) `onModeThreeExpire`
   * (arg2 always `false`) and `l(int)`'s (`stepLegacyL`) `onEntityMode`
   * (arg2 always `true`).
   *
   * `local3`(type)===2's call to `releaseTenEntity` (offset 89..101) is
   * the method's own FIRST real action, BEFORE the try/catch that wraps
   * everything else (offset 102..575) -- if it throws (see
   * `LegacySubsystemBTenSlotThrows.ts`), the exception propagates out of
   * this method entirely, uncaught, same as the original.
   *
   * `local8`(team) is `(id<31) ? 0 : 1`, `local6`/`local7` are the
   * type's packed width/height (table 138, offsets 104/130 -- the SAME
   * lookup `stepLegacyEffectSlotScan` already uses).
   */
  private stepEntityRemoval(id: number, arg2: boolean): void {
    const dense = this.denseState;
    const g = this.game;
    const tableBase = this.packedOffsets[138] ?? 0;
    const type = dense[8749 + id] ?? 0;
    const x = dense[8383 + id] ?? 0;
    const y = dense[8444 + id] ?? 0;
    const width = this.packedBytes[tableBase + 104 + type] ?? 0;
    const height = this.packedBytes[tableBase + 130 + type] ?? 0;
    const team = id < 31 ? 0 : 1;

    if (type === 2) this.subsystemTenSlotReleaseEntity(id);

    try {
      if (arg2) {
        this.stepEntityCoordinateUpdate(id === 1 ? -1 : 0, 0);
        dense[8505 + id] = -1;
        enqueueLegacyEffectSlot(this.mainArrays.e, id, 3);

        let cursor = dense[8993 + id] ?? 0;
        while (cursor > 0) {
          stepLegacyEntityRecordCancel(dense, this.gridC, cursor, id, true, false, (record: number) => this.completeEntityRecord(record));
          cursor = dense[4545 + cursor] ?? 0;
        }

        const linked = dense[8810 + id] ?? 0;
        const skip = linked <= 1 || (type === 2 && (dense[8627 + id] ?? 0) === 0);
        if (!skip) {
          stepLegacyEntityRecordCancel(dense, this.gridC, linked, id, true, false, (record: number) => this.completeEntityRecord(record));
        }

        if ((g.wByte === 2 || g.wByte === 4) && id === g.qCounter) {
          g.wByte = 0;
          g.qCounter = 0;
          this.runSelectionFlagsRefresh(true, true, false, false);
        }
        return;
      }

      dense[8505 + id] = 0;
      dense[8627 + id] = 3;
      for (let row = 0; row < height; row += 1) {
        for (let col = 0; col < width; col += 1) {
          if (this.gridC[y + row]) this.gridC[y + row][x + col] = 0;
        }
      }

      if (type === 2) {
        const marks = this.mainArrays.aShort[team];
        if (marks) {
          marks[16] = marks[16] - 4; // Int16Array assignment narrows like i2s
          if (marks[16] < 0) marks[16] = 1;
        }
        const base = team * 50 + 1;
        for (let slot = base; slot < base + 50; slot += 1) {
          if ((dense[3434 + slot] ?? 0) === id) dense[3434 + slot] = 0;
        }
      }

      if (!g.cameraSFlag) {
        const own = this.mainArrays.aShort[team];
        if (own) own[14] = own[14] - 1;
        const other = this.mainArrays.aShort[1 - team];
        if (other) other[21] = other[21] + 1;
      }

      if (type === 0) {
        const rows = this.mainArrays.aByte3[team];
        let slot = 0;
        while (slot < 10 && (rows?.[slot]?.[11] ?? 0) !== id) slot += 1;
        if (slot >= 10) slot = 9;
        if (rows?.[slot]) rows[slot][11] = 0;
      }

      this.subsystemTenSlotRelease(id);

      if (team === 0) this.runByteActionQueue(8, x, y, 0);
    } catch {
      // Matches the real exception table (offset 102..575, catch(Exception){}):
      // every branch above can hit a confirmed-permanently-null field
      // (LegacySubsystemBTenSlotThrows.ts) and this silently swallows it.
    }
  }

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

  /** Exact private void e(int,int,int) (bytecode/f-javap.txt offsets 0..75). */
  private stepLegacyE3(x: number, y: number, recordOffset: number): void {
    const dense = this.denseState;
    dense[2828 + recordOffset] = 69;
    dense[3131 + recordOffset] = x;
    dense[3232 + recordOffset] = y;
    dense[6161 + recordOffset] = 2;
    dense[4747 + recordOffset] = 0;
    dense[7979 + recordOffset] = (dense[7979 + recordOffset] ?? 0) & 191;
  }

  /** Exact private void d(int,int,int) (bytecode/f-javap.txt offsets 0..45). */
  private stepLegacyD3(x: number, y: number, indexFilter: number): void {
    for (let i = 0; i < this.auxiliaryScratch.length; i += 1) {
      if (i === indexFilter || i >= 6) this.stepLegacyE3(x, y, this.auxiliaryScratch[i] ?? 0);
    }
  }

  /**
   * Exact private void O() (bytecode/f-javap.txt offsets 0..232), `S()`'s
   * `onO` callback (only invoked when `aPInt===1`). Composites
   * `Image[frameImageSlots[1]]` onto `Graphics[frameImageSlots[0]]` via
   * the SAME static blit helper #435 already fully decoded and ported as
   * `stepGameplayPaintComposite` -- a second, independent real caller of
   * that helper, confirming it's genuinely reused across the codebase
   * rather than a one-off. Then runs the SAME 20-slot `selectionFlags`
   * element-scan/fixed-sprite (524/528) shape `f.m()`
   * (`stepGameplayFramePrep`) already has -- but NOT the same underlying
   * data: `f.m()` reads `frameRecordInts` (f.c:[I] #264) and subtracts 8
   * from each entry; `O()` reads a DIFFERENT field, `f.d:[I]` (#275,
   * `oElementRecordInts`), with no adjustment. Confirmed distinct via
   * constant-pool index before reuse, not assumed.
   *
   * CONFIRMED (2026-08-24): both `frameRecordInts` and `oElementRecordInts`
   * were believed permanently null (RETRACTED 2026-09-07 -- they are not) in the original -- see `LegacyGameState.ts`'s own
   * docblocks and `docs/unknowns.md`'s 2026-08-24 entry. This method's own
   * `this.game.oElementRecordInts[recordIndex] ?? 0` fallback intentionally
   * does not reproduce the real guaranteed-throw, same reasoning as `f.m()`.
   */
  private stepLegacyO(): void {
    this.game.frameImageSlots[8] = 0;
    this.game.frameImageSlots[9] = 0;

    const graphics = this.offscreenTargets?.graphics[this.game.frameImageSlots[0] as 0 | 1 | 2 | 3];
    const image = this.offscreenTargets?.images[this.game.frameImageSlots[1] as 0 | 1 | 2 | 3];
    if (graphics && image) {
      try {
        graphics.drawRegion(image, 0, 0, 264, this.game.selectionAInt, 0, 0, this.game.selectionBb - this.game.selectionAx, 0);
      } catch { /* a(Graphics,Image,...) (#435) catches the underlying draw exception. */ }
    }

    const base195 = this.packedOffsets[195] ?? 0;
    for (let i = 0; i < 20; i += 1) {
      if (!this.game.selectionFlags[i]) continue;
      this.game.frameFlags[i] = true;

      // Offsets 84..109: a(i, 0, d[t195[i]]) -- drawn, not just traced
      // (until 2026-10-01 only the trace entry was pushed, so the pause
      // menu's copy of the gameplay screen had no top resource bar).
      const recordIndex = this.packedBytes[base195 + i] ?? 0;
      const y = this.game.oElementRecordInts[recordIndex] ?? 0;
      this.framePrimitives.push([i, 0, y]);
      this.drawFrameCommandPrimitive(i, 0, y);

      this.game.targetSlot = this.game.frameImageSlots[0] ?? 0;

      const marker = this.packedBytes[base195 + 20 + i] ?? 0;
      if (marker === 1 && this.game.Q !== 20) {
        this.drawPackedComposite(524, 0, this.game.selectionBb);
      } else if (marker === 2) {
        this.drawPackedComposite(528, 0, 320 - this.game.selectionBa);
      }
    }

    // Offsets 216..231: `c[9] = c[8] = 2` (dup_x2 stores 2 into both).
    this.game.frameImageSlots[8] = 2;
    this.game.frameImageSlots[9] = 2;
  }

  /**
   * Exact private void l(int) (bytecode/f-javap.txt offsets 0..376), a thin
   * runtime adapter around the already-ported, already-tested pure function
   * `stepLegacyZL`. Reuses `selectionFlags`/`frameFlags` for the
   * bytecode's `a:[Z`(#123)/`b:[Z`(#234) -- confirmed the same fields via
   * constant-pool index cross-check. CORRECTION (2026-09-02): this used
   * to target a separate `selectionMirrorFlags` array that was never
   * read by anything downstream (a duplicate of `frameFlags` for the
   * same real field) -- see `docs/unknowns.md`'s 2026-09-02 entry.
   *
   * CORRECTION (2026-08-22): `onFourFlagReset`/`onNineFlagReset` used to be
   * left unwired -- this call site passed no callbacks object at all. Both
   * are the same `a(ZZZZ)`/`a(ZZZZZZZZZ)` overloads already ported as
   * `runSelectionFlagsRefresh`, reused at ~10 other call sites; wired here
   * too. `onAh` was wired on 2026-10-09 (see the call); the note below is the old reasoning -- lowercase
   * `ah()` itself is no longer a mystery (`LegacyZAh.ts`/`stepLegacyZAh`,
   * fully derived and safely wired at `stepGameplayZAe`'s own, NON-nested
   * `onAh` call site), but wiring it HERE would create a genuinely new,
   * directly self-recursive path this codebase has never exercised before:
   * `stepLegacyL(-1)` -> `onAh` -> `stepLegacyZAh` -> (`state.w===4`) ->
   * `onL(-1)` -> `stepLegacyL(-1)` again, with `zlXByte`/`cSInt`/`kFlag`
   * (the three values that decide whether that inner call re-triggers
   * `onAh` and hits `w===4` again) all left completely unmutated by the
   * `w===4` branch itself. Whether the real game ever reaches a state
   * where this chain terminates (some external write between iterations)
   * or whether `zlXByte===4 && cSInt===100 && kFlag===false` is simply
   * unreachable together is unproven -- porting this specific call blind
   * risks a real stack-overflow bug, so it stays a documented no-op.
   * `onEntityMode` (2026-08-24): its real consumer, `final void
   * c(int, boolean)` (#555, offset 29630), is now fully ported --
   * `stepEntityRemoval` above -- and wired here, arg2 always `true`.
   */
  private stepLegacyL(value: number): void {
    const g = this.game;
    // Scalars live: onEntityMode's stepEntityRemoval writes w and P itself.
    const state: LegacyZLState = Object.assign(
      liveView<Pick<LegacyZLState, "q" | "w" | "x" | "Y" | "s" | "P" | "M" | "O">>(g, {
        q: "qCounter", w: "wByte", x: "zlXByte", Y: "zlYInt", s: "cSInt", P: "pendingP", M: "xMFlag", O: "xOFlag",
      }),
      { d: g.zlDShorts, k: g.zlKBytes, flags: g.selectionFlags, bFlags: g.frameFlags, cSnapshot: g.zlFlagSnapshot },
    );
    stepLegacyZL(state, value, {
      onFourFlagReset: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      onNineFlagReset: (a, b, c, d, e, f, h, i, j) => this.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
      onEntityMode: (id) => this.stepEntityRemoval(id, true),
      // f.l(int) offset 350: ah() after a CALL TO ARMS / FORM UP place (s == 100). WIRED
      // 2026-10-09 (oracle run 6, frame 18861): without it w stayed at the saved x (2, the
      // unit bar) instead of ah()'s 0/1. ah() re-enters l(-1) only when w == 4, where the
      // original would recurse the same way.
      onAh: () => this.stepZAh(),
    });
  }

  /**
   * Exact private void X() (bytecode/f-javap.txt offsets 0..484). Its only
   * confirmed real caller is `V()`'s `wByte===3` branch (offsets 261..273
   * of `private void V()`), wired via `stepLegacyGameplayInput`'s
   * `onXDispatch` callback (2026-08-18). Gated on `cRFlag` (r:Z #359) --
   * its real producer is `stepLegacyC2`'s (`private void c(int,int)`) own
   * `wByte===3` branch, ALREADY wired via `onC` in `stepGameplayFramePrep`
   * (found 2026-08-18 while tracing this exact gate: `cRFlag` was
   * originally duplicated under a fresh `xTriggerFlag` name before the two
   * methods' fields were merged -- see `LegacyGameState.ts`'s docblock on
   * `cRFlag` for the full self-caught-bug writeup). So `stepLegacyX()` is
   * now reachable AND its gate is populated by real gameplay state, not
   * just wired-but-inert.
   *
   * Four branches on `cSInt` (s:I #364): `===100` (branch A -- two
   * conditional calls into class b's own no-arg `b()`, a genuinely
   * tangential ~250-instruction loop over team slots 1..50, left a
   * documented no-op matching this session's convention for the
   * c(int,int)/O() class-c calls), `<0` (branch B, dense-state writes),
   * `0..3` (branch C, a linear scan over `xSlotTable`/`b:[[[B` #237 that
   * either reuses an empty slot or, when the value being written is
   * exactly 3, treats it as a real "spawn" and calls `l(-1)`), and the
   * default/else (branch D -- an in-bounds check via the original's
   * private `b(int,int):boolean` #533, then a real `placeEntity()` call).
   */
  private stepLegacyX(): void {
    const g = this.game;
    const dense = this.denseState;
    if (!g.cRFlag) return;

    if (g.cSInt === 100) {
      if (g.xOFlag) {
        g.outerLoopNFlag = g.xOFlag;
        g.xMFlag = false;
        g.outerLoopLFlag = false;
        this.subsystemBTeamSweep();
      } else if (g.xMFlag) {
        g.outerLoopLFlag = g.xMFlag;
        this.subsystemBTeamSweep();
      }
      g.outerLoopRowEndMarker[0] = g.IByte + g.yByte;
      g.outerLoopRowEndMarker[1] = g.KByte + g.AByte;
      this.stepLegacyL(-1);
      return;
    }

    if (g.cSInt < 0) {
      dense[3131 + g.cRInt] = dense[8383 + g.qCounter] ?? 0;
      dense[3232 + g.cRInt] = dense[8444 + g.qCounter] ?? 0;
      dense[2828 + g.cRInt] = 43 - g.cSInt;
      dense[6161 + g.cRInt] = 3;
      return;
    }

    if (g.cSInt <= 3) {
      g.xNByte = 0;
      while (g.xNByte < 29 && (g.xSlotTable[0]?.[0]?.[g.xNByte] ?? 0) !== 0) {
        g.xNByte += 1;
      }
      const row0 = g.xSlotTable[0];
      if (!row0) return;
      row0[1]![g.xNByte] = g.cSInt;
      if (row0[1]![g.xNByte] === 3) {
        row0[0]![g.xNByte] = g.qCounter;
        row0[2]![g.xNByte] = g.IByte + g.yByte;
        row0[3]![g.xNByte] = g.KByte + g.AByte;
        this.stepLegacyL(-1);
        return;
      }
      if (classifyLegacyPositiveEntity(g.cRInt) !== 0) return;
      row0[0]![g.xNByte] = g.qCounter;
      row0[2]![g.xNByte] = g.cRInt;
      return;
    }

    const x = g.IByte + g.cTInt;
    const y = g.KByte + g.cUInt;
    if (!(x >= 0 && y >= 0 && x < g.mapWidth && y < g.mapHeight)) return;
    const placementOptions = this.buildingPlacementOptions();
    const placed = this.placeEntity(this.gridC, 0, g.cSInt, x, y, 1, false, -1, placementOptions);
    if (placed <= 0) return;
    this.stepLegacyL(-1);
    g.wByte = 2;
  }

  /**
   * Exact private void d(byte) (bytecode/f-javap.txt offsets 0..123), one
   * of `V()`'s movement/target dispatch targets. A second tap within the
   * n:I cooldown sets the window to the viewport and runs aF() (offset 60),
   * selecting every unit on screen -- wired 2026-09-23 (was an inert no-op).
   */
  private stepLegacyD(arg: number): void {
    const g = this.game;
    if (g.nInt > 1) {
      g.nInt = 0;
      g.BCounter = g.IByte - 1;
      g.CCounter = g.KByte - 1;
      g.DCounter = g.viewportO;
      g.ECounter = g.viewportP;
      g.uFlag = true;
      g.inputT = true; // t:Z (#367)
      this.selectWindowUnits(); // aF(), offset 60
      this.runSelectionFlagsRefresh(true, true, false, false);
      g.frameLayoutL = 0;
      g.kByte = 0;
      return;
    }
    if ((this.denseState[1919 + arg] ?? 0) > 0) {
      this.runSelectionFlagsRefresh(false, true, false, true);
      g.wByte = 1;
      g.frameLayoutL = arg;
      g.kByte = arg;
      g.FByte = -1;
    }
  }

  /**
   * Exact private void e(byte) (bytecode/f-javap.txt offsets 0..69). Loops
   * `mainArrays.aByte[FByte]` when `FByte!==-1`, else dispatches once using
   * `kByte`.
   *
   * CORRECTION (2026-08-24): was `game.teamEntitySlots`, a disconnected
   * duplicate of this SAME field (`f.a:[[B]`#130, confirmed via this
   * method's own bytecode read, offset 17) -- `teamEntitySlots` had no
   * real writer anywhere (its own docblock said "producer untraced"),
   * while `mainArrays.aByte` is the field's live, already-established
   * identity (`docs/code-mapping.md`'s `f.aa()` row, confirmed via exact
   * constructor allocation size). This was a real, currently-live bug:
   * `stepLegacyE`'s `FByte!==-1` loop always saw zeros and never
   * dispatched anything for a selected formation's armed units.
   */
  private stepLegacyE(arg: number): void {
    const g = this.game;
    if (g.FByte !== -1) {
      const row = this.mainArrays.aByte[g.FByte];
      if (row) {
        for (let id = 0; id < 50; id += 1) {
          const value = row[id] ?? 0;
          if (value > 0) this.stepLegacyA2(value, arg);
        }
      }
    } else {
      this.stepLegacyA2(g.kByte, arg);
    }
    g.nInt = 0;
  }

  /**
   * Exact private void a(byte,byte) (bytecode/f-javap.txt offsets 0..622),
   * `e(byte)`'s own dispatch target -- `target` is `local_1` (an id read
   * out of `teamEntitySlots`/`kByte`, NOT a loop counter), `source` is
   * `local_2` (`e(byte)`'s own `arg`).
   *
   * `b.a(byte,int,int)` (f-side pool #468, b-side #274) is WIRED as of
   * 2026-09-10. The 2026-08-22 note that replaced it -- "CONFIRMED a
   * guaranteed-throw past its two real guards ... class b's own
   * `short[] d`(#152) has ZERO `putfield` sites anywhere in the class" --
   * is RETRACTED. `f.g()` allocates it (`f-javap.txt:1329`,
   * `bipush 6; newarray short; putfield #273 // Field b.d:[S`), and class
   * b's own `a(f)` then fills it with -1 at its offsets 209..238, which
   * would itself have thrown if the field were really null. It is this
   * port's `LegacySubsystemArrays.dShort`.
   *
   * The method was ALREADY fully ported under the same retraction on
   * 2026-09-07 (`LegacyEntityMoveTrigger.ts`, `triggerLegacyEntityMove`,
   * already wired at three other call sites), so this site just calls it.
   * The stale `LegacySubsystemBFootprintGate.ts` -- a second, partial port
   * of the SAME method (#274) that only implemented the two guards and
   * stopped at the "guaranteed throw" -- had no call site at all and has
   * been deleted rather than left as a second source of truth.
   * `b.b(int):byte` (#543, ~94 instructions) is now fully ported
   * (`LegacySubsystemBClassify.ts`) and wired below for its
   * `dense[7777+target]` side effect -- the original discards its return
   * value, so this port does too.
   * `Z()` (#428) IS wired, via `stepFrameSelectionTransition()` -- found
   * 2026-08-18 that an earlier pass here had wrongly trusted a stale
   * "unopened" comment elsewhere in this codebase and left it a no-op;
   * `Z()` was actually already fully ported (`LegacyZTransition.ts`) AND
   * already wired at a completely different real call site (`f.W()`'s own
   * Z-command dispatch, `stepLegacyGameplayCommand`'s `onZ`). Since `Z()`
   * is parameterless and operates purely on persistent instance state,
   * this call site reuses that SAME already-wired method directly rather
   * than duplicating its (substantial) field/callback wiring. See
   * `docs/unknowns.md`'s "Z() cluster wiring" entry for the full
   * writeup of that correction.
   */
  private stepLegacyA2(target: number, source: number): void {
    const g = this.game;
    const dense = this.denseState;

    // f.a(byte,byte) offsets 0..56. BUG FIX (2026-09-10): this condition was
    // `... && (N || (L && (dense[7979+target] & 64) === 0))`. The bytecode is
    // `getfield N:Z; ifne 57` (skip when N is SET) then `getfield L:Z;
    // ifeq 45` (call when L is CLEAR) then `(dense[7979+target] & 64); ifne
    // 57`, i.e. `!N && (!L || (dense[7979+target] & 64) === 0)`.
    if (
      (dense[505 + target] ?? 0) < 10 &&
      !g.outerLoopNFlag &&
      (!g.outerLoopLFlag || ((dense[7979 + target] ?? 0) & 64) === 0)
    ) {
      // Offset 45..56: `b.a(12, target, 0); return;`
      this.entityMove(12, target, 0);
      return;
    }

    if (classifyLegacyNegativeEntity(source) === 0 && (dense[8749 - source] ?? 0) === 6) {
      this.runSelectionFlagsRefresh(true, false, true, false);
      g.qCounter = -source;
      g.wByte = 2;
      this.stepFrameSelectionTransition();
      return;
    }

    // Offsets 104..156: a double tap (n:I > 1) or re-ordering the same cell.
    // FIXED 2026-10-08: was `n <= 1 || same`, and q:Z was set on every order
    // (offset 157 sets it on this branch only).
    const samePosition = g.nInt > 1
      || ((dense[3131 + target] ?? 0) === g.yByte + g.IByte && (dense[3232 + target] ?? 0) === g.AByte + g.KByte);

    const packedOffsetsBase = (nibbleBase: number) => {
      const nibble = (dense[606 + target] ?? 0) & 1;
      const v1 = this.packedOffsets[nibbleBase + nibble * 2] ?? 0;
      const v2 = this.packedOffsets[nibbleBase + nibble * 2 + 1] ?? 0;
      const inner = this.packedBytes[v2 + (dense[1010 + target] ?? 0) - 5] ?? 0;
      const outer = this.packedBytes[v1 + inner + ((dense[1111 + target] ?? 0) & 15)] ?? 0;
      return ((dense[1111 + target] ?? 0) & 240) + outer;
    };

    if (samePosition) {
      g.cQFlag = true;
      if ((dense[7777 + target] ?? 0) === 0) {
        dense[7777 + target] = 3;
        classifyLegacySubsystemB({ dense, id: target });
        // Real bytecode re-checks dense[7777+target] after b.b()'s call
        // (offset 194..204) -- several of its branches reset that field
        // back to 0, in which case the packedOffsetsBase(129) write below
        // never happens.
        if ((dense[7777 + target] ?? 0) > 0) {
          dense[1111 + target] = packedOffsetsBase(129);
        }
      }
    } else if ((dense[7777 + target] ?? 0) > 0) {
      dense[1111 + target] = packedOffsetsBase(133);
      dense[7777 + target] = 0;
    }

    dense[3131 + target] = g.yByte + g.IByte;
    dense[3232 + target] = g.AByte + g.KByte;
    dense[7979 + target] = (dense[7979 + target] ?? 0) & 223;
    dense[6161 + target] = 2;
    dense[4747 + target] = source;
    g.cAbByte = g.yByte + g.IByte;
    g.cAcByte = g.AByte + g.KByte;

    const checksOccupancy = classifyLegacyPositiveEntity(source) === 1
      || classifyLegacyNegativeEntity(source) === 1
      || isLegacyEntityIdInRange101to122(source);
    if (checksOccupancy && this.occupancyClass(g.yByte + g.IByte, g.AByte + g.KByte) === 0) {
      g.cAaByte = 2;
    } else {
      g.cAaByte = 1;
    }
  }

  /**
   * Exact private void f(byte) (bytecode/f-javap.txt offsets 0..81).
   * `Z()` wired via `stepFrameSelectionTransition()`, same reasoning as
   * `stepLegacyA2`'s docblock.
   */
  private stepLegacyF(arg: number): void {
    const g = this.game;
    const dense = this.denseState;
    if ((dense[8749 + arg] ?? 0) === 3 && (dense[4444 + (this.mainArrays.aShort[0]?.[17] ?? 0)] ?? 0) !== arg) {
      this.mainArrays.r[0] = 0;
      g.frameLayoutAS = 0;
      this.stepLegacyL(4);
      return;
    }
    this.runSelectionFlagsRefresh(true, false, true, false);
    g.qCounter = arg;
    g.wByte = 2;
    g.kByte = 0;
    this.stepFrameSelectionTransition();
  }

  /**
   * Exact private void c(int,int) (bytecode/f-javap.txt offsets 0..966),
   * `f.m()`'s cursor/selection-overlay method, called twice per frame for
   * viewport translation. Composed almost entirely from already-ported
   * pieces found while tracing this: the 4 static classifiers
   * (`classifyLegacyPositiveEntity`/`classifyLegacyCameraCell`/
   * `isLegacyEntityIdInRange101to122`/`isLegacyMarkerIdInRangeMinus110to61`,
   * all already in `LegacyEntityClassifiers.ts`/`LegacyCameraFrame.ts`) and
   * `f.d(int,int,int,int)` (`stepZSubrecordDraw`, already used extensively
   * elsewhere).
   *
   * CORRECTION (2026-08-24): the `local5>0`/`cACInt>0`-gated calls to
   * `c.a(int,int,int,String,int)` (#451) and `c.a(Graphics)` (#452) were
   * previously characterized as "cosmetic debug text, not gameplay state"
   * and left as no-ops. That was wrong on two counts: (1) both methods
   * were ALREADY fully ported, as `LegacyGeometryDecoder.queueTextWithWidth`
   * (#451) and `LegacyGeometryRenderer.emit`/`renderTo` (#452) -- the same
   * machinery the menu "Z scan" text already uses (`this.geometry`/
   * `this.geometryRenderer`) -- so wiring them needed no new port at all;
   * (2) `javap -v`'s real constant pool shows string #665 is empty (""),
   * so the drawn text is just the plain decimal number, not a "STR"-
   * prefixed debug label -- this is a genuine numeric HUD overlay (a
   * count, drawn at the cursor position). The `local5>0` branch is now
   * wired below: `local5` (an armed/occupied-slot count for the selected
   * formation, `g.FByte`) is already computed earlier in this method, so
   * it has no further dependency. The `cACInt`/`f.aC:I`(#151) branch
   * remains a documented no-op: its real producer is a DIFFERENT,
   * currently-unported method, `private boolean a()`
   * (`bytecode/f-javap.txt` offsets 0..275, starting at that file's line
   * 5394 -- not `p()`, an earlier misattribution caught while re-deriving
   * this), which scans the camera-visible `gridC` cells for a per-type
   * gate (`e[1919+cellType]>0`) and also sets `ax:I`; a real future
   * candidate of its own, not folded into this fix. The `a(1000+s+1,2)`
   * building ghost (offset 518) is wired since 2026-10-01 through
   * `drawImageHelper`: its >= 1000 arm takes its origin from S:I/T:I, not
   * ah/ai, so the earlier objection did not apply.
   */
  private stepLegacyC2(arg1: number, arg2: number): void {
    const g = this.game;
    const dense = this.denseState;

    if (g.cAaByte !== 0) {
      this.stepZSubrecordDraw(
        34 + g.cAaByte,
        (g.cAbByte - g.IByte) * 22,
        (g.cAcByte - g.KByte) * 16,
        g.timingCounterE,
        { onSpriteRecord: (record, x, y) => this.drawPackedComposite(record, x, y) },
      );
      if (g.timingCounterE === 5) g.cAaByte = 0;
    }

    const local4 = this.gridC[g.KByte + g.AByte]?.[g.IByte + g.yByte] ?? 0;
    let local3 = 32;

    if (g.wByte !== 2) {
      let local5 = -1;

      if (g.wByte === 1) {
        if (g.kByte !== 0) {
          local5 = 1;
        } else if (g.FByte !== -1) {
          local5 = 0;
          for (let i = 0; i < 50; i += 1) {
            if ((this.mainArrays.aByte[g.FByte]?.[i] ?? 0) !== 0) local5 += 1;
          }
        }
        if (g.outerLoopZByte !== 0) {
          local3 = 33;
        } else {
          const accept =
            classifyLegacyCameraCell(local4) === 1 ||
            isLegacyEntityIdInRange101to122(local4) ||
            (classifyLegacyPositiveEntity(local4) === 1 && ((dense[7979 + local4] ?? 0) & 2) === 0);
          local3 = accept ? 34 : 33;
        }
      } else if (g.wByte === 3) {
        if (g.cSInt === 100) {
          g.cRFlag = true;
          local3 = 105;
        } else if (g.cSInt <= 3) {
          // Offset 260 `iflt 271`: a negative s (a building order) takes this branch too.
          // Reach the r:I=W assignment (offset 323) when EITHER (a) local4
          // classifies as team-0-range AND e[1414+local4]>=12 (direct
          // jump at offset 292), OR (b) that's false but W:B ALSO
          // classifies as team-0-range AND e[1414+W]>=12 (falls through
          // the offset 295..320 check instead). Re-verified against the
          // exact bytecode after an initial transcription had this
          // condition inverted.
          const local4Accepts = classifyLegacyPositiveEntity(local4) === 0 && (dense[1414 + local4] ?? 0) >= 12;
          const wAccepts = classifyLegacyPositiveEntity(g.cWByte) === 0 && (dense[1414 + g.cWByte] ?? 0) >= 12;
          if (local4Accepts || wAccepts) {
            g.cRInt = g.cWByte;
            g.cTInt = dense[0 + g.cRInt] ?? 0;
            g.cUInt = dense[101 + g.cRInt] ?? 0;
            g.cRFlag = true;
            local3 = 33;
          } else if (g.cSInt === 3) {
            g.cRFlag = true;
            local3 = 33;
          } else {
            g.cRFlag = false;
            local3 = 32;
          }
        } else {
          // Offsets 400..566, still inside `w == 3` (s > 3 at offset 268).
          // CORRECTED 2026-09-15: this block hung off `w != 1 && w != 3`, so a
          // building cursor never set r:Z.
          const local6 = this.packedBytes[(this.packedOffsets[138] ?? 0) + 104 + g.cSInt] ?? 0;
          const local7 = this.packedBytes[(this.packedOffsets[138] ?? 0) + 130 + g.cSInt] ?? 0;
          g.cTInt = g.yByte - Math.trunc(local6 / 2);
          g.cUInt = g.AByte - Math.trunc(local7 / 2);
          // Offsets 473..518: S:I/T:I (#98/#101, projectionS/T -- a twin
          // cSViewportX/cTViewportY pair was merged 2026-10-01), then the
          // building ghost a(1000 + s + 1, 2), which was deferred until then.
          g.projectionS = arg1 - Math.trunc(local6 / 2) * 22;
          g.projectionT = arg2 - Math.trunc(local7 / 2) * 16 - 5 + g.timingCounterE;
          this.drawImageHelper(1000 + g.cSInt + 1, 2, g.projectionS, g.projectionT);
          // a(int,int,int,boolean):boolean (#450) is canPlaceLegacyFootprint.
          const accepted = this.canPlaceFootprint(this.gridC, g.IByte + g.cTInt, g.KByte + g.cUInt, g.cSInt, true);
          g.cRFlag = accepted;
          local3 = accepted ? 41 : 40;
        }
      }

      if (g.cEFlag && g.timingCounterE < 2 && local3 <= 34) local3 += 5;
      this.stepZSubrecordDraw(local3, arg1, arg2, g.timingCounterE, {
        onSpriteRecord: (record, x, y) => this.drawPackedComposite(record, x, y),
      });
      // local5-gated numeric overlay: c.a(x+22,y+8,0,String(local5),1) then
      // c.a(Graphics[N:B]) -- see docblock above, CORRECTED 2026-08-24.
      // local5 is already computed above (armed/occupied-slot count for the
      // selected formation), so this needs no new dependency.
      if (local5 > 0) {
        const graphics = this.offscreenTargets?.graphics[this.game.targetSlot];
        if (graphics) {
          this.geometry.queueTextWithWidth(arg1 + 22, arg2 + 8, 0, String(local5), 1);
          this.geometryRenderer.renderTo(graphics, this.imageGroups[0]!);
          // c.a(Graphics)'s tail (offset 624) sets a:B = 0. Missing here and in
          // the 1010 slot counts until 2026-10-10 (oracle run 8, frame 11645):
          // rows piled up until row 13 spilled into the floating-text ring.
          this.geometry.reset();
        }
      }
      // cACInt-gated numeric overlay -- still deferred, see docblock above:
      // its producer is a distinct, not-yet-ported method.

      if (g.wByte === 3) {
        if (g.cSInt < 0) {
          this.drawPackedComposite(659 - g.cSInt - 1, arg1 + 11 + 5, arg2 + 8 + 5);
        } else if (g.cSInt <= 3) {
          this.stepZSubrecordDraw(g.cSInt + 48, arg1, arg2, g.timingCounterE, {
            onSpriteRecord: (record, x, y) => this.drawPackedComposite(record, x, y),
          });
        }
      }
    }

    // offset 793: w===2 jumps directly here too.
    local3 = 0;
    if (g.wByte === 1) {
      if (g.cQFlag && g.cAaByte !== 0) {
        local3 = 47;
        g.outerLoopZByte = 0;
      } else if (local4 === -124) {
        local3 = 44;
      } else if (local4 === -125) {
        local3 = 45;
      } else if (classifyLegacyCameraCell(local4) === 0) {
        if ((dense[8749 - local4] ?? 0) !== 10) local3 = 41;
      } else if (isLegacyMarkerIdInRangeMinus110to61(local4)) {
        local3 = (dense[9833 + (local4 + 61) * -1] ?? 0) === 7 ? 46 : 43;
      } else if (isLegacyEntityIdInRange101to122(local4)) {
        if (g.outerLoopZByte === 0) local3 = 43;
      }
    }
    if (local3 !== 0 && g.outerLoopZByte !== 2) {
      this.stepZSubrecordDraw(local3, arg1, arg2, g.timingCounterE, {
        onSpriteRecord: (record, x, y) => this.drawPackedComposite(record, x, y),
      });
    }
  }

  /**
   * private void a(int,byte) (#441) for resourceId >= 1000: origin S:I/T:I,
   * records b[0]/j[0][resourceId - 1000], then a(IBBIIB) and the g/h/i clear.
   * Shared by G()'s a(1118, mode) and c(int,int)'s building ghost
   * a(1000 + s + 1, 2) (offset 518; was deferred until 2026-10-01).
   */
  private drawImageHelper(resourceId: number, mode: number, S: number, T: number): void {
    if (!this.packedData || !this.offscreenTargets) return;
    // Exact private f.a(int,byte) prelude for resource 1118. The
    // helper receives the negative marker id, the e[9115+id] gate,
    // the e[8749+id] selector, and the computed map-screen origin;
    // it does not receive resourceId-1000 as its argument tuple.
    const invocation = prepareLegacyImageHelperInvocation({
      resourceId,
      dense: this.denseState,
      shortOffsets: this.packedOffsets,
      shortTables: this.packedData.shortTables,
      byteTables: this.packedData.byteTables,
      groupSelectors: this.mainArrays.gBytes,
      ah: 0,
      ai: this.game.projectionAi,
      I: this.game.IByte,
      K: this.game.KByte,
      S,
      T,
      vByte: this.game.vByte,
      fCounter: this.game.fCounter,
    });
    const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
    const packed = new LegacyPackedSpriteRenderer({
      shortTables: this.packedData.shortTables,
      byteTables: this.packedData.byteTables,
      imageGroups: this.imageGroups,
      graphics,
    });
    this.frameProjections.length = 0;
    projectLegacyImageHelper({
      recordBase: invocation.recordBase,
      recordCount: invocation.recordCount,
      argument1: invocation.marker,
      argument2: invocation.argument2,
      argument3: invocation.argument3,
      initialU: 0,
      originX: invocation.originX,
      originY: invocation.originY,
      mode,
      shortTables: this.packedData.shortTables,
      byteTables: this.packedData.byteTables,
      groupSelectors: this.mainArrays.gBytes,
      eBytes: this.denseState,
      hFlags: this.mainArrays.hBytes,
      groupFlags: this.mainArrays.iBytes,
      aBytes: this.packedBytes,
      aShorts: this.packedOffsets,
      stateV: this.game.vByte,
      fieldF: this.game.fCounter,
      fieldK: this.game.KByte,
      ai: this.game.projectionAi,
      // x:Z (#383), offset 1492. Wired 2026-09-28.
      onStateX: () => { this.game.xZFlag = true; },
      onComposite: (record, x, y) => packed.drawComposite(record, x, y),
      onProjection: (record, x, y, extra) => {
        this.frameProjections.push([record, x, y, extra]);
        const data = this.packedData;
        if (!data) return;
        const wrapped = data.shortTables[5]?.[record] ?? 0;
        const divisor = data.byteTables[9]?.[record] ?? 0;
        const index = divisor === 0 ? wrapped : wrapped + (extra % divisor);
        const drawRecord = data.shortTables[6]?.[index] ?? 0;
        const drawX = x + (data.byteTables[10]?.[index] ?? 0);
        const drawY = y + (data.byteTables[11]?.[index] ?? 0);
        packed.drawComposite(drawRecord, drawX, drawY);
      },
      onStatefulProjection: (record, x, y, extra, kind) => {
        this.game.projectionAq = record;
        this.game.projectionAr = x;
        this.game.projectionAs = y;
        this.game.projectionAt = extra;
        this.game.projectionY = kind;
        // The call itself: a(IIIIB) (#443), whose p() draws the sprite and writes ao/ap/au/...
        // Added 2026-10-09 (oracle menu run: f.ao/f.ap stayed 0 on the title screen).
        this.stepEntityAction(record, x, y, extra, kind);
        this.frameHelperCalls.push({
          kind: "stateful-projection",
          record,
          x,
          y,
          extra,
          mode: kind,
        });
      },
    });
    // f.a(IBBIIB) clears g/h/i[0..7] after the normal projection loop.
    for (let index = 0; index < 8; index += 1) {
      this.mainArrays.gBytes[index] = 0;
      this.mainArrays.hBytes[index] = 0;
      this.mainArrays.iBytes[index] = 0;
    }
  }

  /** Exact f.h() maintenance call: f.a(100,0,0,0). */
  private stepByteActionQueueMaintenance(): void {
    this.runByteActionQueue(100, 0, 0, 0);
  }

  /**
   * Exact `private void a(byte,byte,byte,byte)` (constant pool #433) --
   * factored out of `stepByteActionQueueMaintenance` (2026-08-18) so
   * `placeEntity`'s own call to the SAME method (`onTeamZeroReset`,
   * `type=5` -- confirmed via direct bytecode read of `placeEntity`
   * offset 1098..1106: `iconst_5; iload_3(x); i2b; iload 4(y); i2b;
   * iconst_0; invokevirtual #433`) can share it instead of duplicating
   * the state setup/write-back.
   */
  private runByteActionQueue(type: number, x: number, y: number, value: number): void {
    const state = {
      c: this.game.c,
      u: this.game.uByte,
      ay: this.game.ayByte,
      uBytes: this.mainArrays.uBytes,
      kMatrix: this.mainArrays.kMatrix,
      gCounters: this.mainArrays.gCounters,
      selectionFlags: this.game.selectionFlags,
      // f.a(ZZZZ) is a proven callback boundary.
      onSelectionRefresh: (first: boolean, second: boolean, third: boolean, fourth: boolean) => {
        this.runSelectionFlagsRefresh(first, second, third, fourth);
      },
    };
    stepLegacyByteActionQueue(state, type, x, y, value);
    // The helper mutates the queue arrays in place; ay is the only scalar
    // result of this call, so mirror it back to the live f field.
    this.game.ayByte = state.ay;
  }

  /**
   * Execute the confirmed outer b.g()/b.e() update order used by f.j().
   *
   * b.h() and the entity-private movement/combat calls are intentionally left
   * as raw callback boundaries until their bytecode consumers are mapped.
   *
   * WIRED (2026-08-24): `selectEntityUpdateCandidates`'s `onCleanup` --
   * see `LegacyEntityUpdateSelection.ts`'s own docblock for the bug this
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
   * same helper already wired at this file's `onSlotAction`/offset-100
   * call sites).
   */
  private stepSubsystemFrame(): void {
    this.selectEntityUpdateCandidates(this.game.c, {
      onCleanup: (id, associationIndex) => {
        this.filterEntityLifecycle(id, true, (row, column) => this.gridC[row]?.[column] ?? 0);
        this.cleanupEntityUpdate(id, associationIndex, {
          onEntityReset: (entityId, mode) => {
            enqueueLegacyEffectSlot(this.mainArrays.e, entityId, mode);
          },
          onEntityFinalize: (entityId) => {
            const dState = { w: this.game.wByte, q: this.game.qCounter, P: this.game.pendingP };
            stepLegacyFD(entityId, dState);
            this.game.pendingP = dState.P;
          },
        });
      },
    });
    // b.K:B (#28), live: a():Z resets it mid-loop (offset 654). FIXED 2026-10-09 (oracle run 5,
    // frame 12810): a snapshot written back after the loop undid every reset, so K stayed 50 and
    // b.a(byte,int,int) raised prompts the original holds back while K < 50.
    const arrays = this.subsystemArrays;
    const scheduler = { get kByte() { return arrays.bField28; }, set kByte(value: number) { arrays.bField28 = value; } };
    // e()'s own exception table (offsets 0..832 -> 833, pop;return) wraps
    // the ENTIRE method -- confirmed via direct bytecode read (2026-08-27).
    // This matters because b.t()'s onEntityTargetStep callback can reach a
    // confirmed-guaranteed-throw (subsystemEntityTransform, only when an
    // entity's mode is exactly 2 -- see LegacyEntityActionCommit.ts's own
    // docblock) that is NOT locally caught inside t() itself, so it
    // propagates here. Faithfully reproducing e()'s own catch means one
    // mode===2 entity anywhere in the roster aborts the REST of this
    // tick's entity loop (every entity after it in iteration order), not
    // just that one entity -- matched with a try/catch at this exact
    // scope, not the broader f.j()-level catch four other confirmed-throw
    // instances this session relied on.
    try {
      this.runSubsystemEntityLoop(
        this.game.c,
      this.game.qByte,
      // f.b:B (b's #138, f's #243 -- levelBByte). CORRECTED 2026-10-14: subsystemModeByte, never written.
      this.game.levelBByte,
      scheduler,
      {
        // b.e()'s own u:I maintenance -- see LegacySubsystemEntityLoop.ts's
        // note at this callback's call site.
        onTeamStart: (team) => { this.game.subsystemU = team; },
        onV: (v) => { this.game.subsystemV = v; },
        readV: () => this.game.subsystemV,
        onTeamOneAuxiliary: () => { this.subsystemTeamOneAiMuster(); },
        // b.e()'s offset-31 `a(0)` (#281, stepLegacySubsystemWorkerDispatch),
        // result popped. WIRED 2026-09-22 -- the last of e()'s four unwired
        // calls; the method itself was already ported for y()/ap().
        onWorkerDispatchPass: (argument) => {
          stepLegacySubsystemWorkerDispatch({
            state: this.denseState,
            fields: liveView<{ v: number }>(this.game, { v: "subsystemV" }),
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            gridC: this.gridC,
            team: this.game.subsystemU,
            aRows: this.mainArrays.aByte3,
            bRows: this.game.xSlotTable,
            onChangeType: (entityId, type) => { this.changeEntityType(entityId, type); },
            onN: (entityId) => this.stepSubsystemN(entityId, this.game.subsystemU),
          }, argument);
        },
        // b.e()'s offset-256 `h()`, WIRED 2026-09-22 -- a villager noticing an
        // enemy marker within its sight, and the "stop and look" animation
        // whose `true` return holds the unit for the rest of the tick.
        onEntityTimingCheck: (id) => stepLegacyEntitySpotAlert({
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          v: id,
          team: id <= 50 ? 0 : 1,
          frame: this.game.c,
          markerTable: this.game.teamMarkerTable,
          jRow4: (index) => this.packedData?.byteTables?.[4]?.[index] ?? 0,
          scratch: this.spotAlertScratch(),
          onSpiralGate: (mode, scanLimit, x, y) => {
            try {
              this.checkSpiralPlacementGate(mode, scanLimit, x, y, id);
            } catch {
              // e()'s own exception table covers this call.
            }
          },
        }),
        // b.e()'s offset-311 `B()`, WIRED 2026-09-22 -- it picks the thought
        // bubble LegacyEntityOverlayDraw draws as sprite 77 + dense[3333+id].
        // Unwired, villagers only ever showed the few icons k() and i() set.
        onPeriodicEntityAction: (id) => stepLegacyEntityMoodPick({
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          saveOffsets: this.saveOffsets,
          v: id,
          random: (mask, divisor) => this.randomRemainder(mask, divisor),
        }),
        // b.e()'s offset-752 `T()`, WIRED 2026-09-22 -- it rebuilds the
        // on-screen entity index (gridG plus the dense[6060] chain) that
        // LegacySecondaryCellChain.ts walks. Nothing had ever produced it.
        onFinalScriptedPass: () => stepLegacyEntityScreenIndex({
          state: this.denseState,
          gridG: this.gridG,
          viewportI: this.game.IByte,
          viewportK: this.game.KByte,
          viewportO: this.game.viewportO,
          viewportP: this.game.viewportP,
        }),
        onTeamEnd: (team) => { this.subsystemUnitTraining(team); },
        onPrepass: () => {
          this.runSubsystemPrepass(
            this.game.c,
            this.game.qByte,
            // b.s() offsets 87..90: f.b:B (levelBByte). CORRECTED 2026-10-14: subsystemModeByte.
            this.game.levelBByte,
            // b.s() offset 30 reads f.L:Z (#33), FORM UP. CORRECTED 2026-10-13
            // (oracle run 14, play11 frame 48344): it read subsystemLFlag, a
            // twin nothing wrote, so the b() sweep never ran during FORM UP.
            this.game.outerLoopLFlag,
            {
              // b.s() offset 7: c.b() -- the floating +n/-n texts. Wired 2026-09-28.
              onResourceTick: () => this.geometry.stepFloatingTexts(this.game.c),
              fByte: this.game.subsystemGFFlagByte,
              onFReset: () => { this.subsystemArrays.bField16 = 0; },
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
              onSpatialPass: () => this.runSpatialPass({}),
              // b.s()'s `f.L && (f.c&63)===2` guard calls b's own `final
              // void b()` (offset 51, invokevirtual #338 "Method b:()V" --
              // the ONLY no-arg void-returning `b()` in class b, distinct
              // from the `private boolean b()` overload) -- the SAME
              // method already ported and wired elsewhere as
              // `subsystemBTeamSweep`.
              onEntityGuardPass: () => this.subsystemBTeamSweep(),
            },
          );
        },
        onEntityStatusCheck: (id) => stepLegacyEntityStatusGuard({
          fields: liveView<{ B: number }, LegacySubsystemArrays>(this.subsystemArrays, { B: "bField8" }),
          onFBump: () => { this.subsystemArrays.bField16 += 1; },
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          shortTableB: this.saveOffsets,
          gridC: this.gridC,
          id,
          team: id <= 50 ? 0 : 1,
          frame: this.game.c,
          subsystemGFFlagByte: this.game.subsystemGFFlagByte,
          randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
          fQByte: this.game.qByte,
          bShort: this.saveOffsets,
          shortTableBOffsets: this.sectionOffsets,
          outerLoopLFlag: this.game.outerLoopLFlag,
          onChangeType: (targetId, type) => { this.changeEntityType(targetId, type); },
          // b.a():Z offsets 652..654 -- K:B (#28) reset, now modelled; see
          // LegacySubsystemArrays.bField28's own docblock.
          onSchedulerReset: () => { this.subsystemArrays.bField28 = 0; },
          // a(int,int,int,byte) (#283) -- s()/q()/r() reach it through here, so
          // a unit whose HP hits 0 actually leaves the map. Wired 2026-09-16.
          onVacate: (kind, vx, vy, target) => this.vacateEntity(kind, vx, vy, target),
          // f.b(byte) (#348) at ages 12 and 35: re-roll e[2727+id] for the
          // new life stage. Wired 2026-09-27 (ported, never connected).
          onLevelMilestone: (id) => indexLegacyEntityRecord(this.entityRecordLifecycleInput(), id),
          // a()'s periodic V() (#258, housing) and W() (happiness drift). Both
          // were unwired until 2026-09-18, so no villager ever got a home and
          // happiness never moved from its birth value -- see
          // LegacyEntityHousing.ts / LegacyEntityHappiness.ts.
          onV: (target) => stepLegacyEntityHousing({
            state: this.denseState,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            pool: this.mainArrays.aShort,
            id: target,
            team: target <= 50 ? 0 : 1,
          }),
          onW: (target) => {
            const game = this.game;
            stepLegacyEntityHappiness({
              state: this.denseState,
              packedBytes: this.packedBytes,
              packedOffsets: this.packedOffsets,
              id: target,
              team: target <= 50 ? 0 : 1,
              frame: game.c,
              fQ: game.qByte,
              bShort: this.saveOffsets,
              shortTableBOffsets: this.sectionOffsets,
              scratch: { get w() { return game.subsystemW; }, set w(value) { game.subsystemW = value; } },
            });
          },
          // a()'s periodic X() and Y() (the 8080 crowding counter), wired
          // 2026-09-20 -- see LegacyEntityCrowdStress.ts. X() decays 8080 while
          // the unit holds its own cell and raises it (clamped to 30) while it
          // does not; at 30 it sets 7979 bit 2, whose icon f.q() draws as
          // sprite record 73, and Y() then spreads +8 onto adult neighbours.
          onX: (target) => stepLegacyEntityCrowdDecay({
            state: this.denseState,
            entityId: target,
            gridC: this.gridC,
            mapWidth: this.game.mapWidth,
            mapHeight: this.game.mapHeight,
          }),
          onY: (target) => stepLegacyEntityCrowdSpread({
            state: this.denseState,
            entityId: target,
            gridC: this.gridC,
            mapWidth: this.game.mapWidth,
            mapHeight: this.game.mapHeight,
          }),
          // a(int,int) (#294) -- r()'s own hunger/tiredness penalty and regen
          // ticks; unwired until 2026-09-16, so starving villagers took no damage.
          onRandomAction: (target, delta) => { this.entityHealthDelta(target, delta); },
          // a()'s dying branch (offsets 17..105): once 3030 reaches the death
          // animation's own length (f.j[4][2929 & 255]), m(int) (#400) clears the
          // corpse; R() (#254) runs while 5959 is positive. Wired 2026-09-16.
          animationLimit: this.packedData?.byteTables?.[4]?.[(this.denseState[2929 + id] ?? 0) & 255],
          onLifecycle: (target) => { this.entityDeathCleanup(target); },
          onFinal: (target) => {
            stepLegacySubsystemEntityPaceAccum({
              state: this.denseState,
              packedBytes: this.packedBytes,
              packedOffsets: this.packedOffsets,
              id: target,
              team: target <= 50 ? 0 : 1,
              randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
              // S()'s own a(IIIIIIII) (#298) -- WIRED 2026-09-22, see
              // entityStrikeGate. The original discards its result too.
              onQueueAction: (...args) => { this.entityStrikeGate(target, ...args); },
            });
          },
          // q()'s onA (private void A()) -- see subsystemEntityAAlert's own docblock.
          onA: (targetId) => this.subsystemEntityAAlert(targetId),
          onMove: (act, moveId) => this.entityMove(act, moveId, moveId),
        }),
        onEntityTargetStep: (id) => {
          // b.e() invokes b.t(id) after the status guard. `onPositionProbe`
          // (b.a(int,int,boolean)/subsystemEntityTransform) is RETRACTED-
          // PREMISE, FULLY PORTED 2026-09-07 (see subsystemEntityTransform's
          // own docblock) -- real bytecode offsets 108..115 call
          // `a(dense[3131+id], dense[3232+id], true)` then immediately read
          // `l:B`(#199), which is exactly what `subsystemEntityTransform`
          // now returns directly.
          this.stepEntityTarget(id, {
            u: this.game.subsystemU,
            // t() reads b.m:B (#202) and f.N:Z -- CORRECTED 2026-09-14, was
            // the never-written subsystemModeByte and the unrelated nFlag.
            m: () => this.game.subsystemMByte,
            kByte: scheduler.kByte,
            fN: this.game.outerLoopNFlag,
            onPositionProbe: (x, y) => this.subsystemEntityTransform(id, x, y, true),
            onAction: (byteValue, enabled) => {
              const jRows = this.packedData?.byteTables;
              if (!jRows) return false;
              return stepLegacyEntityActionCommit({
                state: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                gridC: this.gridC,
                jRows,
                entityId: id,
                actionCode: byteValue,
                allowRestart: enabled,
                onChangeType: (targetId, type) => { this.changeEntityType(targetId, type); },
                // b.i(0) (#391) after the 83/84 -> 85 and 79 -> 80 type
                // changes. Wired 2026-09-27 (stepEntityIUpdate has been live
                // since 08-31; the "no-op" note here predated it).
                onIUpdate: (arg) => this.stepEntityIUpdate(id, arg, id <= 50 ? 0 : 1),
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
            onDistanceProbe: (x, y, arg3) => this.occupancyCheck(id, x, y, arg3),
            onModeDispatch: (mode) => this.subsystemG(id, mode),
            onByteDispatch: (targetId, value) => { this.changeEntityType(targetId, value); },
          });
        },
        onEntityDecisionCheck: (id) => this.stepEntityDecisionCheck(id),
        onEntityLoopTail: (id, team) => this.subsystemEntityLoopTail(id, team),
        onEntityCoreUpdate: (id, team) => {
          // b.e() reaches b.v() after the decision branch.  The f.j[][] table
          // is the 25-row /pd0 byte-table family; bind it only when the
          // original packed resource has been attached.
          const jRows = this.packedData?.byteTables;
          if (!jRows) return;
          const readPacked = (table: number, index: number): number =>
            this.packedBytes[(this.packedOffsets[table] ?? 0) + index] ?? 0;
          const entityCoreRaw = { d: false };
          this.stepEntityCoreUpdate(id, {
            raw: entityCoreRaw,
            readJ: (row, index) => jRows[row]?.[index] ?? 0,
            readTable39: (index) => readPacked(39, index),
            readTable138: (index) => readPacked(138, index),
            onW: () => this.stepEntityWUpdate(id, {
              team,
              mainShort: this.mainArrays.aShort,
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
                dense: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                id,
                x,
                y,
                value,
                u: this.game.subsystemU,
                kBytes: this.game.subsystemKBytes,
                subsystemX: this.game.subsystemX,
                onGate: (...args) => this.entityStrikeGate(id, ...args),
              }),
              // b.w()'s onAction (private void a(byte,byte,int,int)) -- see
              // LegacyEntityActionScoreGate.ts's own docblock for the full chain.
              // RESTORED (2026-09-07): this used to drop the caller's 3rd/4th
              // args (action/mode) entirely -- they're real params the ported
              // method now reads (see that file's docblock).
              onAction: (x, y, action, mode) => stepLegacyEntityActionScoreGate({
                dense: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                saveOffsets: this.saveOffsets,
                sectionOffsets: this.sectionOffsets,
                id,
                x,
                y,
                entityB: this.subsystemArrays.bField8,
                action,
                mode,
                hTable: this.secondaryCellHTable,
                iTable: this.secondaryCellITable,
                bScalars: this.subsystemArrays,
              }),
              // b.w()'s onJ (private void J(), #246) -- see subsystemEntityJTrigger's own docblock.
              onJ: () => this.subsystemEntityJTrigger(id),
            }),
            // v() offset 327 invokes `d():Z` (#369) -- see
            // LegacyEntityDPredicate.ts for the 2026-09-17 wiring fix.
            onD: () => stepLegacyEntityDPredicate({
              state: this.denseState,
              entityId: id,
              z: this.game.subsystemEntityZ,
              b: this.subsystemArrays.bField8,
              cBytes: this.resourceTables.rowFByte,
              readPacked: (row, index) => this.packedBytes[(this.packedOffsets[row] ?? 0) + index] ?? 0,
              onI: (argument) => this.stepEntityIUpdate(id, argument, this.game.subsystemU),
              onG: (argument) => this.subsystemG(id, argument),
              onPStep: () => this.stepSubsystemP(id),
              onP: () => stepLegacySubsystemEntityRevertIdle(this.denseState, id),
              onVacate: (kind, x, y, target) => this.vacateEntity(kind, x, y, target),
            }),
            onFilterWorkers: (record) => this.filterEntityLifecycle(record, false, (row, column) => this.gridC[row]?.[column] ?? 0),
            // private void x(): the worker leaves its record -- rewritten 2026-09-15.
            onX: () => {
              stepLegacyEntityAssociationCleanup({
                state: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                gridC: this.gridC,
                entityId: id,
                fields: liveView<{ x: number }>(this.game, { x: "subsystemX" }),
                team: this.game.subsystemU,
                fP: this.game.persistedPByte,
                fQ: this.game.qByte,
                mapWidth: this.game.mapWidth,
                mapHeight: this.game.mapHeight,
                onRecordWorkerLevel: (record) => stepLegacySubsystemRecordWorkerLevel(this.denseState, record, this.game.subsystemU),
                onGate: (mode, scanLimit, x, y) => {
                  this.checkSpiralPlacementGate(mode, scanLimit, x, y, id, (occupant) => checkLegacyEntityOccupant({
                    state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets, id,
                  }, occupant));
                },
                onP: () => stepLegacySubsystemEntityRevertIdle(this.denseState, id),
                onSelectionRelease: (entityId) => this.releaseEntitySelection(entityId),
                onAuxiliary: (first, second, third) => {
                  selectLegacyAuxiliaryCandidates({
                    p: this.auxiliaryScratch,
                    dense: this.denseState,
                    shortRows: this.mainArrays.aShort,
                  }, this.auxiliaryQueueState, first, second, third);
                },
                onSceneDispatch: (value) => { this.runSceneDispatch(value); },
                // f.p:B (#353); persistedPByte is the copy al() and the RMS record use.
                onFP: (value) => { this.game.persistedPByte = value; },
                onNeeds: () => this.checkEntityNeeds(id),
                onQ: () => this.selectEntityTypeAfterQ(id),
                onPStep: () => this.stepSubsystemP(id),
                onOccupancy: (x, y, layer) => {
                  this.game.subsystemEntityZ = this.occupancyCheck(id, x, y, layer);
                },
                onN: () => this.stepSubsystemN(id, this.game.subsystemU),
                randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
              });
            },
            onE: () => {
              return stepLegacyEntityESelection({
                state: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                entityId: id,
                readStatus: () => this.entityModeValue(id),
                readRecordCheck: (record) => checkLegacyEntityRecord({
                  state: this.denseState,
                  packedBytes: this.packedBytes,
                  packedOffsets: this.packedOffsets,
                  entityId: id,
                  record,
                  readCell: (row, column) => this.gridC[row]?.[column] ?? 0,
                  // c(int) -> d(int): a(int,int,boolean) (#273), then m:B (#202).
                  readM: () => this.game.subsystemMByte,
                  onEntityTransform: (x, y, flag) => { this.subsystemEntityTransform(id, x, y, flag); },
                  // b.Q() (#253) when d(int) is false.
                  onQ: () => { this.selectEntityTypeAfterQ(id); },
                }),
                // Offsets 460..468 and 566, wired 2026-09-27.
                readSecondaryCheck: (kind) => stepLegacySubsystemNearestBuilding({
                  state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
                  team: id <= 50 ? 0 : 1, entityId: id, kind,
                }),
                onG: (value) => this.subsystemG(id, value),
                onQ: () => { this.selectEntityTypeAfterQ(id); },
              });
            },
            onY: () => {
              // b.y() (WIRED 2026-08-31, see LegacyEntityFollowup.ts's own
              // docblock for the full re-derivation, including two
              // previously-uncaught bugs fixed in the same pass). `entityCoreRaw`
              // is the SAME `d:Z`-tracking object v() itself uses -- y() is
              // called with whatever `d` v() left it at, and reads/writes it
              // through this shared reference, matching the single real
              // instance field both methods operate on.
              // b.z:I, live: y()'s callees (i(int) -> scene dispatch, entityAp) write it too.
              const game = this.game;
              const followupZ = { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } };
              stepLegacyEntityFollowup({
                state: this.denseState,
                entityId: id,
                readPacked,
                raw: entityCoreRaw,
                z: followupZ,
                bValue: this.subsystemArrays.bField8,
                readCell: (row, column) => this.gridC[row]?.[column] ?? 0,
                // v = a(v) (#281): the dispatch borrows v:I and hands back its argument.
                onWorkerDispatch: (arg) => {
                  this.game.subsystemV = stepLegacySubsystemWorkerDispatch({
                    state: this.denseState,
                    fields: liveView<{ v: number }>(this.game, { v: "subsystemV" }),
                    packedBytes: this.packedBytes,
                    packedOffsets: this.packedOffsets,
                    gridC: this.gridC,
                    team,
                    aRows: this.mainArrays.aByte3,
                    bRows: this.game.xSlotTable,
                    onChangeType: (entityId, type) => { this.changeEntityType(entityId, type); },
                    onN: (entityId) => this.stepSubsystemN(entityId, team),
                  }, arg);
                },
                // z = a(x, y, 0) (#266) -- persisted at once, p() runs right after.
                onOccupancy: (x, y, layer) => {
                  const z = this.occupancyCheck(id, x, y, layer);
                  this.game.subsystemEntityZ = z;
                  return z;
                },
                onP: () => this.stepSubsystemP(id),
                // y() offset 240: b(e[3939+v] - 28, true, v) (#344), the
                // afford check. Wired 2026-09-27 (was left inert).
                onType84Action: (action, flag, unit) =>
                  checkLegacyEntityAffordable(this.entityCostInput(id), action, flag, unit),
                onEntityProbe: () => {
                  // i()/j() share the SAME S:I(#51, game.subsystemS)
                  // cross-call scratch -- see both files' own docblocks.
                  const game = this.game;
                  // b.f:Z (#172) is shared by i()Z, j()Z, K() and others -- read/write it live.
                  const fShared = { get value() { return game.subsystemFFlag; }, set value(next: boolean) { game.subsystemFFlag = next; } };
                  const sScratch = { value: this.game.subsystemS };
                  const result = stepLegacySubsystemEntityProbe({
                    state: this.denseState,
                    packedBytes: this.packedBytes,
                    packedOffsets: this.packedOffsets,
                    saveOffsets: this.saveOffsets,
                    shortRows: this.mainArrays.aShort,
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
                    onL: () => checkLegacyEntityModeListed(this.denseState, this.packedBytes, this.packedOffsets, id, {
                      get A() { return game.subsystemA; }, set A(value: number) { game.subsystemA = value; },
                    }),
                    // private boolean a(int,boolean,int) (#292), wired 2026-09-15.
                    onCheckTargetKind: (type, flag, entityId) => this.payEntityCost(type, flag, entityId, entityId),
                    // private boolean a(byte,byte,byte,byte) (#293): skill growth, wired 2026-09-15.
                    onCheckQuad: (attr, chance, cap, step) => this.gainEntitySkill(id, attr, chance, cap, step),
                    // private boolean b(int,int) (#347): a worker's record skills, wired 2026-09-15.
                    onCheckSlotProgress: (kind, level) => this.gainEntitySlotSkills(id, kind, level),
                    // private void j(int) (#394), wired 2026-09-21 --
                    // LegacyEntityOccupantCare.ts. i():Z calls it with 1 (the
                    // healing branch) when the unit's mode is 117.
                    onJInt: (arg) => stepLegacyEntityOccupantCare({
                      state: this.denseState,
                      v: id,
                      scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                      onHealthDelta: (target, delta) => { this.entityHealthDelta(target, delta); },
                    }, arg),
                    // private boolean k() (#396), wired 2026-09-15.
                    onKPredicate: () => this.stepEntityKPredicate(id, team),
                    // private void I() (#245), wired 2026-09-15.
                    onIFinalize: () => stepLegacyEntityIFinalize({
                      state: this.denseState,
                      packedBytes: this.packedBytes,
                      packedOffsets: this.packedOffsets,
                      gridC: this.gridC,
                      id,
                      onChangeType: (entityId, type) => { this.changeEntityType(entityId, type); },
                      // f(boolean) (#382), ported 2026-09-22; this I() site was
                      // missed and still threw until 2026-09-23.
                      onF: (flag) => this.entityProduceItem(id, team, flag),
                      onN: () => this.stepSubsystemN(id, team),
                      onAn: () => this.stepSubsystemAnFor(id),
                    }),
                    onJ: () => this.subsystemEntityJTrigger(id),
                    onAssociationScan: () => stepLegacySubsystemEntityAssociationScan({
                      state: this.denseState,
                      packedBytes: this.packedBytes,
                      packedOffsets: this.packedOffsets,
                      saveOffsets: this.saveOffsets,
                      gRows: this.subsystemArrays.gRows,
                      mainShort: this.mainArrays.aShort,
                      entityId: id,
                      team,
                      zValue: this.game.subsystemEntityZ,
                      aValue: this.game.subsystemA,
                      s: sScratch,
                      f: fShared,
                      // K() (#247), WIRED 2026-09-23 -- see entityTypeReaction.
                      onK: () => this.entityTypeReaction(id, team),
                      onCheckSlotProgress: (kind, level) => this.gainEntitySlotSkills(id, kind, level),
                      // private void j(int) (#394), wired 2026-09-21 -- same
                      // method and same scratch as i():Z's own call above.
                      onJInt: (arg) => stepLegacyEntityOccupantCare({
                        state: this.denseState,
                        v: id,
                        scratch: { get S() { return game.subsystemS; }, set S(value: number) { game.subsystemS = value; } },
                        onHealthDelta: (target, delta) => { this.entityHealthDelta(target, delta); },
                      }, arg),
                      onCheckQuad: (attr, chance, cap, step) => this.gainEntitySkill(id, attr, chance, cap, step),
                      onN: () => this.stepSubsystemN(id, team),
                    }),
                  });
                  this.game.subsystemS = sScratch.value;
                  return result;
                },
                // i(int):V (#391) -- WIRED 2026-08-31. The previous port
                // (stepLegacyEntityIUpdate) was carrying four real bugs and
                // had never had a live caller; see LegacyEntityIUpdate.ts's
                // own docblock for the full re-derivation. `value` is y()'s
                // own z:I, exactly as its offset-579 call site passes it.
                onEntityI: (value) => { this.stepEntityIUpdate(id, value, team); },
              });
            },
          });
        },
      },
      );
    } catch {
      // e()'s own exception table (offsets 0..832 -> 833, pop;return) --
      // see the docblock above this try block for the full derivation.
    }
    // b's u/v/w, live (2026-09-23): the animal loop's e(boolean) writes w
    // and the loop counter is v, so a copy written back afterwards was wrong.
    const hRaw = liveView<{ u: number; v: number; w: number }>(this.game, {
      u: "subsystemU", v: "subsystemV", w: "subsystemW",
    });
    stepLegacySubsystemH({
      state: this.denseState,
      bBytes: this.packedBytes,
      bShorts: this.packedOffsets,
      frame: this.game.c,
      q: this.game.qByte,
      fT: this.game.subsystemT,
      raw: hRaw,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      // final boolean a(int,int,int,int) (#270, checkLegacySpiralPlacementGate)
      // -- the SAME gate already wired at an()'s onLargeGate and
      // LegacyFPairCommand.ts's onFootprintProbe. b.h()'s own exception
      // table (offset 0..658, basically the whole method) swallows any
      // throw from mode=1 accepting a candidate, matching this try/catch.
      onFootprint: (mode, scanLimit, x, y) => {
        try {
          // mode=1 here, so onOccupantCheck (mode===0-only) is irrelevant.
          // The gate's ambient v:I is h()'s own, which offset ~350 has just
          // set to 0 -- so the free cell lands in dense[3131]/[3232], exactly
          // where the spawn reads it. CORRECTED 2026-09-23 (was the stale
          // game.subsystemV, writing the cell to some other unit).
          this.checkSpiralPlacementGate(mode, scanLimit, x, y, hRaw.v);
        } catch {
          // Matches b.h()'s own confirmed exception table.
        }
      },
      // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
      // already-wired helper stepSubsystemStateCommand's own onT (T()'s
      // ai===45 branch, via onSubsystemRecordAllocate) uses.
      onSubsystemRecord: (first, x, y, counterIndex) => {
        this.allocateSubsystemRecord(this.gridC, first, x, y, counterIndex, {
          randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
          counters: this.game.subsystemT,
          q: this.game.qByte,
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
      // confirms this try/catch is load-bearing, not just theoretical.
      onTailMaintenance: (slot) => {
        // Offsets 604..655: the loop counter IS b's v:I, which af()/ah() and
        // the #270 gate (mode 6) read as the current animal. FIXED 2026-09-23.
        this.game.subsystemV = slot;
        try {
          const game = this.game;
          stepLegacySubsystemAf({
            state: this.denseState,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            gridC: this.gridC,
            z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
            slot,
            frame: this.game.c,
            sceneQ: this.game.qByte,
            subsystemFByte: this.game.subsystemGFFlagByte,
            jRow4: (index) => this.packedData?.byteTables?.[4]?.[index] ?? 0,
            randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
            // af()'s offset-302 `a(IIIIIIII)` (#298) -- the animal striking a
            // villager. WIRED 2026-09-22 alongside c()'s own gate; it was the
            // other unwired half of combat. `p3` is the literal 2 af() passes,
            // which is what lets a wild animal hit either team.
            onQueueAction8: (...args) => { this.entityStrikeGate(slot, ...args); },
            // af()'s `a(int,int,byte,int)` (#289) -- the wounded animal's own
            // reaction, WIRED 2026-09-22 (LegacyAnimalHitReaction.ts). Its
            // t181 aggression lookup is where the boar's counter-attack and
            // the deer's flight part company. `e(boolean)` (#376), the flight
            // half, is 308 javap lines and stays an explicit seam.
            onFinishSlot: (targetX, targetY, targetId, arg4) => stepLegacyAnimalHitReaction({
              state: this.denseState,
              packedBytes: this.packedBytes,
              packedOffsets: this.packedOffsets,
              slot,
              // e(true) -- the flight half, WIRED 2026-09-22.
              onFlee: (flag) => this.animalRoam(slot, flag),
            }, targetX, targetY, targetId, arg4),
            // af()'s offset-470 `e(boolean)` (#376), WIRED 2026-09-22.
            onAnimReset: (flag) => this.animalRoam(slot, flag),
            onFootprintGate: (mode, scanLimit, x, y) => {
              try {
                // Same ambient-v reasoning as onFootprint above (b.h()'s
                // af()/ah() have no explicit id parameter either).
                return this.checkSpiralPlacementGate(mode, scanLimit, x, y, this.game.subsystemV);
              } catch {
                return false;
              }
            },
            neighborValue: (x, y, mode) => this.occupancyCheck(slot, x, y, mode),
            onAg: () => {
              stepLegacySubsystemAg({
                state: this.denseState,
                packedBytes: this.packedBytes,
                packedOffsets: this.packedOffsets,
                localFlags: this.game.subsystemBLocalFlags,
                gridC: this.gridC,
                candidateCells: this.subsystemArrays.b,
                slot,
                frame: this.game.c,
                // b.z:I (#234) is class b's own scalar int field, NOT a
                // dense[] offset -- FIXED 2026-09-07 (was reading
                // this.denseState[234], an unrelated dense-array cell).
                zValue: this.game.subsystemEntityZ,
                // ag()'s offset-242 `e(boolean)` (#376), WIRED 2026-09-22.
                onAnimReset: (flag) => this.animalRoam(slot, flag),
                // `private byte a(int,int,int,int,int,int)` (#268) -- ported
                // 2026-09-08 as computeLegacySubsystemPairScore but never
                // wired at THIS call site, so it returned 0 through the `?? 0`
                // default. Its result is `dense[9689+v]`, the size of the
                // candidate-cell bucket ag() then walks: a 0 meant
                // `9711 < 9689` was never true, the walking branch never ran,
                // and animals stood still. WIRED 2026-09-22.
                onFinishBucketAssign: (a1, a2, a3, a4, a5, a6) => computeLegacySubsystemPairScore(
                  this.legacySubsystemScoreInput(slot), a1, a2, a3, a4, a5, a6,
                ),
                onAi: () => stepLegacySubsystemAi({
                  state: this.denseState,
                  packedBytes: this.packedBytes,
                  packedOffsets: this.packedOffsets,
                  slot,
                  sceneQ: this.game.qByte,
                  randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
                  x: { get value() { return game.subsystemX; }, set value(v: number) { game.subsystemX = v; } },
                }),
              });
            },
          });
          stepLegacySubsystemAh({
            state: this.denseState,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            gridC: this.gridC,
            slot,
          });
        } catch {
          // Matches b.h()'s own confirmed exception table.
        }
      },
    });
    // Offset 604 resets v:I for the animal loop, which leaves it at 22.
    this.game.subsystemV = 22;
    const tail = {
      lByte: this.subsystemArrays.bField32,
      kByte: this.subsystemArrays.bField28,
    };
    // b.i()'s post-loop t()/u()/v() (offsets 397..432). RETRACTED
    // 2026-09-23: these were left unwired on the premise that u()/v()'s
    // c(boolean) calls throw on a permanently-null b:[S] (#132); that field
    // is saveOffsets and is live. Ported as LegacySubsystemT/U/V.ts.
    stepLegacySubsystemI({
      state: this.denseState,
      bBytes: this.packedBytes,
      bShorts: this.packedOffsets,
      frame: this.game.c,
      q: this.game.qByte,
      tail,
      onT: () => this.subsystemT(),
      onU: () => this.missionScriptU(),
      onV: () => this.missionScriptV(),
      setV: (v) => { this.game.subsystemV = v; },
      // Wired 2026-09-27: i() offset 347, aj() offsets 113/209 call
      // f.c(int,int,int,int) (the repaint), am() offset 285 a(int,byte).
      onRepairCell: (x, y, width, height) => this.repaintRect(x, y, width, height),
      onAj: (index) => {
        stepLegacySubsystemAj({
          state: this.denseState,
          bBytes: this.packedBytes,
          bShorts: this.packedOffsets,
          index,
          onCellUpdate: (x, y, width, height) => this.repaintRect(x, y, width, height),
          onAm: () => {
            stepLegacySubsystemAm({
              state: this.denseState,
              bBytes: this.packedBytes,
              bShorts: this.packedOffsets,
              aM: index,
              fields: liveView<{ u: number; v: number }>(this.game, { u: "subsystemU", v: "subsystemV" }),
              onEntityAction: (id, type) => { this.changeEntityType(id, type); },
              onN: (id, team) => { this.stepSubsystemN(id, team); },
            });
          },
        });
      },
      // b.ak(): the win/lose check. `u` is f.u:B (game.uByte), NOT b.u:I --
      // CORRECTED 2026-09-24 (it never started the countdown).
      onAk: () => {
        stepLegacySubsystemAk(Object.assign(
          liveView<{ u: number; fByte: number }>(this.game, { u: "uByte", fByte: "subsystemGFFlagByte" }),
          {
            q: this.game.qByte,
            dense: this.denseState,
            shortRows: this.mainArrays.aShort,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            onMapSession: () => this.stepLegacyC(),
          },
        ));
      },
      onAl: () => {
        const alState = {
          pByte: this.game.persistedPByte,
          q: this.game.qByte,
          bG: this.subsystemArrays.bgByte,
          bF: this.game.subsystemGFFlagByte,
          fK: this.game.kFlag,
          fF: this.game.entityFocusFlag,
          // al() reads f.N:Z (outerLoopNFlag) -- CORRECTED 2026-09-14, was nFlag.
          fN: this.game.outerLoopNFlag,
          J: this.subsystemArrays.bJByte,
          cByte: this.game.c,
          aQ: this.subsystemArrays.bAQ,
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          shortRows: this.mainArrays.aShort,
          onSubsystemAction: (first: number, second: number, mode: number) => {
            // b.al() invokes b(0,0,3).  This is the same b.b(III) queue
            // already used by the f.aP(second == -2) path; the bytecode
            // proves firstFlag=false for this call site.
            if (mode !== 3) return;
            selectLegacyAuxiliaryCandidates({
              p: this.auxiliaryScratch,
              dense: this.denseState,
              shortRows: this.mainArrays.aShort,
            }, this.auxiliaryQueueState, first, second, mode);
          },
          onStateCommand: (value: number) => {
            this.stepSubsystemStateCommand(value);
          },
        };
        stepLegacySubsystemAl(alState);
        this.subsystemArrays.bgByte = alState.bG;
        this.subsystemArrays.bJByte = alState.J;
        this.subsystemArrays.bAQ = alState.aQ;
      },
      // b.i() calls b.j() after its ak/al gates. The raw b.j() table
      // reconstruction is already ported; keep this confirmed call live
      // while b.ak()/b.al() remain explicit callback seams.
      onJ: () => { this.runSubsystemJ(this.game.qByte); },
      // b.i()'s own tail: b.b(0,0,3) -- the exact same b.b(III) queue
      // onAl's onSubsystemAction above already wires (same reasoning:
      // firstFlag=false, mode=3). f.b(int) is runSceneDispatch, already
      // ported/wired elsewhere (onBByte) -- confirmed same target via
      // matching bytecode offsets (17347..17572).
      onSubsystemB: (first, second, mode) => {
        if (mode !== 3) return;
        selectLegacyAuxiliaryCandidates({
          p: this.auxiliaryScratch,
          dense: this.denseState,
          shortRows: this.mainArrays.aShort,
        }, this.auxiliaryQueueState, first, second, mode);
      },
      onFByte: (value) => { this.runSceneDispatch(value); },
    });
    this.subsystemArrays.bField32 = tail.lByte;
  }

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
  private entityCostInput(v: number) {
    return {
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      team: this.game.subsystemU,
      v,
      pool: this.mainArrays.aShort,
      dShort: this.subsystemArrays.dShort,
      scratch: { V: 0, W: 0 },
      onNotify: () => this.runByteActionQueue(9, 0, 0, 0),
      R: (() => { const g = this.game; return { get value() { return g.subsystemR; }, set value(v: number) { g.subsystemR = v; } }; })(),
    };
  }

  private payEntityCost(type: number, flag: boolean, w: number, v: number): boolean {
    const g = this.game;
    return stepLegacyEntityPayCost(this.entityCostInput(v), {
      gRows: this.subsystemArrays.gRows,
      f: { get value() { return g.subsystemFFlag; }, set value(next: boolean) { g.subsystemFFlag = next; } },
      onM: () => stepLegacyEntityMUpdate({
        state: this.denseState,
        entityId: w,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        raw: { get R() { return g.subsystemR; }, set R(value: number) { g.subsystemR = value; } },
        onChangeType: (id, newType) => { this.changeEntityType(id, newType); },
        randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      }),
      onN: () => this.stepSubsystemN(w, g.subsystemU),
      onRecordFinish: (record) => this.completeEntityRecord(record),
    }, type, flag, w);
  }

  /** `private boolean b(int,int)` (#347) for unit `id` -- LegacyEntitySkillGain.ts. */
  private gainEntitySlotSkills(id: number, kind: number, level: number): boolean {
    return stepLegacyEntitySlotSkillGain({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      id,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
    }, kind, level);
  }

  /** `private boolean a(byte,byte,byte,byte)` (#293) for unit `id` -- LegacyEntitySkillGain.ts. */
  private gainEntitySkill(id: number, attr: number, chance: number, cap: number, step: number): boolean {
    return stepLegacyEntitySkillGain({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      id,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
    }, attr, chance, cap, step);
  }

  /** private void an() (#321) for unit `id`. */
  private stepSubsystemAnFor(id: number): void {
    stepLegacySubsystemAn({
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      grid: this.gridC,
      id,
      onOccupantCheck: (occupant) => checkLegacyEntityOccupant({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        id,
      }, occupant),
      onBBoolean: () => this.subsystemBBoolean(id, false),
      onRawAction: (rawId, action) => { this.changeEntityType(rawId, action); },
      // private void N() -- derived 2026-08-21, see LegacySubsystemN.ts's
      // own docblock. g(int)/O() reuse the already-ported/wired
      // subsystemG/stepLegacySubsystemO* chain (same shape as the other
      // real N() caller, f.am()'s own onN, below).
      onN: () => this.stepSubsystemN(id, this.game.subsystemU),
      onGroupMode: (mode) => this.subsystemG(id, mode),
      // The gate (#270, ~1900 instructions) -- restored 2026-09-07 (see
      // LegacySpiralPlacementGate.ts's own docblock). an()'s call site
      // uses mode=0/scanLimit=19 (both literal constants in the original
      // bytecode); every known caller including this one discards the
      // boolean result. an()'s own bytecode has no local catch around
      // this call, so -- matching the original -- none is added here
      // either; a real out-of-range table-53 read propagates up the same
      // call chain the original's NPE/AIOOBE would have.
      onLargeGate: (x, y) => {
        this.checkSpiralPlacementGate(0, 19, x, y, id, (occupant) => checkLegacyEntityOccupant({
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          id,
        }, occupant));
      },
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
    });
  }

  /**
   * b.l(int) (#399, bytecode/b-javap.txt 33922, offsets 0..340): take animal
   * `a` off the map -- free the step cell it reserved (-128) while less than
   * half way through a step, clear its own cell and e[9513+a], and count its
   * species f.t[e[9469+a]] down when that index is below t202[q]. Ported
   * 2026-09-27 for vacate (kind 106) and b.l()/b.m()'s 22-animal pass.
   * Offset 20 compares e[9623+a] unmasked (the load rebuild masks it).
   */
  private removeAnimal(a: number): void {
    const e = this.denseState;
    const t = (row: number, index: number) => this.packedBytes[(this.packedOffsets[row] ?? 0) + index] ?? 0;
    const c = this.gridC;
    const dir = e[9491 + a] ?? 0;
    if (((e[9557 + a] ?? 0) & 255) <= 7 &&
        (e[9623 + a] ?? 0) < Math.trunc((t(15, (dir & 1) * 9 + t(179, e[9535 + a] ?? 0)) + 1) / 2)) {
      const ny = (e[9381 + a] ?? 0) + t(1, 8 + dir);
      const nx = (e[9359 + a] ?? 0) + t(1, dir);
      if (c[ny]?.[nx] === -128) c[ny]![nx] = 0;
    }
    const row = c[e[9381 + a] ?? 0];
    if (row) row[e[9359 + a] ?? 0] = 0;
    e[9513 + a] = 0;
    const species = e[9469 + a] ?? 0;
    if (species < t(202, this.game.qByte)) {
      const counts = this.game.subsystemT; // f.t:[B (#368)
      counts[species] = counts[species]! - 1;
    }
  }

  /**
   * b.a(int,int,int) (#266) -- LegacySubsystemEntityOccupancyCheck.ts, with
   * its q:B/r:B (#212/#215) writes landing in subsystemArrays for d(int).
   */
  private occupancyCheck(id: number, x: number, y: number, arg3: number): number {
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
  private allocateEffectSlot(target: number, kind: number, offset: number, frame: number): void {
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
  private placeGroundSlot(kind: number, x: number, y: number, amount: number): number {
    return allocateLegacySpecialTile(this.denseState, (cx, cy, value) => {
      const row = this.gridC[cy];
      if (row && cx >= 0 && cx < row.length) row[cx] = value;
    }, { type: kind, x, y, parameter: amount });
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
  private vacateEntity(kind: number, x: number, y: number, id: number): void {
    const arrays = this.subsystemArrays;
    void arrays;
    const game = this.game;
    stepLegacyEntityVacate({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortRows: this.mainArrays.aShort,
      xSlots: game.xSlotTable,
      v: game.subsystemV,
      fQ: game.qByte,
      scratch: {
        get subsystemGFFlagByte() { return game.subsystemGFFlagByte; },
        set subsystemGFFlagByte(value: number) { game.subsystemGFFlagByte = value; },
      },
      onByteAction: (action, ax, ay, target) => this.runByteActionQueue(action, ax, ay, target),
      onL: (animal) => this.removeAnimal(animal),
      onSpatialAction: (mode, ax, ay, value) => { this.placeGroundSlot(mode, ax, ay, value); },
      onRectMark: (rx, ry, width, height) => this.repaintRect(rx, ry, width, height),
      onFinalizeEntity: (target) => { this.finalizeEntity(target); },
      onEntityRemoval: (target, flag) => { this.stepEntityRemoval(target, flag); },
      onAuxiliary: (first, second, third) => {
        selectLegacyAuxiliaryCandidates({
          p: this.auxiliaryScratch,
          dense: this.denseState,
          shortRows: this.mainArrays.aShort,
        }, this.auxiliaryQueueState, first, second, third);
      },
      onSceneDispatch: (value) => { this.runSceneDispatch(value); },
    }, kind, x, y, id);
  }

  /**
   * `private void m(int)` (#400) for unit `id` -- LegacyEntityDeathCleanup.ts,
   * the corpse cleanup `a()`'s dying branch runs once the death animation ends.
   */
  private entityDeathCleanup(id: number): void {
    stepLegacyEntityDeathCleanup({
      state: this.denseState,
      gridC: this.gridC,
      saveOffsets: this.saveOffsets,
      shortRows: this.mainArrays.aShort,
      onD: (target, argument) => this.subsystemD(target, argument),
    }, id);
  }

  /** `private boolean a(int,int)` (#294) for unit `id` -- LegacyEntityHealthDelta.ts. */
  private entityHealthDelta(id: number, delta: number): boolean {
    return stepLegacyEntityHealthDelta({
      state: this.denseState,
      team: this.game.subsystemU,
      cBytes: this.resourceTables.rowFByte,
    }, id, delta);
  }

  /** `private boolean k()` (#396) for unit `id` -- LegacyEntityKPredicate.ts. */
  private stepEntityKPredicate(id: number, team: number): boolean {
    const arrays = this.subsystemArrays;
    return stepLegacyEntityKPredicate({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      gridC: this.gridC,
      id,
      flags: {
        get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
        get b() { return arrays.bField137; }, set b(value: boolean) { arrays.bField137 = value; },
      },
      onP: () => this.subsystemMarkerScan(id, team),
      // b.f(boolean) (#382), WIRED 2026-09-22 -- the armoury order loop: a
      // type-26 unit banks the finished item into the tribe's pool, a
      // type-27 one puts it on the ground as a negative grid marker (the
      // trap). See LegacyEntityProduceItem.ts.
      onF: (flag) => this.entityProduceItem(id, team, flag),
      // b.ao() (#322) -- ported 2026-09-21 as part of the r()/ap()/ao() chain
      // (LegacyEntityRecordRecovery.ts); this stub was simply left behind.
      onAo: () => stepLegacyEntityAo({
        state: this.denseState,
        v: id,
        team,
        slotTable: this.game.xSlotTable,
      }),
      // b.L() (#248), WIRED 2026-09-22 -- handing a type-50 unit a weapon.
      onL: () => stepLegacyEntityEquipIssue({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        v: id,
        pools: this.mainArrays.aShort,
        team,
        onRecordCompletion: (record) => this.completeEntityRecord(record),
      }),
      onO: () => this.subsystemPrivateO(id),
      onD: (unit, argument) => this.subsystemD(unit, argument),
      // b.c(byte) (#363), WIRED 2026-09-22 -- the balloon carrying a villager
      // off into the other tribe. All four f-side callees are wired too:
      // f.e(int) #377 and f.b(byte) #348 / f.g(int) #386 were already ported
      // (releaseEntitySelection, indexLegacyEntityRecord,
      // initializeLegacyEntityRecord); f.f(int) #383 is new
      // (LegacyEntitySelectionDrop.ts).
      onCByte: (record) => stepLegacyEntityAbduction({
        state: this.denseState,
        saveOffsets: this.saveOffsets,
        routes: this.subsystemArrays.a,
        pools: this.mainArrays.aShort,
        gridC: this.gridC,
        team,
        fields: liveView<{ R: number; S: number }>(this.game, { R: "subsystemR", S: "subsystemS" }),
        chief: this.mainArrays.aShort[0]?.[17] ?? 0,
        onVictimE: (victim) => { this.releaseEntitySelection(victim); },
        onVictimF: (victim) => stepLegacyEntitySelectionDrop({
          state: this.denseState,
          qCounter: this.game.qCounter,
          game: this.game,
          onSelectionRefresh: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
        }, victim),
        onRegister: (copy) => indexLegacyEntityRecord(this.entityRecordLifecycleInput(), copy),
        onRefresh: (copy) => initializeLegacyEntityRecord(this.entityRecordLifecycleInput(), copy),
        onMoveTrigger: (action, moveId, id2) => this.entityMove(action, moveId, id2),
      }, record),
      onVacate: (kind, x, y, target) => this.vacateEntity(kind, x, y, target),
      onNeeds: () => this.checkEntityNeeds(id),
      onChangeType: (unit, type) => { this.changeEntityType(unit, type); },
      onBBoolean: (flag) => this.subsystemBBoolean(id, flag),
      onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
        state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
        team, entityId: id, kind,
      }),
      onGroupMode: (argument) => this.subsystemG(id, argument),
    });
  }

  /** `private boolean o()` (#406) for unit `id` -- LegacySubsystemNPrivateO.ts. */
  private subsystemPrivateO(id: number): boolean {
      const jRows = this.packedData?.byteTables;
      if (!jRows) return false;
      const arrays = this.subsystemArrays;
      const game = this.game;
      return stepLegacySubsystemNPrivateO({
    state: this.denseState,
    id,
    cRows: this.subsystemArrays.cRows,
    gridC: this.gridC,
    jRows,
    // b.x:I (#230) lives on `game` as subsystemX, not on subsystemArrays;
    // o() writes it and at()/g()/ab()/i(int) read it, so it round-trips.
    scratch: {
      get bField10(): number { return arrays.bField10; },
      set bField10(v: number) { arrays.bField10 = v; },
      get x(): number { return game.subsystemX; },
      set x(v: number) { game.subsystemX = v; },
    },
    onAction: (rawId, action) => { this.changeEntityType(rawId, action); },
    onN: () => this.stepSubsystemN(id, this.game.subsystemU),
    onGroupMode: (targetId, argument) => this.subsystemG(targetId, argument),
    onD: (targetId, argument) => this.subsystemD(targetId, argument),
    // f's own `final void a(int,boolean)` (b's constant pool #286,
    // f-javap.txt:20621..20766) -- WIRED 2026-09-20. It was left unwired as
    // "undocumented", but it is the same method already ported as
    // `filterEntityLifecycle` (`filterLegacyEntityLifecycle` +
    // `transferLegacyEntityAction`) and wired at b.g()'s and v()'s own call
    // sites. o() calls it as `f.a(c[5][x], true)` right after the couple
    // claims the hut, to move that record's listed units out of the way.
    onEntityLinkTrigger: (record, flag) =>
      this.filterEntityLifecycle(record, flag, (row, column) => this.gridC[row]?.[column] ?? 0),
      });
  }

  /** `private boolean n()` (#402) for unit `id`: an idle adult's needs. */
  private checkEntityNeeds(id: number): boolean {
    const entityAt = (row: number, column: number): number => this.gridC[row]?.[column] ?? id;
    const subsystemArrays = this.subsystemArrays;
    const gameState = this.game;
    return this.subsystemNOrchestrator({
      q: this.game.qByte,
      N: this.game.outerLoopNFlag,
      L: this.game.outerLoopLFlag,
      u: this.game.subsystemU,
      v: id,
      entityAt,
      onO: () => this.subsystemPrivateO(id),
      // private boolean a(boolean) (#295), wired 2026-09-15.
      onAFalse: () => this.entityCourtship(id, false),
      onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
        state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
        team: this.game.subsystemU, entityId: id, kind,
      }),
      onGroupMode: (argument) => this.subsystemG(id, argument),
      onMove: () => this.entityMove(1, id, id),
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      // n()'s onEntityActionSearch === private boolean a(int,byte)
      // (dispatchLegacyEntityAction). Fixed 2026-08-22: this used to
      // call the nearest-building search directly and treat its boolean as
      // the final answer, bypassing dispatchLegacyEntityAction entirely
      // -- changeEntityType(id,87)/subsystemG(id,1) never fired on a
      // found target. n()'s own (action, parameter) args map to
      // a(int,byte)'s (arg1, arg2): arg1 is the nearest-target search's
      // own `target`, arg2 is the byte threaded through to onMove. See
      // docs/unknowns.md's 2026-08-21 entry for the full derivation.
      onEntityActionSearch: (target, moveAction) => dispatchLegacyEntityAction({
        state: this.denseState,
        id,
        action: moveAction,
        targetSearch: () => {
          const out = { h: false };
          const selected = stepLegacySubsystemNearestBuilding({
            state: this.denseState,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            team: this.game.subsystemU,
            entityId: id,
            kind: target,
          }, {}, out);
          return { selected, found: out.h };
        },
        entityAt,
        onAction: (rawId, act) => { this.changeEntityType(rawId, act); },
        onMode: (mode) => this.subsystemG(id, mode),
        onMove: (act, moveId) => this.entityMove(act, moveId, moveId),
      }),
      // b.n()'s own onRawAction/onQueue (offsets ~809/829, invoke
      // #275/#253) -- the SAME two real methods subsystemB's own
      // onRawAction/onQueue below already target (changeEntityType/
      // selectEntityTypeAfterQ), confirmed via direct bytecode read,
      // not just the shared "87" literal.
      onRawAction: (rawId, action) => { this.changeEntityType(rawId, action); },
      onQueue: () => this.selectEntityTypeAfterQ(id),
    });
  }

  private stepEntityDecisionCheck(id: number): boolean {
    const entityAt = (row: number, column: number): number =>
      this.gridC[row]?.[column] ?? id;
    // b.o() (LegacySubsystemNPrivateO.ts) -- RETRACTED 2026-09-07: b.c:[[B]
    // (#143) was believed permanently null; it is not (f.g()-allocated,
    // this port's LegacySubsystemArrays.cRows). Fully ported; see that
    // file's own docblock for the full derivation.
    const privateO = (): boolean => this.subsystemPrivateO(id);
    return this.subsystemB({
      frame: this.game.c,
      id,
      team: this.game.subsystemU,
      B: () => this.subsystemArrays.bField8,
      fN: this.game.outerLoopNFlag,
      fL: this.game.outerLoopLFlag,
      // BUG FIX (2026-09-10): was `this.game.qByte` (f.q:B #357). b() offset
      // 668 reads class b's own Q:B (#46), already tracked as
      // game.subsystemBQByte -- a different field that happens to share the
      // letter, the trap this project keeps hitting.
      fQ: this.game.subsystemBQByte,
      // b() offsets 884/919 read b.m:B (#202) -- CORRECTED 2026-09-14, was
      // the never-written subsystemModeByte.
      m: () => this.game.subsystemMByte,
      // b()'s onA (private void A()) -- see subsystemEntityAAlert's own docblock.
      onA: () => this.subsystemEntityAAlert(id),
      onOther: () => { privateO(); },
      // b() offset 231: private boolean m() (#401), the rally walk for
      // CALL TO ARMS / FORM UP. Wired 2026-10-02 (was never called).
      onM: () => stepLegacySubsystemBM({
        state: this.denseState,
        gridC: this.gridC,
        team: this.game.subsystemU,
        id,
        Q: this.game.subsystemBQByte,
        fN: this.game.outerLoopNFlag,
        fC: this.game.c,
        fQ: this.game.outerLoopRowEndMarker,
        onChangeType: (target, type) => { this.changeEntityType(target, type); },
        onNearestBuilding: (kind) => stepLegacySubsystemNearestBuilding({
          state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
          team: this.game.subsystemU, entityId: id, kind,
        }),
      }),
      // b() offset 1343: N() (#250). CORRECTED 2026-09-15: this slot held n() (#402).
      onN: () => this.stepSubsystemN(id, this.game.subsystemU),
      // b() offset 610: private boolean n() (#402), the idle adult's needs.
      onNeeds: () => { this.checkEntityNeeds(id); },
      // b()'s onAn -- private void an() (offsets 0..396). See
      // LegacySubsystemAn.ts's own docblock for the full chain.
      onAn: () => this.stepSubsystemAnFor(id),
      // onEntityTransform (b.a(int,int,boolean)): RETRACTED-PREMISE, FULLY
      // PORTED 2026-09-07 -- see subsystemEntityTransform's own docblock.
      // stepLegacySubsystemBDecision discards the (void) result and calls
      // onQueue right after, unconditionally -- matches the real
      // bytecode's own `a(x,y,true)` followed directly by `Q()`.
      onEntityTransform: (x, y, flag) => { this.subsystemEntityTransform(id, x, y, flag); },
      // b.Q(): reads state[1414+v], picks type 69 or 17, delegates to the
      // SAME b.a(int,byte) type-change side effects onRawAction uses below
      // (confirmed via bytecode: both invoke #275).
      onQueue: () => this.selectEntityTypeAfterQ(id),
      // b.a(int,byte) (void-returning, offset 5985..6092): clears #404,
      // writes the type (#2828) and low mode nibble (#1111&15) -- already
      // ported as changeEntityType/LegacyEntityTypeChange.ts, just never
      // wired to a live caller until now.
      onRawAction: (rawId, action) => { this.changeEntityType(rawId, action); },
      // b.b(boolean): real closest-candidate scan, fully rederived
      // 2026-09-07 -- see LegacySubsystemBBoolean.ts's own docblock.
      onBBoolean: (value) => this.subsystemBBoolean(id, value),
      // b.g(int): wired via subsystemG (see its own docblock) -- onD is
      // real now (subsystemD); onU/onCalculateM/readL/onQ/onAByteIntInt/
      // onH remain inert within it.
      onGroupMode: (mode) => this.subsystemG(id, mode),
      // BUG FIX (2026-09-10): this was a gridC lookup. b() offsets 1346..1375
      // are `z:I = a(e[0+v], e[101+v], 0)` -- `a(III)I` (#266), the same
      // occupancy helper already ported as
      // stepLegacySubsystemEntityOccupancyCheck -- and offsets 1423..1434 then
      // gate on `z:I / 10 <= B:I`. The result is also STORED in z:I (#234,
      // game.subsystemEntityZ), which b.u()'s own cancel-gate reads back
      // (LegacySubsystemEntityUpdateTail.ts, offsets 49..57), so the write has
      // to persist, not just feed this comparison. gridC is gate 4's lookup
      // (`entityAt` below), not this one.
      onCellValue: (x, y, layer) => {
    const z = this.occupancyCheck(id, x, y, layer);
    this.game.subsystemEntityZ = z;
    return z;
      },
      entityAt,
      // b()'s offset-1291 `q()` (#411), wired 2026-09-21 --
      // LegacyEntityRecordDoorRetarget.ts. `p:B`(#208) and `n:B`(#204) are
      // class b's shared scratch, but every ported reader (o(), Y(), q())
      // assigns them before reading, so a per-call object is equivalent here.
      // `r()` (#412) is wired as well -- see subsystemRecordRecovery below.
      onQ: () => stepLegacyEntityRecordDoorRetarget({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        saveOffsets: this.saveOffsets,
        v: id,
        bValue: this.subsystemArrays.bField8,
        scratch: { p: 0, n: 0 },
        onOccupancy: (x, y, mode) => this.occupancyCheck(id, x, y, mode),
        onBVoid: (flag) => this.subsystemBVoid(id, flag),
        onChangeType: (target, type) => { this.changeEntityType(target, type); },
        onIUpdate: (argument) => this.stepEntityIUpdate(id, argument, this.game.subsystemU),
        onP: () => this.stepSubsystemP(id),
        onQ: () => this.selectEntityTypeAfterQ(id),
        onLinkByte: (target, value) => {
          writeLegacyEntityLinkByte({
            state: this.denseState,
            entityId: target,
            value,
            bCube: this.game.xSlotTable,
          });
        },
        onR: () => this.subsystemRecordRecovery(id),
      }),
      // b()'s onP -- private void p() (offsets 0..1906). Wired 2026-08-21;
      // see stepSubsystemP's own docblock for the qByte/fByte scratch-field
      // caveat.
      onP: () => this.stepSubsystemP(id),
    });
  }

  /** Raw b.k() decision; the caller supplies the original b-side fields. */
  subsystemDecision(fields: {
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
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Exact deterministic prefix of b.n(); later action branches remain separate ports. */
  subsystemNGate(fields: {
    readonly q: number;
    readonly N: boolean;
    readonly L: boolean;
    readonly u: number;
    readonly v: number;
  }): boolean {
    return legacySubsystemNGate({ ...fields, state: this.denseState });
  }

  /** Bytecode-backed b.n() decision prefix; b.c[][] lookup and private callees stay injectable. */
  subsystemNDecision(
    fields: Omit<LegacySubsystemNDecisionInput, "state" | "packedBytes" | "packedOffsets">,
  ): boolean {
    return stepLegacySubsystemNDecision({
      ...fields,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Bytecode-order b.n() entry composition; private O()/a(false) remain callbacks. */
  subsystemNOrchestrator(
    fields: Omit<LegacySubsystemNOrchestratorInput, "state" | "packedBytes" | "packedOffsets">,
  ): boolean {
    return stepLegacySubsystemNOrchestrator({
      ...fields,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Exact b() continuation after its private n() call; unresolved b-side callees remain callbacks. */
  subsystemBDecision(
    fields: Omit<LegacySubsystemBDecisionInput, "state" | "packedBytes" | "packedOffsets">,
  ): boolean {
    return stepLegacySubsystemBDecision({
      ...fields,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /**
   * Exact private boolean b(boolean) -- fully rederived 2026-09-07, see
   * LegacySubsystemBBoolean.ts's own docblock. `onC` (`c(byte)` #360) is
   * left unwired -- that callee is a separate, unexamined method (see that
   * file's docblock). `onG` wires the real `g(2)` call through the
   * already-ported `subsystemG`.
   */
  subsystemBBoolean(id: number, arg: boolean): boolean {
    return stepLegacySubsystemBBoolean({
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      arrays: this.subsystemArrays,
      v: id,
      arg,
      onG: () => this.subsystemG(id, 2),
      // private boolean c(byte) (#360), wired 2026-09-21 together with the
      // b.i() stage fix that finally gives `9933 + slot` real values: it is
      // the "does this bush still look harvestable?" test b(boolean) asks
      // about every resource-node slot it scans. See LegacyResourceNodeGate.ts.
      onC: (value) => checkLegacyResourceNodeGate({
        state: this.denseState,
        packedBytes: this.packedBytes,
        tableOffsets: this.packedOffsets,
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
  private subsystemEntityLoopTail(id: number, team: number): void {
    const game = this.game;
    const dense = this.denseState;
    const type = dense[2828 + id] ?? 0;
    const arrays = this.subsystemArrays;
    arrays.bField137 = true; // b:Z, offset 328
    if ((dense[5050 + id] ?? 0) === 0 && (dense[1414 + id] ?? 0) >= 12 && type !== 50 && type !== 105) {
      const t = (row: number, index: number) => this.packedBytes[(this.packedOffsets[row] ?? 0) + index] ?? 0;
      // Offsets 404..513: an ordered unit (6161 != 0) on a turn its team does not own still counts
      // only when it is a walking (1) unit at the end of its route, crowded (z/10 > B) and busy.
      const order = dense[6161 + id] ?? 0;
      let a = true;
      if (order !== 0 && (game.subsystemGCurrentI & (team + 1)) === 0) {
        a = order === 1 &&
          (dense[808 + id] ?? 0) <= (dense[707 + id] ?? 0) &&
          Math.trunc(game.subsystemEntityZ / 10) > this.subsystemArrays.bField8 &&
          ((dense[2929 + id] ?? 0) & 255) > 7;
      }
      // Offsets 516..609: off its own cell, only a kind-16 worker with a live 6565 slot.
      if (a && (this.gridC[dense[101 + id] ?? 0]?.[dense[id] ?? 0] ?? 0) !== id) {
        a = t(41, type) === 16 && t(18, dense[6565 + id] ?? 0) > 0;
      }
      // Offsets 612..676: not while 7979 bit 1 is set; a child (type <= 9) only if t27 bit 2 is clear.
      if (a) a = ((dense[7979 + id] ?? 0) & 2) === 0 && (type > 9 || (t(27, type) & 4) === 0);
      arrays.bField73 = a; // a:Z, offset 684
      arrays.bField137 = false; // b:Z, offset 689
      // p()'s boolean result is popped (offset 696).
      this.subsystemMarkerScan(id, team);
    }

    const tailInput = {
      state: dense,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      id,
      team,
      onN: () => this.stepSubsystemN(id, team),
      onF: () => this.entityMoveCancel(id),
      // f.c(x,y,1,1) (#357) -- the dirty-rectangle repaint, WIRED 2026-09-23.
      onMarkVisible: (x: number, y: number, w: number, h: number) => this.repaintRect(x, y, w, h),
      // z and R live: onP -> p() -> N() writes z (entityAp) and can write
      // R (the #270 gate's mode 7). FIXED 2026-09-23 (were snapshots).
      z: { get value() { return game.subsystemEntityZ; }, set value(v: number) { game.subsystemEntityZ = v; } },
      bValue: this.subsystemArrays.bField8,
      // Offsets 337..345 decrement `R:B`(#48), not `Q:B`(#46) -- see the
      // 2026-09-10 correction in LegacySubsystemEntityUpdateTail.ts.
      rByte: { get value() { return game.subsystemRByte; }, set value(v: number) { game.subsystemRByte = v; } },
      scalars: this.subsystemArrays,
      // c()'s (#356) own inputs, restored 2026-09-10 along with the method
      // itself -- see LegacySubsystemEntityPathStep.ts's retraction note.
      route: this.subsystemArrays.a,
      saveOffsets: this.saveOffsets,
      visibilityBits: this.mainArrays.aInt,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      fogClass: (x: number, y: number) => this.occupancyClass(x, y),
      onP: () => this.stepSubsystemP(id),
      // `private void a(byte)` (#285), c()'s offset-594 friendly-unit
      // displacement -- ported 2026-09-14, see LegacySubsystemEntityDisplace.ts.
      // Its two callees run for the OCCUPANT (the original switches v:I to it
      // at offset 11), so both receive that id rather than `id`.
      onDisplace: (occupant: number) => stepLegacySubsystemEntityDisplace({
        state: dense,
        id,
        gridC: this.gridC,
        scalars: this.subsystemArrays,
        onActionCommit: (target, actionCode) => {
          const jRows = this.packedData?.byteTables;
          if (!jRows) return false;
          return stepLegacyEntityActionCommit({
            state: dense,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            gridC: this.gridC,
            jRows,
            entityId: target,
            actionCode,
            allowRestart: false,
            onChangeType: (targetId, type) => { this.changeEntityType(targetId, type); },
            onIUpdate: (arg) => this.stepEntityIUpdate(target, arg, target <= 50 ? 0 : 1),
          });
        },
        onMoveApply: (target) => stepLegacySubsystemEntityMoveApply({
          state: dense,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          gridC: this.gridC,
          id: target,
          onF: () => this.entityMoveCancel(target),
        }),
      }, occupant),
    };
    stepLegacySubsystemEntityUpdateTail(tailInput);

    if ((dense[5959 + id] ?? 0) > 0) {
      stepLegacySubsystemEntityPaceAccum({
        state: dense,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        id,
        team,
        randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
        onQueueAction: (...args) => { this.entityStrikeGate(id, ...args); },
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
   * 3 rows, needs 4) that predated this change and was flagged separately
   * at the time. **MOOT as of 2026-08-31**: `queueLegacyAuxiliary` was a
   * chimera of `b(III)` and `c(boolean)` and has been deleted -- see
   * `LegacyAuxiliaryQueue.ts`'s history docblock -- so this specific
   * `gRows` sizing complaint no longer applies to any live call path.)
   */
  private subsystemUnitTraining(team: number): void {
    stepLegacySubsystemUnitTraining({
      state: this.denseState,
      team,
      mainShort: this.mainArrays.aShort,
      // t[a_s[275 + f.b] + f.q] and t[a_s[212 + f.b] + f.q] (f.b:B, levelBByte, picks the row).
      // CORRECTED 2026-10-14: both added the never-written subsystemModeByte to the row's offset.
      populationThreshold: this.packedBytes[
        (this.packedOffsets[275 + this.game.levelBByte] ?? 0) + this.game.qByte
      ] ?? 0,
      teamOneFlags: Math.trunc(
        (this.packedBytes[
          (this.packedOffsets[212 + this.game.levelBByte] ?? 0) + this.game.qByte
        ] ?? 0) / 4,
      ),
      sceneGateActive: this.game.qByte === 3,
      subsystemQByte: this.game.subsystemBQByte,
      isInView: (x, y) =>
        x >= this.game.IByte - 1 && x <= this.game.IByte + this.game.viewportO &&
        y >= this.game.KByte - 1 && y <= this.game.KByte + this.game.viewportP,
      onG: (newEntityId) => stepLegacySubsystemEntityTrainingSlot({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        entityId: newEntityId,
        randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
        fields: liveView<{ x: number; y: number }>(this.game, { x: "subsystemX", y: "subsystemY" }),
        owners: this.subsystemArrays.i,
      }),
      allocateRecord: (allocTeam, x, y, type, flags) =>
        this.allocateRecord(this.gridC, allocTeam, x, y, type, flags, this.recordOptions()),
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
   * SAME already-tracked `game.subsystemU` field this project's
   * `changeEntityType`/`subsystemNOrchestrator` wiring already reads as
   * "team" -- confirmed via those call sites, not re-derived), and for
   * each slot whose type matches (`dense[8749+s]===11`) or when `arg` is
   * true, walks a linked list (`dense[8993+s]`, chained via
   * `dense[4545+t]`) looking for the current entity id (`v:I`, the SAME
   * `id` this whole call chain already threads through). On a match,
   * marks the entity as associated with that slot (dense 4444/4747) and
   * syncs its position from the raw x/y fields (dense 3131/3232 <-
   * 0/101). Fully self-contained -- no further private calls.
   */
  private subsystemBVoid(id: number, arg: boolean): void {
    const dense = this.denseState;
    const team = this.game.subsystemU;
    for (let s = team * 30 + 1; s <= (team + 1) * 30; s += 1) {
      if ((dense[8749 + s] ?? 0) === 11 || arg) {
        if ((dense[8932 + s] ?? 0) >= 1) {
          let t = dense[8993 + s] ?? 0;
          while (t > 0) {
            if (t === id) {
              dense[4444 + id] = s;
              dense[4747 + id] = -s;
              dense[3131 + id] = dense[0 + id] ?? 0;
              dense[3232 + id] = dense[101 + id] ?? 0;
              return;
            }
            t = dense[4545 + t] ?? 0;
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
   *    stack-traced bytecode shows this is a NESTED lookup, not a sum of
   *    four terms -- `packedBytes[packedOffsets[173] +
   *    packedBytes[packedOffsets[174] + dense[8749+assoc]] +
   *    dense[4646+id]]` (176/177 mirrors this exactly), confirmed by a
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
  private subsystemU(id: number): void {
    const dense = this.denseState;
    this.subsystemBVoid(id, true);

    const assoc = dense[4444 + id] ?? 0;
    if ((dense[4646 + id] ?? 0) === 1) {
      if ((dense[8749 + assoc] ?? 0) === 8 && (dense[8627 + assoc] ?? 0) === 0) {
        const owner = dense[8810 + assoc] ?? 0;
        dense[2828 + owner] = 57;
        dense[2929 + owner] = 105;
        dense[3030 + owner] = 0;
      }
    }

    let useTable176 = false;
    if ((dense[1414 + id] ?? 0) >= 12 && (dense[8749 + assoc] ?? 0) < 12) {
      if ((dense[8627 + assoc] ?? 0) !== 0) {
        useTable176 = true;
      } else {
        const table41 = this.packedBytes[(this.packedOffsets[41] ?? 0) + (dense[2828 + id] ?? 0)] ?? 0;
        if (table41 === 12) useTable176 = true;
      }
    }
    if (useTable176) {
      const inner = this.packedBytes[(this.packedOffsets[177] ?? 0) + (dense[8749 + assoc] ?? 0)] ?? 0;
      dense[2929 + id] = this.packedBytes[(this.packedOffsets[176] ?? 0) + inner + (dense[4646 + id] ?? 0)] ?? 0;
    } else {
      const inner = this.packedBytes[(this.packedOffsets[174] ?? 0) + (dense[8749 + assoc] ?? 0)] ?? 0;
      dense[2929 + id] = this.packedBytes[(this.packedOffsets[173] ?? 0) + inner + (dense[4646 + id] ?? 0)] ?? 0;
    }

    dense[3030 + id] = 0;
    dense[1313 + id] = -3;

    const fDState = { w: this.game.wByte, q: this.game.qCounter, P: this.game.pendingP };
    stepLegacyFD(dense[4444 + id] ?? 0, fDState);
    this.game.pendingP = fDState.P;

    dense[3131 + id] = dense[0 + id] ?? 0;
    dense[3232 + id] = dense[101 + id] ?? 0;

    if ((this.packedBytes[(this.packedOffsets[39] ?? 0) + (dense[2828 + id] ?? 0)] ?? 0) !== 2) {
      this.changeEntityType(id, 59);
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
   * confirmed via direct bytecode read (`getfield #37`/`#33` inside this
   * method resolve to the SAME two fields `stepLegacyX` already tracks,
   * NOT the unrelated `game.nFlag`, which turned
   * out to be a separate pre-existing misidentification -- see this
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
  private subsystemBTeamSweep(): void {
    const dense = this.denseState;
    // b.b() loops on the field v:I (offsets 1..248) and leaves it at 51 (2026-10-09).
    this.game.subsystemV = 51;
    for (let id = 1; id <= 50; id += 1) {
      let reachedLGate = this.game.outerLoopNFlag;
      if (!reachedLGate) {
        const table41A = this.packedBytes[(this.packedOffsets[41] ?? 0) + (dense[2828 + id] ?? 0)] ?? 0;
        const value1 = this.packedBytes[(this.packedOffsets[100] ?? 0) + table41A] ?? 0;
        const table41B = this.packedBytes[(this.packedOffsets[41] ?? 0) + (dense[6464 + id] ?? 0)] ?? 0;
        const value2 = this.packedBytes[(this.packedOffsets[100] ?? 0) + table41B] ?? 0;
        reachedLGate = (value1 + value2) > 1
          && (dense[6565 + id] ?? 0) !== 9
          && ((dense[1717 + id] ?? 0) > 4 || (dense[1616 + id] ?? 0) > 4 || (dense[7575 + id] ?? 0) > 4);
      }
      if (!reachedLGate) continue;

      if (this.game.outerLoopLFlag && ((dense[7979 + id] ?? 0) & 64) !== 0) continue;
      dense[7979 + id] = (dense[7979 + id] ?? 0) | 96;
    }
  }

  /**
   * Exact private void k(int) (bytecode/b-javap.txt offsets 0..131,
   * constant pool #397). Genuinely uses `b:[[B`(#129, confirmed via the
   * constructor's `this.b = fInstance.c:[[B`(#140) aliasing to be the
   * SAME field as `f.c:[[B`, i.e. `this.gridC` -- correctly derived.
   * RETRACTED (2026-09-07): a 2026-08-24 note here declared this method
   * unreachable, because its only caller `d(int,int)`(#367, `subsystemD`
   * below) was believed to throw before either of its two calls to it.
   * `d(int,int)` does not throw -- its `c:[[B]`(#143) is allocated by
   * `f.g()` (see LegacySubsystemBTenSlot.ts) -- so this method is live, and
   * `subsystemD` now really does call it twice.
   */
  private subsystemK(id: number): void {
    const dense = this.denseState;
    if (dense[3535 + id] === 15) dense[3636 + id] = 0;
    // offsets 26..38: `if (dense[2828+id] < 109) goto 131 (return)` -- the rest
    // of the method only runs for a courting unit (109/110/111). CORRECTED
    // 2026-09-20: this comparison was inverted here, so a partner leaving the
    // hut kept type 111 forever (it walks around as a permanent "zombie" and
    // never works again), while ordinary units got reset instead.
    if ((dense[2828 + id] ?? 0) < 109) return;
    if ((this.gridC[dense[101 + id] ?? 0]?.[dense[id] ?? 0] ?? 0) === id) {
      dense[3131 + id] = dense[id] ?? 0;
      dense[3232 + id] = dense[101 + id] ?? 0;
      this.changeEntityType(id, 69);
    } else {
      dense[6161 + id] = 3;
      this.changeEntityType(id, 87);
    }
  }

  /**
   * Exact private void d(int,int) (bytecode/b-javap.txt offsets 0..224,
   * constant pool #367), `b.g(int)`'s own `onD` target (fires when
   * `argument<3`).
   *
   * The 2026-08-24 correction that this method uses `c:[[B]`(#143), NOT the
   * adjacent `k(int)`'s `b:[[B]`(#129)/`gridC`, still stands and was
   * re-verified. What did not stand is the second half of that note, which
   * concluded #143 was believed permanently null (RETRACTED 2026-09-07 -- it is not) and replaced the body with a
   * guard-then-throw: `f.g()` allocates it as `byte[6][10]`
   * (bytecode/f-javap.txt offset 590..594). Fully ported 2026-09-04 as
   * `releaseLegacySubsystemBEntitySlot`, including the `argument` parameter
   * the throwing version dropped.
   */
  private subsystemD(id: number, argument: number): void {
    releaseLegacySubsystemBEntitySlot(this.subsystemArrays.cRows, this.denseState, id, argument, {
      onK: (target) => this.subsystemK(target),
    });
  }

  /**
   * `private void r()` (#412) with its `ap()` (#323) / `ao()` (#322) tail --
   * `LegacyEntityRecordRecovery.ts`, wired 2026-09-21. `q()` calls it when the
   * unit's record counter has run out; `ap()` reassigns the ambient `v:I`
   * (game.subsystemV) exactly as the original does.
   */
  private subsystemRecordRecovery(id: number): void {
    const game = this.game;
    const arrays = this.subsystemArrays;
    stepLegacyEntityRecordRecovery({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      v: id,
      onGroupMode: (argument) => this.subsystemG(id, argument),
      onQ: () => this.selectEntityTypeAfterQ(id),
      onBVoid: (flag) => this.subsystemBVoid(id, flag),
      onChangeType: (target, type) => { this.changeEntityType(target, type); },
      onIUpdate: (argument) => this.stepEntityIUpdate(id, argument, game.subsystemU),
      flags: {
        get a() { return arrays.bField73; }, set a(value: boolean) { arrays.bField73 = value; },
        get b() { return arrays.bField137; }, set b(value: boolean) { arrays.bField137 = value; },
      },
      onPBoolean: () => this.subsystemMarkerScan(id, game.subsystemU),
      onAp: () => this.entityAp(id),
    });
  }

  /**
   * `private void e(boolean)` (#376, `LegacyAnimalRoam.ts`) -- shared wiring
   * for its three call sites: `a(int,int,byte,int)`'s `e(true)` (a
   * zero-aggression animal fleeing) and `af()`/`ag()`'s `e(false)` (ordinary
   * roaming). `slot` is the ambient `v:I` (#225), an animal slot 0..21.
   */
  private animalRoam(slot: number, flag: boolean): void {
    const arrays = this.subsystemArrays;
    const game = this.game;
    stepLegacyAnimalRoam({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      slot,
      sceneQ: game.qByte,
      mapWidth: game.mapWidth,
      mapHeight: game.mapHeight,
      E: arrays.bField15,
      scratch: {
        get x() { return game.subsystemX; }, set x(value: number) { game.subsystemX = value; },
        get w() { return game.subsystemW; }, set w(value: number) { game.subsystemW = value; },
        get B() { return arrays.bField8; }, set B(value: number) { arrays.bField8 = value; },
      },
      random: (mask, divisor) => this.randomRemainder(mask, divisor),
      onFreeCellScan: (mode, scanLimit, x, y) => {
        try {
          this.checkSpiralPlacementGate(mode, scanLimit, x, y, game.subsystemV);
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
  private runAuxiliaryPlacement(first: number, second: number, x: number, y: number, id: number): void {
    const queue = this.auxiliaryQueueState;
    placeLegacyAuxiliary({
      eRows: this.subsystemArrays.eRows,
      fP: this.auxiliaryScratch,
      fields: queue,
      q: this.game.qByte,
      bFByte: this.game.subsystemGFFlagByte,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
      // b(IIII)'s offset 256..260 call is `this.b(first, second, 1)`
      // -- invokespecial #342, i.e. plain b(III) -- NOT c(boolean) as this
      // call site's name and the chimera it used to call both suggested
      // (see LegacyAuxiliaryQueue.ts's history docblock). Repointed
      // 2026-08-31.
      onNestedPlacement: (nestedFirst, nestedSecond, nestedThird) => {
        selectLegacyAuxiliaryCandidates({
          p: this.auxiliaryScratch,
          dense: this.denseState,
          shortRows: this.mainArrays.aShort,
        }, this.auxiliaryQueueState, nestedFirst, nestedSecond, nestedThird);
      },
      // b(IIII)'s offset 175 call: this.c(false).
      onAuxiliaryTagRefresh: (flag) => this.pickAdults(flag),
      // Offset 373's `a(IIII)Z` (#270); the real bytecode pops the result.
      // WIRED 2026-09-21 together with the argument-position fix in
      // LegacyAuxiliaryPlacement.ts -- it was silently absent before.
      onFootprintCheck: (mode, span, footX, footY) => this.checkSpiralPlacementGate(mode, span, footX, footY, id),
      // Offset 421's `f.b(int)` (#343) -- the mission/tutorial script step.
      onRecordFinalize: (value) => { this.runSceneDispatch(value); },
      // Offset 424..433: retiring the step by pushing f:B past t291[q].
      onStepAdvance: (next) => { this.game.subsystemGFFlagByte = next; },
    }, first, second, x, y);
  }

  /**
   * `private boolean p()` (#409, `LegacySubsystemBBoolean2.ts`) plus its
   * `H()` (#244, `LegacyEntityMarkerCommit.ts`) commit half -- shared by all
   * three of `p()`'s call sites. The original discards `p()`'s result at two
   * of them; this returns it for the third (`r()`'s own `type <= 9 && p()`
   * short-circuit).
   */
  private subsystemMarkerScan(id: number, team: number): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    const dense = this.denseState;
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
      sceneQ: game.qByte,
      fByte: game.subsystemGFFlagByte,
      team,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      gridC: this.gridC,
      arrays,
      bFlag: arrays.bField137,
      aFlag: { get value() { return arrays.bField73; }, set value(next: boolean) { arrays.bField73 = next; } },
      zInt: game.subsystemEntityZ,
      bValue: this.subsystemArrays.bField8,
      bByte: { get value() { return game.subsystemB; }, set value(next: number) { game.subsystemB = next; } },
      onH: () => stepLegacyEntityMarkerCommit({
        state: dense,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        gridC: this.gridC,
        v: id,
        team,
        sceneQ: game.qByte,
        fByte: game.subsystemGFFlagByte,
        IByte: game.subsystemGCurrentI,
        bValue: () => this.subsystemArrays.bField8,
        nFlag: game.outerLoopNFlag,
        dShort: arrays.dShort,
        scratch,
        onCoordinateSync: (target, flag) => syncLegacySubsystemBCoordinate({
          dense, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
          // a(int,boolean) offset 286: a(id, 69) (#275), wired 2026-09-27.
          onSpawnMark: (unit) => this.changeEntityType(unit, 69),
        }, target, flag),
        onChangeType: (target, type) => { this.changeEntityType(target, type); },
        onGroupMode: (argument) => this.subsystemG(id, argument),
        onOccupancy: (x, y, mode) => this.occupancyCheck(id, x, y, mode),
        onPVoid: () => this.stepSubsystemP(id),
        onIUpdate: (argument) => this.stepEntityIUpdate(id, argument, team),
        onMoveTrigger: (action, target, id2) => this.entityMove(action, target, id2),
        onByteAction: (type, x, y, value) => this.runByteActionQueue(type, x, y, value),
        // `private void a(byte,byte,byte)` (#291, b-javap.txt:31910): three
        // instructions -- the same bounding box b(byte,byte,byte) computes,
        // `aj:I = u:I`, then the marker scan again with D:B as its mode.
        onMarkerRescan: (x, y, range) => this.subsystemMarkerRescan(id, x, y, range),
        onAuxRecord: (first, second, x, y) => this.runAuxiliaryPlacement(first, second, x, y, id),
      }),
    });
  }

  /** b.B:B (#9) / b.z:B (#235) / b.A:B (#6), live, for `h()`'s own writes. */
  private spotAlertScratch(): { B: number; z: number; A: number } {
    const game = this.game;
    const arrays = this.subsystemArrays;
    return {
      get B() { return game.subsystemB; }, set B(value: number) { game.subsystemB = value; },
      get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
      get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
    };
  }

  /** Shared inputs for `f.g(int)` / `f.b(byte)` (LegacyEntityRecordLifecycle.ts). */
  private entityRecordLifecycleInput() {
    return {
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      randomRemainder: (mask: number, divisor: number) => this.randomRemainder(mask, divisor),
      focusId: this.game.frameLayoutL,
      selectionFlags: this.game.selectionFlags,
      frameFlags: this.game.frameFlags,
    };
  }

  /**
   * `private boolean a(boolean)` (#295, `LegacyEntityCourtship.ts`) -- shared
   * by `n()`'s `a(false)` and `K()`'s type-96 `a(true)`. `v` is the ambient
   * `v:I` the method reads: `K()` swaps it to the unit's associated target
   * before the call, and has already set `R:I` to the original `v`, which
   * this reads live.
   */
  private entityCourtship(v: number, flag: boolean): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    return stepLegacyEntityCourtship({
      state: this.denseState,
      pool: this.mainArrays.aShort,
      cRows: arrays.cRows,
      v,
      team: game.subsystemU,
      R: game.subsystemR,
      scratch: {
        get ae() { return arrays.bField105; }, set ae(value: number) { arrays.bField105 = value; },
        get x() { return game.subsystemX; }, set x(value: number) { game.subsystemX = value; },
      },
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      onChangeType: (rawId, type) => { this.changeEntityType(rawId, type); },
      onN: () => this.stepSubsystemN(v, game.subsystemU),
    }, flag);
  }

  /**
   * `private void K()` (#247, `LegacySubsystemEntityTypeReaction.ts`), run by
   * `j():Z` for types 94..97. Its docblock long called it "CONFIRMED
   * UNREACHABLE" on the premise that `i()`'s `J()` always throws; `J()` (#246)
   * has been ported and wired as `subsystemEntityJTrigger` since, and `j():Z`
   * is live. Wired 2026-09-23.
   */
  private entityTypeReaction(id: number, team: number): void {
    const game = this.game;
    stepLegacySubsystemEntityTypeReaction({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      teamMarkerTable: game.teamMarkerTable,
      entityId: id,
      team,
      scratch: {
        get R() { return game.subsystemR; }, set R(value: number) { game.subsystemR = value; },
        get fFlag() { return game.subsystemFFlag; }, set fFlag(value: boolean) { game.subsystemFFlag = value; },
      },
    }, {
      onCheckQuad: (attr, chance, cap, step) => this.gainEntitySkill(id, attr, chance, cap, step),
      onCheckPair: (target, delta) => this.entityHealthDelta(target, delta),
      onActOnTarget: (target, flag) => this.entityCourtship(target, flag),
    });
  }

  /** b's `private boolean t()` (#417) -- LegacySubsystemT.ts. */
  private subsystemT(): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    return stepLegacySubsystemT({
      state: this.denseState,
      gridC: this.gridC,
      teamMarkerTable: game.teamMarkerTable,
      aShort: this.mainArrays.aShort,
      frame: game.c,
      mapWidth: game.mapWidth,
      mapHeight: game.mapHeight,
      q: game.qByte,
      fByte: game.subsystemGFFlagByte,
      uByte: game.uByte,
      bField28: arrays.bField28,
      kFlag: { get value() { return game.kFlag; }, set value(v: boolean) { game.kFlag = v; } },
      scratch: {
        get u() { return game.subsystemU; }, set u(v: number) { game.subsystemU = v; },
        get v() { return game.subsystemV; }, set v(x: number) { game.subsystemV = x; },
        get w() { return game.subsystemW; }, set w(v: number) { game.subsystemW = v; },
        get A() { return game.subsystemA; }, set A(v: number) { game.subsystemA = v; },
        get C() { return arrays.bField10; }, set C(v: number) { arrays.bField10 = v; },
        get D() { return arrays.bField12; }, set D(v: number) { arrays.bField12 = v; },
      },
      onPrompt: (ap, am, an) => this.entityActionPrompt(ap, am, an),
    });
  }

  /**
   * f.c(int,int,int,int) (#357, LegacyEffectRectMark.ts): mark the cells of a
   * rectangle inside the viewport for redraw and set B:Z.
   */
  private repaintRect(x: number, y: number, width: number, height: number): void {
    const g = this.game;
    const bounds = { originColumn: g.IByte, originRow: g.KByte, columns: g.viewportO, rows: g.viewportP };
    const rectState = { boolGrid: this.effectRectBoolGrid, originColumn: g.IByte, originRow: g.KByte, B: g.cameraBFlag };
    stepLegacyCRect(x, y, width, height, rectState, {
      isBlocked: (bx, by) => isLegacyWithinViewport(bounds, bx, by),
    });
    g.cameraBFlag = rectState.B;
  }

  /** b's `private void c(boolean)` (#361): pick team 0's best adults into e[1..3]. */
  private pickAdults(flag: boolean): void {
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
  private auxiliaryCandidates(first: number, second: number, third: number): void {
    selectLegacyAuxiliaryCandidates({
      p: this.auxiliaryScratch,
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
    }, this.auxiliaryQueueState, first, second, third);
  }

  /** b's `private boolean u()` (#419) -- mission 4's script, LegacySubsystemU.ts. */
  private missionScriptU(): boolean {
    const game = this.game;
    const arrays = this.subsystemArrays;
    const queue = this.auxiliaryQueueState;
    return stepLegacySubsystemU({
      state: this.denseState,
      aShort: this.mainArrays.aShort,
      aInt: this.mainArrays.aInt,
      eRows: arrays.eRows,
      fP: this.auxiliaryScratch,
      frame: game.c,
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
  private missionScriptV(): boolean {
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
      q: game.qByte,
      frame: game.c,
      bField28: arrays.bField28,
      fields: {
        get f() { return game.subsystemGFFlagByte; }, set f(v: number) { game.subsystemGFFlagByte = v; },
        get F() { return arrays.bField16; }, set F(v: number) { arrays.bField16 = v; },
        get N() { return queue.N; }, set N(v: number) { queue.N = v; },
        get I() { return game.subsystemGCurrentI; }, set I(v: number) { game.subsystemGCurrentI = v; },
        get aw() { return game.levelAwByte; }, set aw(v: number) { game.levelAwByte = v; },
      },
      onPlaceStep: (first, second, x, y) => this.runAuxiliaryPlacement(first, second, x, y, game.subsystemV),
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

  /** b's `final void a(byte,int,int)` (#274) -- LegacyEntityMoveTrigger.ts. */
  private entityMove(action: number, id: number, id2: number): void {
    const game = this.game;
    const arrays = this.subsystemArrays;
    triggerLegacyEntityMove({
      id,
      id2,
      action,
      fQByte: game.qByte,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      dShort: arrays.dShort,
      bField28: arrays.bField28,
      bField235: arrays.bField235,
      bField6: arrays.bField6,
      IByte: game.IByte,
      viewportO: game.viewportO,
      KByte: game.KByte,
      viewportP: game.viewportP,
      onNotify: (ap, am, an) => this.entityActionPrompt(ap, am, an),
    });
  }

  /**
   * f.a(byte,byte,byte) (#306) with its entry gate, offsets 0..42: an
   * argument below 18 needs l:I != 0, Q != 17, !K:Z and u:B <= 0 (18 skips
   * the K:Z test, but 18 and up never reach it).
   */
  private entityActionPrompt(ap: number, am: number, an: number): void {
    const game = this.game;
    if (ap < 18 && (game.lInt === 0 || game.Q === 17 || game.kFlag || game.uByte > 0)) return;
    this.beginEntityAction(ap, am, an);
  }

  /**
   * class b's `final void a(int,int,int,byte,byte)` (#307), reached from
   * f.T() (ai 37/45/48) and from b.av()/b.v(). `aw`/`q` are read live from
   * game.* because T() mutates them between calls.
   */
  private batchAllocate(count: number, x: number, y: number, team: number, value: number): void {
    const game = this.game;
    stepLegacyEntityBatchAllocate({
      state: this.denseState,
      map: this.gridC,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      counters: this.mainArrays.aShort,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      mapWidth: game.mapWidth,
      mapHeight: game.mapHeight,
      aU: game.subsystemAU,
      subsystemY: game.subsystemY,
      ...this.recordOptions(),
      saveOffsets: this.saveOffsets,
      setV: (v: number) => { game.subsystemV = v; },
      setLastRecordId: (v: number) => { game.subsystemLastRecordId = v; },
      // b.a(int,int,int,int) (#270), called as `a(1, 127, x, y)` right
      // after `v:I = 0` (b-javap.txt offsets 32..45 of a(IIIBB)).
      onNearbySearch: (nx, ny) => { this.checkSpiralPlacementGate(1, 127, nx, ny, 0); },
      // L() (#248): the new unit is handed a weapon from its team's pool.
      // The team is the ambient u:I.
      onEquipIssue: (newId) => stepLegacyEntityEquipIssue({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        v: newId,
        pools: this.mainArrays.aShort,
        team: game.subsystemU,
        onRecordCompletion: (record) => this.completeEntityRecord(record),
      }),
    }, count, x, y, team, value);
  }

  /**
   * `private void ap()` (#323, `LegacyEntityRecordRecovery.ts`) -- shared by
   * `r()`'s type 94..96 tail and `O()`'s own call. Extracted 2026-09-23 when
   * `O()`'s site turned out to still be a throwing stub, two days after the
   * method itself was ported.
   */
  private entityAp(id: number): void {
    const game = this.game;
    stepLegacyEntityAp({
      state: this.denseState,
      v: id,
      team: game.subsystemU,
      slotTable: game.xSlotTable,
      scratch: {
        get v() { return game.subsystemV; }, set v(value: number) { game.subsystemV = value; },
        get z() { return game.subsystemEntityZ; }, set z(value: number) { game.subsystemEntityZ = value; },
      },
      onChangeType: (target, type) => { this.changeEntityType(target, type); },
      onN: () => this.stepSubsystemN(id, game.subsystemU),
      onWorkerDispatch: (target) => stepLegacySubsystemWorkerDispatch({
        state: this.denseState,
        fields: liveView<{ v: number }>(this.game, { v: "subsystemV" }),
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        gridC: this.gridC,
        team: game.subsystemU,
        aRows: this.mainArrays.aByte3,
        bRows: game.xSlotTable,
        onChangeType: (entityId, type) => { this.changeEntityType(entityId, type); },
        onN: (entityId) => this.stepSubsystemN(entityId, game.subsystemU),
      }, target),
      onOccupancy: (x, y, mode) => this.occupancyCheck(id, x, y, mode),
      onP: (target) => this.stepSubsystemP(target),
    });
  }

  /**
   * `private void f(boolean)` (#382, `LegacyEntityProduceItem.ts`) -- shared
   * by `k()`'s `onF(true)` and `i()`'s finalizer `onF(false)`, both for a
   * type 26 or 27 unit.
   */
  private entityProduceItem(id: number, team: number, flag: boolean): void {
    const game = this.game;
    stepLegacyEntityProduceItem({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      orders: this.mainArrays.aByte3,
      freeSlotTable: this.mainArrays.f4,
      pools: this.mainArrays.aShort,
      v: id,
      team,
      scratch: {
        get R() { return game.subsystemRByte; }, set R(value: number) { game.subsystemRByte = value; },
      },
      onRecordCompletion: (record) => this.completeEntityRecord(record),
      onMarkVisible: (x, y, w, h) => this.repaintRect(x, y, w, h),
    }, flag);
  }

  /**
   * `private boolean a(int,int,int,int,int,int,int,int)` (#298,
   * `LegacyEntityStrikeGate.ts`) -- shared wiring for all three of its real
   * call sites: `c(int,int,int)`'s own gate (a unit's blow),
   * `af()`'s offset-302 call (an animal's blow, `p3 === 2`) and `S()`'s.
   * `v` is the ambient `v:I` (#225) each caller is iterating on -- an entity
   * id for the first and third, an animal slot for `af()`.
   */
  private entityStrikeGate(
    v: number,
    p1: number, p2: number, p3: number, p4: number,
    p5: number, p6: number, p7: number, p8: number,
  ): boolean {
    const arrays = this.subsystemArrays;
    const game = this.game;
    return stepLegacyEntityStrikeGate({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      k: game.subsystemKBytes,
      v,
      chief: this.mainArrays.aShort[0]?.[17] ?? 0,
      dShort: arrays.dShort,
      cHitPoints: this.resourceTables.rowFByte,
      // f.ag:Z (#108) has no producer anywhere in this port yet; false is
      // the JVM field default.
      agFlag: false,
      scratch: {
        get ax() { return arrays.bField126; }, set ax(value: number) { arrays.bField126 = value; },
        get ay() { return arrays.bField127; }, set ay(value: number) { arrays.bField127 = value; },
        get D() { return arrays.bField13; }, set D(value: number) { arrays.bField13 = value; },
        get z() { return arrays.bField235; }, set z(value: number) { arrays.bField235 = value; },
        get A() { return arrays.bField6; }, set A(value: number) { arrays.bField6 = value; },
        get team() { return game.subsystemU; }, set team(value: number) { game.subsystemU = value; },
      },
      onClassifyCell: (cx, cy, arg3, arg4) => stepLegacySubsystemEntityTransformC({
        dense: this.denseState,
        gridC: this.gridC,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        saveOffsets: this.saveOffsets,
        visibilityBits: this.mainArrays.aInt,
        k: game.subsystemKBytes,
      }, v, cx, cy, arg3, arg4),
      onMarkerRescan: (rx, ry, range) => this.subsystemMarkerRescan(v, rx, ry, range),
      onFilterWorkers: (record, flag) => this.filterEntityLifecycle(record, flag, (r, c) => this.gridC[r]?.[c] ?? 0),
      onVacate: (kind, vx, vy, target) => this.vacateEntity(kind, vx, vy, target),
      // f.a(int,int,int,int) (#301): the hit effect slot. Ported 2026-09-28.
      onHitSprite: (target, kind, offset, frame) => this.allocateEffectSlot(target, kind, offset, frame),
      onMoveTrigger: (action, moveId, id2) => this.entityMove(action, moveId, id2),
      onByteAction: (type, bx, by, bValue) => this.runByteActionQueue(type, bx, by, bValue),
      random: (mask, divisor) => this.randomRemainder(mask, divisor),
    }, p1, p2, p3, p4, p5, p6, p7, p8);
  }

  /**
   * `private void a(byte,byte,byte)` (#291, b-javap.txt:31910) -- three
   * instructions: the bounding box `b(byte,byte,byte)` computes, `aj:I = u:I`,
   * then the marker scan again with `D:B` as its mode. Shared by `H()`'s
   * offset-1198 rescan and the strike gate's offset-609 record wake-up.
   */
  private subsystemMarkerRescan(id: number, x: number, y: number, range: number): void {
    const arrays = this.subsystemArrays;
    const bounds = stepLegacySubsystemClampBounds(x, y, range);
    arrays.bField115 = bounds.an;
    stepLegacySubsystemNearbyMarkerLookup({
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      gridC: this.gridC,
      arrays,
      bounds,
      layer: this.game.subsystemU,
      entityId: id,
      refX: x,
      refY: y,
      mode: arrays.bField13,
      threshold: range,
    });
  }

  /** b.a(byte) (#475) over the f:[[B] table f.g() allocates as fRows (2x10). */
  private subsystemTenSlotAllocate(id: number): boolean {
    return allocateLegacySubsystemBTenSlot(this.subsystemArrays.fRows, this.denseState, id);
  }

  /** b.c(int) (#563) over the same fRows table. */
  private subsystemTenSlotRelease(id: number): void {
    releaseLegacySubsystemBTenSlot(this.subsystemArrays.fRows, id);
  }

  /** b.a(int) (#476) over the c:[[B] table f.g() allocates as cRows (6x10). */
  private subsystemTenSlotReleaseEntity(id: number): void {
    releaseLegacySubsystemBTenSlotEntity(this.subsystemArrays.cRows, this.denseState, id, {
      onD: (entityIndex, argument) => this.subsystemD(entityIndex, argument),
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
   * at 318) wrapping this entire call -- confirmed by reading the raw
   * javap output directly, not assumed. Modeled with a local try/catch
   * here to match, regardless of whether anything inside actually throws.
   *
   * `onQ` -- `private void Q()` (#253, offset 274, the SAME already-ported
   * `selectEntityTypeAfterQ` every other `onQueue` call site in this file
   * uses) -- now wired for real too (reachable once `onCalculateM` no
   * longer throws first).
   *
   * `onAByteIntInt` (`a:(BII)V` #274) and `onH` (`private void h(int)`
   * #388, ~521 raw instructions) remain deliberately unwired: both are
   * separate, not-yet-examined methods out of scope for this pass -- left
   * as an explicit unported boundary rather than guessed, following this
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
  private stepSubsystemN(id: number, team: number): void {
    stepLegacySubsystemN({
      state: this.denseState,
      id,
      team,
      gridC: this.gridC,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      cRows: this.subsystemArrays.cRows,
      scratch: this.subsystemArrays,
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      onGate: (mode, scanLimit, originX, originY) => this.checkSpiralPlacementGate(
        mode, scanLimit, originX, originY, id,
        (occupant) => checkLegacyEntityOccupant({
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          id,
        }, occupant),
      ),
      onGroupMode: (argument) => this.subsystemG(id, argument),
      onChangeEntityType: (rawId, action) => { this.changeEntityType(rawId, action); },
      // private void O() (#251), rewritten 2026-09-15 -- see LegacySubsystemO.ts.
      onOther: (otherId, otherTeam) => stepLegacySubsystemO({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        id: otherId,
        team: otherTeam,
        xSlots: this.game.xSlotTable,
        orders: this.mainArrays.aByte3,
        fRows: this.mainArrays.f4,
        // ap() (#323), ported 2026-09-21; this O() site was missed and still
        // threw until 2026-09-23. O()'s ambient v:I is the unit it handles.
        onAp: () => this.entityAp(otherId),
        onA: (kind) => stepLegacySubsystemNearestBuilding({
          state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
          team: otherTeam, entityId: otherId, kind,
        }),
        onG: (argument) => this.subsystemG(otherId, argument),
      }),
    });
  }

  /**
   * Shared input for `stepLegacySubsystemScore` (b's `b(IIII)` #332, and its
   * four now-ported callees #267/#268/#264/#366) at both of its call sites
   * (`onO`'s inline callback above and `stepSubsystemP` below). `id` is the
   * ambient entity id (`v:I`#225) both #267 and #268 read as `entityId` --
   * passed through explicitly rather than via `game.subsystemV`, see
   * LegacySubsystemScore.ts's own docblock for why. `dByte`/`gridC` are
   * #264's own storage (`LegacySubsystemPairSetup.ts`); `bThreshold` is
   * `b.B:I`(#8), #366's threshold, precomputed the same way
   * `LegacySubsystemP.ts`'s own wiring already does.
   */
  private legacySubsystemScoreInput(id: number): LegacySubsystemScoreInput {
    return {
      dRows: this.subsystemArrays.dRows,
      localFlags: this.game.subsystemBLocalFlags,
      q: this.game.qByte,
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
      team: this.game.subsystemU,
      // #264's own two callees, WIRED 2026-09-10. Both had been ported for
      // weeks and left as unsupplied `?.()` optionals, which is why
      // `eByte`/`fByte` were still all zeros in live play: with `onE` inert,
      // #264 fell straight out at its `if (eByte[g[0]] <= 0) return;` (offset
      // 188..199), so `c:B`(bField144) stayed 0, #332 returned 0, and
      // `dense[808 + id]` -- the step direction `b.u()` gates every move on --
      // was never written. See docs/unknowns.md's 2026-09-10 entry.
      onRelativePreparation: (dx, dy) => setLegacyPathDirection(this.pathDirection, dx, dy),
      onE: (mode) => this.runPathTables(mode, id),
      // d(int) (#366)'s a(int,int,int) (#266) calls, offsets 28 and 434.
      // Wired 2026-09-28: unwired, q:B/r:B stayed 0 and every path candidate
      // was scored by its distance to (0,0).
      onComputeQR: (x, y, arg3) => this.occupancyCheck(id, x, y, arg3),
    };
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
  private runPathTables(mode: number, entityId: number): void {
    const scalars = this.subsystemArrays;
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
      directionMask: this.pathDirection.a,
      deltas: scalars.fByte,
      c: scalars.cByte,
      dScratch: scalars.dByte,
      pathData: scalars.d,
      eCounts: scalars.eByte,
      map: this.gridC,
      // Offsets 121..204 / 506..649: `packedBytes[packedOffsets[0] + offset]`,
      // where the caller has already folded `a:B * 4` into `offset`.
      readPackedDelta: (offset) => this.packedBytes[(this.packedOffsets[0] ?? 0) + offset] ?? 0,
      // `invokespecial #272` -- the same `private byte a(int,int,int)` #264
      // and #380 already call. It only ever returns iconst_0/iconst_1.
      onCellValue: (x, y, cellMode) => (checkLegacyCellCompatibility({
        state: this.denseState,
        // `v:I`(#225), threaded explicitly for the same reason
        // `legacySubsystemScoreInput` threads it -- see its docblock.
        id: entityId,
        team: this.game.subsystemU,
        gridC: this.gridC,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        saveOffsets: this.saveOffsets,
        visibilityBits: this.mainArrays.aInt,
      }, x, y, cellMode) ? 1 : 0),
      state,
    });
    scalars.bField68 = state.a;
    scalars.bField135 = state.b;
    scalars.bField164 = state.e;
    scalars.bField178 = state.g;
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
  private releaseEntitySelection(entityId: number): void {
    const result = finalizeLegacyEntitySelection({
      id: entityId,
      k: this.game.kByte,
      w: this.game.wByte,
      l: this.game.frameLayoutL,
      q: this.game.qCounter,
      dense: this.denseState,
      onSelectionReset: () => { this.runSelectionFlagsRefresh(true, true, false, false); },
    });
    this.game.kByte = result.k;
    this.game.wByte = result.w;
    this.game.frameLayoutL = result.l;
    releaseLegacyEntitySelection({
      groups: this.mainArrays.aByte,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      id: entityId,
      F: this.game.FByte,
      w: this.game.wByte,
      onModeReset: () => { this.game.wByte = 0; },
      onFReset: () => { this.game.FByte = -1; },
    });
  }

  private entityMoveCancel(id: number): void {
    stepLegacySubsystemEntityMoveCancel({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      gridC: this.gridC,
      id,
      readM: () => this.game.subsystemMByte,
      uInt: this.game.subsystemU,
      onChangeType: (targetId, changeType) => { this.changeEntityType(targetId, changeType); },
      // b.d(int)'s a(int,int,boolean) (#273), for the same entity.
      onEntityTransform: (x, y, flag) => { this.subsystemEntityTransform(id, x, y, flag); },
      // f.h(int) (#390) is `f(id); e(id);`. f.f(int) reads f.q:I (#356).
      onSelectionRelease: (entityId) => { this.releaseEntitySelection(entityId); },
      onTrainingSlot: (entityId) => stepLegacySubsystemEntityTrainingSlot({
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        entityId,
        randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
        fields: liveView<{ x: number; y: number }>(this.game, { x: "subsystemX", y: "subsystemY" }),
        owners: this.subsystemArrays.i,
      }),
    });
  }

  private stepSubsystemP(id: number): void {
    stepLegacySubsystemBVoidO({
      state: this.denseState,
      id,
      localFlags: this.game.subsystemBLocalFlags,
      // Same #332 wiring as the onO call site above; see its comment.
      onScore: (a, b, c, d) => stepLegacySubsystemScore(this.legacySubsystemScoreInput(id), a, b, c, d),
    });
    stepLegacySubsystemP({
      state: this.denseState,
      id,
      team: this.game.subsystemU,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      // #266's own inputs, wired 2026-09-10 when p()'s deliberate
      // guaranteed-throw stub for it was retracted -- see LegacySubsystemP.ts.
      saveOffsets: this.saveOffsets,
      qrFields: this.subsystemArrays,
      localFlags: this.game.subsystemBLocalFlags,
      bThreshold: this.subsystemArrays.bField8,
      fNFlag: this.game.outerLoopNFlag,
      qByte: this.game.subsystemBQByte,
      fQByte: this.game.qByte,
      fByte: this.game.subsystemGFFlagByte,
      onNearestCandidate: (arg1, arg2) => this.nearestCandidate(id, arg1, arg2),
      onN: () => this.stepSubsystemN(id, this.game.subsystemU),
      onGate: (mode, scanLimit, originX, originY) => this.checkSpiralPlacementGate(
        mode, scanLimit, originX, originY, id,
        (occupant) => checkLegacyEntityOccupant({
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          id,
        }, occupant),
      ),
      randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
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
   * a 100%-guaranteed throw ... since this call happens BEFORE
   * `readL`/`onQ`/`onAByteIntInt`/`onH` in the bytecode's own instruction
   * order, none of them can ever execute either ... `private void h(int)`
   * (#388, ~521 raw instructions) does not need to be derived at all --
   * provably dead code, not merely deferred."
   *
   * `b.a(int,int,boolean)` is `subsystemEntityTransform`, and its
   * guaranteed-throw premise was RETRACTED and the method fully ported on
   * 2026-09-07. So `h(int)` is not dead: it is the live movement path. The
   * 2026-09-07 sweep cleared 27 `throw` sites of this family but not this one,
   * because here the premise justified an unwired callback rather than a
   * throw.
   *
   * Field sources read from b.h(int)'s own bytecode rather than assumed:
   * `k1`/`k2` are `k:[B`(#196) indices 1/2, `m` is `m:B`(#202), `fN` is
   * `f.N:Z`, and `K` is `b.K:B`(#28), the entity loop's own scheduler byte.
   * CORRECTED 2026-09-14: `m` was read from `subsystemModeByte` (never
   * written, so always 0) and `fN` from the unrelated `game.nFlag`.
   */
  private subsystemH(id: number, argument: number): void {
    const k = this.game.subsystemKBytes;
    // m:B (#202) has one writer, a(int,int,boolean) (subsystemEntityTransform).
    const m = this.game.subsystemMByte;
    stepLegacyEntityHPrefix({ state: this.denseState, entityId: id, argument, k2: k[2] ?? 0, m });
    stepLegacyEntityHActionBranch({
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      entityId: id,
      argument,
      k1: k[1] ?? 0,
      k2: k[2] ?? 0,
      m,
      // f.N:Z (#81 in f) -- outerLoopNFlag, not the unrelated game.nFlag.
      fN: this.game.outerLoopNFlag,
      K: this.subsystemArrays.bField28,
      mapWidth: this.game.mapWidth,
      readEntityCell: (row, column) => this.gridC[row]?.[column] ?? id,
      onFC: (entityId) => this.clearEntityRecordTarget(entityId),
      onChangeType: (entityId, type) => { this.changeEntityType(entityId, type); },
      onNearestCandidate: (arg1, arg2) => this.nearestCandidate(id, arg1, arg2),
    });
  }

  /** `private void b(int,int)` (#333) for entity `id` -- LegacyNearestCandidateSearch.ts. */
  private nearestCandidate(id: number, arg1: number, arg2: number): void {
    findLegacyNearestCandidate({
      state: this.denseState,
      id,
      gridC: this.gridC,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      checkCompatibility: (x, y, mode) => checkLegacyCellCompatibility({
        state: this.denseState,
        id,
        team: this.game.subsystemU,
        gridC: this.gridC,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        saveOffsets: this.saveOffsets,
        visibilityBits: this.mainArrays.aInt,
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
   * site shares this (there were four copies), and the two callbacks below
   * are wired.
   */
  private buildingPlacementOptions() {
    const g = this.game;
    const runtime = this;
    return {
      auxiliaryIndex: 0,
      // See LegacyEntityPlacement.ts's own docblock (qCounter/qByte) for the frameS/qByte/qCounter bug fix.
      get frameS() { return g.cSInt; },
      get qByte() { return g.qByte; },
      get qCounter() { return g.qCounter; },
      get teamZeroSlotValue() { return runtime.mainArrays.r[g.frameLayoutAS] ?? 0; },
      get teamOneSlotValue() { return g.subsystemV; },
      // Offset 1035 of f.a(BIIIIZI)B: [14]/[20] are skipped while f.s:Z holds (same fix as above).
      get suppressCounters() { return g.cameraSFlag; },
      // Offsets 87..115 / 694..722: when team 0 is out of slots, s:I = 100,
      // l(-1), u[0] = 0 and the a(10, 0, 0, 0) notice.
      onCapacityFailure: (_kind: "thirty-slots" | "ten-slots", team: number) => {
        if (team !== 0) return;
        g.cSInt = 100;
        this.stepLegacyL(-1);
        this.mainArrays.uBytes[0] = 0;
        this.runByteActionQueue(10, 0, 0, 0);
      },
      // Offsets 361 / 426: f.c(int,int,int,int), the dirty-rect repaint.
      onFootprintMarked: (x: number, y: number, width: number, height: number) => this.repaintRect(x, y, width, height),
      onTenSlotAllocate: (id: number) => this.subsystemTenSlotAllocate(id),
      // BUG FIX (2026-08-24): this.type===2 call site is #476 (final void
      // a(int)), not #563 -- confirmed via direct bytecode read (offset
      // 1075..1086 gates the SAME invokevirtual #476 on local2===2, the
      // "type" param). releaseTen (#563) has exactly one real call site,
      // inside c(int,boolean), not here.
      onTenSlotRelease: (id: number) => this.subsystemTenSlotReleaseEntity(id),
      onTeamZeroSubsystem: (x: number, y: number, value: number) => {
        markLegacySpatialRecord({
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          layers: this.mainArrays.aInt,
          layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
          mapHeight: this.game.mapHeight,
        }, x, y, value);
      },
      onTeamZeroReset: (mode: number, x: number, y: number, flags: number) => this.runByteActionQueue(mode, x, y, flags),
    };
  }

  /**
   * `b.g()` -- LegacySubsystemBuildingEconomy.ts. b's `u/v/z/x/A/C` scratch
   * fields are shared with the callees (ac/ad/aa/ab/ae and the entity loop),
   * so the loop reads and writes them through accessors on the live fields.
   */
  private stepBuildingEconomy(): void {
    const g = this.game;
    const arrays = this.subsystemArrays;
    const scratch: LegacyBuildingScratch = {
      get u() { return g.subsystemU; }, set u(value) { g.subsystemU = value; },
      get v() { return g.subsystemV; }, set v(value) { g.subsystemV = value; },
      get z() { return g.subsystemEntityZ; }, set z(value) { g.subsystemEntityZ = value; },
      get x() { return g.subsystemX; }, set x(value) { g.subsystemX = value; },
      get A() { return g.subsystemA; }, set A(value) { g.subsystemA = value; },
      get C() { return arrays.bField10; }, set C(value) { arrays.bField10 = value; },
    };
    // f.j:[[B (#194) row 4: action cycle length per mode.
    const cycleLengths = this.packedData?.byteTables?.[4] ?? new Int8Array(256);
    const common = { state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets, scratch };
    stepLegacySubsystemBuildingEconomy({
      ...common,
      simulationCounter: g.c,
      ax: {
        dShort: arrays.dShort,
        saveOffsets: this.saveOffsets,
        sectionOffsets: this.sectionOffsets,
        gameL: g.lInt,
      },
      fRows: arrays.fRows,
      gRows: arrays.gRows,
    }, {
      onN: () => this.runSubsystemN(),
      onFilterWorkers: (record) => this.filterEntityLifecycle(record, true, (row, column) => this.gridC[row]?.[column] ?? 0),
      onAd: () => stepLegacySubsystemTrainingComplete({
        state: this.denseState,
        buildingId: g.subsystemV,
        gRows: arrays.gRows,
        subsystemX: g.subsystemX,
        onEnqueueEffect: (record, mode) => enqueueLegacyEffectSlot(this.mainArrays.e, record, mode),
        onRecordCompletion: (record) => this.completeEntityRecord(record),
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
          shortRows: this.mainArrays.aShort,
          onChangeType: (id, type) => { this.changeEntityType(id, type); },
          // a(2828[w], false, w) with v:I = the record -- the builder takes its materials.
          onActionCheck: (type, flag, worker) => this.payEntityCost(type, flag, worker, g.subsystemV),
          f: { get value() { return g.subsystemFFlag; }, set value(next: boolean) { g.subsystemFFlag = next; } },
        }, worker),
      }),
      onAc: () => stepLegacySubsystemTrainingCount({
        state: this.denseState,
        team: g.subsystemU,
        buildingId: g.subsystemV,
        // b.C:I (#10) is shared with g()/aa(): g() zeroes it, aa() counts the
        // record's workers into it, ac() continues from there.
        scratch,
      }),
      // f.a((byte)u, 9237, 8383, 8444, 1, true, v) -- placeEntity; result popped.
      onAllocate: (team, type, x, y, replaced) => {
        this.placeEntity(this.gridC, team, type, x, y, 1, true, replaced, this.buildingPlacementOptions());
      },
      onEnqueueEffect: (record, mode) => enqueueLegacyEffectSlot(this.mainArrays.e, record, mode),
      onAe: () => stepLegacySubsystemAe({
        ...common,
        gridC: this.gridC,
        fN: g.outerLoopNFlag,
        qByte: g.subsystemBQByte,
        fQ: g.qByte,
        jobTable: this.subsystemArrays.j,
      }),
    });
  }

  private subsystemG(id: number, argument: number): void {
    try {
      stepLegacyEntityGPrefix({
        state: this.denseState,
        entityId: id,
        argument,
        partition: this.game.subsystemU,
        currentI: this.game.subsystemGCurrentI,
        // f.q:B (#211) is game.qByte; the separate subsystemGFQByte had no writer (removed 2026-09-14).
        fQ: this.game.qByte,
        fFlag: this.game.subsystemGFFlagByte,
        readEntityCell: (row, column) => this.gridC[row]?.[column] ?? id,
        onD: (entityId, arg) => this.subsystemD(entityId, arg),
        onU: () => this.subsystemU(id),
        onCalculateM: (x, y, flag) => { this.subsystemEntityTransform(id, x, y, flag); return 0; },
        readL: () => this.subsystemArrays.bField199,
        onQ: () => this.selectEntityTypeAfterQ(id),
        // Both wired 2026-09-10 -- see subsystemH's docblock for why they were
        // not. `a(byte,int,int)` (#274) is the already-ported
        // triggerLegacyEntityMove that the status guard's own onMove uses.
        onAByteIntInt: (value, entityId, second) => this.entityMove(value, entityId, second),
        onH: (arg) => this.subsystemH(id, arg),
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
   * needed here specifically -- this whole callback runs INSIDE
   * `stepSubsystemFrame()`'s existing try/catch around
   * `runSubsystemEntityLoop(...)`, which already matches `b.e()`'s own
   * real exception table (offsets 0..832 -> 833) that this call chain
   * (none of aq()/as()/at() have their own exception tables) propagates
   * into on at()'s confirmed guaranteed throw.
   *
   * `private int a(int,int,int)` (#266, as()/aw()'s shared "occupancy
   * check") is now wired for real -- confirmed a guaranteed throw (same
   * permanently-null `b:[S]`#132 as elsewhere this session; see
   * `LegacySubsystemEntityOccupancyCheck.ts`) except for a narrow escape
   * (`dense[4444+v] < -1`), so both call sites can genuinely crash this
   * whole cluster for a tick, caught by the same outer handler noted
   * above.
   *
   * `f.b(int,boolean):V` (#353, ar()'s building-order action) is ALSO now
   * wired for real: direct bytecode read confirms its very first action
   * unconditionally calls `b.b(byte)`, already confirmed a guaranteed
   * throw from earlier work this session (`LegacySubsystemBFreeList.ts`,
   * via the SAME `g:[[B]`#176 permanently-null field `g()` hit) -- no new
   * derivation needed, just wiring.
   *
   * `av()`'s rally broadcast (#307) is class b's OWN sibling method
   * `a(IIIBB)`, the same one f.T() calls (`batchAllocate`). RETRACTED
   * 2026-09-23: it was a separate duplicate port (LegacySubsystemRallySpawn)
   * that never ran L() or the #270 free-cell search; now shared.
   *
   * `o(int)`'s own gate (#288, `this.a(6)`) is ALSO now wired for real --
   * unlike every other helper in this cluster, it does NOT touch any
   * confirmed-null field; it's genuine "find the nearest eligible
   * building and clamp the entity's target onto its footprint" logic
   * (`LegacySubsystemNearestBuilding.ts`). Every cross-method helper this
   * cluster depends on is now either wired for real or a confirmed
   * guaranteed throw -- none remain as invented no-op stubs.
   */
  private subsystemTeamOneAiMuster(): void {
    const g = this.game;

    const onLowerO = (entityId: number) => {
      stepLegacySubsystemLowerO(
        { state: this.denseState, gridC: this.gridC, entityId, arg: -1 },
        {
          onChangeEntityType: (id, type) => { this.changeEntityType(id, type); },
          onCheckGate: (kind) =>
            stepLegacySubsystemNearestBuilding(
              { state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets, team: 1, entityId, kind },
              { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
            ),
          onGroupMode: (id, argument) => this.subsystemG(id, argument),
        },
      );
    };

    const onAt = (entityId: number, aT: number) => {
      stepLegacySubsystemAt(
        {
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          jobTable: this.subsystemArrays.j,
          entityId,
          qByte: g.subsystemBQByte,
          mByte: g.subsystemM,
          aT,
          gBase: g.subsystemGBase,
          gridC: this.gridC,
          sceneQ: g.qByte,
          fBByte: g.subsystemFBByte,
          simulationCounter: g.c,
          saveOffsets: this.saveOffsets,
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
          onChangeEntityType: (id, type) => { this.changeEntityType(id, type); },
          // final boolean a(int) (#288) -- the SAME gate onLowerO's own
          // onCheckGate calls; at()'s Block E is a second real call site
          // for it (see LegacySubsystemAt.ts's docblock for the
          // correction to LegacySubsystemNearestBuilding.ts's "only one
          // call site" claim).
          onCheckGate: (kind) =>
            stepLegacySubsystemNearestBuilding(
              { state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets, team: 1, entityId, kind },
              { onClamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
            ),
          // private void au() (#328), ported 2026-09-28.
          onAu: () => { const runtime = this; stepLegacySubsystemAu({
            state: this.denseState,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            gridC: this.gridC,
            v: entityId,
            sceneQ: g.qByte,
            scratch: {
              get C(): number { return runtime.subsystemArrays.bField10; }, set C(value: number) { runtime.subsystemArrays.bField10 = value; },
              get D(): number { return runtime.subsystemArrays.bField12; }, set D(value: number) { runtime.subsystemArrays.bField12 = value; },
            },
            onChangeEntityType: (id, type) => { this.changeEntityType(id, type); },
          }); },
        },
      );
    };

    const onAv = () => {
      const result = stepLegacySubsystemAv(
        {
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          jobTable: this.subsystemArrays.j,
          team: 1,
          aInt: g.subsystemA,
          mByte: g.subsystemM,
          rByte: g.subsystemRByte,
          nByte: g.subsystemNByte,
          oByte: g.subsystemOByte,
          gByte: this.subsystemArrays.bgByte,
          sceneQ: g.qByte,
          fBByte: g.subsystemFBByte,
          simulationCounter: g.c,
          fields: liveView<{ x: number; y: number; z: number; aU: number; v: number }>(g, {
            x: "subsystemX", y: "subsystemY", z: "subsystemEntityZ", aU: "subsystemAU", v: "subsystemV",
          }),
        },
        {
          onClamp: (value, min, max) => Math.max(min, Math.min(max, value)),
          onRandomA: (mask, divisor) => this.randomRemainder(mask, divisor),
          // b.a(IIIBB) #307 -- the same method T() reaches via onBCreate.
          onRallyBroadcast: (count, x, y, team, role) => { this.batchAllocate(count, x, y, team, role); },
        },
      );
      g.subsystemRByte = result.rByte;
      g.subsystemNByte = result.nByte;
      g.subsystemOByte = result.oByte;
    };

    const onAw = () => {
      const result = stepLegacySubsystemAw(
        {
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          gridC: this.gridC,
          team: 1,
          nByte: g.subsystemNByte,
          oByte: g.subsystemOByte,
          aR: g.subsystemAR,
          sceneQ: g.qByte,
          simulationCounter: g.c,
        },
        {
          onCheckOccupancy: (id, x, y, arg) =>
            this.occupancyCheck(id, x, y, arg),
        },
      );
      g.subsystemOByte = result.oByte;
    };

    const onAs = () => {
      const result = stepLegacySubsystemAs(
        {
          state: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          jobTable: this.subsystemArrays.j,
          team: 1,
          aQ: this.subsystemArrays.bAQ,
          fByte: g.subsystemGFFlagByte,
          mByte: g.subsystemM,
          sceneQ: g.qByte,
          fBByte: g.subsystemFBByte,
          simulationCounter: g.c,
          fields: liveView<{ O: number; aR: number; v: number; w: number; Q: number }>(g, { O: "subsystemOByte", aR: "subsystemAR", v: "subsystemV", w: "subsystemW", Q: "subsystemBQByte" }),
        },
        {
          onRandomA: (mask, divisor) => this.randomRemainder(mask, divisor),
          onAt,
          onAv,
          onAw,
          onGroupMode: (id, argument) => this.subsystemG(id, argument),
          onCheckOccupancy: (id, x, y, arg) =>
            this.occupancyCheck(id, x, y, arg),
        },
      );
      this.subsystemArrays.bAQ = result.aQ;
      g.subsystemAU = result.aU;
    };

    const placementOptions = this.buildingPlacementOptions();

    stepLegacySubsystemAq(
      {
        state: this.denseState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
        mainShort: this.mainArrays.aShort,
        gridC: this.gridC,
        // f.a:[[[B (#74 via b, #132 in f) is mainArrays.aByte3 and f.b:[[[B (#139 via b,
        // #237 in f) is xSlotTable; the separate scoutMemory/buildingQueue copies were
        // never read by anything else (merged 2026-09-14).
        scoutMemory: this.mainArrays.aByte3,
        buildingQueue: g.xSlotTable,
        freeSlotTable: this.mainArrays.f4,
        team: 1,
        fByte: g.subsystemGFFlagByte,
        qByte: g.subsystemBQByte,
        rByte: g.subsystemRByte,
        sceneQ: g.qByte,
        simulationCounter: g.c,
      },
      {
        onPrologue: (m, a) => { g.subsystemM = m; g.subsystemA = a; },
        // private void n(int) (#404), b-javap offsets 0..193: v = 0, w = a table
        // row picked at random, then a(1, 127, x, y) (#270) puts a free cell near
        // a random point of that row's rectangle into dense[3131]/[3232] (v = 0).
        // Ported 2026-10-13 (oracle run 13, play10 frame 30713): was unwired.
        onN: (arg) => {
          const t = (index: number) => this.packedBytes[index] ?? 0;
          const q = g.qByte;
          const row = (this.packedOffsets[arg + 1] ?? 0) + q;
          g.subsystemV = 0;
          g.subsystemW = (this.packedOffsets[arg] ?? 0) +
            (t(row) + this.randomRemainder(255, t(row + 1) - t(row))) * 4;
          const w = g.subsystemW;
          const x = t(w) + this.randomRemainder(65535, t(w + 2) - t(w) + 1);
          const y = t(w + 1) + this.randomRemainder(65535, t(w + 3) - t(w + 1) + 1);
          this.checkSpiralPlacementGate(1, 127, x, y, g.subsystemV);
        },
        onAr: () => {
          const result = stepLegacySubsystemAr(
            {
              state: this.denseState,
              packedBytes: this.packedBytes,
              packedOffsets: this.packedOffsets,
              gridC: this.gridC,
              pByte: g.subsystemP,
              sceneQ: g.qByte,
              simulationCounter: g.c,
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
                  { dense: this.denseState, gRows: this.subsystemArrays.gRows, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets },
                  id,
                  flag,
                  {
                    onReleaseTenEntity: (target) => this.subsystemTenSlotReleaseEntity(target),
                    onRecordCancel: (node, owner) => stepLegacyEntityRecordCancel(
                      this.denseState, this.gridC, node, owner, false, false, (record) => this.completeEntityRecord(record),
                    ),
                  },
                );
              },
              onV: (value) => { g.subsystemV = value; },
              onPlaceEntity: (team, type, x, y, flags, specialPlacement, existingId) =>
                this.placeEntity(this.gridC, team, type, x, y, flags, specialPlacement, existingId, placementOptions),
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
   * this method was believed a 100%-unconditional guaranteed throw because
   * `e(int,int,int)` unconditionally dereferences `b:[S]` (#132), and that
   * field was believed permanently null. It is not -- `e.f()` allocates it
   * (`new short[570]`) and `b.a(f)` copies it in (bytecode/b-javap.txt:550);
   * it is this port's `saveOffsets`, already live throughout the rest of
   * this codebase. All three methods in the cluster (`a(int,int,boolean)`,
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
   * No exception table exists in this method, `c(IIII)`, or `e(III)`
   * (confirmed -- none of the three has a local `Exception table:` in the
   * raw javap output), so a genuinely unreachable read here (e.g. `e()`'s
   * `idiv`-by-zero) still propagates to whichever caller's own exception
   * table catches it -- same as the other four call sites this method has
   * (`t()`, `g(int)`, `d(int)`, `stepLegacySubsystemBDecision`), each of
   * which already has (or is wrapped in) its own real exception scope.
   *
   * Returns `l:B` (#199) directly -- the two real callers that read it
   * right after calling this method (`g(int)`'s `readL`, `t()`'s
   * `onPositionProbe`) can just use the return value instead of a second
   * field read.
   */
  private subsystemEntityTransform(id: number, x: number, y: number, flag: boolean): number {
    const scratch = {
      bField197: this.subsystemArrays.bField197,
      bField199: this.subsystemArrays.bField199,
      mByte: this.game.subsystemMByte,
    };
    const l = stepLegacySubsystemEntityTransform({
      dense: this.denseState,
      gridC: this.gridC,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      visibilityBits: this.mainArrays.aInt,
      k: this.game.subsystemKBytes,
      id,
      x,
      y,
      flag,
      team: this.game.subsystemU,
      fQ: this.game.qByte,
      scratch,
      // b.a:[[S (#63) is f.a:[[S; read by private byte a() (#276).
      shortRows: this.mainArrays.aShort,
    });
    this.subsystemArrays.bField197 = scratch.bField197;
    this.subsystemArrays.bField199 = scratch.bField199;
    this.game.subsystemMByte = scratch.mByte;
    return l;
  }

  /**
   * `b.w()`'s `onJ` target: private void J() (#246), bytecode/b-javap.txt
   * offsets 0..723 (line 24999).
   *
   * RETRACTED-PREMISE (2026-09-07), FULLY PORTED (2026-09-07). The
   * 2026-08-20 throw was built on `b.b:[S]` (#132, this port's
   * `saveOffsets`) being permanently null -- disproven the same day as
   * this project's other "permanently null field" claims (`e.f()`
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
   *     (`u:I`#222, `game.subsystemU`): reads `idx17 =
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
   * across ~10 other, not-yet-ported methods in this class (confirmed via
   * `grep -n "#10 " bytecode/b-javap.txt`) -- so it's modeled as a real
   * field, `LegacySubsystemArrays.bField10`, not a local; see that file's
   * own docblock for the field. `id` stands in for the ambient `v:I`
   * (#225) this ported method reads directly, same convention as this
   * file's `subsystemEntityAAlert` below.
   *
   * REACHABILITY CORRECTION (2026-09-07): the 2026-08-20/29 chain
   * ("J() always throws" -> "i()'s offset 196..1028 is unreachable" ->
   * "j():Z's only call site is unreachable" -> "K() is unreachable") was
   * entirely downstream of the SAME retracted premise as this method's
   * own old throw. With J() no longer throwing, `i()`'s call to it
   * (offset 192-195, `LegacySubsystemEntityProbe.ts`) returns normally
   * like any other call, so `i()`'s offset 196..1028 -- including
   * `j():Z`'s only call site in the class (offset 595) -- IS reachable,
   * and so is `K()` (`j()`'s only caller). Neither `j()` nor `K()` is
   * (re-)ported here: both already have complete, tested implementations
   * in `LegacySubsystemEntityAssociationScan.ts`/
   * `LegacySubsystemEntityTypeReaction.ts` ("ported anyway, fully
   * derived, for the record" per their own docblocks, written back when
   * they were believed unreachable) -- this fix just makes those existing
   * ports actually reachable. NOTE: `LegacySubsystemEntityProbe.ts`'s own
   * docblock still asserts the old "everything past offset 196 in i() is
   * provably 100% UNREACHABLE" conclusion and needs the same correction;
   * left as-is here (out of this file's scope) but flagged for follow-up.
   */
  private subsystemEntityJTrigger(id: number): void {
    const dense = this.denseState;
    const { packedBytes, packedOffsets, saveOffsets } = this;
    const arrays = this.subsystemArrays;
    const aShort = this.mainArrays.aShort;
    const type = dense[2828 + id] ?? 0;

    const g = this.game;
    g.subsystemA = 1;
    if (((packedBytes[(packedOffsets[27] ?? 0) + type] ?? 0) & 32) === 0) g.subsystemA = -1;

    const t35 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
    const x1 = dense[(saveOffsets[t35] ?? 0) + id] ?? 0;
    const t36 = packedBytes[(packedOffsets[36] ?? 0) + type] ?? 0;
    arrays.bField10 = (x1 + t36) * g.subsystemA;

    const x3 = packedBytes[(packedOffsets[35] ?? 0) + type] ?? 0;
    if (x3 >= 69 && x3 <= 74 && this.game.subsystemU === 0) {
      const idx17 = aShort[0]?.[17] ?? 0;
      const d1 = (dense[id] ?? 0) - (dense[idx17] ?? 0);
      const d2 = (dense[101 + id] ?? 0) - (dense[101 + idx17] ?? 0);
      if (d1 >= -4 && d1 <= 4 && d2 >= -4 && d2 <= 4) {
        arrays.bField10 = Math.trunc((arrays.bField10 * 3) / 2);
      }
    }

    const team = this.game.subsystemU;
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
   * inlined below rather than left a callback, matching this file's own
   * `Math.max(min, Math.min(max, value))` idiom for the SAME helper used
   * elsewhere in this class (e.g. `onClamp` in the `onAv`/`aq()` wiring
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
   *     scanning `j` for this `i` (bytecode jumps straight to the `i--`
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
   *     `i === dense[2626+id]`, this `i` is abandoned entirely (no
   *     insert, straight to `i++`). Otherwise computes `valE =
   *     packedBytes[packedOffsets[108]+i]`, `valF = dense[2222+id]`,
   *     `cmpVal = (valF<8 && valF>0) ? 7 : valF`; if `valE === cmpVal`,
   *     this `i` is likewise abandoned. Otherwise shifts
   *     `dense[saveOffsets[24..j+1]+id]` and inserts `i` at
   *     `dense[saveOffsets[j]+id]`, then stops scanning `j` for this `i`
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
   * this method's own line range) -- but every access within `A()` itself
   * writes each one before it's ever read, so they're modeled as ordinary
   * locals (`i`/`j`/`k`) here; `B()`'s own use of their possibly-stale
   * post-`A()` values is `B()`'s concern, not modeled by this port.
   */
  private subsystemEntityAAlert(id: number): void {
    const dense = this.denseState;
    const { packedBytes, packedOffsets, saveOffsets } = this;
    const clamp = (value: number, min: number, max: number): number =>
      Math.max(min, Math.min(max, value));

    dense[2222 + id] = packedBytes[
      (packedOffsets[41] ?? 0) + (dense[6464 + id] ?? 0)
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

    dense[1818 + id] = clamp(dense[1818 + id] ?? 0, 3 + Math.trunc((dense[1616 + id] ?? 0) / 2), 7);
    dense[4949 + id] = clamp(dense[4949 + id] ?? 0, (dense[1818 + id] ?? 0) + 1, 9);

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
  subsystemBEntryGate(frame: number, id: number, team: number): boolean {
    return legacySubsystemBEntryGate({ frame, id, team, state: this.denseState });
  }

  /** Exact b() offsets 59..253 prefix; the private m()/o() calls remain callback seams. */
  subsystemBActivityPrefix(
    fields: Omit<LegacySubsystemBActivityPrefixInput, "state">,
  ): ReturnType<typeof stepLegacySubsystemBActivityPrefix> {
    return stepLegacySubsystemBActivityPrefix({ ...fields, state: this.denseState });
  }

  /** Exact b() dispatch at 533..614; n()/an() remain injectable callbacks. */
  subsystemBActionSelector(
    fields: Omit<LegacySubsystemBActionSelectorInput, "state">,
  ): void {
    selectLegacySubsystemBAction({ ...fields, state: this.denseState });
  }

  /** Exact b() tail gate through p(); cell and occupancy lookups remain callbacks. */
  subsystemBFinalPrefix(
    fields: Omit<LegacySubsystemBFinalPrefixInput, "state">,
  ): void {
    stepLegacySubsystemBFinalPrefix({ ...fields, state: this.denseState });
  }

  /** Compose the currently ported b() segments in original bytecode order. */
  subsystemB(
    fields: Omit<LegacySubsystemBInput, "state" | "packedBytes" | "packedOffsets">,
  ): boolean {
    return stepLegacySubsystemB({
      ...fields,
      state: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

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

  /**
   * Copy the fields proven by f.e(int) into the raw runtime allocations.
   * This intentionally stops before the original post-load calls to b.n(),
   * b.j(), b.d(), and aK(); those calls are sequenced by loadGameplayFromStore
   * after hydration where their confirmed portions are available.
   */
  hydrateGameplayRecord(record: RmsGameplayRecord): void {
    this.game.qByte = record.qByte; // f.q:B (#357)
    // f.d(int) restores f.q itself before aN()/the post-load b calls.  Keep
    // the state-machine alias live as well as the raw persistence mirror;
    // otherwise a restored gameplay slot would continue running with the
    // pre-load q=0 selector. CORRECTION (2026-08-24): game.subsystemQ was
    // a disconnected duplicate of this SAME field (f.q:B#211/#357, used
    // throughout the whole b-subsystem cluster: ak()/al()/i()/h()/etc.)
    // -- deleted, merged onto qByte, see that field's own docblock.
    this.game.qByte = record.qByte;
    this.game.persistedPByte = record.pByte;
    this.game.persistedDByte = record.dByte;
    this.denseState.set(record.denseState);
    this.game.persistedQ2.set(record.q2);

    copyRows(this.mainArrays.aByte, record.a50, 4);
    copyRows(this.mainArrays.aShort, record.aShort2x26, 2);
    copyRows(this.mainArrays.e, record.e30, 3);
    copyCube(this.mainArrays.aByte3, record.a2x10x12, 2);
    copyRows(this.mainArrays.f4, record.f30, 4);
    copyCube(this.game.xSlotTable, record.b2x5x30, 2);
    copyCube(this.game.teamMarkerTable, record.c2x5x5, 2);

    // BUG FIX (2026-08-25): record.aq/y/A/I/K/ai/L/N are all the SAME live
    // fields already modeled elsewhere (aq:B#215->frameLayoutAq, y:B#387->
    // yByte, A:B#34->AByte, I:B#60/K:B#68->IByte/KByte, ai:B#200->game.ai,
    // L:Z#73/N:Z#81->outerLoopLFlag/outerLoopNFlag) -- confirmed via direct
    // bytecode read of the real load method (private boolean d(int),
    // offsets 510/523/536/549/562/578/594/602) putting straight into those
    // fields, not separate staging copies. The old `persistedAq/Y/A/Ai/L/N`
    // fields had exactly one writer (here) and one reader
    // (snapshotGameplayRecord) each, never touching live state -- same
    // disconnected-duplicate shape as the earlier subsystemQ/qByte and
    // persistedI/K merges. Routed directly; all six fields removed from
    // LegacyGameState.ts. h:B (#313) is the music mood aQ() reads, i.e.
    // game.audioH (persistedH merged into it 2026-09-27).
    this.game.frameLayoutAq = record.aq;
    this.game.yByte = record.y;
    this.game.AByte = record.A;
    this.game.IByte = record.I;
    this.game.KByte = record.K;
    this.game.audioH = record.h;
    this.game.ai = record.ai;
    this.game.c = record.cInt;
    this.game.outerLoopLFlag = record.L;
    this.game.outerLoopNFlag = record.N;

    copyRows(this.mainArrays.aInt[0], record.intLayers0x3x96, 3);
    copyRows(this.subsystemArrays.cRows, record.bC6x10, 6);
    this.game.subsystemGFFlagByte = record.bFByte;
    this.subsystemArrays.bField28 = record.bKByte;
    this.game.subsystemRByte = record.bRByte;
    this.subsystemArrays.bField32 = record.bLByte;
    this.subsystemArrays.bAQ = record.bAQ;
    copyRows(this.subsystemArrays.fRows, record.bF2x10, 2);
    copyRows(this.subsystemArrays.gRows, record.bG3x20, 3);
    this.subsystemArrays.j.set(record.bJ50);
    this.subsystemArrays.bN = record.bN;
    this.subsystemArrays.bO = record.bO;
    this.subsystemArrays.bgByte = record.bg;
    this.subsystemArrays.bJByte = record.bJ;
    this.game.subsystemGCurrentI = record.bI; // b.I:B (#62 in f)
    this.game.subsystemT.set(record.t3);

    for (const group of record.sparseLocations) {
      for (const location of group.locations) {
        if (location.y < 0 || location.y >= this.gridC.length ||
            location.x < 0 || location.x >= this.gridC[location.y].length) {
          throw new RangeError(`Sparse RMS location (${location.x},${location.y}) is outside runtime map`);
        }
        this.gridC[location.y][location.x] = group.value;
      }
    }
    this.rebuildGridAfterLoad();
  }

  /**
   * f.d(int) offsets 988..1947, right after the sparse groups: the save
   * keeps only the -111..-122 cells, so the load writes everything else back
   * into c:[[B (gridC). PORTED 2026-09-27 -- it was missing, so after a load
   * no unit, animal or building was on the grid (units vanished from the
   * screen and could not be picked).
   */
  private rebuildGridAfterLoad(): void {
    const e = this.denseState;
    const a = this.packedBytes;
    const s = this.packedOffsets;
    const c = this.gridC;
    const f = this.mainArrays.f4; // f.f:[[B (#291)
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
      if ((e[9833 + i] ?? 0) >= 6) set(e[9783 + i] ?? 0, e[9733 + i] ?? 0, toJavaByte(-61 - i));
    }
    for (let i = 1; i <= 100; i += 1) { // 1127..1459, units
      if ((e[1919 + i] ?? 0) === 0) continue;
      e[808 + i] = 0;
      if ((e[4646 + i] ?? 0) >= 0) continue;
      set(e[101 + i] ?? 0, e[i] ?? 0, i);
      if (((e[2929 + i] ?? 0) & 255) > 7) continue;
      reserveStep(e[i] ?? 0, e[101 + i] ?? 0, e[606 + i] ?? 0, e[1111 + i] ?? 0,
        (e[1010 + i] ?? 0) - (e[7777 + i] ?? 0));
    }
    for (let i = 0; i < 22; i += 1) { // 1462..1794, animals
      e[9689 + i] = 0;
      if ((e[9513 + i] ?? 0) === 0) continue;
      set(e[9381 + i] ?? 0, e[9359 + i] ?? 0, 101 + i);
      if (((e[9557 + i] ?? 0) & 255) > 7) continue;
      reserveStep(e[9359 + i] ?? 0, e[9381 + i] ?? 0, e[9491 + i] ?? 0, e[9623 + i] ?? 0,
        a[s[179] + (e[9535 + i] ?? 0)] ?? 0);
    }
    for (let i = 1; i <= 60; i += 1) { // 1797..1947, building footprints
      if ((e[8505 + i] ?? 0) === 0) continue;
      const kind = e[8749 + i] ?? 0;
      const rows = a[s[138] + 130 + kind] ?? 0;
      const cols = a[s[138] + 104 + kind] ?? 0;
      for (let r = 0; r < rows; r += 1) {
        for (let col = 0; col < cols; col += 1) set((e[8444 + i] ?? 0) + r, (e[8383 + i] ?? 0) + col, toJavaByte(-i));
      }
    }
  }

  /** Snapshot the same raw shapes written by f.d(int), without semantic remapping. */
  snapshotGameplayRecord(): RmsGameplayRecord {
    const sparseLocations: SparseLocationGroup[] = [];
    for (let value = -111; value >= -122; value -= 1) {
      const locations: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < this.game.mapWidth; x += 1) {
        for (let y = 0; y < this.game.mapHeight; y += 1) {
          if (this.gridC[y]?.[x] === value) locations.push({ x, y });
        }
      }
      sparseLocations.push({ value, locations });
    }

    return {
      qByte: this.game.qByte,
      pByte: this.game.persistedPByte,
      dByte: this.game.persistedDByte,
      denseState: new Int8Array(this.denseState),
      q2: new Int8Array(this.game.persistedQ2),
      a50: cloneRows(this.mainArrays.aByte, 4),
      aShort2x26: cloneRows(this.mainArrays.aShort, 2),
      e30: cloneRows(this.mainArrays.e, 3),
      a2x10x12: cloneCube(this.mainArrays.aByte3, 2),
      f30: cloneRows(this.mainArrays.f4, 4),
      b2x5x30: cloneCube(this.game.xSlotTable, 2),
      c2x5x5: cloneCube(this.game.teamMarkerTable, 2),
      aq: this.game.frameLayoutAq,
      y: this.game.yByte,
      A: this.game.AByte,
      I: this.game.IByte,
      K: this.game.KByte,
      h: this.game.audioH,
      ai: this.game.ai,
      cInt: this.game.c,
      L: this.game.outerLoopLFlag,
      N: this.game.outerLoopNFlag,
      intLayers0x3x96: cloneRows(this.mainArrays.aInt[0], 3),
      bC6x10: cloneRows(this.subsystemArrays.cRows, 6),
      bFByte: this.game.subsystemGFFlagByte,
      bKByte: this.subsystemArrays.bField28,
      bRByte: this.game.subsystemRByte,
      bLByte: this.subsystemArrays.bField32,
      bAQ: this.subsystemArrays.bAQ,
      bF2x10: cloneRows(this.subsystemArrays.fRows, 2),
      bG3x20: cloneRows(this.subsystemArrays.gRows, 3),
      bJ50: new Int8Array(this.subsystemArrays.j),
      bN: this.subsystemArrays.bN,
      bO: this.subsystemArrays.bO,
      bg: this.subsystemArrays.bgByte,
      bJ: this.subsystemArrays.bJByte,
      bI: this.game.subsystemGCurrentI,
      t3: new Int8Array(this.game.subsystemT),
      sparseLocations,
    };
  }

  /** Load one original gameplay slot into the raw runtime buffers. */
  loadGameplayFromStore(slot: 1 | 2, mapWidth = this.game.mapWidth, mapHeight = this.game.mapHeight): boolean {
    this.game.mapWidth = mapWidth;
    this.game.mapHeight = mapHeight;
    const record = this.progressStore.loadGameplay(slot, mapWidth, mapHeight);
    if (!record) return false;

    // f.d(int) calls aM() right after reading q. REMOVED 2026-09-24: a second
    // aM() port (resetGameplayLoadPrefix) used here also wrote Q = 14,
    // v = 0, H, i, w and two counters -- none of them in aM()'s bytecode
    // (offsets 0..598) -- so a successful load from Continue dropped back to
    // the title screen instead of Q = 28.
    this.resetMapEntryAllocation(record.qByte & 0xff);

    // f.e(int) reads f.q before calling aN().  When the original resources are
    // attached, retain that same map-selection boundary before restoring the
    // saved dense state.  The remaining aM()/post-load helpers are still
    // separate reverse-engineering work and are deliberately not inferred.
    // aN() (via loadMap/decodeMap) sets the LOGICAL c:S/d:S; f.d(int) never
    // widens them afterwards. Until 2026-10-07 this overwrote them with the
    // decode stride, so a tutorial load came back 64x48 instead of 40x32.
    if (this.maResource && this.packedData) this.loadMap(record.qByte & 0xff);
    this.hydrateGameplayRecord(record);
    // f.d(int) offsets 172..182: a free-play load (slot 2) restores the
    // difficulty b:B from the saved d:B.
    if (slot === 2) this.game.levelBByte = this.game.persistedDByte;
    // f.d(int) offset 1954: b.n() rebuilds the zone lists before b.j()/b.d().
    // ADDED 2026-09-27: without it a load at f.c % 10 != 0 left b.c:[[[B /
    // b.a:[[B stale (all zeros on a cold boot: head 0 -> next 0), and p()'s
    // walk in LegacySubsystemNearbyMarkerLookup.ts never ended.
    this.runSubsystemN();
    this.runSubsystemJ(record.qByte & 0xff);
    this.runSpatialPass({});
    // f.run() calls aK() after b.d(), then snapshots the normalized viewport
    // pair into J/L.  Keep this ordering explicit; these are raw fields until
    // the source-table aliases feeding aK() are fully identified.
    this.normalizeEntityViewport();
    this.game.JByte = this.game.IByte;
    this.game.cameraSavedKByte = this.game.KByte; // L:B (#72)
    return true;
  }

  /** b.n() (LegacySubsystemVoidN.ts): rebuild the per-team zone lists. */
  private runSubsystemN(): void {
    stepLegacySubsystemVoidN({
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      saveOffsets: this.saveOffsets,
      gridC: this.gridC,
      arrays: this.subsystemArrays,
    });
  }

  /** Exact b.j() post-load counter/table reconstruction. */
  runSubsystemJ(q = this.game.qByte): void {
    const table113 = this.packedOffsets[113] + (q < 4 ? 0 : q === 4 ? 12 : 24);
    for (let index = 0; index < 12; index += 1) {
      this.mainArrays.f[index] = this.packedBytes[table113 + index] ?? 0;
    }
    this.subsystemArrays.bJCursor = 0;
    if (q > 4) return;

    const rangeBase = this.packedOffsets[302] + q;
    let cursor = this.packedBytes[rangeBase] ?? 0;
    const end = this.packedBytes[rangeBase + 1] ?? cursor;
    while (cursor < end) {
      const threshold = this.packedBytes[this.packedOffsets[299] + cursor] ?? 0;
      if (this.game.c >= threshold * 100) {
        const index = this.packedBytes[this.packedOffsets[300] + cursor] ?? -1;
        if (index >= 0 && index < this.mainArrays.f.length) {
          this.mainArrays.f[index] = (this.mainArrays.f[index] + 1) & 0xff;
        }
      } else {
        break;
      }
      cursor += 1;
    }
    this.subsystemArrays.bJCursor = cursor;
  }

  /** Save the current raw runtime buffers using the original slot-1/2 schema. */
  saveGameplayToStore(slot: 1 | 2): void {
    this.progressStore.saveGameplay(slot, this.snapshotGameplayRecord());
  }

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

  private zhPaintBase(imageGroup0: ImagePack): ZhPaint {
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

  /** Raw f.ak() state-machine orchestration; child methods remain callbacks. */
  stepStateMachine(callbacks: LegacyAkCallbacks = {}): void {
    stepLegacyAk(this.game.stateMachineFields(), {
      ...callbacks,
      // CORRECTION 2026-08-22: stepLegacyAl's own onResetInput callback
      // (private void i() #610, offset 42 of al()) was never passed here
      // (silent no-op) -- now wired to resetLegacyZI. Also,
      // LegacyAkState/LegacyAlState's `eFlag`/`fFlag`/`vFlag` fields were
      // renamed to `inputUp`/`inputDown`/`inputV` (see LegacyAkState's own
      // docblock) since ak()'s own bytecode confirms those are the SAME
      // fields LegacyCameraFollow.ts already established, not the
      // orphaned game.eFlag/fFlag/vFlag this structural-typing pickup
      // used to silently read instead.
      onAl: callbacks.onAl ?? (() => stepLegacyAl(this.game, { onResetInput: () => resetLegacyZI(this.game) })),
      onAm: callbacks.onAm ?? (() => this.stepDefaultAm()),
      onAb: callbacks.onAb ?? (() => stepLegacyAB({
        state: this.scrollSelectorState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
      })),
      onAc: callbacks.onAc ?? (() => stepLegacyAC({
        state: this.scrollSelectorState,
        packedBytes: this.packedBytes,
        packedOffsets: this.packedOffsets,
      })),
      onAo: callbacks.onAo ?? (() => this.stepDefaultAo()),
      onAn: callbacks.onAn ?? (() => this.stepDefaultAn()),
      onAd: callbacks.onAd ?? (() => this.stepDefaultAd()),
    });
  }

  /**
   * Default f.am() bridge used by f.ak() for Q=22/23.  The T=0 branch now
   * reaches the proven map-entry chain; the T=1 e(int) action remains an
   * explicit unresolved boundary and therefore returns false without inventing
   * resource semantics.
   */
  private stepDefaultAm(): void {
    // Live, not a snapshot (2026-09-23): onBByte's scene dispatch and
    // onWReset write these same fields mid-method.
    const state = liveView<LegacyAmInput["state"]>(this.game, {
      Q: "Q", R: "R", H: "H", T: "actionT", q: "qByte", uCounter: "uByte", tByte: "tByte",
      W: "actionWFlag", vInt: "vInt", A: "AFlag", vByte: "vByte", mByte: "mByte",
    });
    this.stepStateAm({
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

  /** Exact f.e(int) save boundary used by f.am()'s T=1 branch. */
  private saveOriginalResourceAction(slot: number): boolean {
    try {
      if (slot === 0) {
        this.progressStore.save({
          l: this.game.lInt,
          W: this.game.actionWFlag,
          r: this.game.progressR,
          s: this.game.sByte,
          t: this.game.tByte,
          c: this.game.progressC,
          p: this.game.persistedPByte,
        });
        return true;
      }
      if (slot === 1 || slot === 2) {
        if (slot === 2) this.game.actionWFlag = true;
        if (slot === 1) {
          const base = this.packedOffsets[248] ?? 0;
          this.game.tByte = this.packedBytes[base + this.game.qByte] ?? this.game.tByte;
        }
        this.saveGameplayToStore(slot);
        return true;
      }
      return false;
    } catch {
      // f.e(int) catches the broad Exception boundary and returns false.
      return false;
    }
  }

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
  private startOriginalAudio(): void {
    if (!this.midiResource) return;
    const state = {
      h: this.game.audioH,
      e: this.game.eByte,
      currentTrack: this.game.audioCurrentTrack,
      currentPlayerReady: this.game.playerExists ? 101 : 0,
      currentPlayerTrack: this.game.audioCurrentTrack,
    };
    this.stepStateAQAudio({
      state,
      // aQ() offset 4: b.k() (#618) sets f.h:B, the track pair aQ() picks
      // from. Ported but never called until 2026-09-27, so h never changed.
      onSubsystemDecision: () => {
        const g = this.game;
        g.audioH = this.subsystemDecision({
          fV: g.vByte, fN: g.outerLoopNFlag, fL: g.outerLoopLFlag,
          bO: this.subsystemArrays.bO, bK: this.subsystemArrays.bField28, bN: this.subsystemArrays.bN,
          fQ: g.qByte,
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
  private selectResourceSection(value: number): void {
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
  private readonly scrollSelectorState = liveView<LegacyAbState & LegacyAcState>(this.game, {
    Q: "Q", Z: "Z", ab: "ab", y: "frameGenCounterY", QFlag: "zAd14QFlag", RFlag: "zAd14RFlag",
  });

  /** c.a(Graphics,int) offsets 780..832: f.Q:Z (at the top) / f.R:Z (at the end). */
  private readonly setDialogueEdges = (atTop: boolean, atBottom: boolean): void => {
    this.game.zAd14QFlag = atTop;
    this.game.zAd14RFlag = atBottom;
  };

  /** Shared input for the map overview's C()/D()/e(int,int) (LegacyMapOverview.ts). */
  private mapOverviewInput(): LegacyMapOverviewInput {
    const g = this.game;
    return {
      graphics: this.offscreenTargets?.graphics ?? [],
      images: this.offscreenTargets?.images ?? [],
      imageSlots: g.frameImageSlots,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortTables: this.packedData?.shortTables ?? [],
      byteTables: this.packedData?.byteTables ?? [],
      colors: this.mainArrays.bColors,
      gridC: this.gridC,
      gridB: this.gridB,
      dense: this.denseState,
      occupancyClass: (x, y) => this.occupancyClass(x, y),
      drawSprite: (graphicsIndex, record, x, y) => {
        const graphics = this.offscreenTargets?.graphics[graphicsIndex as 0 | 1 | 2 | 3];
        if (!graphics || !this.packedData) return;
        new LegacyPackedSpriteRenderer({
          shortTables: this.packedData.shortTables,
          byteTables: this.packedData.byteTables,
          imageGroups: this.imageGroups,
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
   * f.a(byte,int,int) (#438), the command-backed frame renderer.  Originally
   * only wired inline inside the "G" handler's onFrameCommand (resources 10
   * and 17); extracted 2026-08-26 so the SAME tested pipeline can also be
   * reached from onElementScan (P()'s epilogue and m()'s per-tick call),
   * which previously only pushed a trace stub and never actually invoked
   * this method -- see LegacyZElementScan.ts's docblock for the orphaned
   * duplicate port (scanLegacyZElementPrefix) this replaces as the real
   * wiring target.
   */
  private drawFrameCommandPrimitive(command: number, x: number, y: number): void {
    this.frameHelperCalls.push({ kind: "frame-command", resourceId: command, x, y });
    // command 4 (the selected-unit panel) is drawn like the others since
    // 2026-09-28: the old skip rested on f.b:[S] (#245) being null, which it
    // is not (e.f() writes it); y() is ported as stepLegacyY.
    // f.a(byte,int,int)'s own offset-6 prefix call, private boolean c()
    // (bytecode/f-javap.txt:12798) -- confirmed reachable and ported:
    // aD===0, aD∈{2,5} (->z()), aD===6 (->A()), aD∈{7,8} (c()'s own inline
    // logic), and aD===17 (->B(), the vByte===1 branch; command=17 is the
    // shared text/dialogue overlay every non-G/H handler uses). Opening
    // the command menu via LSK activates selectionFlags[0]/[5]/[17],
    // which f.m()'s HUD loop turns into command=0/5/17 calls; the rest
    // were confirmed via a live jdb trace across all 5 command-menu items
    // -- see reverse-engineering/frame-command-changed-cluster.md.
    const changedState: LegacyZAdChangeState = {
      saveOffsets: this.saveOffsets,
      l: this.game.frameLayoutL,
      aShortStats: this.mainArrays.aShort,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      dShort: this.game.zlDShorts,
      kBytes: this.game.zlKBytes,
      flags: this.game.frameFlags,
      r: this.mainArrays.r,
      as: this.game.frameLayoutAS,
      kFlag: this.game.kFlag,
      entityFocusFlag: this.game.entityFocusFlag,
      zAfCursorVFlag: this.game.zAfCursorVFlag,
      dense: this.denseState,
      vInt: this.game.vInt,
      wByte: this.game.wByte,
      zlYInt: this.game.zlYInt,
      qCounter: this.game.qCounter,
      FByte: this.game.FByte,
      adByte: this.game.selectionAd,
      frameGenCounterY: this.game.frameGenCounterY,
      frameGenCounterZ: this.game.frameGenCounterZ,
      ayByte: this.game.ayByte,
      aByteRows: this.mainArrays.aByte,
      uBytes: this.mainArrays.uBytes,
      am: this.game.am,
      qByte: this.game.qByte,
      Q: this.game.Q,
      al: this.game.al,
      ai: this.game.ai,
      mByte: this.game.mByte,
      akByte: this.game.akByte,
      Z: this.game.Z,
      W: this.game.exitPrepWInt,
      X: this.game.exitPrepXInt,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      zAd14T: this.game.frameLayoutT,
      zAd14U: this.game.frameLayoutU,
      zAd14Q: this.game.zAd14QFlag,
      zAd14R: this.game.zAd14RFlag,
      af: this.game.columnScrollDelta,
      ag: this.game.rowScrollDelta,
    };
    const changed = stepLegacyFrameCommandChanged(command, this.game.vByte, changedState, {
      onD: () => stepLegacyMapOverviewScroll(this.mapOverviewInput()),
    });
    this.game.vInt = changedState.vInt;
    this.game.am = changedState.am;
    this.game.frameLayoutT = changedState.zAd14T;
    this.game.frameLayoutU = changedState.zAd14U;
    this.game.zAd14QFlag = changedState.zAd14Q;
    this.game.zAd14RFlag = changedState.zAd14R;
    this.game.columnScrollDelta = changedState.af;
    this.game.rowScrollDelta = changedState.ag;
    const result = drawLegacyFrameCommand({
      command,
      x,
      y,
      changed,
      flags: this.game.frameFlags,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortTables: this.packedData?.shortTables ?? [],
      byteTables: this.packedData?.byteTables ?? [],
      // f.c:[B (#263): one field with game.frameImageSlots (merged 2026-09-28;
      // O()'s c[8]/c[9] writes never reached this copy).
      imageSelectors: this.game.frameImageSlots,
      dShort: this.game.zlDShorts,
      kBytes: this.game.zlKBytes,
      v: this.game.vInt,
      w: this.game.resourceSectionW,
      dense: this.denseState,
      l: this.game.frameLayoutL,
      onTarget: (target) => { this.frameDispatchState.N = target; },
      onProgress: (progressX, progressY, width, height, anchor) => {
        this.frameHelperCalls.push({ kind: "progress", x: progressX, y: progressY, width, height, anchor });
        // f.a(byte,int,int) offsets 702..815: setColor(0), then helper #437
        // (fillRect at +11/+8) blacks out the empty part of the bar.
        const graphics = this.offscreenTargets?.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        graphics?.setColor(0);
        graphics?.fillRect(progressX + 11, progressY + 8, width, height);
      },
      onText: (record, textX, textY, style, row) => {
        this.frameHelperCalls.push({ kind: "frame-text", record, x: textX, y: textY, style, row });
      },
      onRecord1010: (record, mode, recordX, recordY, row) => {
        this.frameHelperCalls.push({ kind: "frame-record-1010", record, mode, x: recordX, y: recordY, row });
        if (!this.offscreenTargets || !this.packedData || !this.imageGroups[0]) return;
        const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        const packed = new LegacyPackedSpriteRenderer({
          shortTables: this.packedData.shortTables,
          byteTables: this.packedData.byteTables,
          imageGroups: this.imageGroups,
          graphics,
        });
        drawLegacy1010({
          start: record,
          selection: mode,
          originY: recordY,
          count: this.game.frameLayoutAW,
          stride: this.game.frameLayoutAV,
          aX: this.game.frameLayoutAX,
          originX: this.game.frameLayoutAY,
          aZ: this.game.frameLayoutAZ,
          selectedRow: this.game.frameLayoutAS,
          av: this.game.frameLayoutAv,
          r: this.mainArrays.r,
          s: this.mainArrays.s,
          recordKind: this.denseState[8749 + this.game.qCounter] ?? 0,
          V: this.game.zAfCursorVFlag,
          F: this.game.entityFocusFlag,
          t: this.game.frameLayoutT,
          u: this.game.frameLayoutU,
          f: this.game.fCounter,
          e: this.game.timingCounterE,
          shortTables: this.packedData.shortTables,
          onSprite: (asset, assetX, assetY) => packed.drawSprite(asset, assetX, assetY),
          onPacked: (asset, assetX, assetY) => packed.drawComposite(asset, assetX, assetY),
          onEntity: (id, entityX, entityY, arg4, arg5) => this.stepEntityAction(id, entityX, entityY, arg4, arg5),
          onText: (textX, textY, width, text, value) => {
            this.frameHelperCalls.push({ kind: "frame-1010-number", x: textX, y: textY, value: Number(text), style: width });
            try {
              this.geometry.queueTextWithWidth(textX, textY, width, text, value);
              this.geometryRenderer.renderTo(graphics, this.imageGroups[0]!);
              this.geometry.reset(); // c.a(Graphics)'s tail: a:B = 0
            } catch {
              // Preserve the original c.a(String) exception boundary.
            }
          },
          onSubrecord: (asset, assetX, assetY, phase) => {
            this.frameHelperCalls.push({ kind: "frame-1010-subrecord", record: asset, x: assetX, y: assetY, mode: phase });
            this.stepZSubrecordDraw(asset, assetX, assetY, phase, {
              onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
            });
          },
          onS: () => { this.game.gameplaySFlag = true; },
        });
      },
      onRecord1137: (record, recordX, recordY, row) => {
        this.frameHelperCalls.push({ kind: "frame-record-1137", record, x: recordX, y: recordY, row });
        if (!this.offscreenTargets || !this.packedData || !this.imageGroups[0]) return;
        const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        const packed = new LegacyPackedSpriteRenderer({
          shortTables: this.packedData.shortTables,
          byteTables: this.packedData.byteTables,
          imageGroups: this.imageGroups,
          graphics,
        });
        try {
          drawLegacy1137Composition({
            x: recordX,
            y: recordY,
            commandRecord: record,
            languageState: this.game.Q,
            selectionIndex: this.game.Z,
            phase: this.game.timingCounterE,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            shortTables: this.packedData.shortTables,
            byteTables: this.packedData.byteTables,
            onLayout: (rowCount) => {
              // f.c() stores the section length in int field ab;
              // f.aC() uses it as the selector wrap bound.
              this.game.ab = rowCount;
            },
            onPacked: (packedRecord, packedX, packedY) => {
              this.frameHelperCalls.push({ kind: "frame-1137-packed", record: packedRecord, x: packedX, y: packedY });
              packed.drawComposite(packedRecord, packedX, packedY);
            },
            // Q14 (the language list) gets a sixth row, 中文, when the Chinese strings are loaded.
            onExtraRow: this.game.Q === 14 && this.zhStrings ? (rowX, rowY) => {
              this.geometry.queueZhLabel(rowX, rowY, 1, Array.from(ZH_LANGUAGE_NAME, (text) => ({ text })), 0);
            } : undefined,
            onGeometry: (geometryX, mode, width, geometryRecord, value) => {
              this.geometry.decodeRecord(geometryX, mode, width, geometryRecord, value);
              this.frameHelperCalls.push({ kind: "frame-1137-geometry", record: geometryRecord, x: geometryX, y: mode, width, value, active: this.geometry.activeRows });
            },
            onFlush: () => {
              const geometryCommands = this.geometryRenderer.emit();
              this.frameHelperCalls.push({ kind: "frame-1137-active", record: this.geometry.activeRows });
              this.frameHelperCalls.push({ kind: "frame-1137-draw-count", record: geometryCommands.length, active: this.geometry.activeRows });
              for (const draw of geometryCommands.slice(0, 8)) {
                this.frameHelperCalls.push({
                  kind: "frame-1137-draw",
                  record: draw.imageIndex,
                  x: draw.x,
                  y: draw.y,
                  width: draw.width,
                  height: draw.height,
                  sourceX: draw.sourceX,
                  sourceY: draw.sourceY,
                });
              }
              this.geometryRenderer.renderTo(graphics, this.imageGroups[0]!);
              this.geometry.reset();
            },
            onSelectionMarker: (kind, markerX, markerY, phase) => {
              this.frameHelperCalls.push({ kind: "frame-1137-marker", record: kind, x: markerX, y: markerY, mode: phase });
              this.stepZSubrecordDraw(kind, markerX, markerY, phase, {
                onSpriteRecord: (markerRecord, drawX, drawY) => packed.drawComposite(markerRecord, drawX, drawY),
              });
            },
          });
        } catch (error) {
          this.frameHelperCalls.push({ kind: "frame-1137-error", message: error instanceof Error ? error.message : String(error) });
          // Preserve f.c()'s broad frame-level exception boundary.
        }
      },
      onKind2: (row, aI, aJ, aK) => {
        this.frameHelperCalls.push({ kind: "frame-kind2", row, mode: aI, x: aJ, y: aK });
        if (!this.offscreenTargets || !this.packedData || !this.imageGroups[0]) return;
        const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        const packed = new LegacyPackedSpriteRenderer({
          shortTables: this.packedData.shortTables,
          byteTables: this.packedData.byteTables,
          imageGroups: this.imageGroups,
          graphics,
        });
        const kind2State: LegacyZKind2State = {
          Q: this.game.zAd14QFlag,
          R: this.game.zAd14RFlag,
          T: this.game.frameLayoutT,
          U: this.game.frameLayoutU,
          aI,
          aJ,
          aK,
          y: this.game.yByte,
          I: this.game.IByte,
          W: this.game.exitPrepWInt,
          K: this.game.KByte,
          X: this.game.exitPrepXInt,
          aL: this.game.exitPrepALInt,
          A: this.game.AByte,
          O: this.game.viewportO,
          P: this.game.viewportP,
          f: this.game.fCounter,
          k: this.game.tickDivisor,
          S: this.game.gameplaySFlag,
        };
        stepLegacyZKind2(kind2State, row, {
          onDrawRect: (rectX, rectY, width, height) => {
            this.frameHelperCalls.push({ kind: "frame-kind2-rect", x: rectX, y: rectY, width, height });
            // #536's b(Graphics,IIII) targets Graphics[M:B] (#76), a
            // *static* field confirmed 0 at its one and only write site
            // (the class static initializer) -- same graphics[0] target
            // stepLegacyR/stepLegacyP already use for the same field.
            const bar = this.offscreenTargets?.graphics[0];
            if (bar) {
              bar.setColor(1105252);
              bar.drawRect(rectX, rectY, width, height);
            }
          },
          onSubrecord: (index, spriteX, spriteY, phase) => {
            this.frameHelperCalls.push({ kind: "frame-kind2-sprite", record: index, x: spriteX, y: spriteY, mode: phase });
            this.stepZSubrecordDraw(index, spriteX, spriteY, phase, {
              onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
            });
          },
        });
        this.game.gameplaySFlag = kind2State.S;
      },
      onKind4: (_row, aI, aJ, aK) => {
        this.stepZKind4({ aI, aJ, aK }, {
          onSetClip: (clipX, clipY, width, height) => {
            const g = this.game;
            g.bc = clipX;
            g.bd = clipY;
            g.be = width;
            g.bf = height;
            this.offscreenTargets?.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3]?.setClip(clipX, clipY, width, height);
          },
        });
      },
      onKind3: (row, aI, aJ, aK, aFValue) => {
        this.frameHelperCalls.push({ kind: "frame-kind3", row, mode: aI, x: aJ, y: aK, value: aFValue });
        if (!this.packedData) return;
        const kind3State: LegacyZKind3State = {
          aI,
          aJ,
          aK,
          // f.o:B (#349): the picture index aI 10 hands to c(byte).
          o: this.game.oByte,
          aF: aFValue,
          u0: this.mainArrays.uBytes[0] ?? 0,
          e: this.denseState,
          kRows: this.mainArrays.kMatrix,
          cBytes: this.game.frameImageSlots,
          byteRows: this.packedData.byteTables,
          shortRows: this.packedData.shortTables,
        };
        stepLegacyZKind3(kind3State, row, {
          // aI 10: c(byte) (#558) reads /pi8 and stores entry o in
          // a:[[Image][2][0]; then drawImage(a[2][0], x, y, anchor) into
          // Graphics[N] -- the cutscene picture. /pi8 is preloaded as
          // imageGroups[2]; a missing entry leaves the slot as it was (the
          // original's catch).
          onPalette: (value) => {
            const image = this.imageGroups[2]?.get(value)?.image;
            if (image) this.pi8Slot0 = image;
          },
          onImage: (_group, _index, imageX, imageY, anchor) => {
            const image = this.pi8Slot0 ?? this.imageGroups[2]?.get(0)?.image;
            const target = this.offscreenTargets?.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
            if (image && target) target.drawImage(image, imageX, imageY, anchor as AnchorValue);
          },
          // aI 11: helper #435 copies the map overview out of Image[c[1]]
          // into Graphics[M] (M:B is 0); its exception is swallowed.
          onRegion: (imageSlot, sourceX, sourceY, width, height, regionX, regionY) => {
            const image = this.offscreenTargets?.images[imageSlot as 0 | 1 | 2 | 3];
            const target = this.offscreenTargets?.graphics[0];
            if (!image || !target) return;
            try {
              target.drawRegion(image, sourceX, sourceY, width, height, 0, regionX, regionY, 0);
            } catch {
              // #435 returns false.
            }
          },
          onFiveIntText: (x, mode, width, record, value) => {
            this.frameHelperCalls.push({ kind: "frame-kind3-five", x, y: mode, width, record, value });
            applyLegacyZFiveIntGeometry(this.geometry, x, mode, width, record, value);
          },
          onSevenIntText: (x, mode, width, first, second, third, value) => {
            this.frameHelperCalls.push({ kind: "frame-kind3-seven", x, y: mode, width, record: first, value });
            applyLegacyZSevenIntGeometry(this.geometry, x, mode, width, first, second, third, value);
          },
        });
      },
      onKText: (textX, textY, command, mode, row, value) => {
        this.frameHelperCalls.push({ kind: "frame-k-text", x: textX, y: textY, command, mode, row, value });
        if (!this.offscreenTargets || !this.imageGroups[0]) return;
        const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        const textState = {
          aF: value,
          aI: mode + 1,
          aJ: textX,
          aK: textY,
          // f.l:B (#337), the selected unit k(int)'s advance rows and row
          // 1067 read. Was a constant 0 until 2026-10-02, so the unit panel
          // showed unit 0's fields (the "-1"s).
          l: this.game.frameLayoutL,
        };
        try {
          this.stepZKText(textState, command, {
            onText: (glyphX, glyphMode, width, text, value) => {
              // c.a(aJ,aK,j[3][row]>>6,String.valueOf(aF),aI-1)
              // maps directly to the compact geometry text entry.
              this.geometry.queueTextWithWidth(glyphX, glyphMode, width, text, value);
            },
          });
          this.game.frameCommandAF = textState.aF;
        } catch {
          // Preserve f.k()/c.a(String)'s broad frame exception boundary.
        }
      },
      onCompose: (record, composeX, composeY, width, height, align, font, row, compose) => {
        this.frameHelperCalls.push({ kind: "frame-compose", record, x: composeX, y: composeY, width, height, align, font, row });
        // f.a(BII) offsets 962..991: a new text (w != v) starts at row 0;
        // z:I = y:I; c.a(Graphics, y) then draws from row y (the scroll).
        // CORRECTED 2026-09-30: y was never reset and rows always started at 0.
        const g = this.game;
        if (g.resourceSectionW !== g.vInt) {
          g.resourceSectionW = g.vInt;
          g.frameGenCounterY = 0;
        }
        g.frameGenCounterZ = g.frameGenCounterY;
        if (!this.offscreenTargets || !this.imageGroups[0]) return;
        try {
          if (compose) composeLegacyC(
            this.cComposition,
            this.packedBytes,
            this.packedOffsets,
            this.resourceTables.byteViews,
            this.resourceTables.offsetViews,
            composeX,
            composeY,
            width,
            height,
            record,
            align,
            font,
            this.resourceTables.sectionArg,
            this.zhCompose,
          );
          const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
          const extras = this.cRenderExtras();
          const imageGroup0 = this.imageGroups[0];
          const commands = emitLegacyCRenderRow(
            this.cComposition,
            this.packedBytes,
            this.packedOffsets,
            this.resourceTables.byteViews,
            this.imageGroups[0],
            g.frameGenCounterY,
            undefined,
            this.setDialogueEdges,
            {
              ...extras,
              onZhLine: (tokens, m, n, zhFont, stat) => paintZhLine(graphics,
                { ...this.zhPaintBase(imageGroup0), onIcon: extras.onIcon, onStat: stat }, zhFont, tokens, m, n),
            },
          );
          for (const draw of commands) {
            const image = this.imageGroups[0].get(draw.imageIndex)?.image;
            if (image) graphics.drawRegion(image, draw.sourceX, draw.sourceY, draw.width, draw.height, 0, draw.x, draw.y, draw.anchor);
          }
        } catch {
          // Preserve c/f's broad exception boundary for malformed rows.
        }
      },
      onRowCommand: (kind, row, record, rowX, rowY, stateAI, aF) => {
        this.frameHelperCalls.push({ kind: "frame-row-command", row, mode: kind, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0 });
        if (!this.offscreenTargets || !this.packedData) return;
        const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
        const packed = new LegacyPackedSpriteRenderer({
          shortTables: this.packedData.shortTables,
          byteTables: this.packedData.byteTables,
          imageGroups: this.imageGroups,
          graphics,
        });
        if (kind === 0) {
          // f.d(0,row) offsets 0..17: b(aI, aJ, aK) (#535), a single sprite
          // (mostly type 29/30 fills such as panel background 1737), not the
          // a(III) composite -- composite 1737 is empty.
          packed.drawSprite(record ?? 0, rowX ?? 0, rowY ?? 0);
          return;
        }
        if (kind !== 1) return;
        // f.d(1,row) calls f.j(row); aI is the independent decoded
        // b[1][row] value retained in the surrounding object state.
        this.game.frameCommandAI = stateAI ?? this.game.frameCommandAI;
        this.game.frameCommandAJ = rowX ?? this.game.frameCommandAJ;
        this.game.frameCommandAK = rowY ?? this.game.frameCommandAK;
        // The row loop's own aF (d[aE] for a pending row, else 0); the
        // previous command's leftover made the portrait 720 + HP.
        this.game.frameCommandAF = aF ?? 0;
        this.consumeFrameCommand(row, {
          onSprite: (asset, spriteX, spriteY) => packed.drawComposite(asset, spriteX, spriteY),
          onDefaultSprite: (asset, spriteX, spriteY) => packed.drawComposite(asset, spriteX, spriteY),
          onText: (textX, textY, style, value, mode) => {
            // j(int) offsets 190..246: c.a(x, y, j[3][row]>>6, text, 0).
            // Until 2026-10-01 this passed (x, mode, text, style): every
            // cost number landed at y 0 with the alignment as its spacing.
            try {
              this.geometry.queueTextWithWidth(textX, textY, style, value, mode);
              this.geometryRenderer.renderTo(graphics, this.imageGroups[0]!);
            } catch {
              // Preserve the original c/f rendering exception boundary.
            }
          },
        });
      },
      onFlush: () => {
        this.frameHelperCalls.push({ kind: "frame-flush" });
        if (!this.offscreenTargets || !this.imageGroups[0]) return;
        try {
          const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
          this.geometryRenderer.renderTo(graphics, this.imageGroups[0]);
          this.geometry.reset();
        } catch {
          // Preserve c.a(Graphics)'s broad frame exception boundary.
        }
      },
      onUnhandled: (kind, row, record, rowX, rowY, group) => this.frameHelperCalls.push({ kind: "frame-unhandled", mode: kind, row, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0, group: group ?? -1 }),
    });
    if (result) {
      this.game.frameCommandAE = result.aE;
      this.game.frameCommandAF = result.aF;
    }
  }

  /** Execute the proven f.F() dispatch after the state-machine step. */
  stepFrameDispatch(
    callbacks: Omit<LegacyFrameDispatchInput, "state" | "packedBytes" | "packedOffsets" | "stateTableIndex"> = {},
  ): void {
    this.framePrimitives.length = 0;
    this.frameHelperCalls.length = 0;
    this.frameDispatchState.c = this.game.c;
    this.frameDispatchState.Q = this.game.Q;
    this.frameDispatchState.H = this.game.H;
    const onHandler = callbacks.onHandler ?? ((handler) => {
      if (handler === "G") {
        // `gState` is hoisted out of the call so S:I/T:I can be written back:
        // G() sets them (offsets 120..129 and 681..690) and f.a(int,byte)'s
        // >= 1000 arm reads them as its projection origin.
        const gState = {
          H: this.game.H,
          Q: this.game.Q,
          U: this.game.U,
          V: 4,
          N: this.frameDispatchState.N,
          c1: this.frameDispatchState.c1,
          k: this.game.zlKBytes,
          flags: this.game.frameFlags,
          S: this.game.projectionS,
          T: this.game.projectionT,
        };
        stepLegacyGFrame({
          state: gState,
          onSurfaceClear: (target) => {
            if (target !== 1 || !this.offscreenTargets) return;
            this.offscreenTargets.clear(1, 9422847, 0, -8, 264, 304);
            this.offscreenTargets.clear(1, 940839, 0, 232, 264, 64);
          },
          onSurfaceCopy: (target, source) => {
            if (target !== 0 || source !== 1 || !this.offscreenTargets) return;
            this.offscreenTargets.copy(0, 1, 0, 328, 36);
          },
          onSurfaceHeader: (target) => {
            if (target !== 0 || !this.offscreenTargets) return;
            this.offscreenTargets.clear(0, 9422847, 0, 0, 264, 80);
          },
          onTargetChanged: (target) => {
            this.frameDispatchState.N = target;
          },
          onImageHelper: (resourceId, mode) => {
            this.frameHelperCalls.push({ kind: "image", resourceId, mode });
            if (resourceId !== 1118) return;
            this.drawImageHelper(resourceId, mode, gState.S, gState.T);
          },
          onDrawHelper: (resourceId, x, y) => {
            this.frameHelperCalls.push({ kind: "draw", resourceId, x, y });
            if (resourceId >= 0 && this.packedData && this.offscreenTargets) {
              const graphics = this.offscreenTargets.graphics[this.frameDispatchState.N as 0 | 1 | 2 | 3];
              new LegacyPackedSpriteRenderer({
                shortTables: this.packedData.shortTables,
                byteTables: this.packedData.byteTables,
                imageGroups: this.imageGroups,
                graphics,
              }).drawComposite(resourceId, x, y);
            }
          },
          onFrameCommand: (command, x, y) => this.drawFrameCommandPrimitive(command, x, y),
          geometry: this.gGeometry,
          randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
          onPrimitive: (index, x, y) => {
            this.framePrimitives.push([index, x, y]);
            callbacks.onPrimitive?.(index, x, y);
          },
        });
        // Write S:I/T:I back: G() owns them, and c(int,int) reads/writes the
        // same two fields outside this handler.
        this.game.projectionS = gState.S;
        this.game.projectionT = gState.T;
        this.frameDispatchState.H = false;
        return;
      }
      if (handler === "P") {
        stepLegacyP(this.pFrameState, this.offscreenTargets?.graphics ?? [], {
          // f.n() is this handler's onScroll below.
          // Q()'s j() (offset 487): the world update during a cutscene. Was
          // left unwired on a double-run worry, but h()'s j() only runs for
          // v == 1 and P()/Q() only for v == 0 (oracle 2026-10-08).
          onJ: () => this.stepOriginalJ(),
          // 2026-08-22: private void i() (#610) wired -- resetLegacyZI,
          // the SAME shared reset also called from stepGameplayZAh's onI
          // and stepLegacyGameplayTick's three real call sites.
          onI: () => resetLegacyZI(this.game),
          // R()'s n() (offsets 57, 85): the camera step that redraws the
          // terrain into Image[c[1]]. main.ts only runs it for v == 1, and a
          // dialogue over the map is v == 0 -- the terrain stayed black.
          onScroll: () => this.stepCameraScroll(),
          // R() offsets 146..192: helper #435 copies the map band out of
          // Image[c[1]] into Graphics[c[0]]; its exception is swallowed.
          onPartialBlit: (height, destY) => {
            const slots = this.game.frameImageSlots;
            const target = this.offscreenTargets?.graphics[slots[0] as 0 | 1 | 2 | 3];
            const image = this.offscreenTargets?.images[slots[1] as 0 | 1 | 2 | 3];
            if (!target || !image) return;
            try {
              target.drawRegion(image, 0, 120, 264, height, 0, 0, destY, 0);
            } catch {
              // #435 returns false.
            }
          },
          onGameplayDraw: () => this.stepGameplayOuterLoop(this.offscreenTargets?.graphics[this.pFrameState.targetSlot]),
          // onPopulateItems (f.O()) -- CORRECTION (2026-08-24): the SAME
          // already-ported/wired stepLegacyO the "K"/"M" handlers' own onO
          // use (see the "M" handler's onO comment above); was previously
          // left as a stale "not yet resolved" no-op despite the target
          // already existing.
          onPopulateItems: () => this.stepLegacyO(),
          onElementScan: (aD, x, y) => {
            this.framePrimitives.push([aD, x, y]);
            callbacks.onPrimitive?.(aD, x, y);
            this.drawFrameCommandPrimitive(aD, x, y);
          },
          // f.d(IIII)/LegacyZSubrecordDraw (#572), bytecode/f-javap.txt
          // offsets 292..355 of P()'s own tableA0===1 branch -- two calls,
          // records `98+tableA28` and `104`, both at (120,176), targeting
          // the SAME `graphics[targetSlot]` (field #79/N:B, written 0 two
          // instructions earlier at offset 258, exactly like R()'s own
          // established targetSlot=0-then-call pattern this class already
          // follows for onGameplayDraw above). 2026-08-31/09-02: found
          // unwired via live trace (Q=17, al=2, the story-dialog screen) --
          // this callback fires every frame there, and its silent drop is
          // exactly why the canvas's middle ~2/3 painted pure black: the
          // same branch clears that region two calls earlier
          // (`bar.fillRect(11, 120, 240, 128)`, LegacyGameplayPaintTriggers
          // .ts's stepLegacyP) and nothing else was left to redraw it.
          onSpriteDraw: (record, x, y, phase) => {
            this.frameHelperCalls.push({ kind: "p-sprite", record, x, y, mode: phase });
            if (!this.offscreenTargets || !this.packedData || !this.imageGroups[0]) return;
            const graphics = this.offscreenTargets.graphics[this.pFrameState.targetSlot];
            const packed = new LegacyPackedSpriteRenderer({
              shortTables: this.packedData.shortTables,
              byteTables: this.packedData.byteTables,
              imageGroups: this.imageGroups,
              graphics,
            });
            this.stepZSubrecordDraw(record, x, y, phase, {
              onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
            });
          },
          randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
        });
      } else if (handler === "H" || handler === "I" || handler === "J" || handler === "K" || handler === "L" || handler === "N") {
        stepLegacySimpleFrameHandler(handler, this.simpleFrameState, {
          // L()'s C() (#405): the whole map overview, drawn once on entry.
          onC: () => drawLegacyMapOverview(this.mapOverviewInput()),
          // 2026-08-26: confirmed via direct bytecode read (I()/J()/K()/L()/
          // N(), all `invokespecial #438 // Method a:(BII)V`) that this is
          // the SAME f.a(byte,int,int) call onElementScan wires elsewhere --
          // now reuses the same tested drawFrameCommandPrimitive pipeline
          // instead of only tracing.
          onPrimitive: (index, x, y) => {
            this.framePrimitives.push([index, x, y]);
            callbacks.onPrimitive?.(index, x, y);
            this.drawFrameCommandPrimitive(index, x, y);
          },
          // f.K()'s onU (f.u(), case "K" only -- I()/J()/L()/N() don't call
          // it) wired 2026-08-14, same stepGameplayOuterLoop() as R()'s
          // onGameplayDraw (see that method's own docblock). Like am(),
          // K()'s own bytecode never writes N:B (#79) before calling u()
          // -- reads the live game.targetSlot instead of assuming 0
          // (second pass, 2026-08-14).
          onN: () => this.stepCameraScroll(),
          onU: () => this.stepGameplayOuterLoop(this.offscreenTargets?.graphics[this.game.targetSlot]),
          // onO (f.O(), offsets 0..232) -- CORRECTION 2026-08-18: this is
          // the SAME already-ported/tested `stepLegacyO` S()'s own onO
          // callback already uses (confirmed: only one `private void O()`
          // declaration exists in the whole class; K()'s bytecode calls
          // it directly at offset 25-28, `invokespecial #417 // Method
          // O:()V`, right after n()/u() in the same order this dispatch
          // already calls onN/onU/onO) -- was previously left as a stale
          // "remains unresolved" comment despite the target already
          // existing.
          onO: () => this.stepLegacyO(),
          // This callback lives inside stepLegacySimpleFrameHandler's own
          // "case P" branch, which handler === "P" never reaches here (see
          // the real dispatch above -- "P" is fully handled before this
          // call). Dead code either way, but fixed for consistency:
          // f.P()'s own i() call (#610) -- see the real, reachable stepLegacyP
          // wiring's own onI for the live equivalent.
          onInputReset: () => resetLegacyZI(this.game),
        });
      } else if (handler === "M") {
        this.mFrameState.a = this.packedOffsets;
        this.mFrameState.H = this.game.H;
        this.mFrameState.I = this.game.I;
        this.mFrameState.m = this.game.mByte;
        stepLegacyMFrame({
          state: this.mFrameState,
          // f.M()'s onO -- CORRECTION (2026-08-24): confirmed via direct
          // bytecode read (offset 13, `invokespecial #417 // Method
          // O:()V`) to be the SAME already-ported/wired `stepLegacyO`
          // K()'s own onO already uses (see that callback's own comment
          // above) -- was previously left as a stale empty no-op.
          onO: () => this.stepLegacyO(),
          emit: (command) => this.applyMFrameCommand(command),
        });
        this.game.H = this.mFrameState.H;
        this.game.I = this.mFrameState.I;
        this.game.mByte = this.mFrameState.m;
      }
    });
    stepLegacyFrameDispatch({
      ...callbacks,
      // The handlers write game.H directly; re-sync the copy so the write-back
      // below does not undo it. (Until 2026-10-01 it did, and every handler
      // re-ran its H:Z first-entry block each frame.)
      onHandler: (handler) => {
        onHandler(handler);
        this.frameDispatchState.H = this.game.H;
      },
      // 2026-08-26: the Q=18/24/32 inline branches' own onPrimitive calls
      // (bytecode-confirmed invokespecial #438 // Method a:(BII)V, same as
      // I()/J()/K()/L()/N()/onElementScan) previously only reached
      // callbacks.onPrimitive, which main.ts's zero-argument
      // stepFrameDispatch() call never supplies -- wired to the same
      // tested pipeline here.
      onPrimitive: (index, x, y) => {
        this.framePrimitives.push([index, x, y]);
        callbacks.onPrimitive?.(index, x, y);
        this.drawFrameCommandPrimitive(index, x, y);
      },
      state: this.frameDispatchState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      stateTableIndex: 153,
    });
    this.game.H = this.frameDispatchState.H;
  }

  private applyMFrameCommand(command: LegacyMFrameCommand): void {
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
   * `game.IByte`/`KByte` stayed 0 instead of taking `JByte`/
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
  private stepDefaultAd(): void {
    stepLegacyAd({
      state: this.adState,
      // f.aD()'s own call to private void i() (#610, offset 232 -- CORRECTION
      // 2026-08-22: was wired to the unrelated resetInputTransientState(),
      // whose own 17+ fields don't match #610's real 13 at all; see
      // docs/unknowns.md).
      onInputReset: () => resetLegacyZI(this.game),
      onY: () => this.stepCameraFollow(),
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

  /**
   * Raw f.Y(): the real camera-pan driver (see LegacyCameraFollow.ts). Its
   * callers are f.aD() and f.V()'s tail (LegacyGameplayInput's onY, wired;
   * the old "V() not yet ported" note was stale -- 2026-09-28). Builds a
   * fresh state object each call (rather than reusing a persisted one, the
   * pattern used elsewhere in this class) since most of `LegacyCameraFollowState`'s
   * fields are `readonly` from the port's own perspective.
   */
  private stepCameraFollow(): void {
    const state: LegacyCameraFollowState = {
      cameraBFlag: this.game.cameraBFlag,
      inputUp: this.game.inputUp,
      inputDown: this.game.inputDown,
      inputLeft: this.game.inputLeft,
      inputRight: this.game.inputRight,
      cursorColumn: this.game.yByte,
      cursorRow: this.game.AByte,
      cursorTargetColumn: this.game.cursorTargetColumn,
      cursorTargetRow: this.game.cursorTargetRow,
      originColumn: this.game.IByte,
      originRow: this.game.KByte,
      columnScrollDelta: this.game.columnScrollDelta,
      rowScrollDelta: this.game.rowScrollDelta,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      // f.O:B / f.P:B (#83/#87), live -- were a {12, 19} placeholder until 2026-10-09 (oracle run 5,
      // frame 12275: with P 16 the camera scrolls down at K 11, the placeholder stopped it there).
      viewportColumns: this.game.viewportO,
      viewportRows: this.game.viewportP,
      selectionFlags: this.game.selectionFlags,
      selectionBa: this.game.selectionBa,
    };
    stepLegacyCameraFollow(state);
    this.game.yByte = state.cursorColumn;
    this.game.AByte = state.cursorRow;
    this.game.IByte = state.originColumn;
    this.game.KByte = state.originRow;
    this.game.columnScrollDelta = state.columnScrollDelta;
    this.game.rowScrollDelta = state.rowScrollDelta;
  }

  private readonly cameraScrollState: LegacyCameraScrollState = {
    rowScrollDelta: 0, columnScrollDelta: 0, pixelColumnOffset: 0, pixelRowOffset: 0,
    scrollTargetColumn: 0, scrollTargetRow: 0, followFlag: false, cFlag: false,
    bFlag: false, dFlag: false, aiScratch: 0, sFlag: false,
  };
  // f.O:B / f.P:B (#83/#87), live: e.c() sets 11 x 18 (LegacyFrameLayout) and a(ZZZZZZZZZ) changes
  // P:B with the HUD. Was a {12, 19} placeholder until 2026-10-08 (oracle: al/am off by one).
  private readonly cameraScrollViewport: LegacyCameraScrollViewport = (() => {
    const game = this.game;
    return { get columns() { return game.viewportO; }, get rows() { return game.viewportP; } };
  })();
  private readonly aeState: LegacyAeState = {
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
  private stepAe(): void {
    this.aeState.F = this.game.aeTimerF;
    this.aeState.byteF = this.game.FByte;
    this.aeState.uFlag = this.game.uFlag;
    this.aeState.tFlag = this.game.inputT;
    this.aeState.k = this.game.kByte;
    this.aeState.q = this.game.qCounter;
    this.aeState.y = this.game.yByte;
    this.aeState.I = this.game.IByte;
    this.aeState.A = this.game.AByte;
    this.aeState.K = this.game.KByte;
    this.aeState.G = this.game.mapPixelExtentG;
    this.aeState.HCoord = this.game.mapPixelExtentH;
    stepLegacyAe({
      state: this.aeState,
      onFourFlags: (v) => { this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3]); },
      onAI: () => stepLegacyAi({ a4: this.mainArrays.aByte[4]!, dense: this.denseState }),
    });
    this.game.aeTimerF = this.aeState.F;
    this.game.FByte = this.aeState.byteF;
    this.game.uFlag = this.aeState.uFlag;
    this.game.inputT = this.aeState.tFlag;
    this.game.kByte = this.aeState.k;
    this.game.qCounter = this.aeState.q;
    this.game.mapPixelExtentG = this.aeState.G;
    this.game.mapPixelExtentH = this.aeState.HCoord;
  }
  /**
   * Raw f.n(): per-tick camera pixel-scroll handler (see LegacyCameraScroll.ts).
   *
   * BUG FIX (2026-09-08): `onRedraw` (f.o(), five call sites in f.n() matching
   * this port's five `onRedraw?.()` sites) used to be left inert, on the
   * reasoning that "main.ts's own per-frame render() already unconditionally
   * redraws the gameplay map every frame". That substitution put terrain on
   * the WRONG surface. In the original, f.o() draws tiles through
   * `a(int,int,int)` (#439) into `Graphics[N:B]` -- the offscreen buffer --
   * and `paint()`'s v==1 branch then blits that buffer to the screen. The
   * port instead drew terrain straight onto the visible Graphics inside
   * `renderGameplayTo`, and then the (faithful) composite blitted the
   * terrain-less offscreen over the top of it. Measured: the visible canvas
   * went 0 -> 69616 non-black pixels from that direct draw, then back down to
   * 2240 the moment the composite ran. Now wired to `renderMap` against
   * `graphics[targetSlot]`, which is what `Graphics[N:B]` is.
   *
   * `onPartialBlit` is helper #435 (drawRegion, exception swallowed). Offset
   * 134..175 copies the clean map Image[c[0]] into Graphics[c[1]], shifted by
   * aj/ak -- this is what erases last tick's units, bubbles and cursor; 420..455
   * copies Graphics[c[1]] back into Image[c[0]] after any o() redraw.
   * WIRED 2026-09-30: both were inert, so everything u() drew stayed on the
   * map layer until the next full redraw (stale thought bubbles).
   */
  stepCameraScroll(): void {
    this.cameraScrollState.rowScrollDelta = this.game.rowScrollDelta;
    this.cameraScrollState.columnScrollDelta = this.game.columnScrollDelta;
    this.cameraScrollState.pixelColumnOffset = this.game.pixelColumnOffset;
    this.cameraScrollState.pixelRowOffset = this.game.pixelRowOffset;
    this.cameraScrollState.scrollTargetColumn = this.game.scrollTargetColumn;
    this.cameraScrollState.scrollTargetRow = this.game.scrollTargetRow;
    this.cameraScrollState.followFlag = this.game.AFlag;
    this.cameraScrollState.cFlag = this.game.cameraCFlag;
    this.cameraScrollState.bFlag = this.game.cameraBFlag;
    this.cameraScrollState.dFlag = this.game.cameraDFlag;
    this.cameraScrollState.aiScratch = this.game.aiScratch;
    this.cameraScrollState.sFlag = this.game.cameraSFlag;
    stepLegacyCameraScroll(this.cameraScrollState, this.cameraScrollViewport, this.game.selectionAInt, {
      onPartialBlit: (destX, destY, height, graphicsSlot, imageSlot) => {
        const slots = this.game.frameImageSlots;
        const target = this.offscreenTargets?.graphics[slots[graphicsSlot] as 0 | 1 | 2 | 3];
        const image = this.offscreenTargets?.images[slots[imageSlot] as 0 | 1 | 2 | 3];
        if (!target || !image) return;
        try {
          target.drawRegion(image, 0, 0, 264, height, 0, destX, destY, 0);
        } catch {
          // #435 returns false.
        }
      },
      // f.o() (#629): redraw the tile window into the offscreen buffer the
      // composite reads, i.e. Graphics[N:B] == graphics[targetSlot].
      onRedraw: () => {
        this.renderMap(
          { ...LEGACY_DEFAULT_MAP_VIEWPORT, column: this.game.IByte, row: this.game.KByte },
          (this.game.targetSlot as 0 | 1 | 2 | 3),
        );
      },
    });
    this.game.rowScrollDelta = this.cameraScrollState.rowScrollDelta;
    this.game.columnScrollDelta = this.cameraScrollState.columnScrollDelta;
    this.game.pixelColumnOffset = this.cameraScrollState.pixelColumnOffset;
    this.game.pixelRowOffset = this.cameraScrollState.pixelRowOffset;
    this.game.scrollTargetColumn = this.cameraScrollState.scrollTargetColumn;
    this.game.scrollTargetRow = this.cameraScrollState.scrollTargetRow;
    this.game.AFlag = this.cameraScrollState.followFlag;
    this.game.cameraCFlag = this.cameraScrollState.cFlag;
    // BUG FIX (2026-09-03): `bFlag` (B:Z #39, game.cameraBFlag) was read in
    // at the top of this method but never written back here. Real bytecode
    // offset 349..358 of f.n() (`getfield B:Z; ifeq 405; ... putfield 0
    // B:Z`) resets the field to false once its one-shot redraw branch has
    // fired -- `stepLegacyCameraScroll`'s own `if (state.bFlag) { state.bFlag
    // = false; ... }` mirrors that correctly, but the result only ever
    // landed on the throwaway `cameraScrollState.bFlag` copy, never flowed
    // back to `game.cameraBFlag`. `LegacyCameraFollow.ts` (f.Y(), the D-pad
    // cursor driver) has `if (state.cameraBFlag) return;` as its very first
    // line -- once anything set the real field true (e.g. the effect-rect
    // marker `c(IIII)`'s unconditional `state.B = true` in
    // LegacyEffectRectMark.ts, which fires routinely during normal
    // gameplay ticks), the missing write-back meant it could never be
    // observed as reset, permanently blocking direction-key cursor
    // movement. `dFlag` (D:Z #44) has no other reader anywhere in the
    // codebase and is set true then false again within the very same
    // `stepLegacyCameraScroll` call (truly transient, matching that
    // field's own docblock), so it is deliberately left unsynced.
    this.game.cameraBFlag = this.cameraScrollState.bFlag;
    this.game.aiScratch = this.cameraScrollState.aiScratch;
  }

  /** Apply the proven f.an() table/state branches with unresolved callbacks inert. */
  private stepDefaultAn(): void {
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

  /** Apply f.ao()'s table/state branch with unresolved child helpers inert. */
  private stepDefaultAo(): void {
    this.aoTrace.count += 1;
    this.aoTrace.inputQ = this.aoState.Q;
    this.aoTrace.inputZ = this.aoState.Z;
    this.aoTrace.value = this.packedBytes[
      this.packedOffsets[151] + this.packedBytes[this.packedOffsets[152] + this.aoState.Q] + this.aoState.Z
    ];
    stepLegacyAo({
      state: this.aoState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      // aoState is live, so ap()'s Q = 28 sticks (it used to be undone by a
      // copy-out, leaving every Q = 20 prompt open forever).
      onAp: () => { this.stepEntityActionConfirmation(); },
      onLanguage: (language) => this.selectLanguage(language),
      onResourceLoad: (slot) => {
        if (slot === 0 || slot === 1) this.loadLanguageResource(slot);
      },
      onAr: () => { this.stepDefaultArFromAo(); },
      // f.ao()'s Q===18||Q===17 branch: `this.b(-1)` (constant-pool #541,
      // f.b(int)). Confirmed via direct bytecode read (offset 176..181 of
      // ao()) that it really is a call on `this`, not on the c-typed
      // resource-loader field.
      //
      // BUG FIX (2026-08-31): this used to call `runSceneDispatch`, which
      // is an INCOMPLETE second port of f.b(int) covering only offsets
      // 0..54 and opening with `if (value < 0) return;`. Since ao() always
      // passes -1 here, the call did nothing at all -- that is precisely
      // why Q=18 was a dead end. The complete port (the full offset-54
      // shared tail, its an:B dispatch, and f(int,int)) already existed as
      // stepSubsystemStateCommand; point at it instead. See that method
      // and LegacyStateTransitionCommand.ts for the duplicate-port note.
      onB: (value) => { this.stepSubsystemStateCommand(value); },
      onAq: () => {
        // Live fields: aM() (offsets 96/298) sets c:I = 0, and the q < 5 branch leaves it there.
        // FIXED 2026-10-14 (oracle run 15, play23 frame 73824, mission 4 -> 5): a snapshot taken
        // before the call wrote the old c back afterwards.
        const state = liveView<LegacyAqState>(this.game, {
          m: "mByte", Q: "Q", U: "U", u: "uByte", q: "qByte", T: "actionT", R: "R", vInt: "vInt",
          r: "progressR", s: "sByte", V: "progressV", Z: "Z", c: "c",
        });
        stepLegacyAq({
          state,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          onAM: () => this.resetMapEntryAllocation(state.q),
          // f.aq()'s q===6 sub-branch calls `this.b(59)` (constant-pool
          // #541) -- the SAME f.b(int)/runSceneDispatch as onB above, not
          // a distinct "entity signal" method; confirmed via direct
          // bytecode read (offset 224..229 of aq()).
          onEntitySignal: (signalValue) => this.runSceneDispatch(signalValue),
          onGByte: () => this.saveOriginalResourceAction(0),
          onSound: (soundValue) => this.selectResourceSection(soundValue),
        });
      },
      onAs: () => {
        const state = { Z: this.aoState.Z, eByte: this.aoState.eByte, lInt: this.aoState.lInt };
        stepLegacyAs({
          state,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          // f.as()'s `f.a:La;` (#148) is a lazily-constructed MIDI Player
          // wrapper (class `a`, `new a("/s"+track+"audio/midi")`) -- a
          // genuinely separate, unported audio-playback path from the
          // already-ported f.aQ()/startOriginalAudio() track player.
          // onAudio/onAudioStop stay unwired: Q=12 never appears in the
          // confirmed real device Q sequence (see reverse-engineering/
          // main-menu-cutscene-walkthrough.md §13), so this stays a
          // documented, off-critical-path gap rather than invented audio
          // plumbing. See docs/unknowns.md 2026-08-31 entry.
          onAQ: () => this.startOriginalAudio(),
        });
        this.aoState.Z = state.Z;
        this.aoState.eByte = state.eByte;
        this.aoState.lInt = state.lInt;
      },
      // f.at() (Q=13, difficulty) writes b:B #243 (levelBByte), c:B #265
      // (progressC) and d:B #276 (persistedDByte). FIXED 2026-09-27: b was a
      // throwaway local (the chosen difficulty was dropped), c went to the
      // frame counter c:I #260 (so f.F() ran H() instead of G() and the
      // mission-select panel was never drawn), d to the tick counter d:I.
      onAt: () => {
        const state = {
          Z: this.aoState.Z,
          b: this.game.levelBByte,
          c: this.game.progressC,
          q: this.aoState.q,
          Q: this.aoState.Q,
          d: this.game.persistedDByte,
          r: this.aoState.r,
          V: this.aoState.V,
          vInt: this.aoState.vInt,
          pByte: this.aoState.pByte,
          s: this.aoState.s,
          R: this.aoState.R,
          H: this.aoState.H,
        };
        stepLegacyAt({ state, onGByte: () => this.saveOriginalResourceAction(0) });
        this.aoState.Z = state.Z;
        this.game.levelBByte = state.b;
        this.game.progressC = state.c;
        this.aoState.q = state.q;
        this.aoState.Q = state.Q;
        this.game.persistedDByte = state.d;
        this.aoState.V = state.V;
        this.aoState.vInt = state.vInt;
        this.aoState.pByte = state.pByte;
        this.aoState.s = state.s;
        this.aoState.R = state.R;
      },
      onAv: () => {
        const state = {
          Q: this.aoState.Q,
          Z: this.aoState.Z,
          vInt: this.aoState.vInt,
          mByte: this.aoState.mByte,
          aShort: this.mainArrays.aShort,
        };
        stepLegacyAv({
          state,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          onCByte: (value) => this.selectResourceSection(value),
        });
        this.aoState.Q = state.Q;
        this.aoState.Z = state.Z;
        this.aoState.vInt = state.vInt;
        this.aoState.mByte = state.mByte;
      },
      // f.ao()'s Q===25 branch: `f.d:[S]` (#269, already tracked as
      // game.zlDShorts) index 4, and `f.b:[Z]` (#234, already tracked as
      // game.frameFlags) index 2 -- both confirmed elsewhere in this
      // codebase (LegacyFrameCommandChanged.ts) as the SAME two arrays.
      onDShortWrite: (index, value) => { this.game.zlDShorts[index] = value; },
      onBooleanFlag: (index, value) => { this.game.frameFlags[index] = value; },
      onAw: () => {
        const state = {
          q: this.aoState.q,
          R: this.aoState.R,
          Q: this.aoState.Q,
          W: this.game.actionWFlag,
          Z: this.aoState.Z,
          r: this.aoState.r,
          af: this.aoState.af,
          vInt: this.aoState.vInt,
          aaInt: this.aoState.aaInt,
        };
        stepLegacyAw(state);
        this.aoState.q = state.q;
        this.aoState.R = state.R;
        this.aoState.Q = state.Q;
        this.aoState.Z = state.Z;
        this.aoState.vInt = state.vInt;
        this.aoState.aaInt = state.aaInt;
      },
      onAu: () => {
        const state = {
          Q: this.aoState.Q,
          Z: this.aoState.Z,
          q: this.aoState.q,
          s: this.aoState.s,
          vInt: this.aoState.vInt,
          pByte: this.aoState.pByte,
          T: this.aoState.T,
          R: this.aoState.R,
        };
        stepLegacyAu({
          state,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          onGByte: () => {
            this.game.sByte = state.s;
            this.game.persistedPByte = state.pByte;
            return this.saveOriginalResourceAction(0);
          },
        });
        this.aoState.Q = state.Q;
        this.aoState.Z = state.Z;
        this.aoState.q = state.q;
        this.aoState.s = state.s;
        this.aoState.vInt = state.vInt;
        this.aoState.pByte = state.pByte;
        this.aoState.T = state.T;
        this.aoState.R = state.R;
      },
      onAx: () => {
        const state = {
          Z: this.aoState.Z,
          Q: this.aoState.Q,
          R: this.aoState.R,
          q: this.aoState.q,
          s: this.aoState.s,
          V: this.aoState.V,
          vInt: this.aoState.vInt,
          pByte: this.aoState.pByte,
          aaInt: this.aoState.aaInt,
          r: this.aoState.r,
        };
        stepLegacyAx(state);
        this.aoState.Z = state.Z;
        this.aoState.Q = state.Q;
        this.aoState.R = state.R;
        this.aoState.vInt = state.vInt;
        this.aoState.pByte = state.pByte;
        this.aoState.aaInt = state.aaInt;
      },
      onAy: () => {
        const state = {
          X: this.game.XFlag,
          Q: this.aoState.Q,
          R: this.aoState.R,
          vInt: this.aoState.vInt,
          U: this.game.U,
          Z: this.aoState.Z,
          c: this.aoState.c,
          g: 0,
        };
        stepLegacyAy({ state, onAM: () => this.resetMapEntryAllocation(this.aoState.q) });
        this.aoState.Q = state.Q;
        this.aoState.R = state.R;
        this.aoState.vInt = state.vInt;
        this.aoState.Z = state.Z;
        this.aoState.c = state.c;
      },
      onAz: () => {
        const state = {
          Q: this.aoState.Q,
          R: this.aoState.R,
          Z: this.aoState.Z,
          aaInt: this.aoState.aaInt,
          vInt: this.aoState.vInt,
        };
        stepLegacyAz({ state, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets });
        this.aoState.Q = state.Q;
        this.aoState.R = state.R;
        this.aoState.aaInt = state.aaInt;
        this.aoState.vInt = state.vInt;
      },
      // f.ao()'s value===1/3 branches' `this.a.a(70|74)` call, and f.av()'s
      // own `this.a.a(75)` call above -- all the same c.a(int), see
      // selectResourceSection's docblock.
      onCByte: (value) => { this.selectResourceSection(value); },
      // f.ao()'s value===2 branch writes two bytes directly into the same
      // packedBytes table `stepLegacyAo` already reads from -- the target
      // indices are computed inline by stepLegacyAo itself, so this
      // callback only needs to perform the write.
      onResourceByte: (index, value) => { this.packedBytes[index] = value; },
      // f.ao()'s value===7 branch (`onA0`, a pre-existing but misleadingly
      // named callback -- confirmed via direct bytecode read, offset
      // 901..905, that it really calls `this.aA()`, constant-pool #482,
      // NOT some hypothetical "a0()"). aA() is already fully ported and
      // tested as stepLegacyAA (verify-state-short-helpers.mjs) but was
      // never called from anywhere in the runtime until this wiring.
      onA0: () => {
        const state = {
          Q: this.aoState.Q,
          R: this.aoState.R,
          Z: this.aoState.Z,
          aaInt: this.aoState.aaInt,
          X: this.game.XFlag,
          q: this.aoState.q,
          t: this.game.tByte,
          W: this.game.actionWFlag,
          T: this.aoState.T,
          vInt: this.aoState.vInt,
        };
        stepLegacyAA(state);
        this.aoState.Q = state.Q;
        this.aoState.R = state.R;
        this.aoState.aaInt = state.aaInt;
        this.game.XFlag = state.X;
        this.aoState.T = state.T;
        this.aoState.vInt = state.vInt;
      },
      // f.ao()'s fabricated KFlag tail (no bytecode behind it) was deleted
      // from stepLegacyAo 2026-09-27; nothing to wire here.
      onDestroy: () => { this.game.b = false; },
    });
    this.aoTrace.outputQ = this.game.Q;
  }

  /** Execute f.ar() against the live f.ao() field bank. */
  private stepDefaultArFromAo(): void {
    // Live (2026-09-23): onAM's aM() writes these fields itself.
    const state = Object.assign(
      liveView<Omit<Parameters<typeof stepLegacyAr>[0]["state"], "g">>(this.game, {
        vInt: "vInt", Q: "Q", U: "U", Z: "Z", c: "c", T: "actionT", q: "qByte", R: "R", eByte: "eByte",
        ac: "acFlag", pByte: "persistedPByte", s: "sByte", t: "tByte", H: "H",
      }),
      { g: 0 },
    );
    stepLegacyAr({
      state,
      onDestroy: () => { this.game.b = false; },
      onAM: () => this.resetMapEntryAllocation(this.game.qByte),
      onAQ: () => { this.startOriginalAudio(); },
      // v=62 (new game over a saved one: s = -1, t = -2) ends with e(0)
      // (#589, offset 260) -- the progress save, not a map load as this
      // used to say. Wired 2026-09-27, so the reset progress is written.
      onGByte: (slot) => this.saveOriginalResourceAction(slot),
    });
  }

  /** Enter the confirmed f.a(byte,byte,byte) prefix from the live W() path. */
  private beginEntityAction(ap: number, am: number, an: number): void {
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
        this.game.vByte = 0; // v:B (#376)
        this.game.H = true; // H:Z (#57)
        this.game.vInt = 12 + ap; // v:I (#375)
      },
      onSelectionCopy: (values) => { this.stateCommandState.dFlags.splice(0, 9, ...values); },
      onSelectionApply: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      onAFlag: () => { this.game.AFlag = true; },
    });
  }

  /** f.e(int) (#590): take one unit out of the selection groups. */
  private stepSelectionE(id: number): void {
    releaseLegacyEntitySelection({
      groups: this.mainArrays.aByte,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      id,
      F: this.game.FByte,
      w: this.game.wByte,
      onModeReset: () => { this.game.wByte = 0; },
      onFReset: () => { this.game.FByte = -1; },
    });
  }

  /**
   * f.aF() (#487): select every team-0 unit in the window B..E (d(byte)'s
   * double-tap sets it to the viewport). WIRED 2026-09-23.
   */
  private selectWindowUnits(): void {
    const a4 = this.mainArrays.aByte[4]!;
    stepLegacyAf({
      state: liveView<LegacyAfState>(this.game, {
        uFlag: "uFlag", tFlag: "inputT", F: "FByte", k: "kByte", w: "wByte",
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
  private stepGroupKey(store: boolean): void {
    const state = liveView<LegacyGroupKeyState>(this.game, {
      wFlag: "wFlag", I: "inputI", i: "iByte", F: "FByte", k: "kByte", w: "wByte",
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
  private stepZAh(): void {
    const g = this.game;
    // Live: the w == 4 path's l(-1) writes P and w itself.
    const ahState = liveView<Parameters<typeof stepLegacyZAh>[0]>(g, {
      K: "kFlag", P: "pendingP", w: "wByte", k: "kByte", fByte: "FByte",
      l: "frameLayoutL", q: "qCounter", entityFocusFlag: "entityFocusFlag", V: "zAfCursorVFlag",
    });
    stepLegacyZAh(ahState, {
      onL: (value) => this.stepLegacyL(value),
      onSelectionReset: (a, b, c, d) => this.runSelectionFlagsRefresh(a, b, c, d),
      onI: () => resetLegacyZI(g),
    });
  }

  /** f.aj() (#511), LegacyZAj.ts: park the selection cursor on the next living unit. */
  private stepZAj(): void {
    const g = this.game;
    const ajState = {
      entityFocusFlag: g.entityFocusFlag, as: g.frameLayoutAS, frameLayoutAX: g.frameLayoutAX,
      kByte: g.kByte, frameLayoutL: g.frameLayoutL, pendingP: g.pendingP, dense: this.denseState,
    };
    stepLegacyZAj(ajState);
    g.entityFocusFlag = ajState.entityFocusFlag;
    g.frameLayoutAS = ajState.as;
    g.frameLayoutAX = ajState.frameLayoutAX;
    g.kByte = ajState.kByte;
    g.frameLayoutL = ajState.frameLayoutL;
    g.pendingP = ajState.pendingP;
  }

  /** Execute f.ap() when f.ao() reaches Q=20 and copy its proven writes back. */
  private stepEntityActionConfirmation(): void {
    const state = this.entityActionState;
    stepLegacyAp({
      state,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      onEntityPrepare: (id) => this.stepSelectionE(id),
      // b.a(int) (#471) for team 0 (b.u = 0) and the prompt's unit (b.v = am);
      // wired 2026-09-27 -- the ap = 14/15 prompts never sent the unit off.
      onSubsystemCheck: (kind) => stepLegacySubsystemNearestBuilding({
        state: this.denseState, packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
        team: 0, entityId: state.am, kind,
      }),
      onEntityConfigure: (id) => {
        const result = finalizeLegacyEntitySelection({
          id,
          k: this.game.kByte,
          w: this.game.wByte,
          l: this.game.frameLayoutL,
          q: this.game.qCounter,
          dense: this.denseState,
          onSelectionReset: () => { this.runSelectionFlagsRefresh(true, true, false, false); },
        });
        this.game.kByte = result.k;
        this.game.wByte = result.w;
        this.game.frameLayoutL = result.l;
      },
      // f(int,int) moves the camera; offsets 275..304 then save the moved
      // I/K/y/A (live fields -- a snapshot made ad() snap the camera back).
      onEntityFallback: (id, value) => { this.stepEntityCoordinateUpdate(id, value); },
      snapshot: this.stateCommandState.dFlags,
      onSelection: (v) => this.runSelectionFlagsRefresh(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]),
      onFinalize: () => {
        const state = {
          uFlag: this.game.uFlag, F: this.game.FByte, k: this.game.kByte,
          E: this.game.ECounter, D: this.game.DCounter,
          C: this.game.CCounter, B: this.game.BCounter,
        };
        stepLegacyAj(state);
        this.game.uFlag = state.uFlag;
        this.game.FByte = state.F;
        this.game.kByte = state.k;
        this.game.ECounter = state.E;
        this.game.DCounter = state.D;
        this.game.CCounter = state.C;
        this.game.BCounter = state.B;
      },
      // w == 3 path (offsets 138..144): l(-1), ah().
      onRelease: (value) => this.stepLegacyL(value),
      onAh: () => this.stepZAh(),
      onOReset: () => { this.game.oInt = 0; },
      onPReset: () => { this.game.pendingP = false; },
      onFlag4: () => { this.game.frameFlags[4] = true; },
      onZ: () => this.stepFrameSelectionTransition(),
      onAj: () => this.stepZAj(),
    });
  }

  /**
   * BUG FIX (2026-08-18): `C`/`D`/`sFlag`/`c`/`d` used to read from
   * `game.viewportC`/`viewportD`/`viewportSFlag`/`viewportCSize`/
   * `viewportDSize` -- placeholder fields whose own docblock admitted
   * "source table aliases remain unresolved" (never checked against real
   * bytecode). Direct reads of `aK()`'s own raw bytecode (offset 1-13,
   * 44-48) confirm `C:B`(#42)/`D:B`(#45)/`s:Z`(#365) are the SAME already-
   * tracked `cursorTargetColumn`/`cursorTargetRow`/`cameraSFlag` fields
   * `f.Y()`/`f.n()` already use; `c:S`(#254)/`d:S`(#266) are `mapWidth`/
   * `mapHeight` (also independently confirmed via `f.aK()`'s own bytecode,
   * matching this project's other confirmed uses of #254/#266). The old
   * fields were fed by nothing real (`viewportC`/`viewportD`/
   * `viewportSFlag` had zero correct producers; `viewportCSize`/
   * `viewportDSize` were a harmless but redundant copy of `mapWidth`/
   * `mapHeight`, always set together with them) -- so this call has likely
   * been normalizing the viewport against stale/wrong inputs since it was
   * written. See docs/unknowns.md for the discovery trace.
   */
  private normalizeEntityViewport(): void {
    const viewport = {
      C: this.game.cursorTargetColumn, D: this.game.cursorTargetRow,
      y: this.game.yByte, A: this.game.AByte,
      I: this.game.IByte, K: this.game.KByte,
      sFlag: this.game.cameraSFlag, O: this.game.viewportO,
      c: this.game.mapWidth, P: this.game.viewportP, d: this.game.mapHeight,
    };
    stepLegacyAKViewport(viewport);
    this.game.yByte = viewport.y;
    this.game.AByte = viewport.A;
    this.game.IByte = viewport.I;
    this.game.KByte = viewport.K;
  }

  private stepEntityCoordinateUpdate(id: number, offset: number): void {
    const state = {
      // BUG FIX (2026-08-31): `L` was read from/written to `game.frameLayoutL` --
      // that field is f.l:B (#337, LOWERCASE l), a completely different
      // field from the one this method actually writes. Direct bytecode
      // read (private void f(int,int), offset 8..13: `putfield #72 // L:B`)
      // confirms the real target is #72 (UPPERCASE L, saved K), already
      // tracked separately as `game.cameraSavedKByte` -- see its own
      // docblock in LegacyGameState.ts, and the note this exact trap was
      // already caught once before while tracing T()'s ai===48 branch.
      // Found while merging the duplicate f(int,int) port (`stepLegacyF2`,
      // deleted) into this one: that port DID target `cameraSavedKByte`
      // correctly, which is what exposed the mismatch. Every call here was
      // silently corrupting game.frameLayoutL (heavily used elsewhere -- entity
      // finalize, gameplay tick, map focus) with K's old value, while the
      // real #72 field never got written by this method at all.
      J: this.game.JByte, I: this.game.IByte,
      L: this.game.cameraSavedKByte, K: this.game.KByte,
      C: this.game.cursorTargetColumn, D: this.game.cursorTargetRow,
      AFlag: this.game.AFlag,
    };
    stepLegacyEntityCoordinateUpdate({
      state, id, offset, dense: this.denseState,
      packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
      // BUG FIX (2026-08-18): in the original, aK() and f(int,int) share the
      // SAME I:B/K:B instance fields -- no local-copy step exists. This
      // port's `state.I`/`state.K` are a separate local copy from
      // `game.IByte`/`game.KByte`, so a two-way sync is needed around the
      // callback: push the freshly-computed state.I/K INTO game.IByte/KByte
      // first (so aK() actually clamps the fresh position, not whatever
      // game.IByte/KByte happened to hold before this call started), then
      // pull the clamped result back OUT into state.I/K afterward (so the
      // eventual write-back below doesn't overwrite aK()'s clamp with the
      // stale pre-clamp value). Missing either half is a real bug -- the
      // first version of this fix only did the pull-back half and silently
      // fed aK() the WRONG (stale, pre-position-update) input instead.
      onViewportNormalize: () => {
        this.game.IByte = state.I;
        this.game.KByte = state.K;
        this.normalizeEntityViewport();
        state.I = this.game.IByte;
        state.K = this.game.KByte;
      },
    });
    this.game.JByte = state.J;
    this.game.IByte = state.I;
    this.game.cameraSavedKByte = state.L;
    this.game.KByte = state.K;
    this.game.AFlag = state.AFlag;
  }

  /**
   * Exact `private void E()` (bytecode/f-javap.txt offsets 0..157) --
   * `stepLegacyGameplayCommand`'s `onExitPreparation` target (`f.W()`'s
   * `iByte===3` branch, the non-`qByte===3` continuation). Computes two
   * independent clamped viewport-window origins from the camera position
   * (`IByte`/`KByte`) and viewport size (`viewportO`/`viewportP`) against
   * the map bounds (`mapWidth`/`mapHeight`), using two fixed constants
   * (`ag:B`(#195)=40, `ah:B`(#198)=60 -- confirmed via exhaustive grep to
   * have exactly one `putstatic` each, in the class's own `static{}`
   * initializer, never written anywhere else -- true constants, inlined
   * directly rather than tracked as fields). The vertical branch is
   * mutually exclusive: `ah:B<=mapHeight` computes `exitPrepXInt`, else
   * computes `exitPrepALInt` instead (confirmed via the bytecode's own
   * `if_icmple`/early-return structure, not both). Consumers of these
   * three outputs (`W:I`/#111, `X:I`/#114, `aL:I`/#160) are read from many
   * call sites across `V()`/`X()` and others -- out of scope here; this
   * only ports the producer.
   */
  private stepLegacyExitPreparation(): void {
    const g = this.game;
    g.exitPrepWInt = (g.IByte - Math.trunc(40 / 2)) + (g.viewportO >> 1);
    if (g.exitPrepWInt < 0) {
      g.exitPrepWInt = 0;
    } else if (g.exitPrepWInt + 40 >= g.mapWidth) {
      g.exitPrepWInt = g.mapWidth - 40;
    }

    if (60 <= g.mapHeight) {
      g.exitPrepXInt = (g.KByte - Math.trunc(60 / 2)) + (g.viewportP >> 1);
      if (g.exitPrepXInt < 0) {
        g.exitPrepXInt = 0;
      } else if (g.exitPrepXInt + 60 >= g.mapHeight) {
        g.exitPrepXInt = g.mapHeight - 60;
      }
    } else {
      g.exitPrepALInt = (60 - g.mapHeight) >> 1;
    }
  }

  /** Raw f.am() branch port; caller supplies the unresolved subsystem callbacks. */
  stepStateAm(input: Omit<LegacyAmInput, "packedBytes" | "packedOffsets">): void {
    stepLegacyAm({
      ...input,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  // CLEANUP (2026-08-25): stepStateAn/Ao/Ap/Aq/Ar/As/At/Au/Av/Aw/Ax/Ay/Az/
  // AA/Ad/AB/AC/Ae/Af/Ag/Ah/Aj/AKViewport/AL/resetStateAM (25 thin public
  // wrappers over LegacyStateMachine.ts's stepLegacyA* functions) removed --
  // confirmed via full-repo grep zero callers anywhere (not the runtime,
  // not any verify-*.mjs). Some of the underlying stepLegacyA* functions
  // (An/Ao/Ap/Ar/Au/Aw/Ad/AB/AC/Ae/Aj/AKViewport/resetLegacyAM) ARE live,
  // just wired directly at their own real call sites elsewhere in this
  // file rather than through these wrappers -- those are untouched. Others
  // (Aq/As/At/Av/Ax/Ay/Az/AA/Af/Ag/Ah) have NO other caller anywhere and
  // are genuinely unreachable dead code right now -- left in place in
  // LegacyStateMachine.ts (not deleted, since some may still get a real
  // wiring site found later; see stepLegacyAo's own callback-cluster
  // wiring gap in docs/parity-checklist.md for several of them).
  stepStateAi(input: LegacyAiInput): void { stepLegacyAi({ ...input, dense: input.dense ?? this.denseState }); }
  stepStateAOMap(input: LegacyAOMapInput): void { stepLegacyAOMap(input); }

  /** Raw f.U() transition runner; unresolved owners remain callback seams. */
  stepStateU(input: Omit<LegacyStateUInput, "dense" | "packedBytes" | "packedOffsets">): void {
    stepLegacyStateU({
      ...input,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Raw f.b(int) command boundary; negative completion can enter f.U(). */
  stepStateTransitionCommand(
    input: Omit<LegacyStateTransitionCommandInput, "packedBytes" | "packedOffsets">,
    value: number,
  ): void {
    stepLegacyStateTransitionCommand({
      ...input,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    }, value);
  }

  /**
   * Runtime owner for the b-side f.b(int) command submission.  The state is
   * shared across calls because f.S() initializes the ai/aj/ak sequence and
   * later negative f.b() commands advance that same sequence.
   */

  private stepSubsystemStateCommand(value: number): void {
    // stateCommandState is live (see its docblock): no copy in or out.
    const state = this.stateCommandState;

    this.stepStateTransitionCommand({
      state,
      // BUG FIX (2026-08-31): `i()` (#610) is `b(int)`'s own unconditional
      // first instruction (offset 0..1 of every call, positive or negative
      // arg) -- was never wired on this call path at all (only the
      // now-dead `runSceneDispatch` called `resetLegacyZI` directly).
      onReset: () => resetLegacyZI(this.game),
      onS: () => {
        this.stepStateS({
          state,
          aFlags: this.game.selectionFlags,
          onAJ: () => {
            const ajState = {
              uFlag: this.game.uFlag, F: this.game.FByte, k: this.game.kByte,
              E: this.game.ECounter, D: this.game.DCounter, C: this.game.CCounter, B: this.game.BCounter,
            };
            stepLegacyAj(ajState);
            this.game.uFlag = ajState.uFlag;
            this.game.FByte = ajState.F;
            this.game.kByte = ajState.k;
            this.game.ECounter = ajState.E;
            this.game.DCounter = ajState.D;
            this.game.CCounter = ajState.C;
            this.game.BCounter = ajState.B;
          },
          onInputReset: () => this.stepLegacySceneAnimatedSlotClear(),
          onCSelector: (value) => this.selectResourceSection(value),
          // f.O() (~142 lines), called when aP:I===1. UNIFICATION (2026-08-31):
          // previously left unwired here (deferred, matching a note that
          // this call path's traced args never hit aP===1) while the
          // now-deleted duplicate `stepLegacyS`/`runSceneDispatch` DID wire
          // it (`stepLegacyO`, already fully ported and used elsewhere by
          // the "K"/"M" handlers' own onO). Wiring it here too now that this
          // is the ONLY S() path any caller reaches, positive or negative.
          onO: () => this.stepLegacyO(),
          onSelectionSync: (first, second, third, fourth) => this.runSelectionFlagsRefresh(first, second, third, fourth),
        });
      },
      onT: () => {
        // T()'s aw/q/bF are live fields (game.levelAwByte/qByte and b.f:B,
        // game.subsystemGFFlagByte). MERGED 2026-09-23: b.f:B -- the
        // mission-script step -- had three unsynced copies (this one was
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
        // verify-scene-dispatch-branches.mjs's ai===48 case once this
        // became the ONLY T() path (previously masked because the deleted
        // duplicate `stepLegacyTAi48` wrote game.* directly with no
        // batching). Fixed by making aw/q/bF live accessors straight onto
        // game.* instead of a snapshot -- each write is now visible
        // immediately, matching bytecode field-mutation semantics exactly.
        const runtime = this;
        const tState = {
          ai: state.ai,
          get aw() { return runtime.game.levelAwByte; },
          set aw(value: number) { runtime.game.levelAwByte = value; },
          get q() { return runtime.game.qByte; },
          set q(value: number) { runtime.game.qByte = value; },
          get bF() { return runtime.game.subsystemGFFlagByte; },
          set bF(value: number) { runtime.game.subsystemGFFlagByte = value; },
          p: state.p,
        };
        // Live q:B matters here: T() sets q (offsets 480/502) before its
        // placements (bug fixed 2026-08-31, now covered by the shared getters).
        const placementOptions = this.buildingPlacementOptions();
        this.stepStateT({
          state: tState,
          onRecordAction: (first, second) => this.stepEntityCoordinateUpdate(first, second),
          onSubsystemL: () => this.stepLegacyBL(),
          onSubsystemM: () => this.stepLegacyBM(),
          onRecordCommand: (first, second, third) => this.stepLegacyD3(first, second, third),
          onEntityCreate: (team, x, y, type, flags) => {
            this.allocateRecord(this.gridC, team, x, y, type, flags, this.recordOptions());
          },
          // NOTE (2026-08-25, resolved 2026-08-31): this rebuilds live
          // aw/q on every onBCreate call rather than snapshotting one
          // `batchOptions` up front. Confirmed via bytecode (f-javap.txt
          // offsets 131..259, T()'s ai===37 branch) that aw:B is mutated
          // BETWEEN the b.a(IIIBB) invocations and each call reads b's own
          // live field state, so a stale single snapshot would be wrong.
          // The duplicate hand-written T() port (stepLegacyTAi37/38/48,
          // which DID snapshot once) has since been deleted -- this is now
          // the only implementation, and it uses the confirmed-correct
          // live-rebuild approach.
          onBCreate: (count, x, y, type, value) => {
            try {
              this.batchAllocate(count, x, y, type, value);
            } catch { /* f.ak() catches this, matching the original */ }
          },
          onPlace: (team, type, x, y, flags, special, existingId) => {
            this.placeEntity(this.gridC, team, type, x, y, flags, special, existingId, placementOptions);
          },
          onMapReset: (q) => { this.resetMapEntryAllocation(q); },
          onMapLoad: (q) => { this.loadMap(q); },
          onResourceReset: () => {
            try { stepLegacyClassCReset(this.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
          },
          // f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- same
          // already-wired helper stepLegacySubsystemH's own onSubsystemRecord
          // uses.
          onSubsystemRecordAllocate: (first, x, y, counterIndex) => {
            this.allocateSubsystemRecord(this.gridC, first, x, y, counterIndex, {
              randomRemainder: (mask, divisor) => this.randomRemainder(mask, divisor),
              counters: this.game.subsystemT,
              q: this.game.qByte,
            });
          },
        });
        // No write-back needed: aw/q/bF above are now live game.* accessors.
      },
      onU: () => {
        this.stepStateU({
          state,
          frame: this.game.c,
          // Wired 2026-09-27: ai == 26 runs f.c() (offset 22) and ai == 28
          // clears one b.d:[S entry (offset 105).
          onMapSession: () => this.stepLegacyC(),
          onShortWrite: (index, value) => { this.subsystemArrays.dShort[index] = value; },
          onScriptTimer: (value) => { this.subsystemArrays.bField16 = value; },
          // BUG FIX (2026-09-04): U()'s very first bytecode instruction
          // (f-javap.txt offset 0..4, before any of its selector branches)
          // is `this.a.d()` -- a full b.d() spatial pass -- but this
          // callback was entirely missing from this call site (LegacyStateU
          // .ts's `onSubsystemReset?.()` silently no-op'd every call). b.d()
          // is the ONLY place in the whole game that ever writes the
          // fog/vision bitmap (`mainArrays.aInt`, f.a:[[[I) for team-0
          // units/buildings -- with this never wired, occupancyClass() read
          // 2 (fully unexplored) for every tile on every map, forever,
          // which blocks every entity-branch sprite draw in
          // LegacyGameplayCellLoop.ts (positive branch requires
          // occupancyClass===0; the negative branch's and tail's own first
          // gates both no-op when occupancyClass>=2). Wired to
          // `runSpatialPass`, whose default `onPrimarySpatialUpdate` now
          // targets the real `mainArrays.aInt` (see that field's own
          // docblock for the `intLayers` alias bug fixed alongside this).
          // FOLLOW-UP (2026-09-04): this U()-entry call is a one-shot; the
          // per-frame producer is b.s()'s `(f.c & 3) === 0` -> b.d(), which
          // was still unwired at the `runSubsystemPrepass` call site until
          // the fix recorded there. `onRectSpatialUpdate` (the building-
          // footprint half) is wired too now -- b.a(IIII) shares b.d(III)
          // with b.a(III), so it marks the same layer.
          onSubsystemReset: () => this.runSpatialPass({}),
          // Offset 43: `ao == 9` -> b.f(), the end-of-event party restore.
          onSpecialGuard: () => restoreLegacyAuxiliary({
            dense: this.denseState,
            shortRows: this.mainArrays.aShort,
            auxiliaryRows: this.subsystemArrays.eRows,
            packedBytes: this.packedBytes,
            packedOffsets: this.packedOffsets,
            saveOffsets: this.saveOffsets,
          }, this.auxiliaryQueueState),
          onRecordAction: (first, second) => this.stepEntityCoordinateUpdate(first, second),
          // U()'s advance branch sets Q = 28 and calls f.b(ai) at once; the
          // live bag makes that write visible to the recursive call.
          onB: (next) => this.stepSubsystemStateCommand(next),
          onRecordCommand: (first, second, third) => this.stepLegacyD3(first, second, third),
          onResourceReset: () => {
            try { stepLegacyClassCReset(this.resourceTables); } catch { /* f.ak()'s own try/catch, kept */ }
          },
          onViewportNormalize: () => this.normalizeEntityViewport(),
          onSelectionFlags: (flags) => {
            this.runSelectionFlagsRefresh(
              flags[0] ?? false, flags[1] ?? false, flags[2] ?? false, flags[3] ?? false,
              flags[4] ?? false, flags[5] ?? false, flags[6] ?? false, flags[7] ?? false, flags[8] ?? false,
            );
          },
        });
      },
      onRecordAction: (first, second) => this.stepEntityCoordinateUpdate(first, second),
    }, value);

  }

  /** Raw f.S() transition preparation against the live packed resource. */
  stepStateS(input: Omit<LegacyStateSInput, "packedBytes" | "packedOffsets">): void {
    stepLegacyStateS({
      ...input,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    });
  }

  /** Raw f.T() selector branches against the live dense/short state banks. */
  stepStateT(input: Omit<LegacyStateTInput, "dense" | "shortRows">): void {
    stepLegacyStateT({
      ...input,
      dense: this.denseState,
      shortRows: this.mainArrays.aShort,
      onFPairCommand: input.onFPairCommand ?? ((x, y) => {
        this.stepFPairCommand({}, x, y);
      }),
    });
  }

  /** Raw final f.b(int,int) port; b.a(III) stays a callback seam. */
  stepFPairCommand(
    input: Omit<LegacyFPairCommandInput, "dense" | "map" | "subsystem" | "packedBytes" | "packedOffsets">,
    x: number,
    y: number,
  ): void {
    const subsystem = { v: this.game.subsystemV };
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
    this.game.subsystemV = subsystem.v;
  }

  /** Exact f.g(byte) map-entry call chain; lower aM/aN/aO remain explicit callbacks. */
  stepStateMapEntry(q: number, callbacks: LegacyMapEntryCallbacks = {}): void {
    const entryState = { q: this.game.qByte };
    stepLegacyMapEntry(entryState, q, callbacks);
    this.game.qByte = entryState.q;
  }

  /**
   * Execute the confirmed f.g(byte) map-entry phases against this raw runtime.
   *
   * This remains an explicit public entry point for tooling and tests; the
   * default f.am(T=0) bridge also reaches it through the proven g(byte) call.
   * The three callbacks mirror private f.aM(), f.aN(), and f.aO() in order;
   * stepLegacyMapEntry supplies the original broad Exception boundary.
   */
  stepMapEntry(q: number, placementCallbacks: Omit<LegacyAPPrefixInput, "state" | "packedBytes" | "packedOffsets" | "shortRows"> = {}): void {
    this.stepStateMapEntry(q, {
      onAM: () => this.resetMapEntryAllocation(q),
      onAN: () => { this.loadMap(q); },
      onAO: () => {
        const mapState: LegacyAOMapState = {
          q: this.game.qByte,
          C: this.game.cursorTargetColumn,
          D: this.game.cursorTargetRow,
          y: 0, A: 0, I: 0, J: 0, K: 0, L: 0, z: 0, B: 0,
        };
        stepLegacyAOMap({
          state: mapState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          aShort: this.mainArrays.aShort,
          onAP: () => this.runAP(placementCallbacks),
          // BUG FIX (2026-08-18): same two-way state.I/K sync as
          // stepEntityCoordinateUpdate's own onViewportNormalize -- push the
          // freshly-computed mapState.I/K into game.IByte/KByte BEFORE
          // calling aK() (so it clamps the real fresh position, not
          // whatever game.IByte/KByte held before this call started), then
          // pull the clamped result back out afterward so stepLegacyAOMap's
          // own post-callback `state.J = state.I; state.L = state.K;`
          // (offset 118..131) reads the clamped value, not the stale one.
          onViewportNormalize: () => {
            this.game.IByte = mapState.I;
            this.game.KByte = mapState.K;
            this.normalizeEntityViewport();
            mapState.I = this.game.IByte;
            mapState.K = this.game.KByte;
          },
          onSpatialPass: () => this.runSpatialPass({}),
        });
        // BUG FIX (2026-08-18): mapState.y/A (f.y:B/#387, f.A:B/#34) used to
        // be written back into the same stale viewportC/viewportD fields
        // fixed above, instead of the real yByte/AByte fields those
        // constant-pool indices actually name -- and mapState.z/B (f.z:B/
        // #390, f.B:B/#37) were never written back at all. Confirmed via
        // direct bytecode read of aO() itself (offsets 134..150).
        this.game.yByte = mapState.y;
        this.game.AByte = mapState.A;
        this.game.zByte = mapState.z;
        this.game.BByte = mapState.B;
        this.game.IByte = mapState.I;
        this.game.JByte = mapState.J;
        this.game.KByte = mapState.K;
        // BUG FIX (2026-09-09): was `this.game.frameLayoutL = mapState.L`. `aO()`
        // writes #72 (`L:B`, UPPERCASE -- bytecode/f-javap.txt offsets 108
        // and 131, the saved-camera-row half of the `J:B = I:B; L:B = K:B`
        // re-save that follows `aK()`), and #72 is tracked as
        // `game.cameraSavedKByte`. `game.frameLayoutL` is `f.l:B` (#337, LOWERCASE
        // l) -- a completely different field. So map entry both failed to
        // save the camera row AND corrupted the lowercase field with it.
        // This is the SAME trap already fixed once in
        // `stepEntityCoordinateUpdate` (2026-08-31); it survived here.
        // Directly observable: after `stepMapEntry(0)` the port left
        // `J === I === 15` but `L === 0` while `K === 5`, even though
        // offsets 118..131 make `J === I` and `L === K` unconditionally.
        // `aD()`'s Q=28 branch then restores `K:B = L:B`, so the wrong `L`
        // moved the camera to row 0 on every real map entry.
        this.game.cameraSavedKByte = mapState.L;
      },
    });
  }

  /** Raw f.aM() allocation reset wired to the existing field-shaped arrays. */
  resetMapEntryAllocation(q: number): void {
    const state = {
      uFlag: this.game.uFlag,
      tFlag: this.game.inputT,
      F: this.game.FByte,
      LFlag: this.game.outerLoopLFlag,
      NFlag: this.game.outerLoopNFlag,
      FFlag: this.game.entityFocusFlag,
      KFlag: this.game.kFlag,
      X: this.game.exitPrepXInt,
      W: this.game.exitPrepWInt,
      aL: this.game.exitPrepALInt,
      uByte: this.game.uByte,
      ay: this.game.ayByte,
      kFlag: this.game.kResetFlag,
      cInt: this.game.c,
      h: this.game.tailHCounter,
    };
    resetLegacyAM({
      state,
      dense: this.denseState,
      denseLimit: this.denseState.length,
      aRows: this.mainArrays.aByte,
      // aM() offsets 130..148 clear f.u:[B (#371), not b.h:[B. CORRECTED
      // 2026-10-12 (oracle run 12, play7 frame 21693).
      u: this.mainArrays.uBytes,
      c3: this.game.teamMarkerTable,
      entitySlots: this.mainArrays.e[0],
      intLayers: this.mainArrays.aInt[0],
      bytePlanes: this.mainArrays.aByte3,
      f4: this.mainArrays.f4,
      bPlanes: this.game.xSlotTable,
      // f.aM() clears the separately allocated f.c[96][96] and f.b[96][96]
      // planes.  They are the runtime gridC/gridB buffers, not f.h/f.i
      // (which are the independently allocated 13x101 tables).
      map: this.gridC,
      bMap: this.gridB,
      g: this.mainArrays.g,
      gRows: this.mainArrays.g.length,
      gCols: this.mainArrays.g[0]?.length ?? 0,
      shortRows: this.mainArrays.aShort,
      // Offsets 463..466: the pools are kept while s:Z (#365, cameraSFlag --
      // set by S()/U() around scripted scenes) is on. Was a constant false
      // until 2026-09-27, so a scene's map reload wiped them.
      sFlag: this.game.cameraSFlag,
      // aM() offset 524: t() (#649), clear f.d:[[B row 0. Wired 2026-09-27.
      onT: () => this.stepLegacySceneAnimatedSlotClear(),
      onBankReset: () => {
        this.subsystemArrays.initializeOriginal();
        // b.a() offsets 126..164: f.t[0..2] = 0 -- f.t:[B (#368) is game.subsystemT,
        // which b.h() reads. MERGED 2026-10-10 (oracle run 9, frame 21693): b.a()
        // cleared an unread twin (subsystemArrays.t), so the animal counts carried
        // over into the next map.
        this.game.subsystemT.fill(0);
        // b.a() offset 43: f.a:Lc;.a() -- missing until 2026-10-10 (oracle run 7, frame 21232).
        stepLegacyClassCReset(this.resourceTables);
        this.game.subsystemRByte = q === 2 || q === 4 ? -128 : 0; // b.R:B (#48)
        // BUG FIX (2026-08-25): b.f:B#167/b.I:B#23/
        // b.Q:B#46 are the canonical game.* fields, not subsystemArrays.
        this.game.subsystemGFFlagByte = 0;
        this.game.subsystemGCurrentI = q === 2 ? 3 : 0;
        this.game.subsystemBQByte = -1;
        // b.a() offsets 67..79 and 116..123: O:B = aR:I = P:B = -1.
        this.game.subsystemOByte = -1;
        this.game.subsystemAR = -1;
        this.game.subsystemP = -1;
        // b.a() offsets 364..383, its last write: G:I = a:[S][219] + f.q:B*4.
        // Missing until 2026-10-08 (oracle), so at()'s table base stayed 0.
        this.game.subsystemGBase = (this.packedOffsets[219] ?? 0) + q * 4; // b.a:[S] is f.a:[S] (packedOffsets)
      },
      // f.aM()'s own call to private void i() (#610, offset 590, right
      // after the b.a():V bank reset and right before kFlag=true --
      // CORRECTION 2026-08-22: was wired to the unrelated
      // resetInputTransientState(); see docs/unknowns.md).
      onInputReset: () => resetLegacyZI(this.game),
    });
    // Every scalar aM() writes (offsets 0..12, 529..595). u:Z/t:Z/L:Z/X/W/aL/h
    // were never written back, and N:Z (#81) went to the unrelated nFlag,
    // until 2026-10-10 (oracle run 7, frame 21232).
    this.game.uFlag = state.uFlag;
    this.game.inputT = state.tFlag;
    this.game.FByte = state.F;
    this.game.outerLoopLFlag = state.LFlag;
    this.game.outerLoopNFlag = state.NFlag;
    this.game.exitPrepXInt = state.X;
    this.game.exitPrepWInt = state.W;
    this.game.exitPrepALInt = state.aL;
    this.game.tailHCounter = state.h;
    this.game.entityFocusFlag = state.FFlag;
    this.game.kFlag = state.KFlag;
    this.game.uByte = state.uByte;
    this.game.ayByte = state.ay;
    this.game.kResetFlag = state.kFlag; // f.k:Z (#332); state.KFlag above is K:Z
    this.game.c = state.cInt;
  }
  stepStateAPPrefix(input: LegacyAPPrefixInput): void { stepLegacyAPPrefix(input); }
  stepStateAQAudio(input: LegacyAQAudioInput): void { stepLegacyAQAudio(input); }
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

  /** Raw tiles plus the first f.aN() overlay pass, ready for later consumers. */
  decodeMap(mapIndex: number, onSpecialTile?: (type: number, x: number, y: number, parameter: number) => void): LegacyRawMap & LegacyMapOverlay {
    const raw = applyLegacyTerrainAdjustment(this.decodeRawMap(mapIndex), (mask, divisor) =>
      this.randomRemainder(mask, divisor),
    );
    // f.aN() derives the active map dimensions before writing the map grid;
    // keep the same dimensions live for f.c/f.d consumers and footprint gates.
    // f.c:S (#254) / f.d:S (#266) -- the LOGICAL dimensions, which for q === 0
    // and q === 5 differ from the decode stride. See LegacyRawMap's docblock.
    this.game.mapWidth = raw.logicalWidth;
    this.game.mapHeight = raw.logicalHeight;
    if (!this.packedData) throw new Error("/pd0 data has not been attached to runtime state");
    const specialTiles: LegacySpecialTile[] = [];
    const overlay = buildLegacyMapOverlay({
      width: raw.width,
      height: raw.height,
      tiles: raw.tiles,
      tileFlags: this.packedData.shortTables[9],
      tileKinds: this.packedData.byteTables[16],
      mapIndex,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      onSpecialTile: (type, x, y, parameter) => specialTiles.push({ type, x, y, parameter }),
    });
    for (const tile of specialTiles) {
      allocateLegacySpecialTile(this.denseState, (x, y, value) => {
        if (y >= 0 && y < raw.height && x >= 0 && x < raw.width) overlay.values[y * raw.width + x] = value;
      }, tile);
      onSpecialTile?.(tile.type, tile.x, tile.y, tile.parameter);
    }
    applyLegacyMapNeighborPass(raw.width, raw.logicalHeight, raw.logicalWidth, raw.tiles, overlay.values, this.denseState);
    projectLegacyMapGrids(raw, overlay, this.gridB, this.gridC);
    const result = { ...raw, ...overlay };
    this.activeMap = { ...raw, overlay: overlay.values };
    return result;
  }

  /** Decode and retain one original map for the later f.o() render/update path. */
  loadMap(mapIndex: number, onSpecialTile?: (type: number, x: number, y: number, parameter: number) => void): LegacyRenderableMap {
    this.decodeMap(mapIndex, onSpecialTile);
    if (!this.activeMap) throw new Error("map decode did not produce an active map");
    return this.activeMap;
  }

  /** f.o() (#629) into Graphics[target]; see LegacyMapRenderer.ts. */
  renderMap(viewport: LegacyMapViewport = LEGACY_DEFAULT_MAP_VIEWPORT, target: 0 | 1 | 2 | 3 = 1): void {
    const data = this.packedData;
    const graphics = this.offscreenTargets?.graphics[target];
    if (!this.activeMap || !data || !graphics) return;
    const packed = new LegacyPackedSpriteRenderer({
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      imageGroups: this.imageGroups,
      graphics,
    });
    renderLegacyMap({
      width: this.game.mapWidth,
      height: this.game.mapHeight,
      gridB: this.gridB,
      gridC: this.gridC,
      onComposite: (record, x, y) => packed.drawComposite(record, x, y),
      onMarker: (value, ah, ai) => this.drawMapMarker(value, 0, ah, ai, packed),
    }, viewport);
  }

  /**
   * private void a(int,byte) (#441) for cell (ah, ai): the routing half
   * (prepareLegacyMapMarkerDispatch, offsets 0..993), then either the
   * ground/stacked-piece draw (994..1140, arg2 still 0 -- f.o()'s call) or
   * the detail draw a(int,byte,byte,int,int,byte) (1143..1155), then
   * offsets 1158..1202 clear g/h/i[0..7].
   */
  private drawMapMarker(value: number, arg2: number, ah: number, ai: number, packed?: LegacyPackedSpriteRenderer): void {
    const data = this.packedData;
    if (!data) return;
    const result = prepareLegacyMapMarkerDispatch(value, arg2, {
      ah,
      ai,
      originColumn: this.game.IByte,
      originRow: this.game.KByte,
      dense: this.denseState,
      gridC: this.gridC,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      aQ: this.game.aQ,
    });
    for (const write of result.scratchGWrites) {
      this.entityMarkerG[write.index] = write.value;
    }
    if (result.arg2 === 0) {
      if (packed) {
        drawLegacyMapMarkerPieces(result, ah, ai, data.shortTables, data.byteTables, (record, x, y) => packed.drawComposite(record, x, y));
      }
    } else {
      stepLegacyMapMarkerDetail(
        result.local3,
        result.local7,
        result.local4,
        result.local10,
        result.local11,
        result.arg2,
        {
          // BUG FIX (2026-08-18): was game.timingCounterE (e:I,
          // #284) -- direct bytecode read of `a(int,byte,byte,int,
          // int,byte)` (#442, both refs, offset 4/1156) confirms
          // f:I (#294)/game.fCounter. See fCounter's docblock.
          phase: this.game.fCounter,
          N: result.N,
          O: result.O,
          qByte: this.game.qByte,
          vByte: this.game.vByte,
          ai,
          originRow: this.game.KByte,
          dense: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          shortTables: data.shortTables,
          byteTables: data.byteTables,
          entityMarkerG: this.entityMarkerG,
          entityMarkerH: this.entityMarkerH,
          entityMarkerI: this.entityMarkerI,
          statScratch: this.mainArrays.aShort,
        },
        {
          onComposite: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
          onSpriteDraw: packed
            ? (record, x, y, phase) => {
                this.stepZSubrecordDraw(record, x, y, phase, {
                  onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                });
              }
            : undefined,
          // onEntityAction (f.a(IIIIB) #443) wired 2026-08-15 --
          // confirmed a guaranteed no-op in the original (see
          // stepEntityAction's own docblock), wired anyway to
          // document that rather than leave it looking unresolved.
          onEntityAction: (id, x, y, arg4, arg5) => this.stepEntityAction(id, x, y, arg4, arg5),
          // onXFlag (f.x:Z #383) -- confirmed its only reader
          // (stepEntityAction) is unreachable dead code (see
          // game.xZFlag's own docblock), so this write has no
          // observable effect; wired anyway to be faithful.
          onXFlag: () => { this.game.xZFlag = true; },
        },
      );
    }
    for (let index = 0; index < 8; index += 1) {
      this.entityMarkerG[index] = 0;
      this.entityMarkerH[index] = 0;
      this.entityMarkerI[index] = 0;
    }
  }

  /**
   * Render the retained original map directly to the logical browser
   * surface. When `viewport` is omitted, its `column`/`row` (the map-tile
   * origin f.o() reads via I:B/K:B) track the LIVE `game.IByte`/`game.KByte`
   * fields rather than a fixed (0,0) -- f.n() (LegacyCameraScroll.ts) is
   * not wired to a live outer loop yet, but I:B/K:B are already the real
   * camera-origin fields every other ported piece of this project reads,
   * so this at least renders the correct part of the map once something
   * else moves them (and stops silently rendering the map's top-left
   * corner forever, which is what the fixed default viewport did before).
   *
   * Also draws both halves of f.w() (LegacyCameraFrame.ts) directly
   * afterward:
   *
   *  - Letterbox (offsets 0..296): an outlined rectangle showing how far
   *    the viewport extends past the map bounds, gated by `uFlag`
   *    (f.u:Z #370). Wired 2026-08-14 now that its `mapPixelExtentG`/`H`
   *    inputs (f.G:I/H:I #53/58) are genuinely live -- see
   *    gameplay-paint-cluster.md's "f.aE()'s caller traced" section.
   *  - Camera-center cursor (offsets 297..496): a 4-corner bracket drawn
   *    around the centered tile when its map classification is 0. Wired
   *    2026-08-14: `animationPhase` (f.e:I #284) -- previously flagged as
   *    having no established source -- turned out to already be ported and
   *    live as `game.timingCounterE` (see `LegacyGameplayTick.ts`'s
   *    `stepLegacyGameplayTick`, which increments/wraps it every tick;
   *    confirmed by matching its exact bytecode pattern, `e:I+=1; if
   *    e:I>=6 {...}; if e:I>=8 {e:I=0;}`, against `f.h()`'s own bytecode).
   *    `onCorner` routes through the same `stepZSubrecordDraw` boundary
   *    already used elsewhere in this file (e.g. the frame-1137 selection
   *    marker), backed by a fresh `LegacyPackedSpriteRenderer` bound to
   *    this call's `graphics`.
   */
  renderGameplayTo(graphics: Graphics, viewport?: LegacyMapViewport): readonly { resourceId: number; x: number; y: number }[] {
    if (!this.activeMap) return [];
    const resolvedViewport = viewport ?? {
      ...LEGACY_DEFAULT_MAP_VIEWPORT,
      column: this.game.IByte,
      row: this.game.KByte,
    };
    // The terrain draw that used to sit here (`mapRenderer.render(graphics,
    // ...)`, straight onto the VISIBLE Graphics) was the last of the
    // non-bytecode-faithful bridges this docblock mentions. paint()'s v==1
    // branch has no such step: f.o() draws tiles into Graphics[N:B] and the
    // composite below blits that buffer. Removed 2026-09-08; f.o() is now
    // wired for real at stepCameraScroll's onRedraw.
    void resolvedViewport;
    this.stepCameraFrame(graphics);
    this.stepGameplayPaintComposite(graphics);
    this.stepGameplayPaintHud(graphics);
    return [];
  }

  /**
   * f.paint()'s v==1 tail, offsets 89..244 -- the gameplay HUD bars, drawn
   * straight onto the VISIBLE Graphics rather than into an offscreen.
   *
   * That is why nothing the port did to the offscreens ever produced a top
   * resource bar: the composite above maps offscreen y 0 to screen y 14 (its
   * measured call is `drawRegion(img, 0, 0, 262, 304, 0, -11, 14, 0)`), so the
   * top 14 rows are outside the blit by construction and only this loop fills
   * them.
   *
   * Per slot, gated on `a:[Z][slot]` (offsets 98..104):
   *
   *   record = a[a_s[195] + slot]
   *   a(g, Image[c:[B][record]],
   *     0, c:[I][record],                       // source x, y
   *     a:[I][record] + 11, b:[I][record],      // width, height
   *     a:S - 11, b:S + d:[I][record] + 0, 0)   // dest x, y, anchor
   *
   * `a:S`(#140)/`b:S`(#240) have zero putfield sites anywhere (see
   * LegacyPaintScreen.ts's own note), so both are 0 and the dest reduces to
   * `(-11, d:[I][record])`. Helper #435 passes its coordinates through
   * unchanged -- the same helper, and the same treatment, as the composite
   * above.
   *
   * With the live tables this resolves to exactly the two bars: slot 0 takes
   * record 2 (source y 304, 22 tall, dest y 0 -- the top resource bar) and
   * slot 9 takes record 10 (source y 326, 38 tall, dest y 282 -- the bottom
   * status bar).
   *
   * Per-slot extras, offsets 245..454 (ported 2026-09-28), all through
   * `a(Graphics,int,int,int)` (#436, the packed composite on `g`):
   *   slot 7 or 8: record 556 at (a:[I][rec] - 68, b:[I][rec] - 55 + bb + d:[I][rec] + 5)
   *   t195[20 + slot] == 1: record 524 at (0, bb); == 2: record 528 at (0, 320 - ba)
   */
  private stepGameplayPaintHud(graphics: Graphics): void {
    const images = this.offscreenTargets?.images;
    if (!images) return;
    const base195 = this.packedOffsets[195] ?? 0;
    const g = this.game;
    const packed = this.packedData && this.imageGroups[0]
      ? new LegacyPackedSpriteRenderer({
        shortTables: this.packedData.shortTables,
        byteTables: this.packedData.byteTables,
        imageGroups: this.imageGroups,
        graphics,
      })
      : undefined;
    for (let slot = 0; slot < 20; slot += 1) {
      if (!g.selectionFlags[slot]) continue;
      const record = this.packedBytes[base195 + slot] ?? 0;
      const image = images[g.frameImageSlots[record] as 0 | 1 | 2 | 3];
      if (image) {
        try {
          graphics.drawRegion(
            image,
            0,
            g.frameRecordInts[record] ?? 0,
            (g.frameRecordWidths[record] ?? 0) + 11,
            g.frameRecordHeights[record] ?? 0,
            0,
            -11,
            g.oElementRecordInts[record] ?? 0,
            0,
          );
        } catch {
          // Helper #435 catches drawRegion's out-of-bounds exception: records
          // 5/7/10 (source y 326 + 48/86/38 > image 0's 352 rows) draw nothing.
        }
      }
      if (!packed) continue;
      // paint()'s three composites go through #436, the unshifted family (2026-10-15).
      if (slot === 8 || slot === 7) {
        packed.drawCompositeUnshifted(
          556,
          (g.frameRecordWidths[record] ?? 0) - 68,
          (g.frameRecordHeights[record] ?? 0) - 55 + g.selectionBb + (g.oElementRecordInts[record] ?? 0) + 5,
        );
      }
      const edge = this.packedBytes[base195 + 20 + slot] ?? 0;
      if (edge === 1) packed.drawCompositeUnshifted(524, 0, g.selectionBb);
      else if (edge === 2) packed.drawCompositeUnshifted(528, 0, 320 - g.selectionBa);
    }
  }

  /**
   * f.paint()'s v==1 branch, offsets 8..89: the real compositing step that
   * blits whichever offscreen Image f.m()/K()/R()/am() just drew gameplay
   * content into (fog-of-war, entities, footprint marks, health bars --
   * everything `stepGameplayOuterLoop()` draws) onto the real screen
   * Graphics. Ported 2026-08-18, replacing the two interim,
   * explicitly-non-bytecode-faithful "draw twice" bridges added the same
   * investigation (`renderGameplayTo` calling `stepGameplayOuterLoop`
   * directly against the visible graphics, and `onFillHiddenTile` mirroring
   * its fill onto it) -- both are now unnecessary since this blit picks up
   * the SAME offscreen buffer those callbacks already draw into via their
   * real dispatch paths.
   *
   * Bytecode (exact stack simulation, correcting an earlier looser guess
   * that treated `A:I` and `(a:S-11+ad:I)` as one subtracted expression --
   * they are two separate call arguments):
   *   local2 = (ad:I===0 && ae:I===0) ? c[1] : 3      // offsets 9..33
   *   a(g, Image[local2],                              // offset 86, #435
   *     /*sourceX=*\/0, /*sourceY=*\/0, /*width=*\/262,
   *     /*height=*\/A:I,
   *     /*x=*\/a:S - 11 + ad:I,
   *     /*y=*\/b:S - 8 + bb:I - ax:B + ae:I,
   *     /*anchor=*\/0)
   * `a:S` (#140) and `b:S` (#240) are read-only everywhere in this class --
   * exhaustively grepped, zero `putfield` sites anywhere -- so as `short`
   * primitives (not references, no NPE) they stay at Java's implicit
   * default 0 for the entire game, simplifying x/y to `ad-11` and
   * `bb-ax+ae-8`. Helper #435 itself (`static boolean a(Graphics,Image,
   * IIIIIII)`) is just `graphics.drawRegion(image, sx,sy,w,h,
   * /*transform=*\/0, x,y,anchor)` wrapped in try/catch returning success --
   * confirmed by reading its own body directly, not guessed. `c[1]` is
   * `game.frameImageSlots[1]`, confirmed to be the SAME value f.m() (see
   * `LegacyGameplayFramePrep.ts`'s `onTargetSlot`) sets `game.targetSlot`
   * to in every branch except its own ad!==0||ae!==0 case (which sets
   * both to `3`) -- so by the time this runs, the slot this reads is the
   * one that tick's K/R/am/m dispatch actually drew into.
   */
  private stepGameplayPaintComposite(graphics: Graphics): void {
    if (!this.offscreenTargets) return;
    const local2 = this.game.ad === 0 && this.game.ae === 0 ? (this.game.frameImageSlots[1] ?? 0) : 3;
    const image = this.offscreenTargets.images[local2 as 0 | 1 | 2 | 3];
    if (!image) return;
    const x = this.game.ad - 11;
    const y = this.game.selectionBb - this.game.selectionAx + this.game.ae - 8;
    try {
      graphics.drawRegion(image, 0, 0, 262, this.game.selectionAInt, 0, x, y, 0);
    } catch {
      // a(Graphics, Image, …) (#435) catches the underlying J2ME draw exception.
    }
  }

  /** f.w(): both halves (letterbox + camera-center cursor), factored out so `renderGameplayTo` and `stepGameplayFramePrep` (f.m()'s `onW`) can share it. */
  private stepCameraFrame(graphics: Graphics): void {
    const letterboxOutput = stepLegacyCameraLetterbox(this.letterboxState(), graphics);
    if (letterboxOutput) {
      this.game.BCounter = letterboxOutput.b;
      this.game.CCounter = letterboxOutput.c;
      this.game.DCounter = letterboxOutput.d;
      this.game.ECounter = letterboxOutput.e;
    }
    this.stepCameraCursor(graphics);
  }

  private letterboxState(): LegacyCameraFrameLetterboxState {
    return {
      letterboxFlag: this.game.uFlag,
      mapPixelExtentG: this.game.mapPixelExtentG,
      mapPixelExtentH: this.game.mapPixelExtentH,
      viewportOriginI: this.game.IByte,
      viewportOriginK: this.game.KByte,
      scrollY: this.game.yByte,
      scrollA: this.game.AByte,
    };
  }

  private stepCameraCursor(graphics: Graphics): void {
    const data = this.packedData;
    if (!data) return;
    const packed = new LegacyPackedSpriteRenderer({
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      imageGroups: this.imageGroups,
      graphics,
    });
    const state: LegacyCameraFrameCursorState = {
      gridC: this.gridC,
      viewportOriginK: this.game.KByte,
      scrollA: this.game.AByte,
      viewportOriginI: this.game.IByte,
      scrollY: this.game.yByte,
      dense: this.denseState,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
    };
    stepLegacyCameraCursor(state, this.game.timingCounterE, {
      onCorner: (index, x, y, phase) => {
        this.stepZSubrecordDraw(index, x, y, phase, {
          onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
        });
      },
    });
  }

  /**
   * `onEntityAction`'s real target, `private void a(int,int,int,int,byte)`
   * (#443, `LegacyEntityAction.ts`).
   *
   * BUG FIX (2026-09-04): was wired with `bShort: null` on the finding that
   * `f.b:[S]` (#245) has zero `putfield` sites, making this method a
   * guaranteed no-op. That grep covered class `f` only; the field is
   * package-private and `e.f()` allocates it (`new short[570]`) alongside
   * `f.a:[B]`/`f.a:[S]`, then loads all three from `/a`. `saveOffsets` IS
   * that table (see its own docblock and `decodeShortTableB`), so pass it.
   * This unblocks the whole downstream half of the method and its `p()`/
   * `q()` tail, which is where entity sprites are actually drawn.
   */
  private stepEntityAction(id: number, x: number, y: number, arg4: number, arg5: number): void {
    const data = this.packedData;
    if (!data) return;
    const state: LegacyEntityActionState = {
      aq: id, ar: x, as: y, at: arg4, Y: arg5,
      av: 0, au: 0, aw: 0,
      // f.x:Z (#383, game.xZFlag).
      xFlag: this.game.xZFlag,
      dense: this.denseState,
      bShort: this.saveOffsets,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      shortTables: data.shortTables,
      byteTables: data.byteTables,
      aQ: this.game.aQ,
      vByte: this.game.vByte,
    };
    // p()/q(), the tail of f.a(int,int,int,int,byte) and the only place
    // entity sprites are actually emitted. Wired 2026-09-04, once bShort
    // above stopped being (wrongly) modelled as null. Both close over the
    // live `state`, so they see the au/av/aw/ar/as the body just computed,
    // exactly as the original's instance fields do.
    const graphics = this.offscreenTargets?.graphics ?? [];
    // an:I (#209) is live: p() rewrites it per sprite (offsets 153/457 -- 4 for team 1, the
    // chief's remap, ...) and b(III) reads the field. CORRECTED 2026-10-15 (user report: the
    // chief/selected unit's orange clothes showed yellow): the renderer kept the value from before p().
    const game = this.game;
    let loopAn: { an: number } | null = null;
    const packed = data && this.imageGroups[0]
      ? new LegacyPackedSpriteRenderer({
          shortTables: data.shortTables,
          byteTables: data.byteTables,
          imageGroups: this.imageGroups,
          graphics: graphics[this.game.targetSlot] as Graphics,
          get an() { return loopAn ? loopAn.an : game.anInt; },
        })
      : undefined;

    stepLegacyEntityAction(state, {
      onP: () => {
        const loop = {
          aA: 0, aB: 0, ao: -1, ap: -1, ax: 0, ay: 0, az: 0, an: this.game.anInt,
          aq: state.aq, ar: state.ar, as: state.as, au: state.au, Y: state.Y,
          dense: this.denseState,
          byteTables: data.byteTables,
          shortTables: data.shortTables,
        };
        loopAn = loop;
        stepLegacySpriteLayerLoop(loop, {
          onA: () => {
            const a = {
              ay: loop.ay, sFlag: this.game.cameraSFlag, vByte: this.game.vByte, at: state.at,
              dense: this.denseState, aq: state.aq, FByte: this.game.FByte, kByte: this.game.kByte,
              ar: state.ar, as: state.as, byteTables: data.byteTables, az: loop.az,
              cWByte: this.game.cWByte, ax: loop.ax, cACInt: this.game.cACInt,
              CCounter: this.game.CCounter, ECounter: this.game.ECounter,
              BCounter: this.game.BCounter, DCounter: this.game.DCounter,
              gridC: this.gridC,
            };
            const result = stepLegacySpriteLayerPredicateA(a, {
              onComposite: (record, x, y) => packed?.drawComposite(record, x, y),
            });
            loop.ax = a.ax;
            this.game.cACInt = a.cACInt;
            return result;
          },
          onB: () => {
            const b = {
              ay: loop.ay, az: loop.az, ap: loop.ap, ax: loop.ax, aq: state.aq,
              an: loop.an, ao: loop.ao, dense: this.denseState,
              statScratch: this.mainArrays.aShort,
              packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
              aw: state.aw, at: state.at, av: state.av,
            };
            const result = stepLegacySpriteLayerPredicateB(b);
            loop.ax = b.ax; loop.ap = b.ap; loop.ao = b.ao; loop.an = b.an;
            return result;
          },
          onDrawSprite: (index, x, y) => packed?.drawSprite(index, x, y),
          onDrawComposite: (index, x, y) => packed?.drawComposite(index, x, y),
        });
        this.game.anInt = loop.an;
        this.game.aoInt = loop.ao;
        this.game.apInt = loop.ap;
        this.game.projectionAx = loop.ax;
        this.game.projectionAy = loop.ay;
        this.game.projectionAz = loop.az;
      },
      onQ: () => {
        stepLegacyEntityOverlayDraw({
          sFlag: this.game.cameraSFlag, ao: this.game.aoInt, ap: this.game.apInt, // f.ao:I/f.ap:I (#211/#213); was o:I/aP:I until 2026-10-08
          vByte: this.game.vByte, Y: state.Y, aq: state.aq, ar: state.ar, as: state.as,
          at: state.at, frameLayoutAq: this.game.frameLayoutAq, kByte: this.game.kByte,
          cWByte: this.game.cWByte, FByte: this.game.FByte,
          entityFocusFlag: this.game.entityFocusFlag,
          viewportOriginK: this.game.KByte, scrollA: this.game.AByte,
          viewportOriginI: this.game.IByte, scrollY: this.game.yByte,
          XByte: this.game.XByte, zAfCursorVFlag: this.game.zAfCursorVFlag,
          frameLayoutL: this.game.frameLayoutL, targetSlot: this.game.targetSlot,
          c: this.game.c, timingCounterE: this.game.timingCounterE,
          fCounter: this.game.fCounter, dense: this.denseState,
          colorTable: this.game.healthBarColorTable, xSlotTable: this.game.xSlotTable,
          byteTables: data.byteTables, gridC: this.gridC,
          packedBytes: this.packedBytes, packedOffsets: this.packedOffsets,
        }, graphics, {
          onCScanDraw: (arg1, x, y) => this.drawCScan(arg1, x, y),
          onSubrecordDraw: (index, x, y, phase) => this.stepZSubrecordDraw(index, x, y, phase, {
            onSpriteRecord: (record, drawX, drawY) => packed?.drawComposite(record, drawX, drawY),
          }),
          onDrawComposite: (index, x, y) => packed?.drawComposite(index, x, y),
        });
      },
    });
    this.game.xZFlag = state.xFlag;
    // f.aq..f.aw and f.Y are instance fields; keep a(IIIIB)'s values (2026-10-09).
    const g = this.game;
    g.projectionAq = state.aq; g.projectionAr = state.ar; g.projectionAs = state.as; g.projectionAt = state.at;
    g.projectionAu = state.au; g.projectionAv = state.av; g.projectionAw = state.aw; g.projectionY = state.Y;
  }

  /** class c's final void a(int,int,int) (#445), f.q()'s own scan/draw call. */
  private drawCScan(arg1: number, x: number, y: number): void {
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

  /**
   * f.m() (no-arg -- not the already-ported `f.m(int)` numeric-sequence
   * overload). Its only real caller in the whole class is `run()`'s main
   * loop (bytecode offset 133, right after `h()`), called unconditionally
   * every tick -- matched here by calling this from `main.ts`'s `tick()`
   * right after `stepGameplayFrame()` (`h()`), also unconditionally; the
   * method's own `v:B!==1` early-return reproduces the original's own
   * internal gating, so no extra `vByte` check is needed at the call site.
   *
   * This is also `f.u()`'s 5th and final call site (`K()`/`R()`x2/`am()`
   * are the other 4, already wired) and the real per-frame trigger for
   * the gameplay HUD's 20-slot element-scan loop -- `game.selectionFlags`
   * (`f.a:[Z]` #123) is already populated live by
   * `LegacySelectionFlags.ts`'s `stepLegacySelectionFlags`, wired
   * elsewhere in this class, so this loop reaches real content.
   *
   * `onN` is `n()` itself (offset 19), before `w()`/`u()`: its opening blit
   * restores the clean map, so u() draws onto a fresh layer. 2026-09-30:
   * main.ts used to call `n()` separately, after this method -- i.e. after
   * u() -- and K()/am() left theirs inert; `n()` now runs only from its
   * real callers (m(), K(), R(), am()).
   * `onOffscreenDraw` is now wired too (2026-08-20) -- confirmed via direct
   * bytecode read (offsets 30..48) to be a plain
   * `Graphics[3].drawImage(Image[c[1]],0,0,0)`, the exact same static
   * `Image[]`/`Graphics[]` pair `LegacyOffscreenTargets` already models
   * (the same array `onW`/`onU`/`onTargetSlot` above index via
   * `targetSlot`), routed through its existing `copy()` helper. `onC`
   * (`private void c(int,int)`, #552) is now wired too -- see
   * `stepLegacyC2`'s own docblock (ported 2026-08-18).
   */
  stepGameplayFramePrep(): void {
    const data = this.packedData;
    if (!data) return;
    const state: LegacyGameplayFramePrepState = {
      vByte: this.game.vByte,
      imageSlotC1: this.game.frameImageSlots[1] ?? 0,
      scrollY: this.game.yByte,
      ad: this.game.ad,
      scrollA: this.game.AByte,
      ae: this.game.ae,
      slotFlags: this.game.selectionFlags,
      cInts: this.game.frameRecordInts,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      // ax/ba/bb are the SAME fields (#229/#248/#249) LegacySelectionFlags.ts
      // already tracks as selectionAx/selectionBa/selectionBb -- reused
      // directly rather than duplicated, see LegacyGameState.ts's own note.
      ax: this.game.selectionAx,
      bb: this.game.selectionBb,
      ba: this.game.selectionBa,
    };
    stepLegacyGameplayFramePrep(state, {
      onN: () => this.stepCameraScroll(),
      onW: () => {
        const graphics = this.offscreenTargets?.graphics[this.game.targetSlot];
        if (graphics) this.stepCameraFrame(graphics);
      },
      onU: () => {
        const graphics = this.offscreenTargets?.graphics[this.game.targetSlot];
        this.stepGameplayOuterLoop(graphics);
      },
      // Offset 30..48 of f.m(): Graphics[3].drawImage(Image[c[1]], 0, 0, 0),
      // the exact same static Image[]/Graphics[] pair LegacyOffscreenTargets
      // already models (targetSlot/onW/onU above all index the same array).
      // Wired 2026-08-20 -- imageSlot is currently always 0 (no producer
      // traced yet for indices other than 0), guarded to the array's real
      // 0..3 bounds rather than assumed safe.
      onOffscreenDraw: (imageSlot) => {
        if (imageSlot >= 0 && imageSlot <= 3) {
          this.offscreenTargets?.copy(3, imageSlot as 0 | 1 | 2 | 3, 0, 0, 0);
        }
      },
      onTargetSlot: (slot) => { this.game.targetSlot = slot; },
      onSReset: () => { this.game.gameplaySFlag = false; },
      onElementScan: (aD, x, y) => {
        this.framePrimitives.push([aD, x, y]);
        this.drawFrameCommandPrimitive(aD, x, y);
      },
      // m() offsets 206/257: a(III) (#439), the composite edge strips.
      onFixedSprite: (record, x, y) => {
        this.drawPackedComposite(record, x, y);
      },
      // private void c(int,int) (#552), ported 2026-08-18 as
      // stepLegacyC2 -- see its own docblock for the full derivation.
      onC: (x, y) => this.stepLegacyC2(x, y),
      onF: () => this.stepFrameDispatch(),
    });
  }

  /**
   * f.u()'s outer loop (`stepLegacyGameplayOuterLoop`), called from
   * `onGameplayDraw` -- the real f.R()/f.P() call site (see the "P"
   * handler above), matching the bytecode's own `R() -> u()` relationship
   * (`LegacyGameplayPaintTriggers.ts`'s docblock names this exact
   * callback `f.u()`), and also from `K()`'s and `am()`'s own `onU`.
   * Wired 2026-08-14: the loop shape now genuinely iterates every
   * (ah,ai) cell in the real viewport/map bounds each time any of those
   * three reach this point in live play, using real `gridB`/`gridC`/
   * `gridG` and the already-tested `occupancyClass()` classifier.
   *
   * `viewport.columns`/`rows` are f.O:B/#83 and f.P:B/#87 (game.viewportO/P;
   * producer e.c(), see LegacyFrameLayout -- a {12, 19} placeholder until 2026-10-08). `lFlag`/`nFlag`/`rowEndMarker` read
   * `game.outerLoopLFlag`/`outerLoopNFlag`/`outerLoopRowEndMarker`.
   * **CORRECTION (2026-08-24)**: this paragraph's original claim ("stay
   * at construction defaults... end-of-row draw never fires yet") is
   * stale -- it predates two later passes that already closed this gap:
   * `private void X()` (their producer) was ported and wired as
   * `stepLegacyX`/`onXDispatch` on 2026-08-18, reachable through the
   * real `stepGameplayFrame()`->`onV` dispatch chain and gated on
   * `cRFlag`, itself populated live via `stepLegacyC2`'s `onC` (also
   * 2026-08-18); and `onRowEndDraw` itself (below) was found unwired and
   * fixed on 2026-08-22. Both are live now, not inert.
   *
   * `onUnhandledCellBody` is now ALSO wired (second pass, same day):
   * routes to `dispatchLegacyGameplayCellBody`, reconstructing `ah`/`ai`
   * from `columnPixelX`/`rowPixelBase` (exact integer division, since
   * `stepLegacyGameplayCell` computes both as `ah*22`/`ai*16`) since the
   * cell-loop callback doesn't pass them directly. `onFootprintMark`
   * routes to `markLegacyEntityFootprint` using a newly-confirmed
   * width-mask table (`LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS`, a plain
   * `(1<<width)-1` closed form matched against every `iastore` in `b`'s
   * constructor) and the same `mainArrays.aInt` bitmap `occupancyClass()`
   * already reads. `onPackedPrimitive`/`onSpriteDraw` route to
   * `LegacyPackedSpriteRenderer.drawSprite`/`stepZSubrecordDraw`, same
   * pattern as `stepCameraCursor`'s `onCorner`. All three call sites now
   * supply a real `graphics` target (third pass, 2026-08-14): R() passes
   * `graphics[pFrameState.targetSlot]` (it writes `targetSlot=0` itself
   * right before calling); K()'s and am()'s bytecode never write `N:B`
   * (#79) before calling `u()`, so they read the live `game.targetSlot`
   * as-is instead of assuming 0. **STALE CORRECTION (2026-09-04)**: this
   * paragraph used to claim `onMapMarkerArg1` and `onEntityAction` "remain
   * unresolved/inert -- neither has been ported from bytecode yet." That
   * was already false by the time it was written: `onMapMarkerArg1`'s
   * target (`private void a(int,byte,byte,int,int,byte)` #442) has been
   * ported since 2026-08-14 as `stepLegacyMapMarkerDetail`
   * (`LegacyMapMarkerDetail.ts`) and is wired at this callback's own call
   * site inside `onUnhandledCellBody`, below; `onEntityAction`'s target
   * (#443) has been ported since 2026-08-15 as `stepEntityAction`, wired
   * directly two lines below this one. Both are live, not inert -- see
   * `docs/unknowns.md`'s 2026-09-04 entry ("stale docblock" is a recurring
   * failure mode in this file, already hit at `c5511ce`/`c4d7c23`). For
   * ordinary units (villagers, id 1..50, not associated with a map-marker
   * id), `onMapMarkerArg1` never actually fires from this branch --
   * `stepLegacyPositiveEntityBranch`'s own gate requires
   * `dense[4545+id]`'s classifier to be non-default, which is 0/default
   * for every plain unit -- so the branch's only live effect for them is
   * `onEntityAction` (live since 2026-09-04, when its `f.b:[S]` #245 input
   * stopped being modelled as null -- see that method's docblock).
   */
  private stepGameplayOuterLoop(graphics?: Graphics): void {
    const viewport: LegacyGameplayOuterLoopViewport = {
      columns: this.game.viewportO, // f.O:B (#83)
      rows: this.game.viewportP, // f.P:B (#87)
      originColumn: this.game.IByte,
      originRow: this.game.KByte,
      mapWidth: this.game.mapWidth,
      mapHeight: this.game.mapHeight,
      zWriteAiTarget: this.game.AByte,
      zWriteAhTarget: this.game.yByte,
    };
    const state: LegacyGameplayOuterLoopState = {
      sFlag: this.game.cameraSFlag,
      // u() offset 142 reads J:Z (#66), not j:Z (#327). Fixed 2026-10-01.
      jFlag: this.game.jSceneFlag,
      zByte: this.game.outerLoopZByte,
      gridC: this.gridC,
      gridB: this.gridB,
      gridG: this.gridG,
      lFlag: this.game.outerLoopLFlag,
      nFlag: this.game.outerLoopNFlag,
      rowEndMarker: this.game.outerLoopRowEndMarker,
      // BUG FIX (2026-08-18): was game.timingCounterE (e:I, #284) -- direct
      // bytecode read of u()'s own row-end draw calls (offset 2118/2178/
      // 2203) confirms f:I (#294)/game.fCounter. See fCounter's docblock.
      phase: this.game.fCounter,
    };
    const data = this.packedData;
    const packed = graphics && data
      ? new LegacyPackedSpriteRenderer({
          shortTables: data.shortTables,
          byteTables: data.byteTables,
          imageGroups: this.imageGroups,
          graphics,
        })
      : undefined;
    // f.v() (LegacyMapMarkerScan.ts) runs once, unconditionally, at the
    // very start of f.u() -- before its main visible-window loop below.
    // Wired 2026-08-18: previously fully unwired (its own bytecode-
    // confirmed phase field, f:I/#294, matches this method's own already-
    // fixed `state.phase`). resourceNodeTable reuses the already-tracked
    // xSlotTable (f.b:[[[B]/#237, same field, confirmed via constructor
    // allocation order); teamMarkerTable (f.c:[[[B]/#256). CORRECTION
    // (2026-08-22): both are now confirmed to have a real producer (aM(),
    // see LegacyGameState.ts's docblocks) -- no longer inert placeholders.
    decayLegacyMapMarkerDenseState(this.denseState);
    const markerScanState: LegacyMapMarkerScanState = {
      dense: this.denseState,
      teamMarkerTable: this.game.teamMarkerTable,
      resourceNodeTable: this.game.xSlotTable,
      packedBytes: this.packedBytes,
      packedOffsets: this.packedOffsets,
      originColumn: this.game.IByte,
      originRow: this.game.KByte,
      columns: viewport.columns,
      rows: viewport.rows,
      phase: this.game.fCounter,
    };
    stepLegacyMapMarkerScan(markerScanState, {
      classifyOccupancy: (x, y) => this.occupancyClass(x, y),
      onSpriteDraw: packed ? (record, x, y) => packed.drawSprite(record, x, y) : undefined,
    });
    stepLegacyGameplayOuterLoop(viewport, state, {
      classifyOccupancy: (x, y) => this.occupancyClass(x, y),
      // Offsets 186..225: a tree/rock cell (b 180..231 or 243) in sight draws its detail through
      // a(int,byte) with arg2 = 1. FIXED 2026-10-15 (user report: trees showed only their base):
      // never wired at the loop, so every tree canopy was missing.
      onMapMarkerArg1: (value, markerAh, markerAi) => this.drawMapMarker(value, 1, markerAh, markerAi, packed),
      // Fog-of-war epilogue draws (bytecode/f-javap.txt offsets ~1791..2027
      // of u()): occupancyClass===1 -> edge-softened fog sprite (record
      // 12); occupancyClass===2 -> either a solid fillRect (interior, all
      // 4 neighbors also class 2, confirmed via the exact 4 consecutive
      // `invokespecial a:(II)B` classifier calls at offsets 1944..1986)
      // or the class-2 edge sprite (record 11). Wired 2026-08-15. The
      // fillRect target is `Graphics[c[1]]` (offset 1891..1899, NOT
      // necessarily the same slot as this call's own `graphics` param),
      // read the same way f.m() already reads it: `game.frameImageSlots[1]`.
      onPackedPrimitive: packed ? (type, x, y) => packed.drawSprite(type, x, y) : undefined,
      // f.u()'s per-row end-of-row marker (record 105, gated on
      // lFlag||nFlag matching rowEndMarker[1]-originRow===ai). Found
      // unwired 2026-08-22 while tracing u()'s exception scope for the
      // r()/s() wiring; same LegacyZSubrecordDraw routing already used
      // for every other packed sprite draw in this method.
      onRowEndDraw: packed
        ? (record, x, y, phase) => {
            this.stepZSubrecordDraw(record, x, y, phase, {
              onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
            });
          }
        : undefined,
      onFillHiddenTile: (x, y) => {
        const target = this.offscreenTargets?.graphics[this.game.frameImageSlots[1] ?? 0];
        if (!target) return;
        target.setColor(0);
        target.fillRect(11 + x, 8 + y, 22, 16);
        // No longer mirrored onto `graphics` directly (2026-08-17's interim
        // fix, now removed): stepGameplayPaintComposite() -- the real
        // f.paint() blit -- picks up this same offscreen fill and composites
        // it onto the screen, so a second direct draw would double-paint.
      },
      // f.i(int): walks the linked chain of entity ids stacked on this
      // cell's secondary grid, drawing a packed sprite per id whose
      // "kind" (dense[6565+id]) is 1, 2, or 5. Already fully ported as
      // LegacySecondaryCellChain.ts; wired 2026-08-15.
      onSecondaryCell: (headId) => {
        const secondaryState: LegacySecondaryCellChainState = {
          dense: this.denseState,
          originColumn: this.game.IByte,
          originRow: this.game.KByte,
          hTable: this.secondaryCellHTable,
          iTable: this.secondaryCellITable,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
        };
        stepLegacySecondaryCellChain(headId, secondaryState, {
          // f.i(int) offset 264 is a(III) (#439), a composite. CORRECTED 2026-10-15 (pixel comparison,
          // play26 frame 95000): this drew a single b(III) sprite, so thrown spears were bare lines.
          onPackedPrimitive: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
        });
      },
      onUnhandledCellBody: (columnTile, rowTile, columnPixelX, occupancyClass, gridCValue, gridBValue, rowPixelBase) => {
        const ah = columnPixelX / 22;
        const ai = rowPixelBase / 16;
        const bodyState: LegacyGameplayCellBodyState = {
          dense: this.denseState,
          gridC: this.gridC,
          sFlag: this.game.cameraSFlag,
          ao: this.game.ao,
          columns: viewport.columns,
          originColumn: this.game.IByte,
          gridG: this.gridG,
          gridB: this.gridB,
          colorTable: this.game.healthBarColorTable,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          originRow: this.game.KByte,
          scrollA: this.game.AByte,
          scrollY: this.game.yByte,
          phase: this.game.timingCounterE,
          hCounter: this.game.tailHCounter,
        };
        const result = dispatchLegacyGameplayCellBody(
          gridCValue, columnPixelX, rowTile, columnTile, ai, ah, occupancyClass, rowPixelBase,
          bodyState, graphics, {
            onFootprintMark: (layer, x, y, width, height) => {
              const footprintState: LegacyEntityFootprintMarkState = {
                layer,
                widthMasks: LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS,
                layers: this.mainArrays.aInt,
                mapHeight: this.game.mapHeight,
              };
              markLegacyEntityFootprint(footprintState, x, y, width, height);
            },
            // a(III) (#439) in both the negative branch (offset 1234) and its
            // tail (1788): composites, not b(III). Corrected 2026-10-01.
            onPackedPrimitive: packed ? (type, x, y) => packed.drawComposite(type, x, y) : undefined,
            onMapMarkerArg1: (value) => this.drawMapMarker(value, 1, ah, ai, packed),
            onSpriteDraw: packed
              ? (record, x, y, phase) => {
                  this.stepZSubrecordDraw(record, x, y, phase, {
                    onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                  });
                }
              : undefined,
            onEntityAction: (id, x, y, arg4, arg5) => this.stepEntityAction(id, x, y, arg4, arg5),
          },
        );
        return { ahDecrement: result.ahDecrement, occupancyClass: result.occupancyClass };
      },
    });
    this.game.outerLoopZByte = state.zByte;
    // The row counter is the shared field ai:I (#199), not a local: the loop
    // has no early exit, so it ends at P + 3 (oracle 2026-10-08).
    this.game.aiScratch = viewport.rows + 3;

    // f.u()'s post-loop tail: calls r() then s() unconditionally right
    // after the main visible-window loop (bytecode offsets 2141/2145),
    // then its own once-per-tick row-end-marker draw (offset 2148..2209,
    // record 30/31) -- all three wrapped in u()'s own try/catch-all
    // (offset 11..2209 -> pop;return), modeled with a local try/catch
    // around just these three. CORRECTED 2026-09-28: the old note said r()
    // always throws on f.b:[S] (#245) being null; e.f() writes that field
    // (it is saveOffsets), so r() runs normally now.
    const outerLoopViewportBounds = {
      originColumn: this.game.IByte,
      originRow: this.game.KByte,
      columns: this.game.viewportO,
      rows: this.game.viewportP,
    };
    try {
      stepLegacyAnimatedSlotScan(
        {
          slotTable: this.mainArrays.d,
          dense: this.denseState,
          shortTable2D: this.packedData?.shortTables ?? [],
          // f.b:[S] (#245): written by e.f() (e-javap.txt:1115), i.e. this
          // port's saveOffsets. FIXED 2026-09-28: this was a deliberate null
          // left from the retracted "permanently null" premise, so r() threw
          // on every active unit/animal slot and no hit effect was drawn.
          shortTable1D: this.saveOffsets,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
          byteRows: this.packedData?.byteTables ?? [],
          originColumn: this.game.IByte,
          originRow: this.game.KByte,
        },
        {
          isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
          classifyOccupancy: (x, y) => this.occupancyClass(x, y),
          onAq: (aq) => { this.game.projectionAq = aq; },
          onSpriteDraw: packed
            ? (record, x, y, phase) => {
                this.stepZSubrecordDraw(record, x, y, phase, {
                  onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                });
              }
            : undefined,
        },
      );
      stepLegacyEffectSlotScan(
        {
          ...outerLoopViewportBounds,
          slotGrid: this.mainArrays.e,
          dense: this.denseState,
          packedBytes: this.packedBytes,
          packedOffsets: this.packedOffsets,
        },
        {
          isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
          onSpriteDraw: packed
            ? (record, x, y, phase) => {
                this.stepZSubrecordDraw(record, x, y, phase, {
                  onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                });
              }
            : undefined,
          // final void c(int,boolean) (#555, stepEntityRemoval) -- wired
          // 2026-08-24, arg2 always false at this call site.
          onModeThreeExpire: (id) => this.stepEntityRemoval(id, false),
          // final void d(int) (#... see LegacyFrameProgressionScan.ts) --
          // fires once per expiring slot, sets pendingP when w:B===2 and
          // the slot's own id matches game.qCounter.
          onSlotAction: (id) => {
            const dState = { w: this.game.wByte, q: this.game.qCounter, P: this.game.pendingP };
            stepLegacyFD(id, dState);
            this.game.pendingP = dState.P;
          },
          // final void c(int,int,int,int) / stepLegacyCRect -- its own
          // `isBlocked` predicate (private boolean a(int,int) #446) turned
          // out, on direct bytecode read, to be the EXACT SAME I/O/K/P
          // bounds check as isLegacyWithinViewport (not a distinct
          // "blocked" concept as its placeholder name suggested).
          onRect: (x, y, width, height) => this.repaintRect(x, y, width, height),
        },
      );
      // f.u()'s own once-per-tick row-end-marker tail (bytecode offset
      // 2148..2209, right after r()/s(), inside the SAME try block as
      // both): gated on ad:I===0 && ae:I===0 (game.ad/game.ae), draws
      // record 30 when outerLoopNFlag, else record 31 when
      // outerLoopLFlag, at fixed pixel (218,11) with fCounter as phase.
      // Found while tracing this method's exception scope for the r()/s()
      // wiring; genuinely distinct from the per-row onRowEndDraw (record
      // 105) inside the main loop above.
      if (this.game.ad === 0 && this.game.ae === 0) {
        if (this.game.outerLoopNFlag) {
          this.stepZSubrecordDraw(30, 218, 11, this.game.fCounter, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
          });
        } else if (this.game.outerLoopLFlag) {
          this.stepZSubrecordDraw(31, 218, 11, this.game.fCounter, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
          });
        }
      }
    } catch {
      // Matches u()'s own catch-all -- see docblock above.
    }
  }

  /**
   * Execute the bytecode-backed a(IIIIB) -> p()/q() lifecycle with an
   * evidence-backed raw field view. The caller-owned view is intentional until
   * every original scalar alias is proven against LegacyGameState.
   */
  runProjectionLifecycle(input: LegacyProjectionLifecycleInput): ReturnType<typeof runLegacyProjectionLifecycle> {
    const result = runLegacyProjectionLifecycle({
      ...input,
      onQ: (state) => {
        this.game.applyProjectionPreparation(state);
        input.onQ(state);
      },
    });
    this.game.applyProjectionPreparation(result);
    return result;
  }
}

function byteGrid(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function copyRows<T extends Int8Array | Int16Array | Int32Array>(
  target: T[], source: readonly T[], count: number,
): void {
  if (source.length < count || target.length < count) throw new RangeError("RMS row count mismatch");
  for (let row = 0; row < count; row += 1) {
    if (target[row].length !== source[row].length) throw new RangeError("RMS row length mismatch");
    target[row].set(source[row]);
  }
}

function cloneRows<T extends Int8Array | Int16Array | Int32Array>(
  source: readonly T[], count: number,
): T[] {
  return source.slice(0, count).map((row) => new (row.constructor as { new (values: ArrayLike<number>): T })(row));
}

function copyCube(
  target: readonly Int8Array[][],
  source: readonly (readonly Int8Array[])[],
  depth: number,
): void {
  if (target.length < depth || source.length < depth) throw new RangeError("RMS cube depth mismatch");
  for (let layer = 0; layer < depth; layer += 1) copyRows(target[layer], source[layer], source[layer].length);
}

function cloneCube(
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
