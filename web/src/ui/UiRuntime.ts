import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { toJavaByte } from "../core/LegacyRuntimeState";
import { LegacyGameState } from "../core/LegacyGameState";
import { stepLegacyGameplayTick } from "../core/LegacyGameplayTick";
import { stepLegacyGameplayInput } from "./LegacyGameplayInput";
import { stepLegacyGameplayCommand } from "./LegacyGameplayCommand";
import type { Graphics } from "../platform/Graphics";
import { LegacySubsystemArrays } from "../core/LegacySubsystemArrays";
import { drawLegacyMapOverview } from "../render/LegacyMapOverview";
import { acceptLegacyNumericValue } from "../core/LegacyNumericSequence";
import { runLegacyL, runLegacyM } from "../sim/tribe/LegacySubsystemLifecycle";
import { stepLegacyFrame, type LegacyFrameStepInput } from "../core/LegacyFrameStep";
import { stepLegacyFrameDispatch, type LegacyFrameDispatchInput } from "./LegacyFrameDispatch";
import { stepLegacyGFrame } from "./LegacyGFrame";
import { LegacyPackedSpriteRenderer } from "../render/LegacyPackedSpriteRenderer";
import { stepLegacyZTransition } from "./LegacyZTransition";
import { stepLegacyZAi } from "./LegacyZAi";
import { stepLegacyZAh } from "./LegacyZAh";
import { stepLegacyZAe } from "./LegacyZAe";
import { stepLegacyZAf } from "./LegacyZAf";
import { resetLegacyZI } from "./LegacyZI";
import { stepLegacyZAb } from "./LegacyZAb";
import { stepLegacyZAc } from "./LegacyZAc";
import { stepLegacyZAd } from "./LegacyZAd";
import { stepLegacyZAa } from "./LegacyZAa";
import { stepLegacySimpleFrameHandler } from "./LegacySimpleFrameHandlers";
import { stepLegacyP } from "../render/LegacyGameplayPaintTriggers";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity, isLegacyEntityIdInRange101to122 } from "../render/LegacyEntityClassifiers";
import { stepLegacyMFrame } from "./LegacyMFrame";
import { stepLegacyZL, type LegacyZLState } from "./LegacyZL";
import { releaseLegacyEntityHome } from "../sim/units/LegacyEntityDeathCleanup";
import { stepLegacyCursorHover } from "./LegacyCursorHover";
import { triggerLegacyEntityMove } from "../sim/units/LegacyEntityMoveTrigger";
import { classifyLegacySubsystemB } from "../sim/tribe/LegacySubsystemBClassify";
import { stepLegacyStateU, type LegacyStateUInput } from "./LegacyStateU";
import { stepLegacyStateTransitionCommand, type LegacyStateTransitionCommandInput } from "./LegacyStateTransitionCommand";
import { stepLegacyStateS, type LegacyStateSInput } from "./LegacyStateS";
import { stepLegacyStateT, type LegacyStateTInput } from "./LegacyStateT";
import { stepLegacyByteActionQueue } from "./LegacyByteActionQueue";
import { stepLegacySelectionFlags } from "./LegacySelectionFlags";
import { stepLegacyAk, stepLegacyAl, stepLegacyAm, stepLegacyAo, stepLegacyAq, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv, stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA, stepLegacyAB, stepLegacyAC, stepLegacyAi, stepLegacyAKViewport, stepLegacyAL, resetLegacyAM, stepLegacyAOMap, stepLegacyMapEntry, stepLegacyAPPrefix, stepLegacyAQAudio, type LegacyAkCallbacks, type LegacyAmInput, type LegacyAqState, type LegacyAiInput, type LegacyAOMapInput, type LegacyAPPrefixInput, type LegacyAQAudioInput, type LegacyMapEntryCallbacks } from "./LegacyStateMachine";
import { BLD_KIND, BLD_X, BLD_Y, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HAPPINESS, UNIT_HP, UNIT_ORDER, UNIT_RECORD, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET } from "../core/DenseLayout";
import { liveView } from "../core/LegacyRuntimeState";
import { stepSubsystemStateCommand, subsystemBC, subsystemTenSlotReleaseEntity } from "../sim/tribe/TribeRuntime";
import { entityDeathCleanup, finalizeEntity, placeEntity, stepEntityActionConfirmation, stepEntityRemoval } from "../sim/units/UnitRuntime";
import { drawFrameCommandPrimitive, drawImageHelper, drawPackedComposite, stepCameraFollow, stepGameplayFramePrep, stepGameplayOuterLoop, stepGameplayPaintComposite, stepLegacyC2 } from "../render/RenderRuntime";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

/** Feed a raw numeric keycode into the original f.m(int) sequence helper. */
export function acceptNumericSequence(rt: LegacyRuntimeState, value: number): void {
  // u:B (#372) is the SAME real field f.j()/f.am()/f.a(BBBB)/f.aM() share
  // (game.uByte); prime it from there so rt method's conditional
  // "u = 1" write is a faithful read-modify-write against the live
  // field, not a disconnected shadow copy (merged 2026-08-20).
  rt.numericSequence.u = rt.game.uByte;
  // q:B (#357) is likewise the SAME field `game.mission` already tracks
  // pervasively (30+ call sites); prime/write back through it instead of
  // the disconnected `numericQ` shadow (merged 2026-08-20, see
  // docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster").
  rt.numericSequence.q = rt.game.mission;
  acceptLegacyNumericValue(rt.numericSequence, value);
  rt.game.numericAe = rt.numericSequence.ae;
  rt.game.numericAf = rt.numericSequence.af;
  rt.game.numericAg = rt.numericSequence.ag;
  rt.game.uByte = rt.numericSequence.u;
  rt.game.mission = rt.numericSequence.q;
}

/** Raw keyPressed(int) writes outside the input mirror. */
export function projectRawKeyPressed(rt: LegacyRuntimeState, value: number): void {
  switch (value) {
    case 53:
      // keyPressed offsets 311..343: i, t, n:I += 1 (the double-tap count
      // a(byte,byte) reads; FIXED 2026-10-08, it never counted), and E:B = 0
      // unless u:Z.
      rt.game.iFlag = true;
      rt.game.inputT = true;
      rt.game.nInt += 1;
      if (!rt.game.boxSelecting) rt.game.E = 0;
      return;
    case 50: rt.game.inputUp = true; return;
    case 56: rt.game.inputDown = true; return;
    case 52: rt.game.inputLeft = true; return;
    case 54: rt.game.inputRight = true; return;
    default: return;
  }
}

/** Raw keyReleased(int) writes outside the input mirror. */
export function projectRawKeyReleased(rt: LegacyRuntimeState, value: number): void {
  switch (value) {
    case 53:
      rt.game.inputT = false;
      if (rt.game.E < 4) rt.game.inputV = true;
      return;
    case 50: rt.game.inputUp = false; return;
    case 56: rt.game.inputDown = false; return;
    case 52: rt.game.inputLeft = false; return;
    case 54: rt.game.inputRight = false; return;
    default: return;
  }
}

/**
 * Exact f.c() (#365, bytecode/f-javap.txt, offsets 0..53): the map widens
 * to its full stored size (c:S = e:S, d:S = f:S -- aN() cut mission 5 to
 * 32 columns less), q moves on, aP() places the new mission's entities and
 * b.G:I = t219 + 4q. b.ak() calls it when mission 5 is won, which is how
 * mission 6 starts on the same, now larger, map. WIRED 2026-09-24; the old
 * port (beginMapSession) had no caller and an invented session byte.
 */
export function stepLegacyC(rt: LegacyRuntimeState): void {
  const g = rt.game;
  if (rt.activeMap) {
    g.mapWidth = rt.activeMap.width;
    g.mapHeight = rt.activeMap.height;
  }
  g.mission = toJavaByte(g.mission + 1);
  rt.runAP();
  // b.G:I = f.a:[S][219] + 4q (offsets 31..50). FIXED 2026-10-08 (oracle): wrote an
  // unread `subsystemPointer` copy, from saveOffsets (f.b:[S) instead of packedOffsets.
  g.subsystemGBase = (rt.packedOffsets[219] ?? 0) + g.mission * 4;
}

/** Execute the bytecode-backed f.j() control-flow step against caller-owned map/update hooks. */
export function stepFrame(rt: LegacyRuntimeState, input: Omit<LegacyFrameStepInput, "game">): void {
  stepLegacyFrame({ ...input, game: rt.game });
}

/**
 * Enter the proven f.j() maintenance step used by the v==1 branch.
 * Entity/subsystem callbacks remain inert until their callers are mapped,
 * but the original map sweep and transition counters are still advanced.
 */
export function stepGameplayFrame(rt: LegacyRuntimeState): void {
  rt.game.resourceByte = (shortOffset, add) => {
    const base = rt.packedOffsets[shortOffset] ?? 0;
    return rt.packedBytes[base + add] ?? 0;
  };
  stepLegacyGameplayTick(rt.game, {
    // f.l(int) (#620), the same method as every other l() call site. Was
    // `mByte = mode` until 2026-10-08 (oracle): h()'s k:Z reset block's l(-1)
    // clobbered m:B and never set Y:I.
    loadMode: (mode) => rt.stepLegacyL(mode),
    onI: () => resetLegacyZI(rt.game),
    onClearO: () => rt.input.clearRepeatGuard(),
    // f.h() owns the v==0 -> f.ak() dispatch in the original run loop.
    // Keep it inside rt tick so timing counters and state transitions have
    // the same caller boundary in menu and gameplay states.
    onStateMachine: () => { rt.stepStateMachine(); },
    onV: () => {
      stepLegacyGameplayInput(rt.game, rt.denseState, rt.gridC, {
        onW: () => {
          stepLegacyGameplayCommand(rt.game, {
            // f.W()'s staticL branch calls a(true,false,false,false,true,
            // false,false,false,false) -- confirmed via direct bytecode
            // read (offsets 18-27, invokespecial #464) -- the SAME
            // 9-arg method already ported as runSelectionFlagsRefresh
            // (extended 2026-08-18 to expose all 9 params for rt call).
            onSelectionPreset: () => rt.runSelectionFlagsRefresh(true, false, false, false, true),
            onZ: () => { rt.stepFrameSelectionTransition(); },
            // f.l(int) is already ported/wired elsewhere as stepLegacyL
            // (LegacyZL.ts, via stepLegacyX's l(-1) calls) -- rt is the
            // SAME method, confirmed via bytecode (constant pool #620,
            // `invokespecial #620 // Method l:(I)V`, identical to every
            // other l(-1) call site rt session already traced).
            onL: (value) => rt.stepLegacyL(value),
            onViewportReset: () => {
              // BUG FIX (2026-08-18): was reading the stale, unverified
              // game.viewportC/viewportD; direct bytecode read of f.W()'s
              // own i===1 branch (offset ~228/254) confirms y:B=C:B/
              // A:B=D:B here too, i.e. cursorTargetColumn/cursorTargetRow.
              rt.game.cursorColumn = rt.game.cursorTargetColumn;
              rt.game.cursorRow = rt.game.cursorTargetRow;
              // f.W(i=1) derives I/K from k[0][0]/k[1][0] before aK().
              rt.game.cameraColumn = rt.mainArrays.kMatrix[0][0] - rt.game.cursorColumn;
              rt.game.cameraRow = rt.mainArrays.kMatrix[1][0] - rt.game.cursorRow;
              rt.normalizeEntityViewport();
            },
            onEntityActionStart: (ap, am, an) => rt.beginEntityAction(ap, am, an),
            onExitPreparation: () => rt.stepLegacyExitPreparation(),
            // f.W()'s own last instruction (offset 391) -- found missing
            // entirely (2026-08-22) while auditing rt session's other
            // i() (#610) call sites; see LegacyGameplayCommand.ts's own
            // onI docblock.
            onI: () => resetLegacyZI(rt.game),
          });
        },
        onAF: () => rt.selectWindowUnits(),
        onAE: () => rt.stepAe(),
        onAG: () => rt.stepGroupKey(true),
        onAH: () => rt.stepGroupKey(false),
        onAL: () => {
          const state = { w: rt.game.wFlag ? 1 : 0, I: rt.game.inputI };
          stepLegacyAL(state);
          rt.game.wFlag = state.w !== 0;
          rt.game.inputI = state.I;
        },
        onClearSelection: () => { rt.game.pendingP = false; },
        onD: (arg) => rt.stepLegacyD(arg),
        onE: (arg) => rt.stepLegacyE(arg),
        onF: (arg) => rt.stepLegacyF(arg),
        onXDispatch: () => rt.stepLegacyX(),
        onY: () => stepCameraFollow(rt),
      });
    },
    allocateMaintenanceRecord: () => { rt.stepByteActionQueueMaintenance(); },
    // f.h()'s w:B===2||4 gate calls lowercase `ae()` (invokespecial #506,
    // "Method ae:()V", confirmed via direct bytecode read at offset
    // 344-382) -- NOT the unrelated UPPERCASE f.aE() already wired via
    // stepStateAe/onAE above, a case-sensitive collision confirmed
    // separately. See stepGameplayZAe().
    onAe: () => { rt.stepGameplayZAe(); },
    // f.k() (#616), the cursor's hover target W:B. Unwired until 2026-10-08
    // (oracle frame 482): a tap next to a villager never selected it.
    onK: () => stepLegacyCursorHover(rt.game, rt.gridC, rt.denseState),
    onFrameUpdate: () => rt.stepOriginalJ(),
    // f.h()'s k-reset block -- WIRED (2026-08-24), confirmed via direct
    // bytecode read (offset 593, invokespecial #434 // Method a:(ZZZZ)V):
    // the SAME 4-arg boolean overload already ported as
    // runSelectionFlagsRefresh.
    resetSelection: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    // f.h()'s own aI() call (offset 642, invokespecial #490 // Method
    // aI:()V) -- WIRED (2026-08-24): already ported as stepLegacyAi
    // (stepStateAi's own wrapper) but had zero callers anywhere in the
    // codebase until now. a4 is f.a:[[B](#130) index 4, the SAME field
    // already established as mainArrays.aByte (fixed earlier today for
    // stepLegacyE's own teamEntitySlots duplicate-field bug).
    onFlushPending: () => {
      stepStateAi(rt, { a4: rt.mainArrays.aByte[4]!, dense: rt.denseState });
    },
  });
}

/**
 * Runtime owner for the lowercase `f.ae()` dispatcher (`LegacyZAe.ts`).
 * Reuses `stepLegacyZAi`/`stepLegacyZAh` (already fully derived, now
 * wired for the first time via rt call) for the `ai()`/`ah()` tail
 * calls. **DOC CORRECTION (2026-08-22)**: `af()` is now fully derived
 * and wired too (`LegacyZAf.ts`, `onAf` below) -- rt comment's own
 * "left as a no-op seam until the remaining branches are ported" was
 * stale, left over from before that same-day fix landed.
 */
export function stepGameplayZAe(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const state = {
    nInt: g.nInt,
    inputLeft: g.inputLeft,
    inputRight: g.inputRight,
    inputUp: g.inputUp,
    inputDown: g.inputDown,
    jByte: g.jByte,
    as: g.menuCursor,
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
    s: rt.mainArrays.s,
    at: g.frameLayoutAT,
    tiles: rt.mainArrays.aByte3,
    zScratchAuByte: g.zScratchAuByte,
    r: rt.mainArrays.r,
    iFlag: g.iFlag,
    staticL: g.staticL,
    inputV: g.inputV,
    E: g.E,
    wByte: g.barMode,
    staticM: g.staticM,
  };
  const writeBack = (): void => {
    g.nInt = state.nInt;
    g.frameGenCounterY = state.y;
    g.inputLeft = state.inputLeft;
    g.inputRight = state.inputRight;
    g.inputUp = state.inputUp;
    g.inputDown = state.inputDown;
    g.menuCursor = state.as;
    g.frameLayoutAX = state.aX;
    g.zAfCursorVFlag = state.V;
    g.zlYInt = state.zlYInt;
    g.iFlag = state.iFlag;
    g.staticL = state.staticL;
    g.inputV = state.inputV;
    g.E = state.E;
    g.barMode = state.wByte;
    g.staticM = state.staticM;
  };
  const readIn = (): void => {
    state.nInt = g.nInt;
    state.inputLeft = g.inputLeft;
    state.inputRight = g.inputRight;
    state.inputUp = g.inputUp;
    state.inputDown = g.inputDown;
    state.as = g.menuCursor;
    state.aX = g.frameLayoutAX;
    state.V = g.zAfCursorVFlag;
    state.zlYInt = g.zlYInt;
    state.iFlag = g.iFlag;
    state.staticL = g.staticL;
    state.inputV = g.inputV;
    state.E = g.E;
    state.wByte = g.barMode;
    state.staticM = g.staticM;
  };
  stepLegacyZAe(state, {
    onAi: () => {
      const aiState = {
        flags: g.selectionFlags,
        bFlags: g.frameFlags,
        r: rt.mainArrays.r,
        // ai() re-reads ad:B after its a(Z..) calls (offset 190), so live.
        get ad() { return g.selectionAd; },
        as: state.as,
        ar: state.ar,
        aX: state.aX,
        aW: state.aW,
        q: g.mission,
        l: g.selectedId,
        T: g.frameLayoutT,
        U: g.frameLayoutU,
      };
      stepLegacyZAi(aiState, rt.aiFlagCallbacks());
      g.selectedId = aiState.l;
      g.frameLayoutT = aiState.T;
      g.frameLayoutU = aiState.U;
    },
    // l(int) writes w and P directly; same push/pull as onAh/onAf (it was
    // missing here, so ae()'s final writeBack undid l()'s w). 2026-09-23.
    onL: (value) => {
      writeBack();
      rt.stepLegacyL(value);
      readIn();
    },
    onAh: () => {
      writeBack();
      rt.stepZAh();
      readIn();
    },
    // BUG FIX (2026-09-14): af() and its callees (l(int) in particular)
    // write game.* directly, but rt method snapshots those same fields
    // into `state` and wrote the snapshot back after stepLegacyZAe returned.
    // Measured: choosing a building ran l(0) -- d[4]=33 ("place the
    // building."), zlX=w, the four-flag reset -- and set w=3, and then the
    // write-back restored the stale w=2, so placement mode never started.
    // The original has no snapshot: ae(), af() and l() share the instance
    // fields. Push before af(), pull after.
    onAf: () => {
      writeBack();
      rt.stepGameplayZAf();
      readIn();
    },
  });
  writeBack();
}

/**
 * Runtime owner for `private void af()` (`LegacyZAf.ts`). Its sole real
 * caller is `f.ae()`'s `i:Z||static-l:Z` branch (`stepGameplayZAe()`'s
 * `onAf`). `b.b(byte)` (inside `f.b(int,boolean)`, `r[as] in {16,26}`) is
 * left as a documented no-op seam -- see `LegacyZB2.ts`'s own docblock
 * for why. `b.a(int,boolean)` (inside `b.c()`, `r[as] in {14,15}`) is now
 * fully ported and wired -- see `subsystemBC()`'s own docblock.
 */
export function stepGameplayZAf(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const state = {
    dense: rt.denseState,
    r: rt.mainArrays.r,
    as: g.menuCursor,
    entityFocusFlag: g.entityFocusFlag,
    kByte: g.kByte,
    frameLayoutAX: g.frameLayoutAX,
    frameLayoutL: g.selectedId,
    V: g.zAfCursorVFlag,
    qCounter: g.qCounter,
    selectionFlags: g.selectionFlags,
    wByte: g.barMode,
    cSInt: g.cSInt,
    pendingP: g.pendingP,
    xMFlag: g.xMFlag,
    xOFlag: g.xOFlag,
    outerLoopLFlag: g.formUpActive,
    outerLoopNFlag: g.callToArmsActive,
    frameLayoutAq: g.frameLayoutAq,
    yByte: g.cursorColumn,
    IByte: g.cameraColumn,
    AByte: g.cursorRow,
    KByte: g.cameraRow,
    FByte: g.selectionGroup,
    aByte2d: rt.mainArrays.aByte,
    gridC: rt.gridC,
    kFlag: g.choosingChief,
    aShort: rt.mainArrays.aShort,
    gRows: rt.subsystemArrays.gRows,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  };
  // BUG FIX (2026-09-14): same stale-snapshot shape as stepGameplayZAe.
  // af()'s callbacks write game.* directly -- l(int) sets w/s/P/M/O,
  // aJ() sets k, f(int,int) moves the camera -- while rt method kept
  // copies of those same fields in `state` and wrote them all back after
  // stepLegacyZAf returned. Measured: picking a building ran l(0), which set
  // w=3, and the write-back restored w=2, so placement mode never began.
  // In the original every one of these is a shared instance field, so each
  // callback now sees af()'s current values and af() sees what it left.
  const writeBack = (): void => {
    g.menuCursor = state.as;
    g.entityFocusFlag = state.entityFocusFlag;
    // af() offset 129..131 clears f.K:Z (#69) inside the k===l branch.
    g.choosingChief = state.kFlag;
    g.kByte = state.kByte;
    g.frameLayoutAX = state.frameLayoutAX;
    g.selectedId = state.frameLayoutL;
    g.zAfCursorVFlag = state.V;
    g.barMode = state.wByte;
    g.cSInt = state.cSInt;
    g.pendingP = state.pendingP;
    g.xMFlag = state.xMFlag;
    g.xOFlag = state.xOFlag;
    g.formUpActive = state.outerLoopLFlag;
    g.callToArmsActive = state.outerLoopNFlag;
    g.frameLayoutAq = state.frameLayoutAq;
  };
  const readIn = (): void => {
    state.as = g.menuCursor;
    state.entityFocusFlag = g.entityFocusFlag;
    state.kFlag = g.choosingChief;
    state.kByte = g.kByte;
    state.frameLayoutAX = g.frameLayoutAX;
    state.frameLayoutL = g.selectedId;
    state.V = g.zAfCursorVFlag;
    state.wByte = g.barMode;
    state.cSInt = g.cSInt;
    state.pendingP = g.pendingP;
    state.xMFlag = g.xMFlag;
    state.xOFlag = g.xOFlag;
    state.outerLoopLFlag = g.formUpActive;
    state.outerLoopNFlag = g.callToArmsActive;
    state.frameLayoutAq = g.frameLayoutAq;
    state.qCounter = g.qCounter;
    state.yByte = g.cursorColumn;
    state.IByte = g.cameraColumn;
    state.AByte = g.cursorRow;
    state.KByte = g.cameraRow;
    state.FByte = g.selectionGroup;
  };
  const shared = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A): R => {
    writeBack();
    const result = fn(...args);
    readIn();
    return result;
  };
  stepLegacyZAf(state, {
    onF2: shared((arg1: number, arg2: number) => rt.stepEntityCoordinateUpdate(arg1, arg2)),
    onAjUpper: shared(() => rt.runAjUpper()),
    onCompleteEntityRecord: shared((record: number) => rt.completeEntityRecord(record)),
    resourceByte: (shortOffset, add) => g.resourceByte?.(shortOffset, add) ?? 0,
    onSubsystemBC: shared(() => rt.subsystemBC()),
    onReleaseTenEntity: shared((id: number) => subsystemTenSlotReleaseEntity(rt, id)),
    onSelectionReset: shared((a: boolean, b: boolean, c: boolean, d: boolean) => rt.runSelectionFlagsRefresh(a, b, c, d)),
    onSelectionReset9: shared((a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, h: boolean, i: boolean, j: boolean) =>
      rt.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j)),
    onL: shared((value: number) => rt.stepLegacyL(value)),
    // Offsets 134..150, after a new chief is picked: b.b(int) (#544, the
    // chief gives up its reserved hut) and d(byte) (#578). WIRED 2026-09-23.
    onSubsystemBB: shared((id: number) => releaseLegacyEntityHome(rt.denseState, rt.saveOffsets, id)),
    onDByte: shared((value: number) => rt.stepLegacyD(value)),
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
 * `aa()`/`ab()`/`ac()`/`ai()` call cluster rt method mirrors -- i.e.
 * real Java silently aborts just rt one Z()-step and returns if
 * anything inside throws (`ArrayIndexOutOfBoundsException` included).
 * This method had no equivalent try/catch, so `LegacyZAa.ts`'s new
 * `checkArrayIndex` throw (reproducing a real, previously-implicit JVM
 * bounds check) would have escaped all the way up through
 * `stepGameplayFrame()`'s `stepLegacyGameplayTick` to `main.ts`'s
 * `tick()`, which has no try/catch of its own either -- turning what
 * Java treats as "abort rt one Z() step, keep going" into an uncaught
 * exception that kills the whole tick. Wrapping the body here in the
 * matching `try/catch` is not optional scope creep on top of the
 * `au`-loop fix -- without it, that fix would trade an infinite silent
 * hang for a worse, differently-scoped crash than real Java ever
 * produces.
 */
export function stepFrameSelectionTransition(rt: LegacyRuntimeState): void {
  try {
    stepFrameSelectionTransitionInner(rt);
  } catch {
    // Preserve Z()'s broad exception boundary: abort just rt Z()
    // step, exactly like the real `try { aa()/ab()/ac()/...; } catch
    // (Exception e) { }` wrapping its whole body.
  }
}

export function stepFrameSelectionTransitionInner(rt: LegacyRuntimeState): void {
  const raw = {
    ar: rt.game.frameLayoutAR,
    at: rt.game.frameLayoutAT,
    as: rt.game.menuCursor,
    aX: rt.game.frameLayoutAX,
    aW: rt.game.frameLayoutAW,
    aY: rt.game.frameLayoutAY,
    aZ: rt.game.frameLayoutAZ,
    l: rt.game.selectedId,
  };
  stepLegacyZTransition({
    flags: rt.game.selectionFlags,
    // Z() offsets 280..288: `b[ad] = true` -- b:[Z #234, frameFlags.
    bFlags: rt.game.frameFlags,
    r: rt.mainArrays.r,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    raw,
    qByte: rt.game.mission,
    // BUG FIX (2026-09-14): Z() offset 130 is `getfield #200 // Field ai:B`,
    // the T()/S()/U() scene-dispatch key (game.ai). frameCommandAI is
    // `aI:I` (#157), the f.d(int,int) frame-command field -- a different
    // field that differs only in letter case (class f also has `ai:I` #199).
    // With the wrong twin the count at offsets 117..144,
    // `q > 1 ? 11 : (ai < 18 ? 3 : 6)`, read an int like 534 and built six
    // Build entries where KEmulator shows three (hut, store, kitchen).
    aiByte: rt.game.ai,
    pendingP: rt.game.pendingP,
    adByte: rt.game.selectionAd,
    aU: rt.game.frameLayoutAU,
    aV: rt.game.frameLayoutAV,
    onAI: () => {
      const game = rt.game;
      const aiState = {
        flags: rt.game.selectionFlags,
        bFlags: rt.game.frameFlags,
        r: rt.mainArrays.r,
        get ad() { return game.selectionAd; },
        as: raw.as,
        ar: raw.ar,
        aX: raw.aX,
        aW: raw.aW,
        q: rt.game.mission,
        l: raw.l,
        T: rt.game.frameLayoutT,
        U: rt.game.frameLayoutU,
      };
      stepLegacyZAi(aiState, rt.aiFlagCallbacks());
      // Into `raw`, which the epilogue below writes back. BUG FIX
      // 2026-09-23: writing game.selectedId here was overwritten by that
      // epilogue with Z()'s own `l = 0`, so the chief-pick cursor sat on 0.
      raw.l = aiState.l;
      rt.game.frameLayoutT = aiState.T;
      rt.game.frameLayoutU = aiState.U;
    },
    onAA: () => {
      // f.aa() is the producer for r[]/s[] later consumed by 1010.
      // 2026-08-21: switched from the mode-0-only fillLegacyZChoiceRows to
      // the full stepLegacyZAa (modes 0/6/8) now that mode 6's k/F/
      // a:[[B]/a:[[S] inputs are resolved -- k=game.kByte(f.k:B #333),
      // F=game.selectionGroup(f.F:B #50), a:[[B]/a:[[S] = mainArrays.aByte/
      // aShort (confirmed via exact constructor allocation sizes 5x50/
      // 2x26). See LegacyZAa.ts's own docblock for the mode-0 formula fix
      // made earlier the same day.
      const aaState = {
        e: rt.denseState,
        packed: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        tiles: rt.mainArrays.aByte3,
        a2dByte: rt.mainArrays.aByte,
        a2dShort: rt.mainArrays.aShort,
        s: rt.mainArrays.s,
        r: rt.mainArrays.r,
        // aa() reads q:I (#356, the selected record) and the live ar:B
        // Z() has just reset -- FIXED 2026-10-07: it was given f.q:B (the
        // mission) and the pre-Z() ar snapshot, so the armoury listed five
        // clubs instead of club / spear / net trap.
        q: rt.game.qCounter,
        k: rt.game.kByte,
        F: rt.game.selectionGroup,
        au: 0,
        av: rt.game.frameLayoutAv,
        at: raw.at,
        ar: raw.ar,
      };
      stepLegacyZAa(aaState);
      rt.game.frameLayoutAv = aaState.av;
      raw.at = aaState.at;
      raw.ar = aaState.ar;
    },
    onAB: () => {
      const abState = {
        e: rt.denseState,
        j: rt.game.zAbScratch,
        r: rt.mainArrays.r,
        q: rt.game.qCounter,
        ar: raw.ar,
      };
      stepLegacyZAb(abState);
      raw.ar = abState.ar;
    },
    onAC: () => {
      const acState = {
        e: rt.denseState,
        // f.f:[B (#290) is the per-kind max level b.j() fills (mainArrays.f).
        // FIXED 2026-10-07: was a never-written copy, so UPGRADE never showed.
        f: rt.mainArrays.f,
        r: rt.mainArrays.r,
        q: rt.game.qCounter,
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
        F: rt.game.entityFocusFlag,
        qByte: rt.game.mission,
        N: rt.game.callToArmsActive,
        L: rt.game.formUpActive,
        K: rt.game.choosingChief,
        e: rt.denseState,
        r: rt.mainArrays.r,
        ar: raw.ar,
        aq: rt.game.frameLayoutAq,
        aqInt: rt.game.projectionAq,
      };
      // Offset 354: a(ZZZZZZZZZ) (#464) -- was left unwired.
      stepLegacyZAd(adState, rt.aiFlagCallbacks());
      raw.ar = adState.ar;
      rt.game.frameLayoutAq = adState.aq;
      rt.game.projectionAq = adState.aqInt;
    },
  });
  rt.game.frameLayoutAR = raw.ar;
  rt.game.frameLayoutAT = raw.at;
  rt.game.menuCursor = raw.as;
  rt.game.frameLayoutAX = raw.aX;
  rt.game.frameLayoutAW = raw.aW;
  rt.game.frameLayoutAY = raw.aY;
  rt.game.frameLayoutAZ = raw.aZ;
  rt.game.selectedId = raw.l;
}

export function runSelectionFlagsRefresh(rt: LegacyRuntimeState, 
  first: boolean, second: boolean, third: boolean, fourth: boolean,
  fifth = false, sixth = false, seventh = false, eighth = false, ninth = false,
): void {
  const selectionState = {
    aFlags: rt.game.selectionFlags,
    bFlags: rt.game.frameFlags,
    uBytes: rt.mainArrays.uBytes,
    dBytes: rt.game.selectionDBytes,
    recordOf: (ad: number) => rt.packedBytes[(rt.packedOffsets[195] ?? 0) + ad] ?? 0,
    cInts: rt.game.frameRecordInts,
    bInts: rt.game.frameRecordHeights,
    bb: rt.game.selectionBb,
    ax: rt.game.selectionAx,
    // ag:I/P:B/C:Z/K:B/d:S are the camera's own fields; until 2026-10-01
    // rt used never-shared selectionAg/P/CFlag/K/DSize copies, so a HUD
    // resize never reached n() (stale HUD pixels stayed on the map).
    ag: rt.game.rowScrollDelta,
    ad: rt.game.selectionAd,
    ba: rt.game.selectionBa,
    P: rt.game.viewRows,
    AInt: rt.game.selectionAInt,
    CFlag: rt.game.cameraCFlag,
    K: rt.game.cameraRow,
    A: rt.game.cursorRow,
    AFlag: rt.game.AFlag,
    dSize: rt.game.mapHeight,
  };
  stepLegacySelectionFlags(selectionState, first, second, third, fourth, fifth, sixth, seventh, eighth, ninth);
  rt.game.selectionBb = selectionState.bb;
  rt.game.selectionAx = selectionState.ax;
  rt.game.rowScrollDelta = selectionState.ag;
  rt.game.selectionAd = selectionState.ad;
  rt.game.selectionBa = selectionState.ba;
  rt.game.viewRows = selectionState.P;
  rt.game.selectionAInt = selectionState.AInt;
  rt.game.cameraCFlag = selectionState.CFlag;
  rt.game.cameraRow = selectionState.K;
  rt.game.cursorRow = selectionState.A;
  rt.game.AFlag = selectionState.AFlag;
}

/** Exact private void t(): clears f.d:[[B]'s (#268) row 0, all 40 slots. */
export function stepLegacySceneAnimatedSlotClear(rt: LegacyRuntimeState): void {
  rt.mainArrays.d[0]!.fill(0);
}

/**
 * Exact private void T()'s `ai===37` branch (bytecode/f-javap.txt
 * offsets 115..272) -- the branch rt whole investigation traced
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
export function stepLegacyBL(rt: LegacyRuntimeState): void {
  runLegacyL({
    state: rt.denseState,
    // b-javap 49849 offset 23: `f.c(IZ)V` (#364), the record removal
    // (stepEntityRemoval) for records 1..60 -- not f.c(int). CORRECTED
    // 2026-09-29: rt cleared unit associations and removed nothing.
    onPrimaryStep: (id, flag) => rt.stepEntityRemoval(id, flag),
    onEntityCleanup: (id) => { rt.finalizeEntity(id); },
    // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
    onRecordMaintenance: (id) => rt.entityDeathCleanup(id),
    onAuxiliaryPass: (index) => rt.removeAnimal(index),
  });
}

/** b.m(), used by T()'s ai===45 branch. */
export function stepLegacyBM(rt: LegacyRuntimeState): void {
  runLegacyM({
    state: rt.denseState,
    onEntityCleanup: (id) => { rt.finalizeEntity(id); },
    // b.m(int) (#400) = entityDeathCleanup, ported 09-16; wired here 2026-09-27.
    onRecordMaintenance: (id) => rt.entityDeathCleanup(id),
    onAuxiliaryPass: (index) => rt.removeAnimal(index),
  });
}

/** Exact private void e(int,int,int) (bytecode/f-javap.txt offsets 0..75). */
export function stepLegacyE3(rt: LegacyRuntimeState, x: number, y: number, recordOffset: number): void {
  const dense = rt.denseState;
  dense[UNIT_TYPE + recordOffset] = 69;
  dense[UNIT_TARGET_X + recordOffset] = x;
  dense[UNIT_TARGET_Y + recordOffset] = y;
  dense[UNIT_ORDER + recordOffset] = 2;
  dense[UNIT_WORK_TARGET + recordOffset] = 0;
  dense[UNIT_FLAGS + recordOffset] = (dense[UNIT_FLAGS + recordOffset] ?? 0) & 191;
}

/** Exact private void d(int,int,int) (bytecode/f-javap.txt offsets 0..45). */
export function stepLegacyD3(rt: LegacyRuntimeState, x: number, y: number, indexFilter: number): void {
  for (let i = 0; i < rt.auxiliaryScratch.length; i += 1) {
    if (i === indexFilter || i >= 6) stepLegacyE3(rt, x, y, rt.auxiliaryScratch[i] ?? 0);
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
 * `rt.game.oElementRecordInts[recordIndex] ?? 0` fallback intentionally
 * does not reproduce the real guaranteed-throw, same reasoning as `f.m()`.
 */
export function stepLegacyO(rt: LegacyRuntimeState): void {
  rt.game.frameImageSlots[8] = 0;
  rt.game.frameImageSlots[9] = 0;

  const graphics = rt.offscreenTargets?.graphics[rt.game.frameImageSlots[0] as 0 | 1 | 2 | 3];
  const image = rt.offscreenTargets?.images[rt.game.frameImageSlots[1] as 0 | 1 | 2 | 3];
  if (graphics && image) {
    try {
      graphics.drawRegion(image, 0, 0, 264, rt.game.selectionAInt, 0, 0, rt.game.selectionBb - rt.game.selectionAx, 0);
    } catch { /* a(Graphics,Image,...) (#435) catches the underlying draw exception. */ }
  }

  const base195 = rt.packedOffsets[195] ?? 0;
  for (let i = 0; i < 20; i += 1) {
    if (!rt.game.selectionFlags[i]) continue;
    rt.game.frameFlags[i] = true;

    // Offsets 84..109: a(i, 0, d[t195[i]]) -- drawn, not just traced
    // (until 2026-10-01 only the trace entry was pushed, so the pause
    // menu's copy of the gameplay screen had no top resource bar).
    const recordIndex = rt.packedBytes[base195 + i] ?? 0;
    const y = rt.game.oElementRecordInts[recordIndex] ?? 0;
    rt.framePrimitives.push([i, 0, y]);
    rt.drawFrameCommandPrimitive(i, 0, y);

    rt.game.targetSlot = rt.game.frameImageSlots[0] ?? 0;

    const marker = rt.packedBytes[base195 + 20 + i] ?? 0;
    if (marker === 1 && rt.game.screen !== 20) {
      drawPackedComposite(rt, 524, 0, rt.game.selectionBb);
    } else if (marker === 2) {
      drawPackedComposite(rt, 528, 0, 320 - rt.game.selectionBa);
    }
  }

  // Offsets 216..231: `c[9] = c[8] = 2` (dup_x2 stores 2 into both).
  rt.game.frameImageSlots[8] = 2;
  rt.game.frameImageSlots[9] = 2;
}

/**
 * Exact private void l(int) (bytecode/f-javap.txt offsets 0..376), a thin
 * runtime adapter around the already-ported, already-tested pure function
 * `stepLegacyZL`. Reuses `selectionFlags`/`frameFlags` for the
 * bytecode's `a:[Z`(#123)/`b:[Z`(#234) -- confirmed the same fields via
 * constant-pool index cross-check. CORRECTION (2026-09-02): rt used
 * to target a separate `selectionMirrorFlags` array that was never
 * read by anything downstream (a duplicate of `frameFlags` for the
 * same real field) -- see `docs/unknowns.md`'s 2026-09-02 entry.
 *
 * CORRECTION (2026-08-22): `onFourFlagReset`/`onNineFlagReset` used to be
 * left unwired -- rt call site passed no callbacks object at all. Both
 * are the same `a(ZZZZ)`/`a(ZZZZZZZZZ)` overloads already ported as
 * `runSelectionFlagsRefresh`, reused at ~10 other call sites; wired here
 * too. `onAh` was wired on 2026-10-09 (see the call); the note below is the old reasoning -- lowercase
 * `ah()` itself is no longer a mystery (`LegacyZAh.ts`/`stepLegacyZAh`,
 * fully derived and safely wired at `stepGameplayZAe`'s own, NON-nested
 * `onAh` call site), but wiring it HERE would create a genuinely new,
 * directly self-recursive path rt codebase has never exercised before:
 * `stepLegacyL(-1)` -> `onAh` -> `stepLegacyZAh` -> (`state.w===4`) ->
 * `onL(-1)` -> `stepLegacyL(-1)` again, with `zlXByte`/`cSInt`/`kFlag`
 * (the three values that decide whether that inner call re-triggers
 * `onAh` and hits `w===4` again) all left completely unmutated by the
 * `w===4` branch itself. Whether the real game ever reaches a state
 * where rt chain terminates (some external write between iterations)
 * or whether `zlXByte===4 && cSInt===100 && kFlag===false` is simply
 * unreachable together is unproven -- porting rt specific call blind
 * risks a real stack-overflow bug, so it stays a documented no-op.
 * `onEntityMode` (2026-08-24): its real consumer, `final void
 * c(int, boolean)` (#555, offset 29630), is now fully ported --
 * `stepEntityRemoval` above -- and wired here, arg2 always `true`.
 */
export function stepLegacyL(rt: LegacyRuntimeState, value: number): void {
  const g = rt.game;
  // Scalars live: onEntityMode's stepEntityRemoval writes w and P itself.
  const state: LegacyZLState = Object.assign(
    liveView<Pick<LegacyZLState, "q" | "w" | "x" | "Y" | "s" | "P" | "M" | "O">>(g, {
      q: "qCounter", w: "barMode", x: "zlXByte", Y: "zlYInt", s: "cSInt", P: "pendingP", M: "xMFlag", O: "xOFlag",
    }),
    { d: g.zlDShorts, k: g.zlKBytes, flags: g.selectionFlags, bFlags: g.frameFlags, cSnapshot: g.zlFlagSnapshot },
  );
  stepLegacyZL(state, value, {
    onFourFlagReset: (a, b, c, d) => rt.runSelectionFlagsRefresh(a, b, c, d),
    onNineFlagReset: (a, b, c, d, e, f, h, i, j) => rt.runSelectionFlagsRefresh(a, b, c, d, e, f, h, i, j),
    onEntityMode: (id) => rt.stepEntityRemoval(id, true),
    // f.l(int) offset 350: ah() after a CALL TO ARMS / FORM UP place (s == 100). WIRED
    // 2026-10-09 (oracle run 6, frame 18861): without it w stayed at the saved x (2, the
    // unit bar) instead of ah()'s 0/1. ah() re-enters l(-1) only when w == 4, where the
    // original would recurse the same way.
    onAh: () => rt.stepZAh(),
  });
}

/**
 * Exact private void X() (bytecode/f-javap.txt offsets 0..484). Its only
 * confirmed real caller is `V()`'s `wByte===3` branch (offsets 261..273
 * of `private void V()`), wired via `stepLegacyGameplayInput`'s
 * `onXDispatch` callback (2026-08-18). Gated on `cRFlag` (r:Z #359) --
 * its real producer is `stepLegacyC2`'s (`private void c(int,int)`) own
 * `wByte===3` branch, ALREADY wired via `onC` in `stepGameplayFramePrep`
 * (found 2026-08-18 while tracing rt exact gate: `cRFlag` was
 * originally duplicated under a fresh `xTriggerFlag` name before the two
 * methods' fields were merged -- see `LegacyGameState.ts`'s docblock on
 * `cRFlag` for the full self-caught-bug writeup). So `stepLegacyX()` is
 * now reachable AND its gate is populated by real gameplay state, not
 * just wired-but-inert.
 *
 * Four branches on `cSInt` (s:I #364): `===100` (branch A -- two
 * conditional calls into class b's own no-arg `b()`, a genuinely
 * tangential ~250-instruction loop over team slots 1..50, left a
 * documented no-op matching rt session's convention for the
 * c(int,int)/O() class-c calls), `<0` (branch B, dense-state writes),
 * `0..3` (branch C, a linear scan over `xSlotTable`/`b:[[[B` #237 that
 * either reuses an empty slot or, when the value being written is
 * exactly 3, treats it as a real "spawn" and calls `l(-1)`), and the
 * default/else (branch D -- an in-bounds check via the original's
 * private `b(int,int):boolean` #533, then a real `placeEntity()` call).
 */
export function stepLegacyX(rt: LegacyRuntimeState): void {
  const g = rt.game;
  const dense = rt.denseState;
  if (!g.cRFlag) return;

  if (g.cSInt === 100) {
    if (g.xOFlag) {
      g.callToArmsActive = g.xOFlag;
      g.xMFlag = false;
      g.formUpActive = false;
      rt.subsystemBTeamSweep();
    } else if (g.xMFlag) {
      g.formUpActive = g.xMFlag;
      rt.subsystemBTeamSweep();
    }
    g.outerLoopRowEndMarker[0] = g.cameraColumn + g.cursorColumn;
    g.outerLoopRowEndMarker[1] = g.cameraRow + g.cursorRow;
    rt.stepLegacyL(-1);
    return;
  }

  if (g.cSInt < 0) {
    dense[UNIT_TARGET_X + g.cRInt] = dense[BLD_X + g.qCounter] ?? 0;
    dense[UNIT_TARGET_Y + g.cRInt] = dense[BLD_Y + g.qCounter] ?? 0;
    dense[UNIT_TYPE + g.cRInt] = 43 - g.cSInt;
    dense[UNIT_ORDER + g.cRInt] = 3;
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
      row0[2]![g.xNByte] = g.cameraColumn + g.cursorColumn;
      row0[3]![g.xNByte] = g.cameraRow + g.cursorRow;
      rt.stepLegacyL(-1);
      return;
    }
    if (classifyLegacyPositiveEntity(g.cRInt) !== 0) return;
    row0[0]![g.xNByte] = g.qCounter;
    row0[2]![g.xNByte] = g.cRInt;
    return;
  }

  const x = g.cameraColumn + g.cTInt;
  const y = g.cameraRow + g.cUInt;
  if (!(x >= 0 && y >= 0 && x < g.mapWidth && y < g.mapHeight)) return;
  const placementOptions = rt.buildingPlacementOptions();
  const placed = rt.placeEntity(rt.gridC, 0, g.cSInt, x, y, 1, false, -1, placementOptions);
  if (placed <= 0) return;
  rt.stepLegacyL(-1);
  g.barMode = 2;
}

/**
 * Exact private void d(byte) (bytecode/f-javap.txt offsets 0..123), one
 * of `V()`'s movement/target dispatch targets. A second tap within the
 * n:I cooldown sets the window to the viewport and runs aF() (offset 60),
 * selecting every unit on screen -- wired 2026-09-23 (was an inert no-op).
 */
export function stepLegacyD(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  if (g.nInt > 1) {
    g.nInt = 0;
    g.BCounter = g.cameraColumn - 1;
    g.CCounter = g.cameraRow - 1;
    g.DCounter = g.viewColumns;
    g.ECounter = g.viewRows;
    g.boxSelecting = true;
    g.inputT = true; // t:Z (#367)
    rt.selectWindowUnits(); // aF(), offset 60
    rt.runSelectionFlagsRefresh(true, true, false, false);
    g.selectedId = 0;
    g.kByte = 0;
    return;
  }
  if ((rt.denseState[UNIT_HP + arg] ?? 0) > 0) {
    rt.runSelectionFlagsRefresh(false, true, false, true);
    g.barMode = 1;
    g.selectedId = arg;
    g.kByte = arg;
    g.selectionGroup = -1;
  }
}

/**
 * Exact private void e(byte) (bytecode/f-javap.txt offsets 0..69). Loops
 * `mainArrays.aByte[FByte]` when `FByte!==-1`, else dispatches once using
 * `kByte`.
 *
 * CORRECTION (2026-08-24): was `game.teamEntitySlots`, a disconnected
 * duplicate of rt SAME field (`f.a:[[B]`#130, confirmed via rt
 * method's own bytecode read, offset 17) -- `teamEntitySlots` had no
 * real writer anywhere (its own docblock said "producer untraced"),
 * while `mainArrays.aByte` is the field's live, already-established
 * identity (`docs/code-mapping.md`'s `f.aa()` row, confirmed via exact
 * constructor allocation size). This was a real, currently-live bug:
 * `stepLegacyE`'s `FByte!==-1` loop always saw zeros and never
 * dispatched anything for a selected formation's armed units.
 */
export function stepLegacyE(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  if (g.selectionGroup !== -1) {
    const row = rt.mainArrays.aByte[g.selectionGroup];
    if (row) {
      for (let id = 0; id < 50; id += 1) {
        const value = row[id] ?? 0;
        if (value > 0) rt.stepLegacyA2(value, arg);
      }
    }
  } else {
    rt.stepLegacyA2(g.kByte, arg);
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
 * would itself have thrown if the field were really null. It is rt
 * port's `LegacySubsystemArrays.dShort`.
 *
 * The method was ALREADY fully ported under the same retraction on
 * 2026-09-07 (`LegacyEntityMoveTrigger.ts`, `triggerLegacyEntityMove`,
 * already wired at three other call sites), so rt site just calls it.
 * The stale `LegacySubsystemBFootprintGate.ts` -- a second, partial port
 * of the SAME method (#274) that only implemented the two guards and
 * stopped at the "guaranteed throw" -- had no call site at all and has
 * been deleted rather than left as a second source of truth.
 * `b.b(int):byte` (#543, ~94 instructions) is now fully ported
 * (`LegacySubsystemBClassify.ts`) and wired below for its
 * `dense[7777+target]` side effect -- the original discards its return
 * value, so rt port does too.
 * `Z()` (#428) IS wired, via `stepFrameSelectionTransition()` -- found
 * 2026-08-18 that an earlier pass here had wrongly trusted a stale
 * "unopened" comment elsewhere in rt codebase and left it a no-op;
 * `Z()` was actually already fully ported (`LegacyZTransition.ts`) AND
 * already wired at a completely different real call site (`f.W()`'s own
 * Z-command dispatch, `stepLegacyGameplayCommand`'s `onZ`). Since `Z()`
 * is parameterless and operates purely on persistent instance state,
 * rt call site reuses that SAME already-wired method directly rather
 * than duplicating its (substantial) field/callback wiring. See
 * `docs/unknowns.md`'s "Z() cluster wiring" entry for the full
 * writeup of that correction.
 */
export function stepLegacyA2(rt: LegacyRuntimeState, target: number, source: number): void {
  const g = rt.game;
  const dense = rt.denseState;

  // f.a(byte,byte) offsets 0..56. BUG FIX (2026-09-10): rt condition was
  // `... && (N || (L && (dense[7979+target] & 64) === 0))`. The bytecode is
  // `getfield N:Z; ifne 57` (skip when N is SET) then `getfield L:Z;
  // ifeq 45` (call when L is CLEAR) then `(dense[7979+target] & 64); ifne
  // 57`, i.e. `!N && (!L || (dense[7979+target] & 64) === 0)`.
  if (
    (dense[UNIT_HAPPINESS + target] ?? 0) < 10 &&
    !g.callToArmsActive &&
    (!g.formUpActive || ((dense[UNIT_FLAGS + target] ?? 0) & 64) === 0)
  ) {
    // Offset 45..56: `b.a(12, target, 0); return;`
    rt.entityMove(12, target, 0);
    return;
  }

  if (classifyLegacyNegativeEntity(source) === 0 && (dense[BLD_KIND - source] ?? 0) === 6) {
    rt.runSelectionFlagsRefresh(true, false, true, false);
    g.qCounter = -source;
    g.barMode = 2;
    rt.stepFrameSelectionTransition();
    return;
  }

  // Offsets 104..156: a double tap (n:I > 1) or re-ordering the same cell.
  // FIXED 2026-10-08: was `n <= 1 || same`, and q:Z was set on every order
  // (offset 157 sets it on rt branch only).
  const samePosition = g.nInt > 1
    || ((dense[UNIT_TARGET_X + target] ?? 0) === g.cursorColumn + g.cameraColumn && (dense[UNIT_TARGET_Y + target] ?? 0) === g.cursorRow + g.cameraRow);

  const packedOffsetsBase = (nibbleBase: number) => {
    const nibble = (dense[UNIT_DIRECTION + target] ?? 0) & 1;
    const v1 = rt.packedOffsets[nibbleBase + nibble * 2] ?? 0;
    const v2 = rt.packedOffsets[nibbleBase + nibble * 2 + 1] ?? 0;
    const inner = rt.packedBytes[v2 + (dense[UNIT_SPEED + target] ?? 0) - 5] ?? 0;
    const outer = rt.packedBytes[v1 + inner + ((dense[1111 + target] ?? 0) & 15)] ?? 0;
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

  dense[UNIT_TARGET_X + target] = g.cursorColumn + g.cameraColumn;
  dense[UNIT_TARGET_Y + target] = g.cursorRow + g.cameraRow;
  dense[UNIT_FLAGS + target] = (dense[UNIT_FLAGS + target] ?? 0) & 223;
  dense[UNIT_ORDER + target] = 2;
  dense[UNIT_WORK_TARGET + target] = source;
  g.cAbByte = g.cursorColumn + g.cameraColumn;
  g.cAcByte = g.cursorRow + g.cameraRow;

  const checksOccupancy = classifyLegacyPositiveEntity(source) === 1
    || classifyLegacyNegativeEntity(source) === 1
    || isLegacyEntityIdInRange101to122(source);
  if (checksOccupancy && rt.occupancyClass(g.cursorColumn + g.cameraColumn, g.cursorRow + g.cameraRow) === 0) {
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
export function stepLegacyF(rt: LegacyRuntimeState, arg: number): void {
  const g = rt.game;
  const dense = rt.denseState;
  if ((dense[BLD_KIND + arg] ?? 0) === 3 && (dense[UNIT_RECORD + (rt.mainArrays.aShort[0]?.[17] ?? 0)] ?? 0) !== arg) {
    rt.mainArrays.r[0] = 0;
    g.menuCursor = 0;
    rt.stepLegacyL(4);
    return;
  }
  rt.runSelectionFlagsRefresh(true, false, true, false);
  g.qCounter = arg;
  g.barMode = 2;
  g.kByte = 0;
  rt.stepFrameSelectionTransition();
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
export function runByteActionQueue(rt: LegacyRuntimeState, type: number, x: number, y: number, value: number): void {
  const state = {
    c: rt.game.missionFrame,
    u: rt.game.uByte,
    ay: rt.game.ayByte,
    uBytes: rt.mainArrays.uBytes,
    kMatrix: rt.mainArrays.kMatrix,
    gCounters: rt.mainArrays.gCounters,
    selectionFlags: rt.game.selectionFlags,
    // f.a(ZZZZ) is a proven callback boundary.
    onSelectionRefresh: (first: boolean, second: boolean, third: boolean, fourth: boolean) => {
      rt.runSelectionFlagsRefresh(first, second, third, fourth);
    },
    onQueued: rt.onMessage,
  };
  stepLegacyByteActionQueue(state, type, x, y, value);
  // The helper mutates the queue arrays in place; ay is the only scalar
  // result of rt call, so mirror it back to the live f field.
  rt.game.ayByte = state.ay;
}

/** Raw f.ak() state-machine orchestration; child methods remain callbacks. */
export function stepStateMachine(rt: LegacyRuntimeState, callbacks: LegacyAkCallbacks = {}): void {
  stepLegacyAk(rt.game.stateMachineFields(), {
    ...callbacks,
    // CORRECTION 2026-08-22: stepLegacyAl's own onResetInput callback
    // (private void i() #610, offset 42 of al()) was never passed here
    // (silent no-op) -- now wired to resetLegacyZI. Also,
    // LegacyAkState/LegacyAlState's `eFlag`/`fFlag`/`vFlag` fields were
    // renamed to `inputUp`/`inputDown`/`inputV` (see LegacyAkState's own
    // docblock) since ak()'s own bytecode confirms those are the SAME
    // fields LegacyCameraFollow.ts already established, not the
    // orphaned game.eFlag/fFlag/vFlag rt structural-typing pickup
    // used to silently read instead.
    onAl: callbacks.onAl ?? (() => stepLegacyAl(rt.game, { onResetInput: () => resetLegacyZI(rt.game) })),
    onAm: callbacks.onAm ?? (() => rt.stepDefaultAm()),
    onAb: callbacks.onAb ?? (() => stepLegacyAB({
      state: rt.scrollSelectorState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    })),
    onAc: callbacks.onAc ?? (() => stepLegacyAC({
      state: rt.scrollSelectorState,
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
    })),
    onAo: callbacks.onAo ?? (() => rt.stepDefaultAo()),
    onAn: callbacks.onAn ?? (() => rt.stepDefaultAn()),
    onAd: callbacks.onAd ?? (() => rt.stepDefaultAd()),
  });
}

/** Execute the proven f.F() dispatch after the state-machine step. */
export function stepFrameDispatch(rt: LegacyRuntimeState, 
  callbacks: Omit<LegacyFrameDispatchInput, "state" | "packedBytes" | "packedOffsets" | "stateTableIndex"> = {},
): void {
  rt.framePrimitives.length = 0;
  rt.frameHelperCalls.length = 0;
  rt.frameDispatchState.missionFrame = rt.game.missionFrame;
  rt.frameDispatchState.screen = rt.game.screen;
  rt.frameDispatchState.H = rt.game.H;
  const onHandler = callbacks.onHandler ?? ((handler) => {
    if (handler === "G") {
      // `gState` is hoisted out of the call so S:I/T:I can be written back:
      // G() sets them (offsets 120..129 and 681..690) and f.a(int,byte)'s
      // >= 1000 arm reads them as its projection origin.
      const gState = {
        H: rt.game.H,
        Q: rt.game.screen,
        U: rt.game.U,
        V: 4,
        N: rt.frameDispatchState.N,
        c1: rt.frameDispatchState.c1,
        k: rt.game.zlKBytes,
        flags: rt.game.frameFlags,
        S: rt.game.projectionS,
        T: rt.game.projectionT,
      };
      stepLegacyGFrame({
        state: gState,
        onSurfaceClear: (target) => {
          if (target !== 1 || !rt.offscreenTargets) return;
          rt.offscreenTargets.clear(1, 9422847, 0, -8, 264, 304);
          rt.offscreenTargets.clear(1, 940839, 0, 232, 264, 64);
        },
        onSurfaceCopy: (target, source) => {
          if (target !== 0 || source !== 1 || !rt.offscreenTargets) return;
          rt.offscreenTargets.copy(0, 1, 0, 328, 36);
        },
        onSurfaceHeader: (target) => {
          if (target !== 0 || !rt.offscreenTargets) return;
          rt.offscreenTargets.clear(0, 9422847, 0, 0, 264, 80);
        },
        onTargetChanged: (target) => {
          rt.frameDispatchState.N = target;
        },
        onImageHelper: (resourceId, mode) => {
          rt.frameHelperCalls.push({ kind: "image", resourceId, mode });
          if (resourceId !== 1118) return;
          drawImageHelper(rt, resourceId, mode, gState.S, gState.T);
        },
        onDrawHelper: (resourceId, x, y) => {
          rt.frameHelperCalls.push({ kind: "draw", resourceId, x, y });
          if (resourceId >= 0 && rt.packedData && rt.offscreenTargets) {
            const graphics = rt.offscreenTargets.graphics[rt.frameDispatchState.N as 0 | 1 | 2 | 3];
            new LegacyPackedSpriteRenderer({
              shortTables: rt.packedData.shortTables,
              byteTables: rt.packedData.byteTables,
              imageGroups: rt.imageGroups,
              graphics,
            }).drawComposite(resourceId, x, y);
          }
        },
        onFrameCommand: (command, x, y) => rt.drawFrameCommandPrimitive(command, x, y),
        geometry: rt.gGeometry,
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        onPrimitive: (index, x, y) => {
          rt.framePrimitives.push([index, x, y]);
          callbacks.onPrimitive?.(index, x, y);
        },
      });
      // Write S:I/T:I back: G() owns them, and c(int,int) reads/writes the
      // same two fields outside rt handler.
      rt.game.projectionS = gState.S;
      rt.game.projectionT = gState.T;
      rt.frameDispatchState.H = false;
      return;
    }
    if (handler === "P") {
      stepLegacyP(rt.pFrameState, rt.offscreenTargets?.graphics ?? [], {
        // f.n() is rt handler's onScroll below.
        // Q()'s j() (offset 487): the world update during a cutscene. Was
        // left unwired on a double-run worry, but h()'s j() only runs for
        // v == 1 and P()/Q() only for v == 0 (oracle 2026-10-08).
        onJ: () => rt.stepOriginalJ(),
        // 2026-08-22: private void i() (#610) wired -- resetLegacyZI,
        // the SAME shared reset also called from stepGameplayZAh's onI
        // and stepLegacyGameplayTick's three real call sites.
        onI: () => resetLegacyZI(rt.game),
        // R()'s n() (offsets 57, 85): the camera step that redraws the
        // terrain into Image[c[1]]. main.ts only runs it for v == 1, and a
        // dialogue over the map is v == 0 -- the terrain stayed black.
        onScroll: () => rt.stepCameraScroll(),
        // R() offsets 146..192: helper #435 copies the map band out of
        // Image[c[1]] into Graphics[c[0]]; its exception is swallowed.
        onPartialBlit: (height, destY) => {
          const slots = rt.game.frameImageSlots;
          const target = rt.offscreenTargets?.graphics[slots[0] as 0 | 1 | 2 | 3];
          const image = rt.offscreenTargets?.images[slots[1] as 0 | 1 | 2 | 3];
          if (!target || !image) return;
          try {
            target.drawRegion(image, 0, 120, 264, height, 0, 0, destY, 0);
          } catch {
            // #435 returns false.
          }
        },
        onGameplayDraw: () => rt.stepGameplayOuterLoop(rt.offscreenTargets?.graphics[rt.pFrameState.targetSlot]),
        // onPopulateItems (f.O()) -- CORRECTION (2026-08-24): the SAME
        // already-ported/wired stepLegacyO the "K"/"M" handlers' own onO
        // use (see the "M" handler's onO comment above); was previously
        // left as a stale "not yet resolved" no-op despite the target
        // already existing.
        onPopulateItems: () => rt.stepLegacyO(),
        onElementScan: (aD, x, y) => {
          rt.framePrimitives.push([aD, x, y]);
          callbacks.onPrimitive?.(aD, x, y);
          rt.drawFrameCommandPrimitive(aD, x, y);
        },
        // f.d(IIII)/LegacyZSubrecordDraw (#572), bytecode/f-javap.txt
        // offsets 292..355 of P()'s own tableA0===1 branch -- two calls,
        // records `98+tableA28` and `104`, both at (120,176), targeting
        // the SAME `graphics[targetSlot]` (field #79/N:B, written 0 two
        // instructions earlier at offset 258, exactly like R()'s own
        // established targetSlot=0-then-call pattern rt class already
        // follows for onGameplayDraw above). 2026-08-31/09-02: found
        // unwired via live trace (Q=17, al=2, the story-dialog screen) --
        // rt callback fires every frame there, and its silent drop is
        // exactly why the canvas's middle ~2/3 painted pure black: the
        // same branch clears that region two calls earlier
        // (`bar.fillRect(11, 120, 240, 128)`, LegacyGameplayPaintTriggers
        // .ts's stepLegacyP) and nothing else was left to redraw it.
        onSpriteDraw: (record, x, y, phase) => {
          rt.frameHelperCalls.push({ kind: "p-sprite", record, x, y, mode: phase });
          if (!rt.offscreenTargets || !rt.packedData || !rt.imageGroups[0]) return;
          const graphics = rt.offscreenTargets.graphics[rt.pFrameState.targetSlot];
          const packed = new LegacyPackedSpriteRenderer({
            shortTables: rt.packedData.shortTables,
            byteTables: rt.packedData.byteTables,
            imageGroups: rt.imageGroups,
            graphics,
          });
          rt.stepZSubrecordDraw(record, x, y, phase, {
            onSpriteRecord: (spriteRecord, drawX, drawY) => packed.drawComposite(spriteRecord, drawX, drawY),
          });
        },
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
      });
    } else if (handler === "H" || handler === "I" || handler === "J" || handler === "K" || handler === "L" || handler === "N") {
      stepLegacySimpleFrameHandler(handler, rt.simpleFrameState, {
        // L()'s C() (#405): the whole map overview, drawn once on entry.
        onC: () => drawLegacyMapOverview(rt.mapOverviewInput()),
        // 2026-08-26: confirmed via direct bytecode read (I()/J()/K()/L()/
        // N(), all `invokespecial #438 // Method a:(BII)V`) that rt is
        // the SAME f.a(byte,int,int) call onElementScan wires elsewhere --
        // now reuses the same tested drawFrameCommandPrimitive pipeline
        // instead of only tracing.
        onPrimitive: (index, x, y) => {
          rt.framePrimitives.push([index, x, y]);
          callbacks.onPrimitive?.(index, x, y);
          rt.drawFrameCommandPrimitive(index, x, y);
        },
        // f.K()'s onU (f.u(), case "K" only -- I()/J()/L()/N() don't call
        // it) wired 2026-08-14, same stepGameplayOuterLoop() as R()'s
        // onGameplayDraw (see that method's own docblock). Like am(),
        // K()'s own bytecode never writes N:B (#79) before calling u()
        // -- reads the live game.targetSlot instead of assuming 0
        // (second pass, 2026-08-14).
        onN: () => rt.stepCameraScroll(),
        onU: () => rt.stepGameplayOuterLoop(rt.offscreenTargets?.graphics[rt.game.targetSlot]),
        // onO (f.O(), offsets 0..232) -- CORRECTION 2026-08-18: rt is
        // the SAME already-ported/tested `stepLegacyO` S()'s own onO
        // callback already uses (confirmed: only one `private void O()`
        // declaration exists in the whole class; K()'s bytecode calls
        // it directly at offset 25-28, `invokespecial #417 // Method
        // O:()V`, right after n()/u() in the same order rt dispatch
        // already calls onN/onU/onO) -- was previously left as a stale
        // "remains unresolved" comment despite the target already
        // existing.
        onO: () => rt.stepLegacyO(),
        // This callback lives inside stepLegacySimpleFrameHandler's own
        // "case P" branch, which handler === "P" never reaches here (see
        // the real dispatch above -- "P" is fully handled before rt
        // call). Dead code either way, but fixed for consistency:
        // f.P()'s own i() call (#610) -- see the real, reachable stepLegacyP
        // wiring's own onI for the live equivalent.
        onInputReset: () => resetLegacyZI(rt.game),
      });
    } else if (handler === "M") {
      rt.mFrameState.a = rt.packedOffsets;
      rt.mFrameState.bytes = rt.packedBytes;
      rt.mFrameState.H = rt.game.H;
      rt.mFrameState.I = rt.game.I;
      rt.mFrameState.m = rt.game.mByte;
      stepLegacyMFrame({
        state: rt.mFrameState,
        // f.M()'s onO -- CORRECTION (2026-08-24): confirmed via direct
        // bytecode read (offset 13, `invokespecial #417 // Method
        // O:()V`) to be the SAME already-ported/wired `stepLegacyO`
        // K()'s own onO already uses (see that callback's own comment
        // above) -- was previously left as a stale empty no-op.
        onO: () => rt.stepLegacyO(),
        emit: (command) => rt.applyMFrameCommand(command),
      });
      rt.game.H = rt.mFrameState.H;
      rt.game.I = rt.mFrameState.I;
      rt.game.mByte = rt.mFrameState.m;
    }
  });
  stepLegacyFrameDispatch({
    ...callbacks,
    // The handlers write game.H directly; re-sync the copy so the write-back
    // below does not undo it. (Until 2026-10-01 it did, and every handler
    // re-ran its H:Z first-entry block each frame.)
    onHandler: (handler) => {
      onHandler(handler);
      rt.frameDispatchState.H = rt.game.H;
    },
    // 2026-08-26: the Q=18/24/32 inline branches' own onPrimitive calls
    // (bytecode-confirmed invokespecial #438 // Method a:(BII)V, same as
    // I()/J()/K()/L()/N()/onElementScan) previously only reached
    // callbacks.onPrimitive, which main.ts's zero-argument
    // stepFrameDispatch() call never supplies -- wired to the same
    // tested pipeline here.
    onPrimitive: (index, x, y) => {
      rt.framePrimitives.push([index, x, y]);
      callbacks.onPrimitive?.(index, x, y);
      rt.drawFrameCommandPrimitive(index, x, y);
    },
    state: rt.frameDispatchState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    stateTableIndex: 153,
  });
  rt.game.H = rt.frameDispatchState.H;
}

/** Apply f.ao()'s table/state branch with unresolved child helpers inert. */
export function stepDefaultAo(rt: LegacyRuntimeState): void {
  rt.aoTrace.count += 1;
  rt.aoTrace.inputQ = rt.aoState.Q;
  rt.aoTrace.inputZ = rt.aoState.Z;
  rt.aoTrace.value = rt.packedBytes[
    rt.packedOffsets[151] + rt.packedBytes[rt.packedOffsets[152] + rt.aoState.Q] + rt.aoState.Z
  ];
  stepLegacyAo({
    state: rt.aoState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // aoState is live, so ap()'s Q = 28 sticks (it used to be undone by a
    // copy-out, leaving every Q = 20 prompt open forever).
    onAp: () => { stepEntityActionConfirmation(rt); },
    onLanguage: (language) => rt.selectLanguage(language),
    onResourceLoad: (slot) => {
      if (slot === 0 || slot === 1) rt.loadLanguageResource(slot);
    },
    onAr: () => { rt.stepDefaultArFromAo(); },
    // f.ao()'s Q===18||Q===17 branch: `rt.b(-1)` (constant-pool #541,
    // f.b(int)). Confirmed via direct bytecode read (offset 176..181 of
    // ao()) that it really is a call on `rt`, not on the c-typed
    // resource-loader field.
    //
    // BUG FIX (2026-08-31): rt used to call `runSceneDispatch`, which
    // is an INCOMPLETE second port of f.b(int) covering only offsets
    // 0..54 and opening with `if (value < 0) return;`. Since ao() always
    // passes -1 here, the call did nothing at all -- that is precisely
    // why Q=18 was a dead end. The complete port (the full offset-54
    // shared tail, its an:B dispatch, and f(int,int)) already existed as
    // stepSubsystemStateCommand; point at it instead. See that method
    // and LegacyStateTransitionCommand.ts for the duplicate-port note.
    onB: (value) => { rt.stepSubsystemStateCommand(value); },
    onAq: () => {
      // Live fields: aM() (offsets 96/298) sets c:I = 0, and the q < 5 branch leaves it there.
      // FIXED 2026-10-14 (oracle run 15, play23 frame 73824, mission 4 -> 5): a snapshot taken
      // before the call wrote the old c back afterwards.
      const state = liveView<LegacyAqState>(rt.game, {
        m: "mByte", Q: "screen", U: "U", u: "uByte", q: "mission", T: "actionT", R: "R", vInt: "vInt",
        r: "progressR", s: "sByte", V: "progressV", Z: "Z", c: "missionFrame",
      });
      stepLegacyAq({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onAM: () => rt.resetMapEntryAllocation(state.q),
        // f.aq()'s q===6 sub-branch calls `rt.b(59)` (constant-pool
        // #541) -- the SAME f.b(int)/runSceneDispatch as onB above, not
        // a distinct "entity signal" method; confirmed via direct
        // bytecode read (offset 224..229 of aq()).
        onEntitySignal: (signalValue) => rt.runSceneDispatch(signalValue),
        onGByte: () => rt.saveOriginalResourceAction(0),
        onSound: (soundValue) => rt.selectResourceSection(soundValue),
      });
    },
    onAs: () => stepAs(rt),
    // f.at() (Q=13, difficulty) writes b:B #243 (levelBByte), c:B #265
    // (progressC) and d:B #276 (persistedDByte). FIXED 2026-09-27: b was a
    // throwaway local (the chosen difficulty was dropped), c went to the
    // frame counter c:I #260 (so f.F() ran H() instead of G() and the
    // mission-select panel was never drawn), d to the tick counter d:I.
    onAt: () => {
      const state = {
        Z: rt.aoState.Z,
        b: rt.game.difficulty,
        c: rt.game.progressC,
        q: rt.aoState.q,
        Q: rt.aoState.Q,
        d: rt.game.persistedDByte,
        r: rt.aoState.r,
        V: rt.aoState.V,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        s: rt.aoState.s,
        R: rt.aoState.R,
        H: rt.aoState.H,
      };
      stepLegacyAt({ state, onGByte: () => rt.saveOriginalResourceAction(0) });
      rt.aoState.Z = state.Z;
      rt.game.difficulty = state.b;
      rt.game.progressC = state.c;
      rt.aoState.q = state.q;
      rt.aoState.Q = state.Q;
      rt.game.persistedDByte = state.d;
      rt.aoState.V = state.V;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.s = state.s;
      rt.aoState.R = state.R;
    },
    onAv: () => {
      const state = {
        Q: rt.aoState.Q,
        Z: rt.aoState.Z,
        vInt: rt.aoState.vInt,
        mByte: rt.aoState.mByte,
        aShort: rt.mainArrays.aShort,
      };
      stepLegacyAv({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onCByte: (value) => rt.selectResourceSection(value),
      });
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.vInt = state.vInt;
      rt.aoState.mByte = state.mByte;
    },
    // f.ao()'s Q===25 branch: `f.d:[S]` (#269, already tracked as
    // game.zlDShorts) index 4, and `f.b:[Z]` (#234, already tracked as
    // game.frameFlags) index 2 -- both confirmed elsewhere in rt
    // codebase (LegacyFrameCommandChanged.ts) as the SAME two arrays.
    onDShortWrite: (index, value) => { rt.game.zlDShorts[index] = value; },
    onBooleanFlag: (index, value) => { rt.game.frameFlags[index] = value; },
    onAw: () => {
      const state = {
        q: rt.aoState.q,
        R: rt.aoState.R,
        Q: rt.aoState.Q,
        W: rt.game.actionWFlag,
        Z: rt.aoState.Z,
        r: rt.aoState.r,
        af: rt.aoState.af,
        vInt: rt.aoState.vInt,
        aaInt: rt.aoState.aaInt,
      };
      stepLegacyAw(state);
      rt.aoState.q = state.q;
      rt.aoState.R = state.R;
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.vInt = state.vInt;
      rt.aoState.aaInt = state.aaInt;
    },
    onAu: () => {
      const state = {
        Q: rt.aoState.Q,
        Z: rt.aoState.Z,
        q: rt.aoState.q,
        s: rt.aoState.s,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        T: rt.aoState.T,
        R: rt.aoState.R,
      };
      stepLegacyAu({
        state,
        packedBytes: rt.packedBytes,
        packedOffsets: rt.packedOffsets,
        onGByte: () => {
          rt.game.sByte = state.s;
          rt.game.persistedPByte = state.pByte;
          return rt.saveOriginalResourceAction(0);
        },
      });
      rt.aoState.Q = state.Q;
      rt.aoState.Z = state.Z;
      rt.aoState.q = state.q;
      rt.aoState.s = state.s;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.T = state.T;
      rt.aoState.R = state.R;
    },
    onAx: () => {
      const state = {
        Z: rt.aoState.Z,
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        q: rt.aoState.q,
        s: rt.aoState.s,
        V: rt.aoState.V,
        vInt: rt.aoState.vInt,
        pByte: rt.aoState.pByte,
        aaInt: rt.aoState.aaInt,
        r: rt.aoState.r,
      };
      stepLegacyAx(state);
      rt.aoState.Z = state.Z;
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.vInt = state.vInt;
      rt.aoState.pByte = state.pByte;
      rt.aoState.aaInt = state.aaInt;
    },
    onAy: () => {
      const state = {
        X: rt.game.XFlag,
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        vInt: rt.aoState.vInt,
        U: rt.game.U,
        Z: rt.aoState.Z,
        c: rt.aoState.c,
        g: 0,
      };
      stepLegacyAy({ state, onAM: () => rt.resetMapEntryAllocation(rt.aoState.q) });
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.vInt = state.vInt;
      rt.aoState.Z = state.Z;
      rt.aoState.c = state.c;
    },
    onAz: () => {
      const state = {
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        Z: rt.aoState.Z,
        aaInt: rt.aoState.aaInt,
        vInt: rt.aoState.vInt,
      };
      stepLegacyAz({ state, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets });
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.aaInt = state.aaInt;
      rt.aoState.vInt = state.vInt;
    },
    // f.ao()'s value===1/3 branches' `rt.a.a(70|74)` call, and f.av()'s
    // own `rt.a.a(75)` call above -- all the same c.a(int), see
    // selectResourceSection's docblock.
    onCByte: (value) => { rt.selectResourceSection(value); },
    // f.ao()'s value===2 branch writes two bytes directly into the same
    // packedBytes table `stepLegacyAo` already reads from -- the target
    // indices are computed inline by stepLegacyAo itself, so rt
    // callback only needs to perform the write.
    onResourceByte: (index, value) => { rt.packedBytes[index] = value; },
    // f.ao()'s value===7 branch (`onA0`, a pre-existing but misleadingly
    // named callback -- confirmed via direct bytecode read, offset
    // 901..905, that it really calls `rt.aA()`, constant-pool #482,
    // NOT some hypothetical "a0()"). aA() is already fully ported and
    // tested as stepLegacyAA (verify-state-short-helpers.mjs) but was
    // never called from anywhere in the runtime until rt wiring.
    onA0: () => {
      const state = {
        Q: rt.aoState.Q,
        R: rt.aoState.R,
        Z: rt.aoState.Z,
        aaInt: rt.aoState.aaInt,
        X: rt.game.XFlag,
        q: rt.aoState.q,
        t: rt.game.tByte,
        W: rt.game.actionWFlag,
        T: rt.aoState.T,
        vInt: rt.aoState.vInt,
      };
      stepLegacyAA(state);
      rt.aoState.Q = state.Q;
      rt.aoState.R = state.R;
      rt.aoState.aaInt = state.aaInt;
      rt.game.XFlag = state.X;
      rt.aoState.T = state.T;
      rt.aoState.vInt = state.vInt;
    },
    // f.ao()'s fabricated KFlag tail (no bytecode behind it) was deleted
    // from stepLegacyAo 2026-09-27; nothing to wire here.
    onDestroy: () => { rt.game.b = false; },
  });
  rt.aoTrace.outputQ = rt.game.screen;
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
 * matching rt project's other confirmed uses of #254/#266). The old
 * fields were fed by nothing real (`viewportC`/`viewportD`/
 * `viewportSFlag` had zero correct producers; `viewportCSize`/
 * `viewportDSize` were a harmless but redundant copy of `mapWidth`/
 * `mapHeight`, always set together with them) -- so rt call has likely
 * been normalizing the viewport against stale/wrong inputs since it was
 * written. See docs/unknowns.md for the discovery trace.
 */
export function normalizeEntityViewport(rt: LegacyRuntimeState): void {
  const viewport = {
    C: rt.game.cursorTargetColumn, D: rt.game.cursorTargetRow,
    y: rt.game.cursorColumn, A: rt.game.cursorRow,
    I: rt.game.cameraColumn, K: rt.game.cameraRow,
    sFlag: rt.game.cameraSFlag, O: rt.game.viewColumns,
    c: rt.game.mapWidth, P: rt.game.viewRows, d: rt.game.mapHeight,
  };
  stepLegacyAKViewport(viewport);
  rt.game.cursorColumn = viewport.y;
  rt.game.cursorRow = viewport.A;
  rt.game.cameraColumn = viewport.I;
  rt.game.cameraRow = viewport.K;
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
 * call sites across `V()`/`X()` and others -- out of scope here; rt
 * only ports the producer.
 */
export function stepLegacyExitPreparation(rt: LegacyRuntimeState): void {
  const g = rt.game;
  g.exitPrepWInt = (g.cameraColumn - Math.trunc(40 / 2)) + (g.viewColumns >> 1);
  if (g.exitPrepWInt < 0) {
    g.exitPrepWInt = 0;
  } else if (g.exitPrepWInt + 40 >= g.mapWidth) {
    g.exitPrepWInt = g.mapWidth - 40;
  }

  if (60 <= g.mapHeight) {
    g.exitPrepXInt = (g.cameraRow - Math.trunc(60 / 2)) + (g.viewRows >> 1);
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
export function stepStateAm(rt: LegacyRuntimeState, input: Omit<LegacyAmInput, "packedBytes" | "packedOffsets">): void {
  stepLegacyAm({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

// CLEANUP (2026-08-25): stepStateAn/Ao/Ap/Aq/Ar/As/At/Au/Av/Aw/Ax/Ay/Az/
// AA/Ad/AB/AC/Ae/Af/Ag/Ah/Aj/AKViewport/AL/resetStateAM (25 thin public
// wrappers over LegacyStateMachine.ts's stepLegacyA* functions) removed --
// confirmed via full-repo grep zero callers anywhere (not the runtime,
// not any verify-*.mjs). Some of the underlying stepLegacyA* functions
// (An/Ao/Ap/Ar/Au/Aw/Ad/AB/AC/Ae/Aj/AKViewport/resetLegacyAM) ARE live,
// just wired directly at their own real call sites elsewhere in rt
// file rather than through these wrappers -- those are untouched. Others
// (Aq/As/At/Av/Ax/Ay/Az/AA/Af/Ag/Ah) have NO other caller anywhere and
// are genuinely unreachable dead code right now -- left in place in
// LegacyStateMachine.ts (not deleted, since some may still get a real
// wiring site found later; see stepLegacyAo's own callback-cluster
// wiring gap in docs/parity-checklist.md for several of them).
export function stepStateAi(rt: LegacyRuntimeState, input: LegacyAiInput): void { stepLegacyAi({ ...input, dense: input.dense ?? rt.denseState }); }

export function stepStateAOMap(rt: LegacyRuntimeState, input: LegacyAOMapInput): void { stepLegacyAOMap(input); }

/** Raw f.U() transition runner; unresolved owners remain callback seams. */
export function stepStateU(rt: LegacyRuntimeState, input: Omit<LegacyStateUInput, "dense" | "packedBytes" | "packedOffsets">): void {
  stepLegacyStateU({
    ...input,
    dense: rt.denseState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Raw f.b(int) command boundary; negative completion can enter f.U(). */
export function stepStateTransitionCommand(rt: LegacyRuntimeState, 
  input: Omit<LegacyStateTransitionCommandInput, "packedBytes" | "packedOffsets">,
  value: number,
): void {
  stepLegacyStateTransitionCommand({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  }, value);
}

/** Raw f.S() transition preparation against the live packed resource. */
export function stepStateS(rt: LegacyRuntimeState, input: Omit<LegacyStateSInput, "packedBytes" | "packedOffsets">): void {
  stepLegacyStateS({
    ...input,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
  });
}

/** Raw f.T() selector branches against the live dense/short state banks. */
export function stepStateT(rt: LegacyRuntimeState, input: Omit<LegacyStateTInput, "dense" | "shortRows">): void {
  stepLegacyStateT({
    ...input,
    dense: rt.denseState,
    shortRows: rt.mainArrays.aShort,
    onFPairCommand: input.onFPairCommand ?? ((x, y) => {
      rt.stepFPairCommand({}, x, y);
    }),
  });
}

/** Exact f.g(byte) map-entry call chain; lower aM/aN/aO remain explicit callbacks. */
export function stepStateMapEntry(rt: LegacyRuntimeState, q: number, callbacks: LegacyMapEntryCallbacks = {}): void {
  const entryState = { q: rt.game.mission };
  stepLegacyMapEntry(entryState, q, callbacks);
  rt.game.mission = entryState.q;
}

export function stepStateAPPrefix(rt: LegacyRuntimeState, input: LegacyAPPrefixInput): void { stepLegacyAPPrefix(input); }

export function stepStateAQAudio(rt: LegacyRuntimeState, input: LegacyAQAudioInput): void { stepLegacyAQAudio(input); }

/**
 * f.as(): the OPTIONS screen's toggle of row Z (1 MUSIC, 3 HINTS). Also used by the settings panel
 * (Settings.ts), which sets Z for the call.
 */
export function stepAs(rt: LegacyRuntimeState): void {
  const state = { Z: rt.aoState.Z, eByte: rt.aoState.eByte, lInt: rt.aoState.lInt };
  stepLegacyAs({
    state,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // f.as() offsets 66..84: with a player (f.a:La; #148, created by aQ() and cleared by aR(),
    // i.e. game.playerExists) the toggle only calls a.a(e): e == 0 stops it, otherwise it
    // restarts and sets the volume. Only without one does it run aR() + aQ(), whose track
    // pick uses the RNG. CORRECTED 2026-10-16 (oracle, options screen, frame 12253): the
    // player branch was unwired, so every MUSIC toggle re-rolled a track.
    onAudio: rt.game.playerExists
      ? (value) => { if (value === 0) rt.midiPlayer?.stop(); else rt.midiPlayer?.start(); }
      : undefined,
    onAQ: () => rt.startOriginalAudio(),
  });
  rt.aoState.Z = state.Z;
  rt.aoState.eByte = state.eByte;
  rt.aoState.lInt = state.lInt;
}
