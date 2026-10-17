import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { LegacyGameState } from "../core/LegacyGameState";
import type { RmsGameplayRecord, SparseLocationGroup } from "./RmsGameplayRecord";
import { initializeLegacyEntityRecord, indexLegacyEntityRecord } from "../sim/world/LegacyEntityRecordLifecycle";
import { markLegacySpatialRecord } from "../sim/world/LegacySpatialRecordUpdate";
import { stepLegacyByteActionQueue } from "../ui/LegacyByteActionQueue";
import { LEGACY_SPATIAL_LAYER_INDEX, copyRows, cloneRows, copyCube, cloneCube } from "../core/LegacyRuntimeState";
import { runSubsystemN } from "../sim/tribe/TribeRuntime";
import { decodeMap, loadMap, rebuildGridAfterLoad } from "../sim/world/WorldRuntime";

/**
 * LegacyRuntimeState wiring moved out of the class (phase 2 step 3): each function is the former
 * method of the same name, with `this` as the `rt` parameter.
 */

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
export function recordOptions(rt: LegacyRuntimeState) {
  const g = rt.game;
  const life = rt.entityRecordLifecycleInput();
  return {
    framePending: () => { g.pendingP = true; },
    onRecordInitialized: (id: number) => initializeLegacyEntityRecord(life, id),
    onRecordIndexed: (id: number) => indexLegacyEntityRecord(life, id),
    // f.a(1,x,y,id) -- the SAME stepLegacyByteActionQueue #433 the
    // type=100/5 call sites use (offset 1473 of the record allocator).
    onTeamZeroPlacement: (x: number, y: number, id: number) => rt.runByteActionQueue(1, x, y, id),
    // b.a(int,int,int) (#473) = markLegacySpatialRecord.
    onSubsystemPlacement: (x: number, y: number, span: number) => markLegacySpatialRecord({
      packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets,
      layers: rt.mainArrays.aInt,
      layerIndex: LEGACY_SPATIAL_LAYER_INDEX,
      mapHeight: g.mapHeight,
    }, x, y, span),
    frameFlag: g.entityFocusFlag, // F:Z (#49), offset 57
    q: g.mission,
    aw: g.levelAwByte,
    // Offset 1443 of f.a(BBBBB)B: the [11]/[19] counts are skipped while f.s:Z (a scripted scene
    // sets up the map) holds. FIXED 2026-10-14 (oracle run 15, play20 frame 61981): was false.
    get suppressCounters() { return g.cameraSFlag; },
  };
}

/**
 * Copy the fields proven by f.e(int) into the raw runtime allocations.
 * This intentionally stops before the original post-load calls to b.n(),
 * b.j(), b.d(), and aK(); those calls are sequenced by loadGameplayFromStore
 * after hydration where their confirmed portions are available.
 */
export function hydrateGameplayRecord(rt: LegacyRuntimeState, record: RmsGameplayRecord): void {
  rt.game.mission = record.qByte; // f.q:B (#357)
  // f.d(int) restores f.q itself before aN()/the post-load b calls.  Keep
  // the state-machine alias live as well as the raw persistence mirror;
  // otherwise a restored gameplay slot would continue running with the
  // pre-load q=0 selector. CORRECTION (2026-08-24): game.subsystemQ was
  // a disconnected duplicate of rt SAME field (f.q:B#211/#357, used
  // throughout the whole b-subsystem cluster: ak()/al()/i()/h()/etc.)
  // -- deleted, merged onto qByte, see that field's own docblock.
  rt.game.mission = record.qByte;
  rt.game.persistedPByte = record.pByte;
  rt.game.persistedDByte = record.dByte;
  rt.denseState.set(record.denseState);
  rt.game.persistedQ2.set(record.q2);

  copyRows(rt.mainArrays.aByte, record.a50, 4);
  copyRows(rt.mainArrays.aShort, record.aShort2x26, 2);
  copyRows(rt.mainArrays.e, record.e30, 3);
  copyCube(rt.mainArrays.aByte3, record.a2x10x12, 2);
  copyRows(rt.mainArrays.f4, record.f30, 4);
  copyCube(rt.game.xSlotTable, record.b2x5x30, 2);
  copyCube(rt.game.teamMarkerTable, record.c2x5x5, 2);

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
  rt.game.frameLayoutAq = record.aq;
  rt.game.cursorColumn = record.y;
  rt.game.cursorRow = record.A;
  rt.game.cameraColumn = record.I;
  rt.game.cameraRow = record.K;
  rt.game.audioH = record.h;
  rt.game.ai = record.ai;
  rt.game.missionFrame = record.cInt;
  rt.game.formUpActive = record.L;
  rt.game.callToArmsActive = record.N;

  copyRows(rt.mainArrays.aInt[0], record.intLayers0x3x96, 3);
  copyRows(rt.subsystemArrays.cRows, record.bC6x10, 6);
  rt.game.subsystemGFFlagByte = record.bFByte;
  rt.subsystemArrays.bField28 = record.bKByte;
  rt.game.subsystemRByte = record.bRByte;
  rt.subsystemArrays.bField32 = record.bLByte;
  rt.subsystemArrays.bAQ = record.bAQ;
  copyRows(rt.subsystemArrays.fRows, record.bF2x10, 2);
  copyRows(rt.subsystemArrays.gRows, record.bG3x20, 3);
  rt.subsystemArrays.j.set(record.bJ50);
  rt.subsystemArrays.bN = record.bN;
  rt.subsystemArrays.bO = record.bO;
  rt.subsystemArrays.bgByte = record.bg;
  rt.subsystemArrays.bJByte = record.bJ;
  rt.game.subsystemGCurrentI = record.bI; // b.I:B (#62 in f)
  rt.game.subsystemT.set(record.t3);

  for (const group of record.sparseLocations) {
    for (const location of group.locations) {
      if (location.y < 0 || location.y >= rt.gridC.length ||
          location.x < 0 || location.x >= rt.gridC[location.y].length) {
        throw new RangeError(`Sparse RMS location (${location.x},${location.y}) is outside runtime map`);
      }
      rt.gridC[location.y][location.x] = group.value;
    }
  }
  rebuildGridAfterLoad(rt);
}

/** Snapshot the same raw shapes written by f.d(int), without semantic remapping. */
export function snapshotGameplayRecord(rt: LegacyRuntimeState): RmsGameplayRecord {
  const sparseLocations: SparseLocationGroup[] = [];
  for (let value = -111; value >= -122; value -= 1) {
    const locations: Array<{ x: number; y: number }> = [];
    for (let x = 0; x < rt.game.mapWidth; x += 1) {
      for (let y = 0; y < rt.game.mapHeight; y += 1) {
        if (rt.gridC[y]?.[x] === value) locations.push({ x, y });
      }
    }
    sparseLocations.push({ value, locations });
  }

  return {
    qByte: rt.game.mission,
    pByte: rt.game.persistedPByte,
    dByte: rt.game.persistedDByte,
    denseState: new Int8Array(rt.denseState),
    q2: new Int8Array(rt.game.persistedQ2),
    a50: cloneRows(rt.mainArrays.aByte, 4),
    aShort2x26: cloneRows(rt.mainArrays.aShort, 2),
    e30: cloneRows(rt.mainArrays.e, 3),
    a2x10x12: cloneCube(rt.mainArrays.aByte3, 2),
    f30: cloneRows(rt.mainArrays.f4, 4),
    b2x5x30: cloneCube(rt.game.xSlotTable, 2),
    c2x5x5: cloneCube(rt.game.teamMarkerTable, 2),
    aq: rt.game.frameLayoutAq,
    y: rt.game.cursorColumn,
    A: rt.game.cursorRow,
    I: rt.game.cameraColumn,
    K: rt.game.cameraRow,
    h: rt.game.audioH,
    ai: rt.game.ai,
    cInt: rt.game.missionFrame,
    L: rt.game.formUpActive,
    N: rt.game.callToArmsActive,
    intLayers0x3x96: cloneRows(rt.mainArrays.aInt[0], 3),
    bC6x10: cloneRows(rt.subsystemArrays.cRows, 6),
    bFByte: rt.game.subsystemGFFlagByte,
    bKByte: rt.subsystemArrays.bField28,
    bRByte: rt.game.subsystemRByte,
    bLByte: rt.subsystemArrays.bField32,
    bAQ: rt.subsystemArrays.bAQ,
    bF2x10: cloneRows(rt.subsystemArrays.fRows, 2),
    bG3x20: cloneRows(rt.subsystemArrays.gRows, 3),
    bJ50: new Int8Array(rt.subsystemArrays.j),
    bN: rt.subsystemArrays.bN,
    bO: rt.subsystemArrays.bO,
    bg: rt.subsystemArrays.bgByte,
    bJ: rt.subsystemArrays.bJByte,
    bI: rt.game.subsystemGCurrentI,
    t3: new Int8Array(rt.game.subsystemT),
    sparseLocations,
  };
}

/** Load one original gameplay slot into the raw runtime buffers. */
export function loadGameplayFromStore(rt: LegacyRuntimeState, slot: 1 | 2, mapWidth = rt.game.mapWidth, mapHeight = rt.game.mapHeight): boolean {
  rt.game.mapWidth = mapWidth;
  rt.game.mapHeight = mapHeight;
  const record = rt.progressStore.loadGameplay(slot, mapWidth, mapHeight);
  if (!record) return false;

  // f.d(int) calls aM() right after reading q. REMOVED 2026-09-24: a second
  // aM() port (resetGameplayLoadPrefix) used here also wrote Q = 14,
  // v = 0, H, i, w and two counters -- none of them in aM()'s bytecode
  // (offsets 0..598) -- so a successful load from Continue dropped back to
  // the title screen instead of Q = 28.
  rt.resetMapEntryAllocation(record.qByte & 0xff);

  // f.e(int) reads f.q before calling aN().  When the original resources are
  // attached, retain that same map-selection boundary before restoring the
  // saved dense state.  The remaining aM()/post-load helpers are still
  // separate reverse-engineering work and are deliberately not inferred.
  // aN() (via loadMap/decodeMap) sets the LOGICAL c:S/d:S; f.d(int) never
  // widens them afterwards. Until 2026-10-07 rt overwrote them with the
  // decode stride, so a tutorial load came back 64x48 instead of 40x32.
  if (rt.maResource && rt.packedData) rt.loadMap(record.qByte & 0xff);
  rt.hydrateGameplayRecord(record);
  // f.d(int) offsets 172..182: a free-play load (slot 2) restores the
  // difficulty b:B from the saved d:B.
  if (slot === 2) rt.game.difficulty = rt.game.persistedDByte;
  // f.d(int) offset 1954: b.n() rebuilds the zone lists before b.j()/b.d().
  // ADDED 2026-09-27: without it a load at f.c % 10 != 0 left b.c:[[[B /
  // b.a:[[B stale (all zeros on a cold boot: head 0 -> next 0), and p()'s
  // walk in LegacySubsystemNearbyMarkerLookup.ts never ended.
  runSubsystemN(rt);
  rt.runSubsystemJ(record.qByte & 0xff);
  rt.runSpatialPass({});
  // f.run() calls aK() after b.d(), then snapshots the normalized viewport
  // pair into J/L.  Keep rt ordering explicit; these are raw fields until
  // the source-table aliases feeding aK() are fully identified.
  rt.normalizeEntityViewport();
  rt.game.JByte = rt.game.cameraColumn;
  rt.game.cameraSavedKByte = rt.game.cameraRow; // L:B (#72)
  return true;
}

/** Save the current raw runtime buffers using the original slot-1/2 schema. */
export function saveGameplayToStore(rt: LegacyRuntimeState, slot: 1 | 2): void {
  rt.progressStore.saveGameplay(slot, rt.snapshotGameplayRecord());
}

/** Exact f.e(int) save boundary used by f.am()'s T=1 branch. */
export function saveOriginalResourceAction(rt: LegacyRuntimeState, slot: number): boolean {
  try {
    if (slot === 0) {
      rt.progressStore.save({
        l: rt.game.lInt,
        W: rt.game.actionWFlag,
        r: rt.game.progressR,
        s: rt.game.sByte,
        t: rt.game.tByte,
        c: rt.game.progressC,
        p: rt.game.persistedPByte,
      });
      return true;
    }
    if (slot === 1 || slot === 2) {
      if (slot === 2) rt.game.actionWFlag = true;
      if (slot === 1) {
        const base = rt.packedOffsets[248] ?? 0;
        rt.game.tByte = rt.packedBytes[base + rt.game.mission] ?? rt.game.tByte;
      }
      rt.saveGameplayToStore(slot);
      return true;
    }
    return false;
  } catch {
    // f.e(int) catches the broad Exception boundary and returns false.
    return false;
  }
}
