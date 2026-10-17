import { UNIT_AGE, UNIT_FLAGS, UNIT_GENDER, UNIT_HELD_ITEM, UNIT_HP, UNIT_MAX_HP, UNIT_MELEE_SKILL, UNIT_RANGED_SKILL, UNIT_SCOUT_SKILL } from "../../core/DenseLayout";
import { T_RALLY_X, T_RALLY_Y } from "../../core/DataTables";
/**
 * Exact `private void av()` (bytecode/b-javap.txt offsets 0..878),
 * `as()`'s tail call (`if (Q<0 && (f.q===3 || game.missionFrame===aQ)) this.av();`)
 * -- selects a batch of team-1 units fit to muster, heals them toward
 * `dense[6767+id]`, and marks them (`dense[7979+id]` bit6 set) for
 * `aw()` to march to the rally point.
 *
 * Gate: `if (f.q>=7 && game.missionFrame<A/7) return;`.
 *
 * Computes `x`/`y`/`z` staging scalars from packedBytes tables indexed by
 * `packedOffsets[N+f.bByte]+f.q` (CORRECTED formula pattern, matching
 * `at()`'s own correction -- `f.bByte` is part of the `packedOffsets`
 * index, not added to the looked-up value), jittered via a static clamp
 * helper (`static b(III)I`, exposed as `onClamp`) and a bounded-random
 * helper (`f.a(int,int):int`, exposed as `onRandomA`, the SAME shape as
 * `Z()`'s `randomRemainder` but with different masks -- `65535`/
 * `16777215` -- seen at each call site here).
 *
 * A SECOND, easy-to-miss early return: when `game.missionFrame<A` AND `f.q===0` AND
 * b's own `g:B` (#175, al()'s scene counter) `< 11`, the method returns
 * before ever touching the per-entity loop at all.
 *
 * Per-entity loop (`v` over the 50-slot team-1 roster): requires
 * `dense[1919+v]>0` ("HP", `dense[1414+v]>=12` ("level"), `j[local
 * index]>=M`, `dense[7979+v]` bit6 CLEAR (not already selected),
 * `dense[6565+v]!==9`, and NOT (`dense[1515+v]===1 && (R:B&128)!==0`).
 * Then a spatial exemption: skip unless at least one of
 * `dense[1717/1616/7575+v] >= y/2` is true; and when `z>=2`, additionally
 * skip if `dense[7575+v]>3`.
 *
 * Selected units: `dense[7979+v] |= 64` (mark), clamp
 * `dense[1717/1616+v]` into `[0,y]`, and -- only while `game.missionFrame<A` -- both
 * `dense[1919+v]` (HP) and `dense[6767+v]` are OVERWRITTEN with the SAME
 * computed value (`dense[6767+v]/2 + (dense[6767+v]*game.missionFrame/A)/2`) --
 * NOT a simple "regen toward a fixed max": the presumed max itself also
 * gets rewritten here, so this project's "maxHP" label for
 * `dense[6767+id]` needs re-checking once this method is wired for real.
 * Selection stops once `aU` (count selected) reaches `x`.
 *
 * Tail: clears `R:B` bit7, calls `final void a(int,int,int,byte,byte)`
 * (#307, exposed as `onRallyBroadcast`) with `(x-aU, packedBytes-derived
 * rally x/y, team, 0)`, recomputes `N:B` via `onRandomA`, resets `O:B=0`.
 * CORRECTED 2026-08-27: this is class b's OWN sibling method (confirmed
 * via bytecode -- the `invokevirtual` receiver is `this`, not `this.game`
 * -- the port is LegacyEntityBatchAllocate.ts, shared with f.T()), not
 * `f.a(...)` as this docblock previously said.
 */
export type LegacySubsystemAvInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly jobTable: Int8Array;
  readonly team: number;
  /** b.A:I (#7) -- set by aq()'s own prologue. */
  readonly aInt: number;
  /** b.M:B (#36). */
  readonly mByte: number;
  /** b.R:B (#48). */
  readonly rByte: number;
  /** b.N:B (#39) / b.O:B (#40): written only at the tail (offsets 870/875), so the early returns keep them. */
  readonly nByte: number;
  readonly oByte: number;
  /** b.g:B (#175) -- al()'s scripted-scene counter (subsystemArrays.bgByte). */
  readonly gByte: number;
  readonly sceneQ: number;
  readonly fBByte: number;
  readonly simulationCounter: number;
  /**
   * b.x:I (#230), b.y:I (#233), b.z:I (#234), b.aU:I (#96), b.v:I (#225):
   * real fields, written in bytecode order (x/y before the early returns).
   * The rally broadcast's b.a(IIIBB) reads y (the new unit's 1616/1717)
   * and aU. Added 2026-10-06: they were locals, so a tutorial raider got a
   * stale y as its skill, A() then raised its range 4949 to 53, and it
   * "attacked" a villager 17 cells away from the spawn point forever.
   */
  readonly fields: { x: number; y: number; z: number; aU: number; v: number };
};

export type LegacySubsystemAvResult = {
  readonly rByte: number;
  readonly nByte: number;
  readonly oByte: number;
};

export type LegacySubsystemAvCallbacks = {
  /** static b(int,int,int):int -- clamp(value, min, max), confirmed real, not yet derived. */
  readonly onClamp?: (value: number, min: number, max: number) => number;
  /** f.a(int,int):int -- bounded-random helper, same shape as Z()'s randomRemainder. */
  readonly onRandomA?: (mask: number, divisor: number) => number;
  /** final void a(int,int,int,byte,byte) (#307) -- class b's own sibling method, LegacyEntityBatchAllocate.ts. */
  readonly onRallyBroadcast?: (count: number, x: number, y: number, team: number, role: number) => void;
};

export function stepLegacySubsystemAv(
  input: LegacySubsystemAvInput,
  callbacks: LegacySubsystemAvCallbacks = {},
): LegacySubsystemAvResult {
  const { state, packedBytes, packedOffsets, jobTable, team: u, mByte: M, sceneQ: q, fBByte, simulationCounter: c } = input;
  let rByte = input.rByte;
  // BUG FIX (2026-10-09, oracle run 3 frame 4809): the early returns reported N = O = 0, and the
  // caller stored that -- O:B >= 0 then started aw()'s muster march in the tutorial.
  let nByte = input.nByte;
  let oByte = input.oByte;
  const clamp = (value: number, min: number, max: number) => callbacks.onClamp?.(value, min, max) ?? Math.max(min, Math.min(max, value));
  const randomA = (mask: number, divisor: number) => callbacks.onRandomA?.(mask, divisor) ?? 0;

  const fields = input.fields;
  fields.aU = 0;
  if (q >= 7 && c < input.aInt / 7) return { rByte, nByte, oByte };

  const sum206 = (packedBytes[(packedOffsets[206 + fBByte] ?? 0) + q] ?? 0) + Math.trunc((c / (packedBytes[(packedOffsets[210 + fBByte] ?? 0) + q] ?? 1)) / 1000);
  fields.x = clamp(sum206, 0, packedBytes[(packedOffsets[208 + fBByte] ?? 0) + q] ?? 0);
  fields.x = Math.trunc(fields.x / 2) + randomA(16777215, fields.x + 1);
  const x = fields.x;

  fields.y = packedBytes[(packedOffsets[212 + fBByte] ?? 0) + q] ?? 0;
  // Offsets 203..282: before A, the tutorial (q 0) holds raids back until
  // al() has played its 11th scripted scene (g:B >= 11 jumps past the
  // return to 285). Was inverted until 2026-10-02.
  if (c < input.aInt) {
    if (q === 0) {
      if (input.gByte < 11) return { rByte, nByte, oByte };
    } else {
      fields.y = Math.trunc(fields.y / (3 - fBByte)) + Math.trunc(Math.trunc((fields.y * c) / input.aInt) / 2);
    }
  }
  const y = fields.y;

  fields.z = randomA(65535, 10);
  const z = fields.z;

  let aU = 0;
  let v = u * 50 + 1;
  for (; v <= (u + 1) * 50; v += 1) {
    if ((state[UNIT_HP + v] ?? 0) <= 0) continue;
    if ((state[UNIT_AGE + v] ?? 0) < 12) continue;
    if ((jobTable[v - u * 50 - 1] ?? 0) < M) continue;
    if (((state[UNIT_FLAGS + v] ?? 0) & 64) !== 0) continue;
    if ((state[UNIT_HELD_ITEM + v] ?? 0) === 9) continue;
    if ((state[UNIT_GENDER + v] ?? 0) === 1 && (rByte & 128) !== 0) continue;

    const half = Math.trunc(y / 2);
    if ((state[UNIT_MELEE_SKILL + v] ?? 0) < half && (state[UNIT_RANGED_SKILL + v] ?? 0) < half && (state[UNIT_SCOUT_SKILL + v] ?? 0) < half) continue;
    if (z >= 2 && (state[UNIT_SCOUT_SKILL + v] ?? 0) > 3) continue;

    state[UNIT_FLAGS + v] = toJavaByte((state[UNIT_FLAGS + v] ?? 0) | 64);
    state[UNIT_MELEE_SKILL + v] = toJavaByte(clamp(state[UNIT_MELEE_SKILL + v] ?? 0, 0, y));
    state[UNIT_RANGED_SKILL + v] = toJavaByte(clamp(state[UNIT_RANGED_SKILL + v] ?? 0, 0, y));

    if (c < input.aInt) {
      const maxHp = state[UNIT_MAX_HP + v] ?? 0;
      const newVal = Math.trunc(maxHp / 2) + Math.trunc(Math.trunc((maxHp * c) / input.aInt) / 2);
      state[UNIT_MAX_HP + v] = toJavaByte(newVal);
      state[UNIT_HP + v] = toJavaByte(newVal);
    }

    aU += 1;
    if (aU >= x) break;
  }
  fields.aU = aU;
  fields.v = v;

  rByte = toJavaByte(rByte & 127);
  callbacks.onRallyBroadcast?.(
    x - aU,
    packedBytes[(packedOffsets[T_RALLY_X] ?? 0) + q] ?? 0,
    packedBytes[(packedOffsets[T_RALLY_Y] ?? 0) + q] ?? 0,
    u,
    0,
  );
  nByte = toJavaByte(randomA(65535, packedBytes[(packedOffsets[235] ?? 0) + q] ?? 0));
  oByte = 0;

  return { rByte, nByte, oByte };
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
