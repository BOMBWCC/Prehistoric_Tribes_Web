import type { Graphics } from "../platform/Graphics";
import { BLD_HP, BLD_KIND, BLD_MAX_HP, BLD_OWNER, BLD_WORK, BLD_X, BLD_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/**
 * Raw port of f.u()'s negative-entity-id branch, bytecode/f-javap.txt
 * offsets 525..1581 (part of the larger 225..1791 body -- see
 * reverse-engineering/gameplay-paint-cluster.md). Entered when
 * `gridCValue` (the entity id) is in `[-60,-1]`; NOT reachable from the
 * positive-id branch (`LegacyGameplayPositiveEntityBranch.ts`), which
 * always exits to the epilogue before this code could run.
 *
 * Four sequential sections, each gated separately. Every early exit funnels
 * to the shared "goto 1791" epilogue -- EXCEPT the very first gate (offset
 * 555, `occupancyClass>=2 && e[9176-id]<=0`), confirmed by tracing every
 * branch target in this byte range: it jumps to offset **1584**, the start
 * of `LegacyGameplayNegativeEntityBranchTail.ts`, meaning the tail branch's
 * logic must still run (with the same `id`/`occupancyClass`) rather than
 * being skipped. Modeled here as the `fallThroughToTail` return flag; every
 * other exit point (including falling off the end normally) reports `false`.
 *  1. offsets 525..683: a table-driven `e[9176-id]` update (uses the
 *     *original* occupancy class value, computed by the caller before
 *     dispatching to this branch) -- has a real side effect but its own
 *     local-variable bookkeeping (reusing the JVM slot also used for
 *     occupancy class elsewhere) is never read again in this method, so it
 *     is not modeled as a return value.
 *  2. offsets 700..861: footprint marking via the already-ported
 *     `b.a(IIII)`/`b.d(III)` (`LegacyEntityFootprintMark.ts`), gated on a
 *     per-frame "already marked" bit.
 *  3. offsets 862..1140: gates leading to a packed-sprite record-40 draw
 *     (via the already-ported private `b(III)` / `LegacyPackedSpriteRenderer`).
 *  4. offsets 1023..1581: health/status-bar rendering (a packed-sprite
 *     frame plus a proportional colored fill) and, only for the entity
 *     under the camera-center cell, a selection-indicator "pip" row whose
 *     colors and counts come from `b.a(int):byte`'s two 4-bit nibbles.
 */

export type LegacyNegativeEntityBranchState = {
  /** f.e:[B] (#286), the existing dense-state array. */
  readonly dense: Int8Array;
  /** f.e:[I] (#279) -- health-bar color palette, indexed 0..2. */
  readonly colorTable: Int32Array;
  /** f.c:[[B] -- gridC, the same map grid tracked elsewhere. */
  readonly gridC: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.s:Z (#365). */
  readonly sFlag: boolean;
  /** f.A:B (#34) -- added to originRow (K) to get the camera-center row, per bytecode `K+A`. */
  readonly scrollA: number;
  /** f.y:B (#387) -- added to originColumn (I) to get the camera-center column, per bytecode `I+y`. */
  readonly scrollY: number;
  /**
   * f.e:I (#284), NOT f:I (#294) -- CORRECTION 2026-08-18: this file's own
   * claim of f:I was wrong, caught while independently re-verifying every
   * "phase" field binding in LegacyRuntimeState.ts. Direct bytecode read
   * of this branch's own sprite-draw call (offset 862..1020, record 40,
   * confirmed by matching the exact coordinate formulas below against the
   * raw bytecode) shows `getfield #284`, matching `game.animStep`
   * -- the wiring at that call site was already correct despite this
   * comment's error.
   */
  readonly phase: number;
  /** bytecode local2, confirmed `ai * 16` (see LegacyGameplayCellLoop.ts's header correction). */
  readonly rowPixelBase: number;
};

export type LegacyNegativeEntityBranchCallbacks = {
  /** private void a(int,byte) with arg2=1. */
  readonly onMapMarkerArg1?: (value: number) => void;
  /** b.a(int,int,int,int) via LegacyEntityFootprintMark, plus the b.S layer write around it. */
  readonly onFootprintMark?: (layer: number, x: number, y: number, width: number, height: number) => void;
  /** a(int,int,int) (#439), the composite draw (offset 1234; the tail's 1788 too). */
  readonly onPackedPrimitive?: (type: number, x: number, y: number) => void;
  /** private void d(int,int,int,int) / LegacyZSubrecordDraw. */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
  /**
   * b.a(int):byte -- fully ported as `legacyEntitySelectionNibble`
   * (LegacyEntitySelectionNibble.ts); kept as a callback here (not
   * imported) to keep this file's own standalone-vm-transpile test
   * working. LegacyGameplayCellBodyDispatch.ts supplies the real
   * implementation by default when this callback is omitted.
   */
  readonly nibbleSource?: (negatedId: number) => number;
};

export type LegacyNegativeEntityBranchResult = {
  /**
   * True only when bytecode offset 555's gate fired (`occupancyClass>=2 &&
   * e[9176-id]<=0`) -- the caller must then invoke
   * `stepLegacyNegativeEntityBranchTail(id, occupancyClass, ...)` with the
   * same arguments, since that's the actual jump target (offset 1584), not
   * the epilogue. False for every other exit.
   */
  readonly fallThroughToTail: boolean;
  /** f.u()'s local3 after offsets 634..682, for the epilogue; absent when the tail runs. */
  readonly occupancyClass?: number;
};

/**
 * `occupancyClass` is the value the caller already computed for this cell
 * (before deciding to dispatch here).
 */
export function stepLegacyNegativeEntityBranch(
  id: number,
  occupancyClass: number,
  state: LegacyNegativeEntityBranchState,
  graphics: Graphics | undefined,
  callbacks: LegacyNegativeEntityBranchCallbacks = {},
): LegacyNegativeEntityBranchResult {
  // Section 1, offsets 538..682.
  if (occupancyClass >= 2 && (state.dense[9176 - id] ?? 0) <= 0) {
    return { fallThroughToTail: true };
  }
  if (((state.dense[9176 - id] ?? 0) & 4) !== 0) {
    if (occupancyClass === 0) state.dense[9176 - id] = 6;
    else if (occupancyClass === 1) state.dense[9176 - id] = 5;
  }
  // Offsets 634..682: local3 is re-derived from the record's own visibility (1 -> 1, 2 -> 0), and
  // the epilogue's fog draw and z:B use it. FIXED 2026-10-13 (oracle run 15, play11 frame 52120).
  let local3 = occupancyClass;
  const seen = (state.dense[9176 - id] ?? 0) & 3;
  if (seen === 1) local3 = 1;
  else if (seen === 2) local3 = 0;

  // Section 2, offsets 683..861.
  if (((state.dense[8871 - id] ?? 0) & 1) !== 0) return { fallThroughToTail: false, occupancyClass: local3 };
  callbacks.onMapMarkerArg1?.(id);
  state.dense[8871 - id] = ((state.dense[8871 - id] ?? 0) | 1) & 0xff;
  const local9 = state.dense[BLD_KIND - id] ?? 0;
  const local10 = state.packedBytes[state.packedOffsets[T_BUILDING] + 104 + local9] ?? 0;
  const local11 = state.packedBytes[state.packedOffsets[T_BUILDING] + 130 + local9] ?? 0;
  // Offsets 782..861: only a record not yet marked (9176 & 4 == 0) gets b.S = 0, b.a(x, y, w, h)
  // on layer 0, b.S = 1 and 9176 = 4. FIXED 2026-10-13 (oracle run 15): a marked record was marked
  // again on layer 1 (lighting up an enemy site the player only remembers), and 9176 was OR-ed.
  if (((state.dense[9176 - id] ?? 0) & 4) === 0) {
    callbacks.onFootprintMark?.(0, state.dense[BLD_X - id] ?? 0, state.dense[BLD_Y - id] ?? 0, local10, local11);
    state.dense[9176 - id] = 4;
  }

  // Section 3, offsets 862..1020.
  if (state.sFlag) return { fallThroughToTail: false, occupancyClass: local3 };
  if (local9 >= 22) return { fallThroughToTail: false, occupancyClass: local3 };
  const tableVal = state.packedBytes[state.packedOffsets[T_BUILDING] + 156 + local9] ?? 0;
  const b8627 = state.dense[BLD_WORK - id] ?? 0;
  // The original bytecode classifies `id` itself (not a coordinate) via the
  // static #531 classifier already ported as `classifyLegacyCameraCell` in
  // LegacyCameraFrame.ts; duplicated locally (`classifyLegacyCameraCellLocal`
  // below) to keep this module import-free like the rest of this codebase.
  // Offsets 895..929: `if_icmpne 932` jumps straight to the owner test when
  // t156 != -1; only a -1 type (camp, hut, store...) also needs stage 1/2,
  // i.e. a site under construction. Was `=== -1` until 2026-10-01, which
  // put the "!" on the finished camp.
  if (
    (tableVal !== -1 || b8627 === 1 || b8627 === 2) &&
    (state.dense[BLD_OWNER - id] ?? 0) === 0 &&
    classifyLegacyCameraCellLocal(id) === 0
  ) {
    callbacks.onSpriteDraw?.(
      40,
      ((state.dense[BLD_X - id] ?? 0) - state.originColumn) * 22 + local10 * 11 - 11,
      ((state.dense[BLD_Y - id] ?? 0) - state.originRow) * 16 + local11 * 8 - 8,
      state.phase,
    );
  }

  // Section 4, offsets 1023..1581.
  const currentValue = state.dense[BLD_HP - id] ?? 0;
  let reachesHealthBar: boolean;
  const cameraRow = state.originRow + state.scrollA;
  const cameraColumn = state.originColumn + state.scrollY;
  const isSelectedCell = (state.gridC[cameraRow]?.[cameraColumn] ?? 0) === id;
  if (currentValue > 0 && (isSelectedCell || Math.trunc((state.dense[BLD_MAX_HP - id] ?? 0) / 2) > currentValue)) {
    reachesHealthBar = true;
  } else if (b8627 === 1 || b8627 === 2) {
    reachesHealthBar = true;
  } else if (local9 < 12) {
    reachesHealthBar = false;
  } else {
    reachesHealthBar = true;
  }
  if (reachesHealthBar && classifyLegacyCameraCellLocal(id) !== 0) reachesHealthBar = false;
  if (!reachesHealthBar) return { fallThroughToTail: false, occupancyClass: local3 };

  const local12 = Math.trunc((state.dense[BLD_MAX_HP - id] ?? 0) / 80) + 6;
  let local13 = ((state.dense[BLD_X - id] ?? 0) - state.originColumn) * 22 + local10 * 11 - 11;
  const local14Base = state.rowPixelBase - (state.packedBytes[state.packedOffsets[T_BUILDING] + 520 + local9] ?? 0) * 8 - 5;

  callbacks.onPackedPrimitive?.(607 + local12, local13, local14Base);

  // Offsets 1237..1341: the bar fill and (1448..1568) the selection pips all
  // go through helper #437, which adds 11/8 to x/y. CORRECTED 2026-10-01:
  // the fill width reads a[a_s[128] + local12] (it read a_s[138] + 128, so
  // it was 0), the +11/+8 was missing, and the pip colours are 0xF6A800 /
  // 0x40331D.
  const fill = (x: number, y: number, width: number, height: number) => graphics?.fillRect(x + 11, y + 8, width, height);
  if (graphics) {
    // Java int division by zero throws; the bytecode doesn't special-case
    // maxValue===0 here, so a genuine maxValue-0 entity would raise an
    // exception in the original too. Guarded to 0 rather than propagating
    // JS's NaN/Infinity into a fillRect call.
    const maxValue = state.dense[BLD_MAX_HP - id] ?? 0;
    const colorIndex = maxValue !== 0 ? Math.trunc(((currentValue - 1) * 3) / maxValue) : 0;
    graphics.setColor(state.colorTable[colorIndex] ?? 0);
    fill(
      local13 + 1,
      local14Base + 1,
      maxValue !== 0 ? Math.trunc((state.packedBytes[state.packedOffsets[128] + local12] ?? 0) * currentValue / maxValue) : 0,
      2,
    );
  }

  // Selection-indicator, offsets 1344..1581: only for the camera-center entity.
  if (!isSelectedCell) return { fallThroughToTail: false, occupancyClass: local3 };
  const nibbleSource = callbacks.nibbleSource?.(-id) ?? 0;
  const highNibble = (nibbleSource >> 4) & 15;
  const lowNibble = nibbleSource & 15;
  const pipCount = highNibble + lowNibble;
  if (pipCount <= 0) return { fallThroughToTail: false, occupancyClass: local3 };

  local13 = local13 + 1 + Math.trunc((state.packedBytes[state.packedOffsets[128] + local12] ?? 0) / 2) - Math.trunc((4 * pipCount) / 2) + 1;
  const local14 = local14Base + 6;

  if (graphics) {
    graphics.setColor(0);
    fill(local13, local14 - 1, pipCount * 4 - 1, 4);
    fill(local13 - 1, local14, pipCount * 4 + 1, 2);
    for (let pip = 0; pip < pipCount; pip += 1) {
      graphics.setColor(pip < lowNibble ? 0xf6a800 : 0x40331d);
      fill(local13 + pip * 4, local14, 3, 2);
    }
  }
  return { fallThroughToTail: false, occupancyClass: local3 };
}

// Local duplicate of LegacyCameraFrame.ts's classifyLegacyCameraCell (#531)
// so this module stays import-free like the rest of this codebase's ports;
// see that file for the canonical, independently-tested version.
function classifyLegacyCameraCellLocal(value: number): number {
  if (value <= -1 && value >= -30) return 0;
  if (value <= -31 && value >= -60) return 1;
  return 2;
}
