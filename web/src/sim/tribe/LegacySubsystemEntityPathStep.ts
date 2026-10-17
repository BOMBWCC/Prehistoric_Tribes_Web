import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import {
  checkLegacyCellCompatibility,
  type LegacyCellCompatibilityCheckInput,
} from "../world/LegacyCellCompatibilityCheck";
import { UNIT_DIRECTION, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";

/**
 * Direct translation of `private boolean c()` (constant pool #356),
 * bytecode/b-javap.txt offsets 0..820 (line 10494). Its only caller is
 * `u()` (`LegacySubsystemEntityUpdateTail.ts`) at that method's offset 105.
 *
 * **RETRACTED (2026-09-10)** -- this file previously modeled everything past
 * offset 180 as unreachable, on the finding that class `b`'s `a:[[[B`(#70)
 * "has ZERO putfield #70 sites anywhere in class b ... It is therefore
 * permanently null". The grep was right and the conclusion was wrong, for
 * the same reason this project has now hit five times: class `b` does not
 * allocate its own arrays. `f.g()` does, through its `a:Lb;` handle --
 * bytecode/f-javap.txt offsets 429..442, `multianewarray [[[B 2,101,80;
 * putfield #133 // Field b.a:[[[B` (f's own pool index, which is why a
 * b-side grep for #70 finds no writer). It is `new byte[2][101][80]`, this
 * port's `LegacySubsystemArrays.a`, and `LegacySubsystemScore.ts` had
 * already re-confirmed it real in the 2026-09-07 sweep -- the same array
 * `#268`'s copy-out loop fills with the planned route:
 * `a[0][id][step]` / `a[1][id][step]` are waypoint x / y.
 *
 * So offsets 180..818 -- the occupancy check, the friendly-unit
 * displacement call, and the step-cursor advance -- are live code, and this
 * is the method that actually walks a unit along its path. `a(byte):V`
 * (#285), dismissed with it as "itself dead code", is live too (ported
 * 2026-09-14 as `LegacySubsystemEntityDisplace.ts`, wired as `onDisplace`).
 *
 * Field identities, each checked by constant-pool index:
 *  - `a:[B`(#61) -- `dense`. `v:I`(#225) -- the entity id, threaded as `id`.
 *  - `a:[[[B`(#70) -- `LegacySubsystemArrays.a`, the route table above.
 *  - `b:[[B`(#129) -- `gridC`, row-major (`gridC[y][x]`).
 *  - `b:[B`(#130) / `a:[S`(#66) -- `packedBytes` / `packedOffsets`.
 *  - `u:I`(#222) -- the team index (`game.bTeam`).
 *  - `b:Z`(#137) -- `scalars.bField137`, a boolean; NOT `b:[B`#130,
 *    `b:[[B`#129 or `b:I`#135. Read only here; written by `final void e()`,
 *    `k()` and `r()`, none of them ported, so it is false in practice today.
 *  - `y:B`(#232) -- `scalars.bField232`, already modeled. NOT `y:I`(#233).
 *  - `C:I`(#10) / `D:I`(#12) -- `scalars.bField10` / `.bField12`.
 *  - `E:I`(#14) -- `scalars.bField14`, the displacement counter `u()` resets
 *    before calling this method.
 *  - `a:(III)B`(#272) -- `checkLegacyCellCompatibility`, called for real.
 *  - `a:(B)V`(#285) -- its ONLY call site in the class is offset 594 here.
 *    `onDisplace`, wired to `stepLegacySubsystemEntityDisplace`.
 *  - `N:()V`(#250) -- `onN` (LegacySubsystemN.ts, already wired upstream).
 *  - `p:()V`(#408) -- `onP`, the same `p()` `b()`'s own tail calls.
 *
 * Control flow:
 *
 *   if (e[202+v] != 0 || e[303+v] != 0 || e[1313+v] == -1) return false;  // 0..46
 *   try {                                                    // table: [49,156] -> 159
 *     step = e[707+v];
 *     e[606+v] = pb[ po[4] + (a[0][v][step] - e[0+v] + 1) * 3
 *                          + (a[1][v][step] - e[101+v] + 1) ];    // 49..155
 *   } catch (Exception) { N(); e[808+v] = 0; return true; }        // 159..179
 *
 *   if (gridC[a[1][v][step]][a[0][v][step]] != 0                   // 180..238
 *       && a(a[0][v][step], a[1][v][step], 0) != 0) {              // 242..297 (#272)
 *     if (!b && y > 1) {                                           // 300..312
 *       if (e[2828+v] == 0 || e[2828+v] == 3)                      // 315..347
 *         e[2828+v] = (byte)(e[2828+v] + 1);                       // 348..365
 *       if (e[6161+v] == 1) e[6161+v] = 0;                         // 366..396
 *     }
 *     p(); return true;                                            // 397..402
 *   }
 *
 *   occ = gridC[a[1][v][step]][a[0][v][step]];                     // 403..458
 *   if (occ > u*50 && occ <= (u+1)*50) a((byte) occ);              // 459..596 (#285)
 *   else e[4848+v] = 0;                                            // 600..613
 *
 *   if (E == 0) {                                                  // 614..618
 *     C = e[0+v]   + pb[ po[1] + 0 + e[606+v] ];                   // 621..663
 *     D = e[101+v] + pb[ po[1] + 8 + e[606+v] ];                   // 664..708
 *     if (gridC[D][C] != 0) e[4545+v] = (byte) -gridC[D][C];       // 709..754
 *     gridC[D][C] = -128;                                          // 755..770
 *   }
 *   if ((e[2929+v] & 255) <= 7 && E < 2)                           // 771..800
 *     e[707+v] = (byte)(e[707+v] + 1);                             // 801..818
 *   return false;                                                  // 819..820
 *
 * Note the asymmetry the bytecode really has: the "cell is occupied and not
 * compatible" branch at 300..402 runs `p()` and returns `true` (which makes
 * `u()` return immediately, skipping `D()`), while the ordinary path falls
 * through to 819 and returns `false`. The `!b && y > 1` test guards only the
 * type-bump and the order-clear, NOT the `p()` call.
 */
export type LegacySubsystemEntityPathStepInput = {
  readonly state: Int8Array;
  readonly id: number;
  /** b.u:I (#222) -- the team index. */
  readonly team: number;
  /** b.a:[[[B (#70) -- LegacySubsystemArrays.a, `new byte[2][101][80]`. */
  readonly route: readonly Int8Array[][];
  /** b.b:[[B (#129) -- gridC, row-major. Written at offsets 755..770. */
  readonly gridC: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** Forwarded to #272 alongside the fields above. */
  readonly saveOffsets: Int16Array;
  readonly visibilityBits: readonly (readonly Int32Array[])[];
  /** f.c:S / f.d:S, the play area -- used only by the off-map guard below. */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** f.a(int,int) fog class (2 = unexplored) -- used only by the child guard below. */
  readonly fogClass: (x: number, y: number) => number;
  readonly scalars: Pick<LegacySubsystemArrays, "bField10" | "bField12" | "bField14" | "bField137" | "bField232">;
  /** private void N() (#250). */
  readonly onN: () => void;
  /** private void p() (#408) -- the same p() b()'s tail calls. */
  readonly onP?: () => void;
  /** private void a(byte) (#285) -- LegacySubsystemEntityDisplace.ts; swaps with a friendly occupant. */
  readonly onDisplace?: (occupant: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/**
 * Reads inside the [49,156] try range. The JVM throws
 * ArrayIndexOutOfBounds/NullPointer here and this method's OWN handler
 * catches it (offset 159), so the throw has to be real rather than JS's
 * silent `undefined` -- the catch path is a different, observable outcome
 * (`N()`, `e[808+v] = 0`, `return true`).
 */
function routeAt(route: readonly Int8Array[][], axis: number, id: number, step: number): number {
  const row = route[axis]?.[id];
  if (!row || step < 0 || step >= row.length) {
    throw new RangeError(`LegacySubsystemEntityPathStep: a:[[[B][${axis}][${id}][${step}] is out of bounds`);
  }
  return row[step]!;
}

export function stepLegacySubsystemEntityPathStep(input: LegacySubsystemEntityPathStepInput): boolean {
  const { state, id, route, gridC, packedBytes, packedOffsets, scalars } = input;

  if ((state[UNIT_OFFSET_X + id] ?? 0) !== 0) return false;
  if ((state[UNIT_OFFSET_Y + id] ?? 0) !== 0) return false;
  if ((state[UNIT_TIMER + id] ?? 0) === -1) return false;

  // NOT IN THE BYTECODE -- a deliberate deviation (user decision 2026-10-06).
  // c() never compares the step cursor 707 with the route length 808: past
  // the end it reads stale waypoints, t4[...] yields a garbage heading and
  // the unit steps into whatever cell that is -- it walked villagers off the
  // map and onto an enemy's cell, which then made H() teleport the enemy to
  // (0,0) and stalled the tutorial (docs/unknowns.md 2026-10-06). A finished
  // route is handled like the offset-159 catch instead: N(), 808 = 0.
  if ((state[707 + id] ?? 0) >= (state[808 + id] ?? 0)) {
    input.onN();
    state[808 + id] = 0;
    return true;
  }

  try {
    const step = state[707 + id] ?? 0;
    const dx = routeAt(route, 0, id, step) - (state[id] ?? 0) + 1;
    const dy = routeAt(route, 1, id, step) - (state[UNIT_Y + id] ?? 0) + 1;
    state[UNIT_DIRECTION + id] = packedBytes[(packedOffsets[4] ?? 0) + dx * 3 + dy] ?? 0;
  } catch {
    // Offsets 159..179.
    input.onN();
    state[808 + id] = 0;
    return true;
  }

  // NOT IN THE BYTECODE -- a deliberate deviation (user decisions 2026-09-15
  // and 2026-10-06). A unit whose step cursor ran past its route reads stale
  // or zero waypoints, gets a garbage heading and can walk off the 40x32 map:
  // a crawling child did, and with a store built CALL TO ARMS sent the odd
  // villager east to x 80..106 (docs/unknowns.md 2026-10-06; root cause not
  // pinned). Players never lose villagers in the original, so no unit steps
  // outside the play area, and our own child (type 17) also not into unexplored
  // fog (class 2); it re-picks a target the way c()'s own catch does (N(), 808 = 0).
  {
    const heading = state[UNIT_DIRECTION + id] ?? 0;
    const nx = (state[id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + heading] ?? 0);
    const ny = (state[UNIT_Y + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + heading] ?? 0);
    const offMap = nx < 0 || ny < 0 || nx >= input.mapWidth || ny >= input.mapHeight;
    // The fog is the player's, so the child rule covers team 0 only. CORRECTED
    // 2026-10-13 (oracle run 13, play10 frame 32841): it stopped a newborn of
    // the man-eating tribe, which the original lets walk on.
    if (offMap || (input.team === 0 && (state[UNIT_TYPE + id] ?? 0) === 17 && input.fogClass(nx, ny) === 2)) {
      input.onN();
      state[808 + id] = 0;
      return true;
    }
  }

  // Past offset 156 there is no local handler: a throw here propagates
  // through u() (which has no exception table of its own) up to
  // `final void e()`'s blanket [0,832] catch, aborting the rest of that
  // team's entity loop for the tick -- reproduced by NOT catching here.
  const step = state[707 + id] ?? 0;
  const wx = route[0]![id]![step]!;
  const wy = route[1]![id]![step]!;

  const compatInput: LegacyCellCompatibilityCheckInput = {
    state,
    id,
    team: input.team,
    gridC,
    packedBytes,
    packedOffsets,
    saveOffsets: input.saveOffsets,
    visibilityBits: input.visibilityBits,
  };

  // 180..297: the waypoint cell is occupied AND #272 says this entity may
  // not enter it.
  if (gridC[wy]![wx] !== 0 && checkLegacyCellCompatibility(compatInput, wx, wy, 0)) {
    if (!scalars.bField137 && scalars.bField232 > 1) {
      const type = state[UNIT_TYPE + id] ?? 0;
      if (type === 0 || type === 3) state[UNIT_TYPE + id] = toByte(type + 1);
      if ((state[UNIT_ORDER + id] ?? 0) === 1) state[UNIT_ORDER + id] = 0;
    }
    input.onP?.();
    return true;
  }

  // 403..613: a friendly occupant (an id in this team's own 50-slot range)
  // gets displaced; anything else clears e[4848+v] instead.
  const occupant = gridC[wy]![wx]!;
  if (occupant > input.team * 50 && occupant <= (input.team + 1) * 50) {
    input.onDisplace?.(toByte(occupant));
  } else {
    state[4848 + id] = 0;
  }

  // 614..770: claim the cell this entity is stepping INTO.
  if (scalars.bField14 === 0) {
    const direction = state[UNIT_DIRECTION + id] ?? 0;
    scalars.bField10 = (state[id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + direction] ?? 0);
    scalars.bField12 = (state[UNIT_Y + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + direction] ?? 0);
    const previous = gridC[scalars.bField12]![scalars.bField10]!;
    if (previous !== 0) state[UNIT_NEXT_WORKER + id] = toByte(-previous);
    gridC[scalars.bField12]![scalars.bField10] = -128;
  }

  // 771..818.
  if (((state[UNIT_MODE + id] ?? 0) & 255) <= 7 && scalars.bField14 < 2) {
    state[707 + id] = toByte((state[707 + id] ?? 0) + 1);
  }
  return false;
}
