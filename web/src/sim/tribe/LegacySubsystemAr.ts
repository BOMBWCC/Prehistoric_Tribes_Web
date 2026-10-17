import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_WORK } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Exact `private void ar()` (bytecode/b-javap.txt offsets 0..538),
 * `aq()`'s conditional first call (`if (aShort[u][11]>0 && Q<1)
 * this.ar();`) -- team 1's "scout for a deployable slot, recruit a unit
 * there" trigger. Hard-coded for team 1 throughout (no `u:I` reference
 * anywhere in this method's own bytecode).
 *
 * Throttle: proceeds when `(game.missionFrame&31)===0` OR
 * `game.missionFrame % (packedBytes[packedOffsets[241]+f.q]*10) === 0` (either
 * periodic condition is enough).
 *
 * Main loop: scans `aS` from `packedBytes[packedOffsets[247]+f.q]&255` up
 * to (exclusive) `packedBytes[packedOffsets[247]+f.q+1]&255`. Each row
 * looks up a candidate id via the occupancy grid's negative-id convention
 * (`aT = -gridC[ packedBytes[packedOffsets[246]+aS] ][ packedBytes[
 * packedOffsets[245]+aS] ]`, reinforcing this project's `b:[[B]`(#129)
 * `=gridC` hypothesis).
 *
 *  - `aT` outside `[31,60]` (team 1's 30-slot building range): if
 *    `aT===0` (empty cell) and the `(game.missionFrame&31)===0` sub-schedule and no
 *    candidate is queued yet (`P:B===-1`), records `aS` itself as the
 *    candidate row.
 *  - `aT` inside `[31,60]`: only considered when its building kind
 *    matches `packedBytes[packedOffsets[243]+aS]`, it's active
 *    (`dense[8505+aT]>0`) and not busy (`dense[8627+aT]===0`). On the
 *    `(game.missionFrame&31)===0` schedule, requires `dense[8505+aT] >=
 *    dense[8566+aT]/4` then calls `game.b(aT,false)`; otherwise requires
 *    `dense[9115+aT] < packedBytes[packedOffsets[244]+aS]` then calls
 *    `game.b(aT,true)` -- `f.b(int,boolean):V`, confirmed real, not yet
 *    derived.
 *
 * After the scan, if a candidate row was ever recorded (`P:B!==-1`),
 * calls the already-ported `placeLegacyEntity` directly: `(team=1, type=
 * packedBytes[packedOffsets[138]+416+packedBytes[packedOffsets[243]+
 * (P&255)]], x=packedBytes[packedOffsets[245]+(P&255)], y=packedBytes[
 * packedOffsets[246]+(P&255)], flags=3, specialPlacement=true,
 * existingId=-1)`. `P:B` is reset to `-1` only if that call succeeds
 * (returns a positive id).
 */
export type LegacySubsystemArInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  /** b.P:B (#43) -- the queued candidate row, or -1. Caller owns persisting this across calls. */
  readonly pByte: number;
  readonly sceneQ: number;
  readonly simulationCounter: number;
};

export type LegacySubsystemArResult = {
  /** The (possibly-unchanged) value to persist back into b.P:B. */
  readonly pByte: number;
};

export type LegacySubsystemArCallbacks = {
  /** f.b(int,boolean):V -- confirmed real, not yet derived. */
  readonly onBuildingAction?: (buildingId: number, flag: boolean) => void;
  /** b.v:I write at offset 432 -- f.a(BIIIIZI) stores it as a team-1 site's 9237. */
  readonly onV: (value: number) => void;
  /** placeLegacyEntity, already ported. */
  readonly onPlaceEntity?: (
    team: number,
    type: number,
    x: number,
    y: number,
    flags: number,
    specialPlacement: boolean,
    existingId: number,
  ) => number;
};

export function stepLegacySubsystemAr(
  input: LegacySubsystemArInput,
  callbacks: LegacySubsystemArCallbacks,
): LegacySubsystemArResult {
  const { state, packedBytes, packedOffsets, gridC, sceneQ: q, simulationCounter: c } = input;
  let pByte = input.pByte;

  const periodicA = (c & 31) === 0;
  const period = (packedBytes[(packedOffsets[241] ?? 0) + q] ?? 0) * 10;
  const periodicB = period !== 0 && c % period === 0;
  if (!(periodicA || periodicB)) return { pByte };

  let aS = (packedBytes[(packedOffsets[247] ?? 0) + q] ?? 0) & 255;
  const upperBound = (packedBytes[(packedOffsets[247] ?? 0) + q + 1] ?? 0) & 255;

  while (aS < upperBound) {
    const row = packedBytes[(packedOffsets[246] ?? 0) + aS] ?? 0;
    const col = packedBytes[(packedOffsets[245] ?? 0) + aS] ?? 0;
    const aT = -(gridC[row]?.[col] ?? 0);

    if (aT < 31 || aT > 60) {
      // Offsets 351..385: `ifeq 388` skips when (c & 31) == 0. CORRECTED
      // 2026-10-13 (oracle run 13, play10 frame 30028): the port had it inverted.
      if (aT === 0 && !periodicA && pByte === -1) pByte = toJavaByte(aS);
      aS += 1;
      continue;
    }

    if ((state[BLD_KIND + aT] ?? 0) !== (packedBytes[(packedOffsets[243] ?? 0) + aS] ?? 0)) {
      aS += 1;
      continue;
    }
    if ((state[BLD_HP + aT] ?? 0) <= 0) {
      aS += 1;
      continue;
    }
    if ((state[BLD_WORK + aT] ?? 0) !== 0) {
      aS += 1;
      continue;
    }

    if (periodicA) {
      // Offsets 256..296: only a building below a quarter of its hit points
      // is sent for repair (`if_icmpge 388` skips the rest). CORRECTED
      // 2026-10-13 (oracle run 13, play10 frame 30028): inverted, so every
      // healthy team-1 building was put into repair on each 32nd frame.
      if ((state[BLD_HP + aT] ?? 0) >= Math.trunc((state[BLD_MAX_HP + aT] ?? 0) / 4)) {
        aS += 1;
        continue;
      }
      callbacks.onBuildingAction?.(aT, false);
    } else {
      if ((state[BLD_LEVEL + aT] ?? 0) >= (packedBytes[(packedOffsets[244] ?? 0) + aS] ?? 0)) {
        aS += 1;
        continue;
      }
      callbacks.onBuildingAction?.(aT, true);
    }
    aS += 1;
  }

  if (pByte === -1) return { pByte };

  const idx = pByte & 255;
  const inner = packedBytes[(packedOffsets[243] ?? 0) + idx] ?? 0;
  // Offset 432: v = t243[P]. FIXED 2026-10-13 (oracle run 15, play11 frame 49163): the write was
  // missing, so a rebuilt enemy site kept the loop's v (51) as its 9237 instead of its own kind.
  callbacks.onV(inner);
  const type = packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 416 + inner] ?? 0;
  const x = packedBytes[(packedOffsets[245] ?? 0) + idx] ?? 0;
  const y = packedBytes[(packedOffsets[246] ?? 0) + idx] ?? 0;
  const result = callbacks.onPlaceEntity?.(1, type, x, y, 3, true, -1) ?? -1;
  if (result > 0) pByte = -1;

  return { pByte };
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
