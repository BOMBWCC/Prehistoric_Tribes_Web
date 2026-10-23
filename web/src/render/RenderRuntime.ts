import { hdArt } from "./HdArt";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { AnchorValue } from "../platform/anchors";
import { LegacyGameState } from "../core/LegacyGameState";
import { stepLegacyGameplayTick } from "../core/LegacyGameplayTick";
import type { Graphics } from "../platform/Graphics";
import { LegacyGeometryDecoder } from "../text/LegacyGeometryDecoder";
import { LegacyGeometryRenderer } from "../text/LegacyGeometryRenderer";
import { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } from "../text/LegacyZGeometryBridge";
import { composeLegacyC, emitLegacyCRenderRow, type LegacyCDrawCommand } from "../text/LegacyCComposition";
import { scanLegacyZElementPrefix } from "./LegacyZElementScan";
import { stepLegacyZKind3, type LegacyZKind3State } from "./LegacyZKind3";
import { stepLegacyZKind2, type LegacyZKind2State } from "./LegacyZKind2";
import { stepLegacyZSubrecordDraw, type LegacyZSubrecordDrawCallbacks } from "./LegacyZSubrecordDraw";
import { drawLegacyPackedSpritePrimitive, type LegacyPackedSpritePrimitiveCallbacks } from "./LegacyPackedSpritePrimitive";
import { stepLegacyMapOverviewScroll } from "./LegacyMapOverview";
import { stepLegacyD as stepLegacyFD } from "../ui/LegacyFrameProgressionScan";
import { LegacyOffscreenTargets } from "./LegacyOffscreenTargets";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { drawLegacy1137Composition } from "./Legacy1137Composition";
import { ZH_LANGUAGE_NAME, paintZhLine } from "../text/LegacyZhText";
import { prepareLegacyImageHelperInvocation } from "./LegacyImageHelperInvocation";
import { drawLegacyFrameCommand } from "./LegacyFrameCommandDraw";
import { stepLegacyFrameCommandChanged, type LegacyZAdChangeState } from "../ui/LegacyFrameCommandChanged";
import { drawLegacy1010 } from "./Legacy1010Renderer";
import { LEGACY_DEFAULT_MAP_VIEWPORT, renderLegacyMap, type LegacyMapRedrawRange, type LegacyMapViewport } from "./LegacyMapRenderer";
import { stepLegacyP } from "./LegacyGameplayPaintTriggers";
import { stepLegacyCameraFollow, type LegacyCameraFollowState } from "./LegacyCameraFollow";
import { stepLegacyCameraScroll } from "./LegacyCameraScroll";
import { stepLegacyCameraLetterbox, stepLegacyCameraCursor, classifyLegacyCameraCell, type LegacyCameraFrameCursorState } from "./LegacyCameraFrame";
import { classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122, isLegacyMarkerIdInRangeMinus110to61 } from "./LegacyEntityClassifiers";
import { stepLegacyGameplayOuterLoop, type LegacyGameplayOuterLoopViewport, type LegacyGameplayOuterLoopState } from "./LegacyGameplayOuterLoop";
import { stepLegacyAnimatedSlotScan } from "./LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan, isLegacyWithinViewport } from "./LegacyEffectSlotScan";
import { stepLegacyCRect } from "./LegacyEffectRectMark";
import { dispatchLegacyGameplayCellBody, type LegacyGameplayCellBodyState } from "./LegacyGameplayCellBodyDispatch";
import { markLegacyEntityFootprint, LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS, type LegacyEntityFootprintMarkState } from "../sim/units/LegacyEntityFootprintMark";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch } from "./LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "./LegacyMapMarkerDetail";
import { stepLegacyGameplayFramePrep, type LegacyGameplayFramePrepState } from "./LegacyGameplayFramePrep";
import { stepLegacySecondaryCellChain, type LegacySecondaryCellChainState } from "./LegacySecondaryCellChain";
import { decayLegacyMapMarkerDenseState, stepLegacyMapMarkerScan, type LegacyMapMarkerScanState } from "./LegacyMapMarkerScan";
import { canPlaceLegacyFootprint } from "../sim/world/LegacyFootprintCheck";
import { stepLegacySelectionFlags } from "../ui/LegacySelectionFlags";
import { BLD_KIND, RES_KIND, UNIT_AGE, UNIT_FLAGS, UNIT_Y } from "../core/DenseLayout";
import { stepEntityAction, stepEntityRemoval } from "../sim/units/UnitRuntime";
import { T_BUILDING } from "../core/DataTables";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Emit the exact c.a(Graphics,int) drawRegion commands for one row window. */
export function renderCRow(rt: LegacyRuntimeState, rowStart: number, onDraw?: (command: LegacyCDrawCommand) => void): LegacyCDrawCommand[] {
  return emitLegacyCRenderRow(rt.cComposition, rt.packedBytes, rt.packedOffsets, rt.resourceTables.byteViews, rt.imageGroups[0], rowStart, onDraw, rt.setDialogueEdges, rt.cRenderExtras());
}

/** Resolve the proven f.d(IIII) subrecord and expose its f.a(III) boundary. */
export function stepZSubrecordDraw(rt: LegacyRuntimeState, index: number, x: number, y: number, phase: number, callbacks: LegacyZSubrecordDrawCallbacks = {}): void {
  const data = rt.packedData;
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
 * BUG FIX (2026-09-09): rt method only called the callback-decoding port,
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
export function drawPackedComposite(rt: LegacyRuntimeState, record: number, x: number, y: number): void {
  const data = rt.packedData;
  const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot as 0 | 1 | 2 | 3];
  if (!data || !graphics) return;
  new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  }).drawComposite(record, x, y);
}

export function drawPackedSpritePrimitive(rt: LegacyRuntimeState, id: number, x: number, y: number, typeOverride = -1, callbacks: LegacyPackedSpritePrimitiveCallbacks = {}): void {
  const data = rt.packedData;
  if (!data) throw new Error("Packed /pd0 data is not loaded");
  drawLegacyPackedSpritePrimitive({ byteRows: data.byteTables, colorRows: data.byteTables, typeOverride }, id, x, y, callbacks);
  const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot as 0 | 1 | 2 | 3];
  if (!graphics) return;
  new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  }).drawSprite(id, x, y);
}

/**
 * Exact private void c(int,int) (bytecode/f-javap.txt offsets 0..966),
 * `f.m()`'s cursor/selection-overlay method, called twice per frame for
 * viewport translation. Composed almost entirely from already-ported
 * pieces found while tracing rt: the 4 static classifiers
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
 * machinery the menu "Z scan" text already uses (`rt.geometry`/
 * `rt.geometryRenderer`) -- so wiring them needed no new port at all;
 * (2) `javap -v`'s real constant pool shows string #665 is empty (""),
 * so the drawn text is just the plain decimal number, not a "STR"-
 * prefixed debug label -- rt is a genuine numeric HUD overlay (a
 * count, drawn at the cursor position). The `local5>0` branch is now
 * wired below: `local5` (an armed/occupied-slot count for the selected
 * formation, `g.selectionGroup`) is already computed earlier in rt method, so
 * it has no further dependency. The `cACInt`/`f.aC:I`(#151) branch
 * draws the box count: its producer is a DIFFERENT,
 * method, `private boolean a()`
 * (`bytecode/f-javap.txt` offsets 0..275, starting at that file's line
 * 5394 -- not `p()`, an earlier misattribution caught while re-deriving
 * rt), which scans the camera-visible `gridC` cells for a per-type
 * gate (`e[1919+cellType]>0`) and also sets `ax:I` (since ported in
 * LegacySpriteLayerPredicates.ts); the branch is wired since 2026-10-16. The `a(1000+s+1,2)`
 * building ghost (offset 518) is wired since 2026-10-01 through
 * `drawImageHelper`: its >= 1000 arm takes its origin from S:I/T:I, not
 * ah/ai, so the earlier objection did not apply.
 */
export function stepLegacyC2(rt: LegacyRuntimeState, arg1: number, arg2: number, touchCursor = false): void {
  const g = rt.game;
  const dense = rt.denseState;

  if (g.cAaByte !== 0) {
    rt.stepZSubrecordDraw(
      34 + g.cAaByte,
      (g.cAbByte - g.cameraColumn) * 22,
      (g.cAcByte - g.cameraRow) * 16,
      g.animStep,
      { onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y) },
    );
    if (g.animStep === 5) g.cAaByte = 0;
  }

  const local4 = rt.gridC[g.cameraRow + g.cursorRow]?.[g.cameraColumn + g.cursorColumn] ?? 0;
  let local3 = 32;

  if (g.barMode !== 2) {
    let local5 = -1;

    if (g.barMode === 1) {
      if (g.kByte !== 0) {
        local5 = 1;
      } else if (g.selectionGroup !== -1) {
        local5 = 0;
        for (let i = 0; i < 50; i += 1) {
          if ((rt.mainArrays.aByte[g.selectionGroup]?.[i] ?? 0) !== 0) local5 += 1;
        }
      }
      if (g.outerLoopZByte !== 0) {
        local3 = 33;
      } else {
        const accept =
          classifyLegacyCameraCell(local4) === 1 ||
          isLegacyEntityIdInRange101to122(local4) ||
          (classifyLegacyPositiveEntity(local4) === 1 && ((dense[UNIT_FLAGS + local4] ?? 0) & 2) === 0);
        local3 = accept ? 34 : 33;
      }
    } else if (g.barMode === 3) {
      if (g.cSInt === 100) {
        g.cRFlag = true;
        local3 = 105;
      } else if (g.cSInt <= 3) {
        // Offset 260 `iflt 271`: a negative s (a building order) takes rt branch too.
        // Reach the r:I=W assignment (offset 323) when EITHER (a) local4
        // classifies as team-0-range AND e[1414+local4]>=12 (direct
        // jump at offset 292), OR (b) that's false but W:B ALSO
        // classifies as team-0-range AND e[1414+W]>=12 (falls through
        // the offset 295..320 check instead). Re-verified against the
        // exact bytecode after an initial transcription had rt
        // condition inverted.
        const local4Accepts = classifyLegacyPositiveEntity(local4) === 0 && (dense[UNIT_AGE + local4] ?? 0) >= 12;
        const wAccepts = classifyLegacyPositiveEntity(g.hoverUnit) === 0 && (dense[UNIT_AGE + g.hoverUnit] ?? 0) >= 12;
        if (local4Accepts || wAccepts) {
          g.cRInt = g.hoverUnit;
          g.cTInt = dense[0 + g.cRInt] ?? 0;
          g.cUInt = dense[UNIT_Y + g.cRInt] ?? 0;
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
        // CORRECTED 2026-09-15: rt block hung off `w != 1 && w != 3`, so a
        // building cursor never set r:Z.
        const local6 = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 104 + g.cSInt] ?? 0;
        const local7 = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 130 + g.cSInt] ?? 0;
        g.cTInt = g.cursorColumn - Math.trunc(local6 / 2);
        g.cUInt = g.cursorRow - Math.trunc(local7 / 2);
        // Offsets 473..518: S:I/T:I (#98/#101, projectionS/T -- a twin
        // cSViewportX/cTViewportY pair was merged 2026-10-01), then the
        // building ghost a(1000 + s + 1, 2), which was deferred until then.
        g.projectionS = arg1 - Math.trunc(local6 / 2) * 22;
        g.projectionT = arg2 - Math.trunc(local7 / 2) * 16 - 5 + g.animStep;
        drawImageHelper(rt, 1000 + g.cSInt + 1, 2, g.projectionS, g.projectionT);
        // a(int,int,int,boolean):boolean (#450) is canPlaceLegacyFootprint.
        const accepted = rt.canPlaceFootprint(rt.gridC, g.cameraColumn + g.cTInt, g.cameraRow + g.cUInt, g.cSInt, true);
        g.cRFlag = accepted;
        local3 = accepted ? 41 : 40;
      }
    }

    if (g.cEFlag && g.animStep < 2 && local3 <= 34) local3 += 5;
    // `touchCursor` is not in the original (phase 3, the larger view for touch play): no hand
    // outside building placement -- only the action icon and the count stay.
    if (!touchCursor || g.barMode === 3) {
      rt.stepZSubrecordDraw(local3, arg1, arg2, g.animStep, {
        onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
      });
    }
    // local5-gated numeric overlay: c.a(x+22,y+8,0,String(local5),1) then
    // c.a(Graphics[N:B]) -- see docblock above, CORRECTED 2026-08-24.
    // local5 is already computed above (armed/occupied-slot count for the
    // selected formation), so rt needs no new dependency.
    if (local5 > 0) {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) {
        rt.geometry.queueTextWithWidth(arg1 + 22, arg2 + 8, 0, String(local5), 1);
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
        // c.a(Graphics)'s tail (offset 624) sets a:B = 0. Missing here and in
        // the 1010 slot counts until 2026-10-10 (oracle run 8, frame 11645):
        // rows piled up until row 13 spilled into the floating-text ring.
        rt.geometry.reset();
      }
    }
    // Offsets 662..721: the same overlay with aC:I, the unit count f.a()Z leaves for the box
    // being dragged (the "2" next to the cursor). Unwired until 2026-10-16 (screenshot diff).
    if (g.boxUnitCount > 0) {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) {
        rt.geometry.queueTextWithWidth(arg1 + 22, arg2 + 8, 0, String(g.boxUnitCount), 1);
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
        rt.geometry.reset();
      }
    }

    if (g.barMode === 3) {
      if (g.cSInt < 0) {
        drawPackedComposite(rt, 659 - g.cSInt - 1, arg1 + 11 + 5, arg2 + 8 + 5);
      } else if (g.cSInt <= 3) {
        rt.stepZSubrecordDraw(g.cSInt + 48, arg1, arg2, g.animStep, {
          onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
        });
      }
    }
  }

  // offset 793: w===2 jumps directly here too.
  local3 = 0;
  if (g.barMode === 1) {
    if (g.cQFlag && g.cAaByte !== 0) {
      local3 = 47;
      g.outerLoopZByte = 0;
    } else if (local4 === -124) {
      local3 = 44;
    } else if (local4 === -125) {
      local3 = 45;
    } else if (classifyLegacyCameraCell(local4) === 0) {
      if ((dense[BLD_KIND - local4] ?? 0) !== 10) local3 = 41;
    } else if (isLegacyMarkerIdInRangeMinus110to61(local4)) {
      local3 = (dense[RES_KIND + (local4 + 61) * -1] ?? 0) === 7 ? 46 : 43;
    } else if (isLegacyEntityIdInRange101to122(local4)) {
      if (g.outerLoopZByte === 0) local3 = 43;
    }
  }
  // Touch play without the hand: villagers selected and no action icon (plain ground) shows the
  // original's four inward arrows (sub-record 35) where they will go.
  const ownUnit = (id: number) => id >= 1 && id <= 50;
  if (touchCursor && local3 === 0 && g.barMode === 1 && !ownUnit(local4) && !ownUnit(g.hoverUnit)) local3 = 35;
  if (local3 !== 0 && g.outerLoopZByte !== 2) {
    rt.stepZSubrecordDraw(local3, arg1, arg2, g.animStep, {
      onSpriteRecord: (record, x, y) => drawPackedComposite(rt, record, x, y),
    });
  }
}

/**
 * private void a(int,byte) (#441) for resourceId >= 1000: origin S:I/T:I,
 * records b[0]/j[0][resourceId - 1000], then a(IBBIIB) and the g/h/i clear.
 * Shared by G()'s a(1118, mode) and c(int,int)'s building ghost
 * a(1000 + s + 1, 2) (offset 518; was deferred until 2026-10-01).
 */
export function drawImageHelper(rt: LegacyRuntimeState, resourceId: number, mode: number, S: number, T: number): void {
  if (!rt.packedData || !rt.offscreenTargets) return;
  // Exact private f.a(int,byte) prelude for resource 1118. The
  // helper receives the negative marker id, the e[9115+id] gate,
  // the e[8749+id] selector, and the computed map-screen origin;
  // it does not receive resourceId-1000 as its argument tuple.
  const invocation = prepareLegacyImageHelperInvocation({
    resourceId,
    dense: rt.denseState,
    shortOffsets: rt.packedOffsets,
    shortTables: rt.packedData.shortTables,
    byteTables: rt.packedData.byteTables,
    groupSelectors: rt.entityMarkerG,
    ah: 0,
    ai: rt.game.aiScratch,
    I: rt.game.cameraColumn,
    K: rt.game.cameraRow,
    S,
    T,
    vByte: rt.game.loopMode,
    fCounter: rt.game.animPhase,
  });
  const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: rt.packedData.shortTables,
    byteTables: rt.packedData.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  rt.frameProjections.length = 0;
  // a(IBBIIB) (#442) -- the same method the map markers use, through the same port. CORRECTED
  // 2026-10-16 (pixel comparison, title-screen scenery): rt path had its own copy of #442
  // (LegacyImageHelperProjection.ts) that still recomputed the animation phase from f:I per record
  // and kept g/h/i in a second set of arrays, so the menu's smoke and water ran out of phase.
  stepLegacyMapMarkerDetail(
    invocation.marker,
    invocation.argument2,
    invocation.argument3,
    invocation.originX,
    invocation.originY,
    mode,
    {
      phase: rt.game.animPhase,
      N: invocation.recordBase,
      O: invocation.recordCount,
      qByte: rt.game.mission,
      vByte: rt.game.loopMode,
      ai: rt.game.aiScratch,
      originRow: rt.game.cameraRow,
      dense: rt.denseState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      shortTables: rt.packedData.shortTables,
      byteTables: rt.packedData.byteTables,
      entityMarkerG: rt.entityMarkerG,
      entityMarkerH: rt.entityMarkerH,
      entityMarkerI: rt.entityMarkerI,
      statScratch: rt.mainArrays.aShort,
    },
    {
      onX: (value) => { rt.game.unitInBuilding = value; },
      onComposite: (record, x, y) => packed.drawComposite(record, x, y),
      onSpriteDraw: (record, x, y, phase) => {
        rt.frameProjections.push([record, x, y, phase]);
        rt.stepZSubrecordDraw(record, x, y, phase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
        });
      },
      onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
      onXFlag: () => { rt.game.xZFlag = true; },
    },
  );
  // f.a(int,byte) offsets 1158..1202 clear g/h/i[0..7] after the detail draw.
  for (let index = 0; index < 8; index += 1) {
    rt.entityMarkerG[index] = 0;
    rt.entityMarkerH[index] = 0;
    rt.entityMarkerI[index] = 0;
  }
}

/**
 * f.a(byte,int,int) (#438), the command-backed frame renderer.  Originally
 * only wired inline inside the "G" handler's onFrameCommand (resources 10
 * and 17); extracted 2026-08-26 so the SAME tested pipeline can also be
 * reached from onElementScan (P()'s epilogue and m()'s per-tick call),
 * which previously only pushed a trace stub and never actually invoked
 * rt method -- see LegacyZElementScan.ts's docblock for the orphaned
 * duplicate port (scanLegacyZElementPrefix) rt replaces as the real
 * wiring target.
 */
export function drawFrameCommandPrimitive(rt: LegacyRuntimeState, command: number, x: number, y: number): void {
  rt.frameHelperCalls.push({ kind: "frame-command", resourceId: command, x, y });
  // A draw that drew something replaces the last one (the HUD layer's redraw of it may draw nothing).
  if (rt.drawingVillagerPanel && rt.villagerPanelDraft.length > 0) rt.villagerPanel = rt.villagerPanelDraft;
  rt.drawingVillagerPanel = command === 4;
  if (command === 4) rt.villagerPanelDraft = [];
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
    saveOffsets: rt.saveOffsets,
    l: rt.game.selectedId,
    aShortStats: rt.mainArrays.aShort,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    dShort: rt.game.zlDShorts,
    kBytes: rt.game.zlKBytes,
    flags: rt.game.frameFlags,
    r: rt.mainArrays.r,
    as: rt.game.menuCursor,
    kFlag: rt.game.choosingChief,
    entityFocusFlag: rt.game.entityFocusFlag,
    zAfCursorVFlag: rt.game.zAfCursorVFlag,
    dense: rt.denseState,
    vInt: rt.game.vInt,
    wByte: rt.game.barMode,
    zlYInt: rt.game.zlYInt,
    qCounter: rt.game.qCounter,
    FByte: rt.game.selectionGroup,
    adByte: rt.game.selectionAd,
    frameGenCounterY: rt.game.frameGenCounterY,
    frameGenCounterZ: rt.game.frameGenCounterZ,
    ayByte: rt.game.ayByte,
    aByteRows: rt.mainArrays.aByte,
    uBytes: rt.mainArrays.uBytes,
    am: rt.game.am,
    qByte: rt.game.mission,
    Q: rt.game.screen,
    al: rt.game.al,
    ai: rt.game.ai,
    mByte: rt.game.mByte,
    akByte: rt.game.akByte,
    Z: rt.game.Z,
    W: rt.game.exitPrepWInt,
    X: rt.game.exitPrepXInt,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    zAd14T: rt.game.frameLayoutT,
    zAd14U: rt.game.frameLayoutU,
    zAd14Q: rt.game.zAd14QFlag,
    zAd14R: rt.game.zAd14RFlag,
    af: rt.game.columnScrollDelta,
    ag: rt.game.rowScrollDelta,
  };
  const changed = stepLegacyFrameCommandChanged(command, rt.game.loopMode, changedState, {
    onD: () => stepLegacyMapOverviewScroll(rt.mapOverviewInput()),
  });
  rt.game.vInt = changedState.vInt;
  rt.game.am = changedState.am;
  rt.game.frameLayoutT = changedState.zAd14T;
  rt.game.frameLayoutU = changedState.zAd14U;
  rt.game.zAd14QFlag = changedState.zAd14Q;
  rt.game.zAd14RFlag = changedState.zAd14R;
  rt.game.columnScrollDelta = changedState.af;
  rt.game.rowScrollDelta = changedState.ag;
  const result = drawLegacyFrameCommand({
    command,
    x,
    y,
    changed,
    flags: rt.game.frameFlags,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: rt.packedData?.shortTables ?? [],
    byteTables: rt.packedData?.byteTables ?? [],
    // f.c:[B (#263): one field with game.frameImageSlots (merged 2026-09-28;
    // O()'s c[8]/c[9] writes never reached rt copy).
    imageSelectors: rt.game.frameImageSlots,
    dShort: rt.game.zlDShorts,
    kBytes: rt.game.zlKBytes,
    v: rt.game.vInt,
    w: rt.game.resourceSectionW,
    dense: rt.denseState,
    l: rt.game.selectedId,
    onTarget: (target) => { rt.frameDispatchState.N = target; },
    onProgress: (progressX, progressY, width, height, anchor) => {
      rt.frameHelperCalls.push({ kind: "progress", x: progressX, y: progressY, width, height, anchor });
      // f.a(byte,int,int) offsets 702..815: setColor(0), then helper #437
      // (fillRect at +11/+8) blacks out the empty part of the bar.
      const graphics = rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      graphics?.setColor(0);
      graphics?.fillRect(progressX + 11, progressY + 8, width, height);
    },
    onText: (record, textX, textY, style, row) => {
      rt.frameHelperCalls.push({ kind: "frame-text", record, x: textX, y: textY, style, row });
    },
    onRecord1010: (record, mode, recordX, recordY, row) => {
      rt.frameHelperCalls.push({ kind: "frame-record-1010", record, mode, x: recordX, y: recordY, row });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      drawLegacy1010({
        start: record,
        selection: mode,
        originY: recordY,
        count: rt.game.frameLayoutAW,
        stride: rt.game.frameLayoutAV,
        aX: rt.game.frameLayoutAX,
        originX: rt.game.frameLayoutAY,
        aZ: rt.game.frameLayoutAZ,
        selectedRow: rt.game.menuCursor,
        av: rt.game.frameLayoutAv,
        r: rt.mainArrays.r,
        s: rt.mainArrays.s,
        recordKind: rt.denseState[BLD_KIND + rt.game.qCounter] ?? 0,
        V: rt.game.zAfCursorVFlag,
        F: rt.game.entityFocusFlag,
        t: rt.game.frameLayoutT,
        u: rt.game.frameLayoutU,
        f: rt.game.animPhase,
        e: rt.game.animStep,
        shortTables: rt.packedData.shortTables,
        onSprite: (asset, assetX, assetY) => packed.drawSprite(asset, assetX, assetY),
        onPacked: (asset, assetX, assetY) => packed.drawComposite(asset, assetX, assetY),
        onEntity: (id, entityX, entityY, arg4, arg5) => rt.stepEntityAction(id, entityX, entityY, arg4, arg5),
        onText: (textX, textY, width, text, value) => {
          rt.frameHelperCalls.push({ kind: "frame-1010-number", x: textX, y: textY, value: Number(text), style: width });
          rt.touchBarNumberX = textX;
          try {
            rt.geometry.queueTextWithWidth(textX, textY, width, text, value);
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
            rt.geometry.reset(); // c.a(Graphics)'s tail: a:B = 0
          } catch {
            // Preserve the original c.a(String) exception boundary.
          }
        },
        onSubrecord: (asset, assetX, assetY, phase) => {
          rt.frameHelperCalls.push({ kind: "frame-1010-subrecord", record: asset, x: assetX, y: assetY, mode: phase });
          rt.stepZSubrecordDraw(asset, assetX, assetY, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        },
        onS: () => { rt.game.gameplaySFlag = true; },
      });
    },
    onRecord1137: (record, recordX, recordY, row) => {
      rt.frameHelperCalls.push({ kind: "frame-record-1137", record, x: recordX, y: recordY, row });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      try {
        drawLegacy1137Composition({
          x: recordX,
          y: recordY,
          commandRecord: record,
          languageState: rt.game.screen,
          selectionIndex: rt.game.Z,
          phase: rt.game.animStep,
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          shortTables: rt.packedData.shortTables,
          byteTables: rt.packedData.byteTables,
          onLayout: (rowCount) => {
            // f.c() stores the section length in int field ab;
            // f.aC() uses it as the selector wrap bound.
            rt.game.ab = rowCount;
            rt.touchMenuRows.length = 0;
            rt.touchMenuQ = rt.game.screen;
          },
          onPacked: (packedRecord, packedX, packedY) => {
            rt.frameHelperCalls.push({ kind: "frame-1137-packed", record: packedRecord, x: packedX, y: packedY });
            // f.c(III) offset 153 is b(III) (#535), one sprite: the row's background fill, which erases
            // last frame's cursor. CORRECTED 2026-10-15 (docs/bugs.md BUG-002): rt drew a composite
            // (1766 has none), so every row the cursor had visited kept its triangles.
            packed.drawSprite(packedRecord, packedX, packedY);
          },
          // Q14 (the language list) gets a sixth row, 中文, when the Chinese strings are loaded.
          onExtraRow: rt.game.screen === 14 && rt.zhStrings ? (rowX, rowY) => {
            rt.touchMenuRows.push(rowY);
            rt.geometry.queueZhLabel(rowX, rowY, 1, Array.from(ZH_LANGUAGE_NAME, (text) => ({ text })), 0);
          } : undefined,
          onGeometry: (geometryX, mode, width, geometryRecord, value) => {
            rt.touchMenuRows.push(mode);
            rt.geometry.decodeRecord(geometryX, mode, width, geometryRecord, value);
            rt.frameHelperCalls.push({ kind: "frame-1137-geometry", record: geometryRecord, x: geometryX, y: mode, width, value, active: rt.geometry.activeRows });
          },
          onFlush: () => {
            const geometryCommands = rt.geometryRenderer.emit();
            rt.frameHelperCalls.push({ kind: "frame-1137-active", record: rt.geometry.activeRows });
            rt.frameHelperCalls.push({ kind: "frame-1137-draw-count", record: geometryCommands.length, active: rt.geometry.activeRows });
            for (const draw of geometryCommands.slice(0, 8)) {
              rt.frameHelperCalls.push({
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
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
            rt.geometry.reset();
          },
          onSelectionMarker: (kind, markerX, markerY, phase) => {
            rt.frameHelperCalls.push({ kind: "frame-1137-marker", record: kind, x: markerX, y: markerY, mode: phase });
            rt.stepZSubrecordDraw(kind, markerX, markerY, phase, {
              onSpriteRecord: (markerRecord, drawX, drawY) => packed.drawComposite(markerRecord, drawX, drawY),
            });
          },
        });
      } catch (error) {
        rt.frameHelperCalls.push({ kind: "frame-1137-error", message: error instanceof Error ? error.message : String(error) });
        // Preserve f.c()'s broad frame-level exception boundary.
      }
    },
    onKind2: (row, aI, aJ, aK) => {
      rt.frameHelperCalls.push({ kind: "frame-kind2", row, mode: aI, x: aJ, y: aK });
      if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      });
      const kind2State: LegacyZKind2State = {
        Q: rt.game.zAd14QFlag,
        R: rt.game.zAd14RFlag,
        T: rt.game.frameLayoutT,
        U: rt.game.frameLayoutU,
        aI,
        aJ,
        aK,
        y: rt.game.cursorColumn,
        I: rt.game.cameraColumn,
        W: rt.game.exitPrepWInt,
        K: rt.game.cameraRow,
        X: rt.game.exitPrepXInt,
        aL: rt.game.exitPrepALInt,
        A: rt.game.cursorRow,
        O: rt.game.viewColumns,
        P: rt.game.viewRows,
        f: rt.game.animPhase,
        k: rt.game.tickDivisor,
        S: rt.game.gameplaySFlag,
      };
      stepLegacyZKind2(kind2State, row, {
        onDrawRect: (rectX, rectY, width, height) => {
          rt.frameHelperCalls.push({ kind: "frame-kind2-rect", x: rectX, y: rectY, width, height });
          // #536's b(Graphics,IIII) targets Graphics[M:B] (#76), a
          // *static* field confirmed 0 at its one and only write site
          // (the class static initializer) -- same graphics[0] target
          // stepLegacyR/stepLegacyP already use for the same field.
          const bar = rt.offscreenTargets?.graphics[0];
          if (bar) {
            bar.setColor(1105252);
            bar.drawRect(rectX, rectY, width, height);
          }
        },
        onSubrecord: (index, spriteX, spriteY, phase) => {
          rt.frameHelperCalls.push({ kind: "frame-kind2-sprite", record: index, x: spriteX, y: spriteY, mode: phase });
          rt.stepZSubrecordDraw(index, spriteX, spriteY, phase, {
            onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
          });
        },
      });
      rt.game.gameplaySFlag = kind2State.S;
    },
    onKind4: (_row, aI, aJ, aK) => {
      rt.stepZKind4({ aI, aJ, aK }, {
        onSetClip: (clipX, clipY, width, height) => {
          const g = rt.game;
          g.bc = clipX;
          g.bd = clipY;
          g.be = width;
          g.bf = height;
          rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3]?.setClip(clipX, clipY, width, height);
        },
      });
    },
    onKind3: (row, aI, aJ, aK, aFValue) => {
      rt.frameHelperCalls.push({ kind: "frame-kind3", row, mode: aI, x: aJ, y: aK, value: aFValue });
      if (!rt.packedData) return;
      const kind3State: LegacyZKind3State = {
        aI,
        aJ,
        aK,
        // f.o:B (#349): the picture index aI 10 hands to c(byte).
        o: rt.game.oByte,
        aF: aFValue,
        u0: rt.mainArrays.uBytes[0] ?? 0,
        e: rt.denseState,
        kRows: rt.mainArrays.kMatrix,
        cBytes: rt.game.frameImageSlots,
        byteRows: rt.packedData.byteTables,
        shortRows: rt.packedData.shortTables,
      };
      stepLegacyZKind3(kind3State, row, {
        // aI 10: c(byte) (#558) reads /pi8 and stores entry o in
        // a:[[Image][2][0]; then drawImage(a[2][0], x, y, anchor) into
        // Graphics[N] -- the cutscene picture. /pi8 is preloaded as
        // imageGroups[2]; a missing entry leaves the slot as it was (the
        // original's catch).
        onPalette: (value) => {
          const image = rt.imageGroups[2]?.get(value)?.image;
          if (image) rt.pi8Slot0 = image;
          rt.shownPicture = value;
        },
        onImage: (_group, _index, imageX, imageY, anchor) => {
          const image = rt.pi8Slot0 ?? rt.imageGroups[2]?.get(0)?.image;
          const target = rt.offscreenTargets?.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
          if (image && target) target.drawImage(image, imageX, imageY, anchor as AnchorValue);
        },
        // aI 11: helper #435 copies the map overview out of Image[c[1]]
        // into Graphics[M] (M:B is 0); its exception is swallowed.
        onRegion: (imageSlot, sourceX, sourceY, width, height, regionX, regionY) => {
          const image = rt.offscreenTargets?.images[imageSlot as 0 | 1 | 2 | 3];
          const target = rt.offscreenTargets?.graphics[0];
          if (!image || !target) return;
          try {
            target.drawRegion(image, sourceX, sourceY, width, height, 0, regionX, regionY, 0);
          } catch {
            // #435 returns false.
          }
        },
        onFiveIntText: (x, mode, width, record, value) => {
          rt.frameHelperCalls.push({ kind: "frame-kind3-five", x, y: mode, width, record, value });
          applyLegacyZFiveIntGeometry(rt.geometry, x, mode, width, record, value);
        },
        onSevenIntText: (x, mode, width, first, second, third, value) => {
          rt.frameHelperCalls.push({ kind: "frame-kind3-seven", x, y: mode, width, record: first, value });
          applyLegacyZSevenIntGeometry(rt.geometry, x, mode, width, first, second, third, value);
        },
      });
    },
    onKText: (textX, textY, command, mode, row, value) => {
      rt.frameHelperCalls.push({ kind: "frame-k-text", x: textX, y: textY, command, mode, row, value });
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const textState = {
        aF: value,
        aI: mode + 1,
        aJ: textX,
        aK: textY,
        // f.l:B (#337), the selected unit k(int)'s advance rows and row
        // 1067 read. Was a constant 0 until 2026-10-02, so the unit panel
        // showed unit 0's fields (the "-1"s).
        l: rt.game.selectedId,
      };
      try {
        rt.stepZKText(textState, command, {
          onText: (glyphX, glyphMode, width, text, value) => {
            // c.a(aJ,aK,j[3][row]>>6,String.valueOf(aF),aI-1)
            // maps directly to the compact geometry text entry.
            if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset: -1, text, x: glyphX, y: glyphMode });
            rt.geometry.queueTextWithWidth(glyphX, glyphMode, width, text, value);
          },
        });
        rt.game.frameCommandAF = textState.aF;
      } catch {
        // Preserve f.k()/c.a(String)'s broad frame exception boundary.
      }
    },
    onCompose: (record, composeX, composeY, width, height, align, font, row, compose) => {
      rt.frameHelperCalls.push({ kind: "frame-compose", record, x: composeX, y: composeY, width, height, align, font, row });
      rt.shownTextRecord = record >= 71 ? record + (rt.packedBytes[rt.packedOffsets[309] + rt.resourceTables.sectionArg] & 0xff) : record;
      // f.a(BII) offsets 962..991: a new text (w != v) starts at row 0;
      // z:I = y:I; c.a(Graphics, y) then draws from row y (the scroll).
      // CORRECTED 2026-09-30: y was never reset and rows always started at 0.
      const g = rt.game;
      if (g.resourceSectionW !== g.vInt) {
        g.resourceSectionW = g.vInt;
        g.frameGenCounterY = 0;
      }
      g.frameGenCounterZ = g.frameGenCounterY;
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      try {
        if (compose) composeLegacyC(
          rt.cComposition,
          rt.packedBytes,
          rt.packedOffsets,
          rt.resourceTables.byteViews,
          rt.resourceTables.offsetViews,
          composeX,
          composeY,
          width,
          height,
          record,
          align,
          font,
          rt.resourceTables.sectionArg,
          rt.zhCompose,
        );
        const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
        const extras = rt.cRenderExtras();
        const imageGroup0 = rt.imageGroups[0];
        const commands = emitLegacyCRenderRow(
          rt.cComposition,
          rt.packedBytes,
          rt.packedOffsets,
          rt.resourceTables.byteViews,
          rt.imageGroups[0],
          g.frameGenCounterY,
          undefined,
          rt.setDialogueEdges,
          {
            ...extras,
            onZhLine: (tokens, m, n, zhFont, stat) => paintZhLine(graphics,
              { ...rt.zhPaintBase(imageGroup0), onIcon: extras.onIcon, onStat: stat }, zhFont, tokens, m, n),
          },
        );
        for (const draw of commands) {
          const image = rt.imageGroups[0].get(draw.imageIndex)?.image;
          if (image) graphics.drawRegion(image, draw.sourceX, draw.sourceY, draw.width, draw.height, 0, draw.x, draw.y, draw.anchor);
        }
      } catch {
        // Preserve c/f's broad exception boundary for malformed rows.
      }
    },
    onRowCommand: (kind, row, record, rowX, rowY, stateAI, aF) => {
      rt.frameHelperCalls.push({ kind: "frame-row-command", row, mode: kind, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0 });
      if (!rt.offscreenTargets || !rt.packedData) return;
      const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
      const packed = new LegacyPackedSpriteRenderer({
        shortTables: rt.packedData.shortTables,
        byteTables: rt.packedData.byteTables,
        imageGroups: rt.imageGroups,
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
      rt.game.frameCommandAI = stateAI ?? rt.game.frameCommandAI;
      rt.game.frameCommandAJ = rowX ?? rt.game.frameCommandAJ;
      rt.game.frameCommandAK = rowY ?? rt.game.frameCommandAK;
      // The row loop's own aF (d[aE] for a pending row, else 0); the
      // previous command's leftover made the portrait 720 + HP.
      rt.game.frameCommandAF = aF ?? 0;
      rt.consumeFrameCommand(row, {
        onSprite: (asset, spriteX, spriteY) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset, text: "", x: spriteX, y: spriteY });
          packed.drawComposite(asset, spriteX, spriteY);
        },
        onDefaultSprite: (asset, spriteX, spriteY) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset, text: "", x: spriteX, y: spriteY });
          packed.drawComposite(asset, spriteX, spriteY);
        },
        onText: (textX, textY, style, value, mode) => {
          if (rt.drawingVillagerPanel) rt.villagerPanelDraft.push({ asset: -1, text: value, x: textX, y: textY });
          // j(int) offsets 190..246: c.a(x, y, j[3][row]>>6, text, 0).
          // Until 2026-10-01 rt passed (x, mode, text, style): every
          // cost number landed at y 0 with the alignment as its spacing.
          try {
            rt.geometry.queueTextWithWidth(textX, textY, style, value, mode);
            rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]!);
          } catch {
            // Preserve the original c/f rendering exception boundary.
          }
        },
      });
    },
    onFlush: () => {
      rt.frameHelperCalls.push({ kind: "frame-flush" });
      if (!rt.offscreenTargets || !rt.imageGroups[0]) return;
      try {
        const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
        rt.geometryRenderer.renderTo(graphics, rt.imageGroups[0]);
        rt.geometry.reset();
      } catch {
        // Preserve c.a(Graphics)'s broad frame exception boundary.
      }
    },
    onUnhandled: (kind, row, record, rowX, rowY, group) => rt.frameHelperCalls.push({ kind: "frame-unhandled", mode: kind, row, record: record ?? -1, x: rowX ?? 0, y: rowY ?? 0, group: group ?? -1 }),
  });
  if (result) {
    rt.game.frameCommandAE = result.aE;
    rt.game.frameCommandAF = result.aF;
  }
}

/**
 * Raw f.Y(): the real camera-pan driver (see LegacyCameraFollow.ts). Its
 * callers are f.aD() and f.V()'s tail (LegacyGameplayInput's onY, wired;
 * the old "V() not yet ported" note was stale -- 2026-09-28). Builds a
 * fresh state object each call (rather than reusing a persisted one, the
 * pattern used elsewhere in rt class) since most of `LegacyCameraFollowState`'s
 * fields are `readonly` from the port's own perspective.
 */
export function stepCameraFollow(rt: LegacyRuntimeState): void {
  const state: LegacyCameraFollowState = {
    cameraBFlag: rt.game.cameraBFlag,
    inputUp: rt.game.inputUp,
    inputDown: rt.game.inputDown,
    inputLeft: rt.game.inputLeft,
    inputRight: rt.game.inputRight,
    cursorColumn: rt.game.cursorColumn,
    cursorRow: rt.game.cursorRow,
    cursorTargetColumn: rt.game.cursorTargetColumn,
    cursorTargetRow: rt.game.cursorTargetRow,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columnScrollDelta: rt.game.columnScrollDelta,
    rowScrollDelta: rt.game.rowScrollDelta,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    // f.O:B / f.P:B (#83/#87), live -- were a {12, 19} placeholder until 2026-10-09 (oracle run 5,
    // frame 12275: with P 16 the camera scrolls down at K 11, the placeholder stopped it there).
    viewportColumns: rt.game.viewColumns,
    viewportRows: rt.game.viewRows,
    selectionFlags: rt.game.selectionFlags,
    selectionBa: rt.game.selectionBa,
  };
  stepLegacyCameraFollow(state);
  rt.game.cursorColumn = state.cursorColumn;
  rt.game.cursorRow = state.cursorRow;
  rt.game.cameraColumn = state.originColumn;
  rt.game.cameraRow = state.originRow;
  rt.game.columnScrollDelta = state.columnScrollDelta;
  rt.game.rowScrollDelta = state.rowScrollDelta;
}

/**
 * Raw f.n(): per-tick camera pixel-scroll handler (see LegacyCameraScroll.ts).
 *
 * BUG FIX (2026-09-08): `onRedraw` (f.o(), five call sites in f.n() matching
 * rt port's five `onRedraw?.()` sites) used to be left inert, on the
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
 * aj/ak -- rt is what erases last tick's units, bubbles and cursor; 420..455
 * copies Graphics[c[1]] back into Image[c[0]] after any o() redraw.
 * WIRED 2026-09-30: both were inert, so everything u() drew stayed on the
 * map layer until the next full redraw (stale thought bubbles).
 */
export function stepCameraScroll(rt: LegacyRuntimeState): void {
  rt.cameraScrollState.rowScrollDelta = rt.game.rowScrollDelta;
  rt.cameraScrollState.columnScrollDelta = rt.game.columnScrollDelta;
  rt.cameraScrollState.pixelColumnOffset = rt.game.pixelColumnOffset;
  rt.cameraScrollState.pixelRowOffset = rt.game.pixelRowOffset;
  rt.cameraScrollState.scrollTargetColumn = rt.game.scrollTargetColumn;
  rt.cameraScrollState.scrollTargetRow = rt.game.scrollTargetRow;
  rt.cameraScrollState.followFlag = rt.game.AFlag;
  rt.cameraScrollState.cFlag = rt.game.cameraCFlag;
  rt.cameraScrollState.bFlag = rt.game.cameraBFlag;
  rt.cameraScrollState.dFlag = rt.game.cameraDFlag;
  rt.cameraScrollState.aiScratch = rt.game.aiScratch;
  rt.cameraScrollState.sFlag = rt.game.cameraSFlag;
  stepLegacyCameraScroll(rt.cameraScrollState, rt.cameraScrollViewport, rt.game.selectionAInt, {
    onPartialBlit: (destX, destY, height, graphicsSlot, imageSlot) => {
      const slots = rt.game.frameImageSlots;
      const target = rt.offscreenTargets?.graphics[slots[graphicsSlot] as 0 | 1 | 2 | 3];
      const image = rt.offscreenTargets?.images[slots[imageSlot] as 0 | 1 | 2 | 3];
      if (!target || !image) return;
      try {
        target.drawRegion(image, 0, 0, 264, height, 0, destX, destY, 0);
      } catch {
        // #435 returns false.
      }
    },
    // f.o() (#629): redraw f.n()'s window -- aj..al x ak..am, only the a:[[Z] cells while D:Z --
    // into the offscreen buffer the composite reads, i.e. Graphics[N:B] == graphics[targetSlot].
    onRedraw: () => {
      const scroll = rt.cameraScrollState;
      renderMap(rt, 
        { fromColumn: scroll.pixelColumnOffset, toColumn: scroll.scrollTargetColumn, fromRow: scroll.pixelRowOffset, toRow: scroll.scrollTargetRow },
        (rt.game.targetSlot as 0 | 1 | 2 | 3),
        scroll.dFlag ? rt.effectRectBoolGrid : null,
      );
    },
  });
  rt.game.rowScrollDelta = rt.cameraScrollState.rowScrollDelta;
  rt.game.columnScrollDelta = rt.cameraScrollState.columnScrollDelta;
  rt.game.pixelColumnOffset = rt.cameraScrollState.pixelColumnOffset;
  rt.game.pixelRowOffset = rt.cameraScrollState.pixelRowOffset;
  rt.game.scrollTargetColumn = rt.cameraScrollState.scrollTargetColumn;
  rt.game.scrollTargetRow = rt.cameraScrollState.scrollTargetRow;
  rt.game.AFlag = rt.cameraScrollState.followFlag;
  rt.game.cameraCFlag = rt.cameraScrollState.cFlag;
  // BUG FIX (2026-09-03): `bFlag` (B:Z #39, game.cameraBFlag) was read in
  // at the top of rt method but never written back here. Real bytecode
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
  rt.game.cameraBFlag = rt.cameraScrollState.bFlag;
  rt.game.aiScratch = rt.cameraScrollState.aiScratch;
}

/** f.o() (#629) into Graphics[target]; see LegacyMapRenderer.ts. */
export function renderMap(rt: LegacyRuntimeState, range: LegacyMapRedrawRange, target: 0 | 1 | 2 | 3, dirty: boolean[][] | null): void {
  const data = rt.packedData;
  const graphics = rt.offscreenTargets?.graphics[target];
  if (!rt.activeMap || !data || !graphics) return;
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  renderLegacyMap({
    width: rt.game.mapWidth,
    height: rt.game.mapHeight,
    gridB: rt.gridB,
    gridC: rt.gridC,
    onComposite: (record, x, y) => packed.drawComposite(record, x, y),
    onMarker: (value, ah, ai) => drawMapMarker(rt, value, 0, ah, ai, packed),
  }, { column: rt.game.cameraColumn, row: rt.game.cameraRow }, range, dirty);
}

/**
 * private void a(int,byte) (#441) for cell (ah, ai): the routing half
 * (prepareLegacyMapMarkerDispatch, offsets 0..993), then either the
 * ground/stacked-piece draw (994..1140, arg2 still 0 -- f.o()'s call) or
 * the detail draw a(int,byte,byte,int,int,byte) (1143..1155), then
 * offsets 1158..1202 clear g/h/i[0..7].
 */
export function drawMapMarker(rt: LegacyRuntimeState, value: number, arg2: number, ah: number, ai: number, packed?: LegacyPackedSpriteRenderer): void {
  const data = rt.packedData;
  if (!data) return;
  const result = prepareLegacyMapMarkerDispatch(value, arg2, {
    ah,
    ai,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    dense: rt.denseState,
    gridC: rt.gridC,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    aQ: rt.game.aQ,
  });
  for (const write of result.scratchGWrites) {
    rt.entityMarkerG[write.index] = write.value;
  }
  // The HD wide view (render/HdArt.ts): a building or map object with an HD picture draws that
  // instead; the original's pieces still go through, onto a measuring or discarded canvas.
  const building = value < 0 && value >= -60 ? result.local3 : 0;
  const plan = hdArt.active && packed
    ? hdArt.planMarker(building, result.local4, result.local7, result.resource, result.local7, result.local10, result.local11, result.arg2 !== 0)
    : null;
  if (plan) packed = plan.packed;
  plan?.before();
  if (result.arg2 === 0) {
    if (packed) {
      const pieces = packed;
      drawLegacyMapMarkerPieces(result, ah, ai, data.shortTables, data.byteTables, (record, x, y) => pieces.drawComposite(record, x, y));
      const ground = plan?.original ? hdArt.ground : null;
      if (ground) {
        drawLegacyMapMarkerPieces(result, ah, ai, data.shortTables, data.byteTables, (record, x, y) => ground.drawComposite(record, x, y));
      }
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
        // BUG FIX (2026-08-18): was game.animStep (e:I,
        // #284) -- direct bytecode read of `a(int,byte,byte,int,
        // int,byte)` (#442, both refs, offset 4/1156) confirms
        // f:I (#294)/game.animPhase. See fCounter's docblock.
        phase: rt.game.animPhase,
        N: result.N,
        O: result.O,
        qByte: rt.game.mission,
        vByte: rt.game.loopMode,
        ai,
        originRow: rt.game.cameraRow,
        dense: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        shortTables: data.shortTables,
        byteTables: data.byteTables,
        entityMarkerG: rt.entityMarkerG,
        entityMarkerH: rt.entityMarkerH,
        entityMarkerI: rt.entityMarkerI,
        statScratch: rt.mainArrays.aShort,
      },
      {
        // CORRECTED 2026-10-15 (docs/bugs.md BUG-001): X:B was never written here, so q() never drew
        // the health bar of a unit inside a building (a chief on a site looked idle).
        onX: (value) => { rt.game.unitInBuilding = value; },
        onComposite: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
        // onEntityAction (f.a(IIIIB) #443) wired 2026-08-15 --
        // confirmed a guaranteed no-op in the original (see
        // stepEntityAction's own docblock), wired anyway to
        // document that rather than leave it looking unresolved.
        onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
        // onXFlag (f.x:Z #383) -- confirmed its only reader
        // (stepEntityAction) is unreachable dead code (see
        // game.xZFlag's own docblock), so rt write has no
        // observable effect; wired anyway to be faithful.
        onXFlag: () => { rt.game.xZFlag = true; },
      },
    );
  }
  plan?.after();
  for (let index = 0; index < 8; index += 1) {
    rt.entityMarkerG[index] = 0;
    rt.entityMarkerH[index] = 0;
    rt.entityMarkerI[index] = 0;
  }
}

/**
 * Render the retained original map directly to the logical browser
 * surface. When `viewport` is omitted, its `column`/`row` (the map-tile
 * origin f.o() reads via I:B/K:B) track the LIVE `game.cameraColumn`/`game.cameraRow`
 * fields rather than a fixed (0,0) -- f.n() (LegacyCameraScroll.ts) is
 * not wired to a live outer loop yet, but I:B/K:B are already the real
 * camera-origin fields every other ported piece of rt project reads,
 * so rt at least renders the correct part of the map once something
 * else moves them (and stops silently rendering the map's top-left
 * corner forever, which is what the fixed default viewport did before).
 *
 * Also draws both halves of f.w() (LegacyCameraFrame.ts) directly
 * afterward:
 *
 *  - Letterbox (offsets 0..296): an outlined rectangle showing how far
 *    the viewport extends past the map bounds, gated by `uFlag`
 *    (f.u:Z #370). Wired 2026-08-14 now that its `boxAnchorColumn`/`boxAnchorRow` (f.G/f.H)
 *    inputs (f.G:I/H:I #53/58) are genuinely live -- see
 *    gameplay-paint-cluster.md's "f.aE()'s caller traced" section.
 *  - Camera-center cursor (offsets 297..496): a 4-corner bracket drawn
 *    around the centered tile when its map classification is 0. Wired
 *    2026-08-14: `animationPhase` (f.e:I #284) -- previously flagged as
 *    having no established source -- turned out to already be ported and
 *    live as `game.animStep` (see `LegacyGameplayTick.ts`'s
 *    `stepLegacyGameplayTick`, which increments/wraps it every tick;
 *    confirmed by matching its exact bytecode pattern, `e:I+=1; if
 *    e:I>=6 {...}; if e:I>=8 {e:I=0;}`, against `f.h()`'s own bytecode).
 *    `onCorner` routes through the same `stepZSubrecordDraw` boundary
 *    already used elsewhere in rt file (e.g. the frame-1137 selection
 *    marker), backed by a fresh `LegacyPackedSpriteRenderer` bound to
 *    rt call's `graphics`.
 */
export function renderGameplayTo(rt: LegacyRuntimeState, graphics: Graphics, viewport?: LegacyMapViewport): readonly { resourceId: number; x: number; y: number }[] {
  if (!rt.activeMap) return [];
  const resolvedViewport = viewport ?? {
    ...LEGACY_DEFAULT_MAP_VIEWPORT,
    column: rt.game.cameraColumn,
    row: rt.game.cameraRow,
  };
  // The terrain draw that used to sit here (`mapRenderer.render(graphics,
  // ...)`, straight onto the VISIBLE Graphics) was the last of the
  // non-bytecode-faithful bridges rt docblock mentions. paint()'s v==1
  // branch has no such step: f.o() draws tiles into Graphics[N:B] and the
  // composite below blits that buffer. Removed 2026-09-08; f.o() is now
  // wired for real at stepCameraScroll's onRedraw.
  void resolvedViewport;
  stepCameraFrame(rt, graphics);
  rt.stepGameplayPaintComposite(graphics);
  stepGameplayPaintHud(rt, graphics);
  return [];
}

/**
 * f.paint()'s v==1 tail, offsets 89..244 -- the gameplay HUD bars, drawn
 * straight onto the VISIBLE Graphics rather than into an offscreen.
 *
 * That is why nothing the port did to the offscreens ever produced a top
 * resource bar: the composite above maps offscreen y 0 to screen y 14 (its
 * measured call is `drawRegion(img, 0, 0, 262, 304, 0, -11, 14, 0)`), so the
 * top 14 rows are outside the blit by construction and only rt loop fills
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
 * With the live tables rt resolves to exactly the two bars: slot 0 takes
 * record 2 (source y 304, 22 tall, dest y 0 -- the top resource bar) and
 * slot 9 takes record 10 (source y 326, 38 tall, dest y 282 -- the bottom
 * status bar).
 *
 * Per-slot extras, offsets 245..454 (ported 2026-09-28), all through
 * `a(Graphics,int,int,int)` (#436, the packed composite on `g`):
 *   slot 7 or 8: record 556 at (a:[I][rec] - 68, b:[I][rec] - 55 + bb + d:[I][rec] + 5)
 *   t195[20 + slot] == 1: record 524 at (0, bb); == 2: record 528 at (0, 320 - ba)
 *
 * `skipSlots` is not in the original: the larger view (WideScreen.ts) draws the HUD again without
 * the bars it replaces.
 */
export function stepGameplayPaintHud(rt: LegacyRuntimeState, graphics: Graphics, skipSlots?: ReadonlySet<number>): void {
  const images = rt.offscreenTargets?.images;
  if (!images) return;
  const base195 = rt.packedOffsets[195] ?? 0;
  const g = rt.game;
  const packed = rt.packedData && rt.imageGroups[0]
    ? new LegacyPackedSpriteRenderer({
      shortTables: rt.packedData.shortTables,
      byteTables: rt.packedData.byteTables,
      imageGroups: rt.imageGroups,
      graphics,
    })
    : undefined;
  for (let slot = 0; slot < 20; slot += 1) {
    if (!g.selectionFlags[slot] || skipSlots?.has(slot)) continue;
    const record = rt.packedBytes[base195 + slot] ?? 0;
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
    const edge = rt.packedBytes[base195 + 20 + slot] ?? 0;
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
 * its fill onto it) -- both are now unnecessary since rt blit picks up
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
 * `a:S` (#140) and `b:S` (#240) are read-only everywhere in rt class --
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
 * both to `3`) -- so by the time rt runs, the slot rt reads is the
 * one that tick's K/R/am/m dispatch actually drew into.
 */
export function stepGameplayPaintComposite(rt: LegacyRuntimeState, graphics: Graphics): void {
  if (!rt.offscreenTargets) return;
  const local2 = rt.game.ad === 0 && rt.game.ae === 0 ? (rt.game.frameImageSlots[1] ?? 0) : 3;
  const image = rt.offscreenTargets.images[local2 as 0 | 1 | 2 | 3];
  if (!image) return;
  const x = rt.game.ad - 11;
  const y = rt.game.selectionBb - rt.game.selectionAx + rt.game.ae - 8;
  try {
    graphics.drawRegion(image, 0, 0, 262, rt.game.selectionAInt, 0, x, y, 0);
  } catch {
    // a(Graphics, Image, …) (#435) catches the underlying J2ME draw exception.
  }
}

/** f.w(): both halves (letterbox + camera-center cursor), factored out so `renderGameplayTo` and `stepGameplayFramePrep` (f.m()'s `onW`) can share it. */
export function stepCameraFrame(rt: LegacyRuntimeState, graphics: Graphics): void {
  const letterboxOutput = stepLegacyCameraLetterbox(rt.letterboxState(), graphics);
  if (letterboxOutput) {
    rt.game.BCounter = letterboxOutput.b;
    rt.game.CCounter = letterboxOutput.c;
    rt.game.DCounter = letterboxOutput.d;
    rt.game.ECounter = letterboxOutput.e;
  }
  stepCameraCursor(rt, graphics);
}

export function stepCameraCursor(rt: LegacyRuntimeState, graphics: Graphics): void {
  const data = rt.packedData;
  if (!data) return;
  const packed = new LegacyPackedSpriteRenderer({
    shortTables: data.shortTables,
    byteTables: data.byteTables,
    imageGroups: rt.imageGroups,
    graphics,
  });
  const state: LegacyCameraFrameCursorState = {
    gridC: rt.gridC,
    viewportOriginK: rt.game.cameraRow,
    scrollA: rt.game.cursorRow,
    viewportOriginI: rt.game.cameraColumn,
    scrollY: rt.game.cursorColumn,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  };
  stepLegacyCameraCursor(state, rt.game.animStep, {
    onCorner: (index, x, y, phase) => {
      rt.stepZSubrecordDraw(index, x, y, phase, {
        onSpriteRecord: (record, drawX, drawY) => packed.drawComposite(record, drawX, drawY),
      });
    },
  });
}

/**
 * f.m() (no-arg -- not the already-ported `f.m(int)` numeric-sequence
 * overload). Its only real caller in the whole class is `run()`'s main
 * loop (bytecode offset 133, right after `h()`), called unconditionally
 * every tick -- matched here by calling rt from `main.ts`'s `tick()`
 * right after `stepGameplayFrame()` (`h()`), also unconditionally; the
 * method's own `v:B!==1` early-return reproduces the original's own
 * internal gating, so no extra `vByte` check is needed at the call site.
 *
 * This is also `f.u()`'s 5th and final call site (`K()`/`R()`x2/`am()`
 * are the other 4, already wired) and the real per-frame trigger for
 * the gameplay HUD's 20-slot element-scan loop -- `game.selectionFlags`
 * (`f.a:[Z]` #123) is already populated live by
 * `LegacySelectionFlags.ts`'s `stepLegacySelectionFlags`, wired
 * elsewhere in rt class, so rt loop reaches real content.
 *
 * `onN` is `n()` itself (offset 19), before `w()`/`u()`: its opening blit
 * restores the clean map, so u() draws onto a fresh layer. 2026-09-30:
 * main.ts used to call `n()` separately, after rt method -- i.e. after
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
export function stepGameplayFramePrep(rt: LegacyRuntimeState): void {
  const data = rt.packedData;
  if (!data) return;
  const state: LegacyGameplayFramePrepState = {
    vByte: rt.game.loopMode,
    imageSlotC1: rt.game.frameImageSlots[1] ?? 0,
    scrollY: rt.game.cursorColumn,
    ad: rt.game.ad,
    scrollA: rt.game.cursorRow,
    ae: rt.game.ae,
    slotFlags: rt.game.selectionFlags,
    cInts: rt.game.frameRecordInts,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // ax/ba/bb are the SAME fields (#229/#248/#249) LegacySelectionFlags.ts
    // already tracks as selectionAx/selectionBa/selectionBb -- reused
    // directly rather than duplicated, see LegacyGameState.ts's own note.
    ax: rt.game.selectionAx,
    bb: rt.game.selectionBb,
    ba: rt.game.selectionBa,
  };
  stepLegacyGameplayFramePrep(state, {
    onN: () => rt.stepCameraScroll(),
    onW: () => {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      if (graphics) stepCameraFrame(rt, graphics);
    },
    onU: () => {
      const graphics = rt.offscreenTargets?.graphics[rt.game.targetSlot];
      rt.stepGameplayOuterLoop(graphics);
    },
    // Offset 30..48 of f.m(): Graphics[3].drawImage(Image[c[1]], 0, 0, 0),
    // the exact same static Image[]/Graphics[] pair LegacyOffscreenTargets
    // already models (targetSlot/onW/onU above all index the same array).
    // Wired 2026-08-20 -- imageSlot is currently always 0 (no producer
    // traced yet for indices other than 0), guarded to the array's real
    // 0..3 bounds rather than assumed safe.
    onOffscreenDraw: (imageSlot) => {
      if (imageSlot >= 0 && imageSlot <= 3) {
        rt.offscreenTargets?.copy(3, imageSlot as 0 | 1 | 2 | 3, 0, 0, 0);
      }
    },
    onTargetSlot: (slot) => { rt.game.targetSlot = slot; },
    onSReset: () => { rt.game.gameplaySFlag = false; },
    onElementScan: (aD, x, y) => {
      rt.framePrimitives.push([aD, x, y]);
      rt.drawFrameCommandPrimitive(aD, x, y);
    },
    // m() offsets 206/257: a(III) (#439), the composite edge strips.
    onFixedSprite: (record, x, y) => {
      drawPackedComposite(rt, record, x, y);
    },
    // private void c(int,int) (#552), ported 2026-08-18 as
    // stepLegacyC2 -- see its own docblock for the full derivation.
    onC: (x, y) => rt.stepLegacyC2(x, y),
    onF: () => rt.stepFrameDispatch(),
  });
}

/**
 * f.u()'s outer loop (`stepLegacyGameplayOuterLoop`), called from
 * `onGameplayDraw` -- the real f.R()/f.P() call site (see the "P"
 * handler above), matching the bytecode's own `R() -> u()` relationship
 * (`LegacyGameplayPaintTriggers.ts`'s docblock names rt exact
 * callback `f.u()`), and also from `K()`'s and `am()`'s own `onU`.
 * Wired 2026-08-14: the loop shape now genuinely iterates every
 * (ah,ai) cell in the real viewport/map bounds each time any of those
 * three reach rt point in live play, using real `gridB`/`gridC`/
 * `gridG` and the already-tested `occupancyClass()` classifier.
 *
 * `viewport.columns`/`rows` are f.O:B/#83 and f.P:B/#87 (game.viewColumns/P;
 * producer e.c(), see LegacyFrameLayout -- a {12, 19} placeholder until 2026-10-08). `lFlag`/`nFlag`/`rowEndMarker` read
 * `game.formUpActive`/`outerLoopNFlag`/`outerLoopRowEndMarker`.
 * **CORRECTION (2026-08-24)**: rt paragraph's original claim ("stay
 * at construction defaults... end-of-row draw never fires yet") is
 * stale -- it predates two later passes that already closed rt gap:
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
 * as-is instead of assuming 0. **STALE CORRECTION (2026-09-04)**: rt
 * paragraph used to claim `onMapMarkerArg1` and `onEntityAction` "remain
 * unresolved/inert -- neither has been ported from bytecode yet." That
 * was already false by the time it was written: `onMapMarkerArg1`'s
 * target (`private void a(int,byte,byte,int,int,byte)` #442) has been
 * ported since 2026-08-14 as `stepLegacyMapMarkerDetail`
 * (`LegacyMapMarkerDetail.ts`) and is wired at rt callback's own call
 * site inside `onUnhandledCellBody`, below; `onEntityAction`'s target
 * (#443) has been ported since 2026-08-15 as `stepEntityAction`, wired
 * directly two lines below rt one. Both are live, not inert -- see
 * `docs/unknowns.md`'s 2026-09-04 entry ("stale docblock" is a recurring
 * failure mode in rt file, already hit at `c5511ce`/`c4d7c23`). For
 * ordinary units (villagers, id 1..50, not associated with a map-marker
 * id), `onMapMarkerArg1` never actually fires from rt branch --
 * `stepLegacyPositiveEntityBranch`'s own gate requires
 * `dense[4545+id]`'s classifier to be non-default, which is 0/default
 * for every plain unit -- so the branch's only live effect for them is
 * `onEntityAction` (live since 2026-09-04, when its `f.b:[S]` #245 input
 * stopped being modelled as null -- see that method's docblock).
 */
export function stepGameplayOuterLoop(rt: LegacyRuntimeState, graphics?: Graphics): void {
  const viewport: LegacyGameplayOuterLoopViewport = {
    columns: rt.game.viewColumns, // f.O:B (#83)
    rows: rt.game.viewRows, // f.P:B (#87)
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    mapWidth: rt.game.mapWidth,
    mapHeight: rt.game.mapHeight,
    zWriteAiTarget: rt.game.cursorRow,
    zWriteAhTarget: rt.game.cursorColumn,
  };
  const state: LegacyGameplayOuterLoopState = {
    sFlag: rt.game.cameraSFlag,
    // u() offset 142 reads J:Z (#66), not j:Z (#327). Fixed 2026-10-01.
    jFlag: rt.game.jSceneFlag,
    zByte: rt.game.outerLoopZByte,
    gridC: rt.gridC,
    gridB: rt.gridB,
    gridG: rt.gridG,
    lFlag: rt.game.formUpActive,
    nFlag: rt.game.callToArmsActive,
    rowEndMarker: rt.game.outerLoopRowEndMarker,
    // BUG FIX (2026-08-18): was game.animStep (e:I, #284) -- direct
    // bytecode read of u()'s own row-end draw calls (offset 2118/2178/
    // 2203) confirms f:I (#294)/game.animPhase. See fCounter's docblock.
    phase: rt.game.animPhase,
  };
  const data = rt.packedData;
  const packed = graphics && data
    ? new LegacyPackedSpriteRenderer({
        shortTables: data.shortTables,
        byteTables: data.byteTables,
        imageGroups: rt.imageGroups,
        graphics,
      })
    : undefined;
  // f.v() (LegacyMapMarkerScan.ts) runs once, unconditionally, at the
  // very start of f.u() -- before its main visible-window loop below.
  // Wired 2026-08-18: previously fully unwired (its own bytecode-
  // confirmed phase field, f:I/#294, matches rt method's own already-
  // fixed `state.phase`). resourceNodeTable reuses the already-tracked
  // xSlotTable (f.b:[[[B]/#237, same field, confirmed via constructor
  // allocation order); teamMarkerTable (f.c:[[[B]/#256). CORRECTION
  // (2026-08-22): both are now confirmed to have a real producer (aM(),
  // see LegacyGameState.ts's docblocks) -- no longer inert placeholders.
  decayLegacyMapMarkerDenseState(rt.denseState);
  const markerScanState: LegacyMapMarkerScanState = {
    dense: rt.denseState,
    teamMarkerTable: rt.game.teamMarkerTable,
    resourceNodeTable: rt.game.xSlotTable,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columns: viewport.columns,
    rows: viewport.rows,
    phase: rt.game.animPhase,
  };
  stepLegacyMapMarkerScan(markerScanState, {
    classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
    onSpriteDraw: packed ? (record, x, y) => packed.drawSprite(record, x, y) : undefined,
  });
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
    // Offsets 186..225: a tree/rock cell (b 180..231 or 243) in sight draws its detail through
    // a(int,byte) with arg2 = 1. FIXED 2026-10-15 (user report: trees showed only their base):
    // never wired at the loop, so every tree canopy was missing.
    onMapMarkerArg1: (value, markerAh, markerAi) => drawMapMarker(rt, value, 1, markerAh, markerAi, packed),
    // Fog-of-war epilogue draws (bytecode/f-javap.txt offsets ~1791..2027
    // of u()): occupancyClass===1 -> edge-softened fog sprite (record
    // 12); occupancyClass===2 -> either a solid fillRect (interior, all
    // 4 neighbors also class 2, confirmed via the exact 4 consecutive
    // `invokespecial a:(II)B` classifier calls at offsets 1944..1986)
    // or the class-2 edge sprite (record 11). Wired 2026-08-15. The
    // fillRect target is `Graphics[c[1]]` (offset 1891..1899, NOT
    // necessarily the same slot as rt call's own `graphics` param),
    // read the same way f.m() already reads it: `game.frameImageSlots[1]`.
    onPackedPrimitive: packed ? (type, x, y) => packed.drawSprite(type, x, y) : undefined,
    // f.u()'s per-row end-of-row marker (record 105, gated on
    // lFlag||nFlag matching rowEndMarker[1]-originRow===ai). Found
    // unwired 2026-08-22 while tracing u()'s exception scope for the
    // r()/s() wiring; same LegacyZSubrecordDraw routing already used
    // for every other packed sprite draw in rt method.
    onRowEndDraw: packed
      ? (record, x, y, phase) => {
          rt.stepZSubrecordDraw(record, x, y, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        }
      : undefined,
    onFillHiddenTile: (x, y) => {
      const target = rt.offscreenTargets?.graphics[rt.game.frameImageSlots[1] ?? 0];
      if (!target) return;
      target.setColor(0);
      target.fillRect(11 + x, 8 + y, 22, 16);
      // No longer mirrored onto `graphics` directly (2026-08-17's interim
      // fix, now removed): stepGameplayPaintComposite() -- the real
      // f.paint() blit -- picks up rt same offscreen fill and composites
      // it onto the screen, so a second direct draw would double-paint.
    },
    // f.i(int): walks the linked chain of entity ids stacked on rt
    // cell's secondary grid, drawing a packed sprite per id whose
    // "kind" (dense[6565+id]) is 1, 2, or 5. Already fully ported as
    // LegacySecondaryCellChain.ts; wired 2026-08-15.
    onSecondaryCell: (headId) => {
      const secondaryState: LegacySecondaryCellChainState = {
        dense: rt.denseState,
        originColumn: rt.game.cameraColumn,
        originRow: rt.game.cameraRow,
        hTable: rt.secondaryCellHTable,
        iTable: rt.secondaryCellITable,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      };
      stepLegacySecondaryCellChain(headId, secondaryState, {
        // f.i(int) offset 264 is a(III) (#439), a composite. CORRECTED 2026-10-15 (pixel comparison,
        // play26 frame 95000): rt drew a single b(III) sprite, so thrown spears were bare lines.
        onPackedPrimitive: packed ? (record, x, y) => packed.drawComposite(record, x, y) : undefined,
      });
    },
    onUnhandledCellBody: (columnTile, rowTile, columnPixelX, occupancyClass, gridCValue, gridBValue, rowPixelBase) => {
      const ah = columnPixelX / 22;
      const ai = rowPixelBase / 16;
      const bodyState: LegacyGameplayCellBodyState = {
        dense: rt.denseState,
        gridC: rt.gridC,
        sFlag: rt.game.cameraSFlag,
        ao: rt.game.ao,
        columns: viewport.columns,
        originColumn: rt.game.cameraColumn,
        gridG: rt.gridG,
        gridB: rt.gridB,
        colorTable: rt.game.healthBarColorTable,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        originRow: rt.game.cameraRow,
        scrollA: rt.game.cursorRow,
        scrollY: rt.game.cursorColumn,
        phase: rt.game.animStep,
        hCounter: rt.game.tailHCounter,
      };
      const result = dispatchLegacyGameplayCellBody(
        gridCValue, columnPixelX, rowTile, columnTile, ai, ah, occupancyClass, rowPixelBase,
        bodyState, graphics, {
          onFootprintMark: (layer, x, y, width, height) => {
            const footprintState: LegacyEntityFootprintMarkState = {
              layer,
              widthMasks: LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS,
              layers: rt.mainArrays.aInt,
              mapHeight: rt.game.mapHeight,
            };
            markLegacyEntityFootprint(footprintState, x, y, width, height);
          },
          // a(III) (#439) in both the negative branch (offset 1234) and its
          // tail (1788): composites, not b(III). Corrected 2026-10-01.
          onPackedPrimitive: packed ? (type, x, y) => packed.drawComposite(type, x, y) : undefined,
          onMapMarkerArg1: (value) => drawMapMarker(rt, value, 1, ah, ai, packed),
          onSpriteDraw: packed
            ? (record, x, y, phase) => {
                rt.stepZSubrecordDraw(record, x, y, phase, {
                  onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
                });
              }
            : undefined,
          onEntityAction: (id, x, y, arg4, arg5) => rt.stepEntityAction(id, x, y, arg4, arg5),
        },
      );
      return { ahDecrement: result.ahDecrement, occupancyClass: result.occupancyClass };
    },
  });
  rt.game.outerLoopZByte = state.zByte;
  // The row counter is the shared field ai:I (#199), not a local: the loop
  // has no early exit, so it ends at P + 3 (oracle 2026-10-08).
  rt.game.aiScratch = viewport.rows + 3;

  // f.u()'s post-loop tail: calls r() then s() unconditionally right
  // after the main visible-window loop (bytecode offsets 2141/2145),
  // then its own once-per-tick row-end-marker draw (offset 2148..2209,
  // record 30/31) -- all three wrapped in u()'s own try/catch-all
  // (offset 11..2209 -> pop;return), modeled with a local try/catch
  // around just these three. CORRECTED 2026-09-28: the old note said r()
  // always throws on f.b:[S] (#245) being null; e.f() writes that field
  // (it is saveOffsets), so r() runs normally now.
  const outerLoopViewportBounds = {
    originColumn: rt.game.cameraColumn,
    originRow: rt.game.cameraRow,
    columns: rt.game.viewColumns,
    rows: rt.game.viewRows,
  };
  try {
    stepLegacyAnimatedSlotScan(
      {
        slotTable: rt.mainArrays.d,
        dense: rt.denseState,
        shortTable2D: rt.packedData?.shortTables ?? [],
        // f.b:[S] (#245): written by e.f() (e-javap.txt:1115), i.e. rt
        // port's saveOffsets. FIXED 2026-09-28: rt was a deliberate null
        // left from the retracted "permanently null" premise, so r() threw
        // on every active unit/animal slot and no hit effect was drawn.
        shortTable1D: rt.saveOffsets,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        byteRows: rt.packedData?.byteTables ?? [],
        originColumn: rt.game.cameraColumn,
        originRow: rt.game.cameraRow,
      },
      {
        isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
        classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
        onAq: (aq) => { rt.game.projectionAq = aq; },
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
      },
    );
    stepLegacyEffectSlotScan(
      {
        ...outerLoopViewportBounds,
        slotGrid: rt.mainArrays.e,
        dense: rt.denseState,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
      },
      {
        isWithinViewport: (x, y) => isLegacyWithinViewport(outerLoopViewportBounds, x, y),
        onSpriteDraw: packed
          ? (record, x, y, phase) => {
              rt.stepZSubrecordDraw(record, x, y, phase, {
                onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
              });
            }
          : undefined,
        // final void c(int,boolean) (#555, stepEntityRemoval) -- wired
        // 2026-08-24, arg2 always false at rt call site.
        onModeThreeExpire: (id) => rt.stepEntityRemoval(id, false),
        // final void d(int) (#... see LegacyFrameProgressionScan.ts) --
        // fires once per expiring slot, sets pendingP when w:B===2 and
        // the slot's own id matches game.qCounter.
        onSlotAction: (id) => {
          const dState = { w: rt.game.barMode, q: rt.game.qCounter, P: rt.game.pendingP };
          stepLegacyFD(id, dState);
          rt.game.pendingP = dState.P;
        },
        // final void c(int,int,int,int) / stepLegacyCRect -- its own
        // `isBlocked` predicate (private boolean a(int,int) #446) turned
        // out, on direct bytecode read, to be the EXACT SAME I/O/K/P
        // bounds check as isLegacyWithinViewport (not a distinct
        // "blocked" concept as its placeholder name suggested).
        onRect: (x, y, width, height) => rt.repaintRect(x, y, width, height),
      },
    );
    // f.u()'s own once-per-tick row-end-marker tail (bytecode offset
    // 2148..2209, right after r()/s(), inside the SAME try block as
    // both): gated on ad:I===0 && ae:I===0 (game.ad/game.ae), draws
    // record 30 when outerLoopNFlag, else record 31 when
    // outerLoopLFlag, at fixed pixel (218,11) with fCounter as phase.
    // Found while tracing rt method's exception scope for the r()/s()
    // wiring; genuinely distinct from the per-row onRowEndDraw (record
    // 105) inside the main loop above.
    if (rt.game.ad === 0 && rt.game.ae === 0) {
      if (rt.game.callToArmsActive) {
        rt.stepZSubrecordDraw(30, 218, 11, rt.game.animPhase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
        });
      } else if (rt.game.formUpActive) {
        rt.stepZSubrecordDraw(31, 218, 11, rt.game.animPhase, {
          onSpriteRecord: (spriteRecord, drawX, drawY) => packed?.drawComposite(spriteRecord, drawX, drawY),
        });
      }
    }
  } catch {
    // Matches u()'s own catch-all -- see docblock above.
  }
}
