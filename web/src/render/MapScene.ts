import type { Graphics } from "../platform/Graphics";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { T_BUILDING } from "../core/DataTables";
import { BLD_HP, BLD_KIND, BLD_MAX_HP, BLD_OWNER, BLD_WORK, BLD_X, BLD_Y, UNIT_DIRECTION, UNIT_FLAGS, UNIT_MELEE_SKILL, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_RANGED_SKILL, UNIT_SCOUT_SKILL, UNIT_SPEED, UNIT_TYPE } from "../core/DenseLayout";
import { stepLegacyEntityAction, type LegacyEntityActionState } from "./LegacyEntityAction";
import { stepLegacySpriteLayerLoop } from "./LegacySpriteLayerLoop";
import { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } from "./LegacySpriteLayerPredicates";
import { stepLegacyEntityOverlayDraw } from "./LegacyEntityOverlayDraw";
import { stepLegacyAnimatedSlotScan } from "./LegacyAnimatedSlotScan";
import { stepLegacyEffectSlotScan } from "./LegacyEffectSlotScan";
import { prepareLegacyMapMarkerDispatch } from "./LegacyMapMarkerDispatch";
import { stepLegacyMapMarkerDetail } from "./LegacyMapMarkerDetail";
import { stepLegacyC2 } from "./RenderRuntime";
import { legacyEntitySelectionNibble } from "../sim/units/LegacyEntitySelectionNibble";

/**
 * What the WebGL map (render/PixiMap.ts) shows of the people, their marks and the effects, read
 * from the game state (modernization step 3, the catalog; docs/modernization-plan.md §4.3, §6). Not
 * in the original: it drew them as it went (f.u(), f.m()); here the same rules -- the ported
 * methods themselves, which only read the game state -- hand back what to draw and where, as a list
 * of the original's drawing calls (`Op`), with nothing drawn and no game state written (their
 * scratch fields are local). PixiMap turns the lists into pictures (HD parts and frames through
 * HdArt), each distinct one made once.
 *
 * Coordinates are the original's drawing coordinates with the map's corner at 0: the packed
 * renderer adds its 11 / 8 margin, so tile (c, r) is at (c * 22, r * 16).
 */
export type Op =
  /** b(III): picture piece `index`, palette remap `an` (-1 none). */
  | { op: "sprite"; index: number; x: number; y: number; an: number }
  /** a(III): composite `index`. */
  | { op: "composite"; index: number; x: number; y: number }
  /** d(IIII): sub-record `index` (an effect) at `phase`. */
  | { op: "effect"; index: number; x: number; y: number; phase: number }
  /** fillRect in `color` (a health bar). */
  | { op: "rect"; color: number; x: number; y: number; width: number; height: number }
  /** A selection ellipse drawn in code (the original's pieces 1622..1627, 2026-10-29): its box. */
  | { op: "ellipse"; color: number; light: number; x: number; y: number; width: number; height: number }
  /** An HD UI picture (hd/ui/<name>.png) over the box: a skill icon in place of the original's. */
  | { op: "ui"; name: string; x: number; y: number; width: number; height: number }
  /** A floating number (c.a(int,int,int): "+n" / "-n"), in the web font, its top-left at (x, y). */
  | { op: "text"; text: string; x: number; y: number };

/** A person or animal: its body (relative to `at`), its marks (absolute), where it stands. */
export type Person = {
  key: string;
  /** Unit id (1..100) or animal slot. */
  id: number;
  /** 29 a person, 108 an animal (f.a(IIIIB)'s Y). */
  kind: number;
  at: { x: number; y: number };
  body: Op[];
  overlay: Op[];
  /** Shown at building record `building` by its detail pass (a worker at their post): drawn over it,
   *  as the original drew it right after the building (BUG-049). */
  building?: number;
};

/** A tile window (the view and a margin). */
export type Window = { column: number; row: number; columns: number; rows: number };

const within = (w: Window, x: number, y: number) => x >= w.column && x < w.column + w.columns && y >= w.row && y < w.row + w.rows;

/**
 * f.a(int,int,int,int,byte) for unit / animal `id` at (x, y), facing `direction`: p()'s layers
 * (its body) relative to (x, y) and q()'s marks (selection, health bar, thought, hearts, floating
 * numbers) in absolute coordinates. As UnitRuntime.stepEntityAction, but recording instead of
 * drawing and with every scratch field (f.an, f.ao, f.ap, f.aC ...) local.
 */
export function personOps(rt: LegacyRuntimeState, id: number, x: number, y: number, direction: number, kind: number, xFlag = false, touch = false): { body: Op[]; overlay: Op[] } {
  const body: Op[] = [];
  const overlay: Op[] = [];
  const data = rt.packedData;
  if (!data) return { body, overlay };
  const g = rt.game;
  // Touch play: the cursor is out of sight, so nothing follows it (BUG-068, user 2026-11-05): no one
  // is "under it" for the ring's colour, the health bar and the lit skill.
  const hover = touch ? 0 : g.hoverUnit;
  const state: LegacyEntityActionState = {
    aq: id, ar: x, as: y, at: direction, Y: kind, av: 0, au: 0, aw: 0, xFlag,
    dense: rt.denseState, bShort: rt.saveOffsets, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
    shortTables: data.shortTables, byteTables: data.byteTables, aQ: g.aQ, vByte: g.loopMode,
  };
  let ao = -1, ap = -1;
  stepLegacyEntityAction(state, {
    onP: () => {
      const loop = {
        aA: 0, aB: 0, ao: -1, ap: -1, ax: 0, ay: 0, az: 0, an: -1,
        aq: state.aq, ar: state.ar, as: state.as, au: state.au, Y: state.Y,
        dense: rt.denseState, byteTables: data.byteTables, shortTables: data.shortTables,
      };
      stepLegacySpriteLayerLoop(loop, {
        onA: () => {
          const a = {
            ay: loop.ay, sFlag: g.cameraSFlag, vByte: g.loopMode, at: state.at, dense: rt.denseState, aq: state.aq,
            FByte: g.selectionGroup, kByte: g.kByte, ar: state.ar, as: state.as, byteTables: data.byteTables, az: loop.az,
            cWByte: hover, ax: loop.ax, cACInt: 0, CCounter: g.CCounter, ECounter: g.ECounter,
            BCounter: g.BCounter, DCounter: g.DCounter, gridC: rt.gridC,
          };
          const result = stepLegacySpriteLayerPredicateA(a, { onComposite: (index, cx, cy) => body.push(index === 599 ? { op: "ellipse", ...RINGS[1622]!, x: cx - x + 3, y: cy - y + 5 } : { op: "composite", index, x: cx - x, y: cy - y }) });
          loop.ax = a.ax;
          return result;
        },
        onB: () => {
          const b = {
            ay: loop.ay, az: loop.az, ap: loop.ap, ax: loop.ax, aq: state.aq, an: loop.an, ao: loop.ao, dense: rt.denseState,
            statScratch: rt.mainArrays.aShort, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
            aw: state.aw, at: state.at, av: state.av,
          };
          const result = stepLegacySpriteLayerPredicateB(b);
          loop.ax = b.ax; loop.ap = b.ap; loop.ao = b.ao; loop.an = b.an;
          return result;
        },
        onDrawSprite: (index, sx, sy) => body.push(RINGS[index] ? { op: "ellipse", ...RINGS[index], x: sx - x, y: sy - y } : { op: "sprite", index, x: sx - x, y: sy - y, an: loop.an }),
        onDrawComposite: (index, cx, cy) => body.push(index === 599 ? { op: "ellipse", ...RINGS[1622]!, x: cx - x + 3, y: cy - y + 5 } : { op: "composite", index, x: cx - x, y: cy - y }),
      });
      ao = loop.ao;
      ap = loop.ap;
    },
    onQ: () => {
      // The health bar's colour and rectangle: q() draws them on Graphics[N] itself.
      let color = 0;
      let frame = -1; // a health bar's frame (composite 607 + n) waiting for its bar
      const recorder = {
        setColor: (c: number) => { color = c; },
        fillRect: (rx: number, ry: number, width: number, height: number) => {
          if (frame >= 0) overlay.push(...barFrame(rt, frame, rx - 11, ry - 8));
          frame = -1;
          overlay.push({ op: "rect", color, x: rx - 11, y: ry - 8, width, height });
        },
      } as unknown as Graphics;
      const e = rt.denseState;
      const glyphs: { sx: number; x: number; y: number }[] = [];
      stepLegacyEntityOverlayDraw({
        sFlag: g.cameraSFlag, ao, ap, vByte: g.loopMode, Y: state.Y, aq: state.aq, ar: state.ar, as: state.as,
        at: state.at, frameLayoutAq: g.frameLayoutAq, kByte: g.kByte, cWByte: hover, FByte: g.selectionGroup,
        entityFocusFlag: g.entityFocusFlag, viewportOriginK: touch ? -1000 : g.cameraRow, scrollA: g.cursorRow,
        viewportOriginI: g.cameraColumn, scrollY: g.cursorColumn, XByte: touch ? 0 : g.unitInBuilding, zAfCursorVFlag: g.zAfCursorVFlag,
        frameLayoutL: g.selectedId, targetSlot: 0, c: g.missionFrame, timingCounterE: g.animStep, fCounter: g.animPhase,
        dense: rt.denseState, colorTable: g.healthBarColorTable, xSlotTable: g.xSlotTable, byteTables: data.byteTables,
        gridC: rt.gridC, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
      }, [recorder], {
        onCScanDraw: (unit, cx, cy) => {
          rt.drawCScan(unit, cx, cy, (sx, _sy, _width, _height, dx, dy) => glyphs.push({ sx, x: dx - 11, y: dy - 8 }));
          overlay.push(...floatingNumbers(rt, glyphs));
        },
        onSubrecordDraw: (index, ex, ey, phase) => overlay.push({ op: "effect", index, x: ex, y: ey, phase }),
        onDrawComposite: (index, cx, cy) => {
          // The lit skill of the job above a selected villager (577 + n; 577 resting): its HD icon.
          if (index >= 577 && index <= 593) overlay.push({ op: "ui", name: index === 577 ? "zzz" : `sk-${SKILL_ICONS[index - 17]}`, x: cx - 1, y: cy - 17, width: 11, height: 11 });
          // The badge of a skilled fighter or scout (602 + level - 5): that skill's HD icon.
          else if (index >= 602 && index <= 606) {
            const ranged = e[UNIT_RANGED_SKILL + id] ?? 0, melee = e[UNIT_MELEE_SKILL + id] ?? 0, scout = e[UNIT_SCOUT_SKILL + id] ?? 0;
            const name = ranged > melee && ranged > scout ? "spear" : melee < scout ? "eyes" : "spark";
            overlay.push({ op: "ui", name: `sk-${name}`, x: cx + 2, y: cy - 8, width: 8, height: 8 });
          } else if (index >= 607 && index <= 620) frame = index - 607;
          else overlay.push({ op: "composite", index, x: cx, y: cy });
        },
      });
    },
  });
  return { body, overlay };
}

/**
 * The body of unit `id` walking, `tiles` tiles into a walk along (dx, dy), for the screen's walks in
 * and out of buildings (BUG-069): what p() draws for a walker (type 69) with that step's frame. The
 * unit's fields are only borrowed for the drawing. Facing from the step table (row 1), the frame as
 * LegacySubsystemEntityAnimOffset counts it over a tile.
 */
export function walkingBody(rt: LegacyRuntimeState, id: number, dx: number, dy: number, tiles: number, touch: boolean): Op[] {
  const e = rt.denseState;
  const table = (row: number, index: number) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0;
  let direction = 0;
  let best = -Infinity;
  for (let d = 0; d < 8; d += 1) {
    const score = table(1, d) * dx / 22 + table(1, 8 + d) * dy / 16;
    if (score > best) { best = score; direction = d; }
  }
  const cycle = Math.max(1, table(15, (direction & 1) * 9 + (e[UNIT_SPEED + id] ?? 0)));
  const fields = [UNIT_TYPE + id, UNIT_DIRECTION + id, 1111 + id];
  const saved = fields.map((f) => e[f] ?? 0);
  e[UNIT_TYPE + id] = 69;
  e[UNIT_DIRECTION + id] = direction;
  e[1111 + id] = (saved[2]! & 240) + Math.floor((tiles % 1) * cycle);
  const { body } = personOps(rt, id, 0, 0, direction, 29, false, touch);
  fields.forEach((f, i) => { e[f] = saved[i]!; });
  return body;
}

/**
 * The people and animals on the map in `w` as f.u() draws them (LegacyGameplayCellBodyDispatch):
 * on tiles in sight only (a story too: the true fog, BUG-030); an enemy hidden by its flag 2 is not
 * drawn. (The ones it draws at a building -- a worker at the kitchen -- come from `markerDetails`.)
 */
function peopleIn(rt: LegacyRuntimeState, w: Window, touch: boolean): Person[] {
  const g = rt.game;
  const e = rt.denseState;
  const people: Person[] = [];
  for (let row = Math.max(0, w.row); row < Math.min(g.mapHeight, w.row + w.rows); row += 1) {
    for (let column = Math.max(0, w.column); column < Math.min(g.mapWidth, w.column + w.columns); column += 1) {
      const id = rt.gridC[row]?.[column] ?? 0;
      if (id < 1 || id > 122) continue;
      if (rt.occupancyClass(column, row) !== 0) continue;
      if (id <= 100) {
        if (id > 50 && ((e[UNIT_FLAGS + id] ?? 0) & 2) !== 0) continue;
        const at = { x: column * 22 + (e[UNIT_OFFSET_X + id] ?? 0), y: row * 16 + (e[UNIT_OFFSET_Y + id] ?? 0) };
        people.push({ key: `u${id}`, id, kind: 29, at, ...personOps(rt, id, at.x, at.y, e[UNIT_DIRECTION + id] ?? 0, 29, false, touch) });
      } else {
        const slot = id - 101; // an animal: 9403 / 9425 its offsets, 9491 its frame
        const at = { x: column * 22 + (e[9403 + slot] ?? 0), y: row * 16 + (e[9425 + slot] ?? 0) };
        people.push({ key: `a${slot}`, id: slot, kind: 108, at, ...personOps(rt, slot, at.x, at.y, e[9491 + slot] ?? 0, 108, false, touch) });
      }
    }
  }
  return people;
}

/**
 * The detail pass f.u() runs for each building and resource point in `w` (drawMapMarker with arg2
 * 1, its first tile in scan order): the frames on it (fire, smoke, the kitchen's pot ...) and the
 * people it shows (a worker at their post). Its composites are in the marker's HD picture.
 */
function markerDetails(rt: LegacyRuntimeState, w: Window, touch: boolean): { effects: Op[]; people: Person[]; swaying: number[] } {
  const effects: Op[] = [];
  const people: Person[] = [];
  const swaying: number[] = [];
  const data = rt.packedData;
  if (!data) return { effects, people, swaying };
  const g = rt.game;
  const seen = new Set<number>();
  for (let row = Math.max(0, w.row); row < Math.min(g.mapHeight, w.row + w.rows); row += 1) {
    for (let column = Math.max(0, w.column); column < Math.min(g.mapWidth, w.column + w.columns); column += 1) {
      const value = rt.gridC[row]?.[column] ?? 0;
      if (value >= 0 || value < -110 || seen.has(value)) continue;
      seen.add(value);
      // f.u(): an unexplored tile draws a building only once it has been seen (9176 & 3), and a
      // resource point only in sight or remembered.
      const occupancy = rt.occupancyClass(column, row);
      if (value >= -60 ? occupancy >= 2 && (rt.denseState[9176 - value] ?? 0) <= 0 : occupancy >= 2) continue;
      const r = prepareLegacyMapMarkerDispatch(value, 1, {
        ah: column, ai: row, originColumn: 0, originRow: 0, dense: rt.denseState, gridC: rt.gridC,
        packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, shortTables: data.shortTables, byteTables: data.byteTables, aQ: g.aQ,
      });
      const markerG = new Int8Array(8);
      for (const write of r.scratchGWrites) markerG[write.index] = write.value;
      let xFlag = false;
      let inBuilding = 0;
      let skipPiece = false;
      stepLegacyMapMarkerDetail(r.local3, r.local7, r.local4, r.local10, r.local11, r.arg2, {
        phase: g.animPhase, N: r.N, O: r.O, qByte: g.mission, vByte: g.loopMode, ai: row, originRow: 0,
        dense: rt.denseState, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
        shortTables: data.shortTables, byteTables: data.byteTables,
        entityMarkerG: markerG, entityMarkerH: new Int8Array(8), entityMarkerI: new Int8Array(8),
        // Its stock lights (the store, the kitchen) write one derived value: onto a copy.
        statScratch: [Int16Array.from(rt.mainArrays.aShort[0] ?? [])],
      }, {
        onX: (unit) => { inBuilding = unit; },
        onSpriteDraw: (index, x, y, phase) => {
          // A couple in a hut: the hearts (90), then a piece of the hut in two frames, which redrawn
          // over the whole picture only flashed (BUG-070, user 2026-11-05). No piece: PixiMap sways
          // the whole hut instead.
          if (skipPiece) { skipPiece = false; return; }
          if (index === 90 && value >= -60 && (rt.denseState[BLD_KIND - value] ?? 0) === 2) {
            skipPiece = true;
            if (!swaying.includes(-value)) swaying.push(-value);
          }
          effects.push({ op: "effect", index, x, y, phase });
        },
        onXFlag: () => { xFlag = true; },
        onEntityAction: (unit, x, y, direction) => {
          // q() reads X:B (the unit in the building) for its health bar (BUG-001).
          const saved = g.unitInBuilding;
          g.unitInBuilding = inBuilding;
          try {
            people.push({ key: `u${unit}`, id: unit, kind: 29, at: { x, y }, building: value >= -60 ? -value : undefined, ...personOps(rt, unit, x, y, direction, 29, xFlag, touch) });
          } finally {
            g.unitInBuilding = saved;
          }
          xFlag = false;
        },
      });
    }
  }
  return { effects, people, swaying };
}

/**
 * The effects over the map in `w`, in f.m()'s order: the corners of the building under the cursor
 * (w(), placed by the caller on the building's picture: BUG-026), then f.u()'s -- the buildings'
 * frames (fire, smoke ...), the "!" on a building that wants workers, our buildings' health bars,
 * r()'s slots (hits, flying
 * spears and stones), s()'s demolition dust -- and c(int,int)'s at the cursor (an order's arrows,
 * the hand and item while aiming), which also leaves its icon for touch play in `touchAction`.
 */
function effectsIn(rt: LegacyRuntimeState, w: Window, touchCursor: boolean, details: Op[]): Op[] {
  const data = rt.packedData;
  if (!data) return [];
  const g = rt.game;
  const e = rt.denseState;
  const effects: Op[] = [];
  if (!g.cameraSFlag) effects.push(...details);
  // f.u() negative branch, section 3: the "!" (sub-record 40) on our own building that takes
  // workers, or a camp / hut ... site still being built.
  if (!g.cameraSFlag) {
    for (let id = 1; id <= 30; id += 1) {
      const column = e[BLD_X + id] ?? 0;
      const row = e[BLD_Y + id] ?? 0;
      if (rt.gridC[row]?.[column] !== -id) continue; // not on the map
      const kind = e[BLD_KIND + id] ?? 0;
      const width = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 104 + kind] ?? 0;
      const height = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 130 + kind] ?? 0;
      if (column + width <= w.column || column >= w.column + w.columns || row + height <= w.row || row >= w.row + w.rows) continue;
      if (rt.occupancyClass(column, row) >= 2 && (e[9176 + id] ?? 0) <= 0) continue;
      if (kind >= 22) continue;
      const work = e[BLD_WORK + id] ?? 0;
      const type = rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 156 + kind] ?? 0;
      if ((type !== -1 || work === 1 || work === 2) && (e[BLD_OWNER + id] ?? 0) === 0) {
        effects.push({ op: "effect", index: 40, x: column * 22 + width * 11 - 11, y: row * 16 + height * 8 - 8, phase: g.animPhase });
      }
      buildingBar(rt, id, effects, touchCursor);
    }
  }
  const inView = (x: number, y: number) => within(w, x, y);
  stepLegacyAnimatedSlotScan({
    slotTable: rt.mainArrays.d, dense: e, shortTable2D: data.shortTables, shortTable1D: rt.saveOffsets,
    packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, byteRows: data.byteTables, originColumn: 0, originRow: 0,
  }, {
    isWithinViewport: inView,
    classifyOccupancy: (x, y) => rt.occupancyClass(x, y),
    onSpriteDraw: (index, x, y, phase) => effects.push({ op: "effect", index, x, y, phase }),
  });
  stepLegacyEffectSlotScan({
    originColumn: 0, originRow: 0, columns: g.mapWidth, rows: g.mapHeight,
    slotGrid: rt.mainArrays.e, dense: e, packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets,
  }, {
    isWithinViewport: inView,
    onSpriteDraw: (index, x, y, phase) => effects.push({ op: "effect", index, x, y, phase }),
  });
  // c(int,int): placing a building, or in touch play an order's spot, shows the HUD's ghost instead.
  const ghosted = g.barMode === 3 && ((g.cSInt > 3 && g.cSInt !== 100) || (g.cSInt === 100 && touchCursor));
  if (!ghosted) cursorOps(rt, touchCursor, effects);
  return effects;
}

/** The selection ellipses (pieces 1622..1627: ours green, under the cursor lighter, an enemy red),
 *  drawn in code: their colours (dark rim, light inside) and size. */
const RINGS: Record<number, { color: number; light: number; width: number; height: number }> = {
  1622: { color: 0x085100, light: 0x18ff00, width: 17, height: 10 },
  1623: { color: 0x0d2f1f, light: 0x1ac300, width: 17, height: 10 },
  1625: { color: 0x085100, light: 0x18ff00, width: 13, height: 6 },
  1626: { color: 0x085100, light: 0x18ff00, width: 13, height: 6 },
  1627: { color: 0x680000, light: 0xff0000, width: 13, height: 6 },
};

/** The skill pictures (hd/ui/sk-*.png) by the original's skill composite 561..576 (the villager
 *  panel's; docs/hd-art-handoff.md §8). */
export const SKILL_ICONS: Record<number, string> = {
  561: "basket", 562: "basket-wood", 563: "basket-meat", 564: "basket-ice", 565: "basket-stone", 566: "basket-mushroom",
  567: "basket-bone", 568: "hammer", 569: "chef", 570: "horseshoe", 571: "mask", 572: "hardhat", 573: "bush", 574: "spark",
  575: "spear", 576: "eyes",
};

/** A health bar's frame (composite 607 + n), drawn in code around its bar whose corner is (x, y):
 *  a black rim, dark inside, as long as the bar's full length (table 128). */
function barFrame(rt: LegacyRuntimeState, frame: number, x: number, y: number): Op[] {
  const length = rt.packedBytes[(rt.packedOffsets[128] ?? 0) + frame] ?? 0;
  return [
    { op: "rect", color: 0x000000, x: x - 1, y: y - 1, width: length + 2, height: 4 },
    { op: "rect", color: 0x19120e, x, y, width: length, height: 2 },
  ];
}

/** c.a(int,int,int)'s floating numbers, its glyphs (by their place in the font) read back as text:
 *  one text op per number ("+n" / "-n"); the glyphs it reported are used up. */
function floatingNumbers(rt: LegacyRuntimeState, glyphs: { sx: number; x: number; y: number }[]): Op[] {
  if (glyphs.length === 0) return [];
  if (!glyphChars) {
    glyphChars = new Map();
    const base = rt.packedOffsets[280] ?? 0, font = rt.packedOffsets[282] ?? 0;
    for (const char of "+-0123456789") {
      const raw = rt.packedBytes[base + char.charCodeAt(0)] ?? 0;
      glyphChars.set((rt.packedBytes[font + Math.trunc(raw / 30) * 21 + (raw % 30)] ?? 0) & 0xff, char);
    }
  }
  const ops: Op[] = [];
  let text: Extract<Op, { op: "text" }> | null = null;
  let next = -Infinity;
  for (const glyph of glyphs) {
    // A number's glyphs come left to right on one line; the next number starts a new line or over.
    if (!text || glyph.y !== text.y || glyph.x <= next) {
      text = { op: "text", text: "", x: glyph.x, y: glyph.y };
      ops.push(text);
    }
    text.text += glyphChars.get(glyph.sx) ?? "";
    next = glyph.x;
  }
  glyphs.length = 0;
  return ops.filter((op) => (op as { text: string }).text !== "");
}
let glyphChars: Map<number, string> | null = null;

/**
 * f.u() negative branch, section 4: our building's health bar -- when it is under the cursor, below
 * half its health, being built or upgraded (work 1 / 2), or a site -- the frame (composite 607 + n)
 * and the bar in its health colour; under the cursor also a pip per worker (lit: at work).
 */
/** The building picked out on the map: under the cursor; in touch play, whose panel is open (the
 *  cursor is out of sight, BUG-068). */
export function pickedBuilding(rt: LegacyRuntimeState, touch: boolean): number {
  const g = rt.game;
  if (touch) return (g.barMode === 2 || g.barMode === 4) && g.selectionFlags[2] ? g.qCounter : 0;
  const cell = rt.gridC[g.cameraRow + g.cursorRow]?.[g.cameraColumn + g.cursorColumn] ?? 0;
  return cell < 0 ? -cell : 0;
}

function buildingBar(rt: LegacyRuntimeState, id: number, ops: Op[], touch: boolean): void {
  const e = rt.denseState;
  const g = rt.game;
  const hp = e[BLD_HP + id] ?? 0;
  const maxHp = e[BLD_MAX_HP + id] ?? 0;
  const kind = e[BLD_KIND + id] ?? 0;
  const work = e[BLD_WORK + id] ?? 0;
  const table = rt.packedOffsets[T_BUILDING] ?? 0;
  const selected = pickedBuilding(rt, touch) === id;
  const shown = (hp > 0 && (selected || Math.trunc(maxHp / 2) > hp)) || work === 1 || work === 2 || kind >= 12;
  if (!shown) return;
  const width = rt.packedBytes[table + 104 + kind] ?? 0;
  const frame = Math.trunc(maxHp / 80) + 6;
  const length = rt.packedBytes[(rt.packedOffsets[128] ?? 0) + frame] ?? 0;
  let x = (e[BLD_X + id] ?? 0) * 22 + width * 11 - 11;
  const y = (e[BLD_Y + id] ?? 0) * 16 - (rt.packedBytes[table + 520 + kind] ?? 0) * 8 - 5;
  ops.push(...barFrame(rt, frame, x + 1, y + 1));
  const color = g.healthBarColorTable[maxHp !== 0 ? Math.trunc(((hp - 1) * 3) / maxHp) : 0] ?? 0;
  ops.push({ op: "rect", color, x: x + 1, y: y + 1, width: maxHp !== 0 ? Math.trunc((length * hp) / maxHp) : 0, height: 2 });
  if (!selected) return;
  const nibbles = legacyEntitySelectionNibble(id, e, rt.packedBytes, rt.packedOffsets);
  const lit = nibbles & 15;
  const pips = ((nibbles >> 4) & 15) + lit;
  if (pips <= 0) return;
  x = x + 1 + Math.trunc(length / 2) - Math.trunc((4 * pips) / 2) + 1;
  ops.push({ op: "rect", color: 0, x, y: y + 5, width: pips * 4 - 1, height: 4 });
  ops.push({ op: "rect", color: 0, x: x - 1, y: y + 6, width: pips * 4 + 1, height: 2 });
  for (let pip = 0; pip < pips; pip += 1) ops.push({ op: "rect", color: pip < lit ? 0xf6a800 : 0x40331d, x: x + pip * 4, y: y + 6, width: 3, height: 2 });
}

/** The people (with the ones shown at buildings) and the effects in `w`. */
export function sceneIn(rt: LegacyRuntimeState, w: Window, touchCursor: boolean): { people: Person[]; effects: Op[]; swaying: number[] } {
  const details = markerDetails(rt, w, touchCursor);
  return { people: [...peopleIn(rt, w, touchCursor), ...details.people], effects: effectsIn(rt, w, touchCursor, details.effects), swaying: details.swaying };
}

/** c(int,int) at the cursor, its sub-records recorded; the game fields it writes (the aimed unit,
 *  r:Z, the arrows' countdown ...) are put back: the game step and the HUD keep their own. */
function cursorOps(rt: LegacyRuntimeState, touchCursor: boolean, effects: Op[]): void {
  const g = rt.game;
  const saved = Object.getOwnPropertyDescriptors(g);
  const values: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(saved)) if ("value" in descriptor && typeof descriptor.value !== "object") values[key] = descriptor.value;
  // c(int,int) draws in the camera's coordinates; on the map that is the camera's corner.
  const ox = g.cameraColumn * 22;
  const oy = g.cameraRow * 16;
  try {
    stepLegacyC2(rt, g.cursorColumn * 22, g.cursorRow * 16, touchCursor, (op) => effects.push({ ...op, x: op.x + ox, y: op.y + oy }));
  } finally {
    Object.assign(g, values);
  }
}
