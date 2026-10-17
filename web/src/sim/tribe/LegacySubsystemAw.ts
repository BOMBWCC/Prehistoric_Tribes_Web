import { UNIT_AGE, UNIT_FLAGS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Exact `private void aw()` (bytecode/b-javap.txt offsets 0..533),
 * `as()`'s other tail call (`if (O:B>=0 && (game.missionFrame&15)===0) this.aw();`)
 * -- walks the batch `av()` selected (`dense[7979+id]` bit6 set) and
 * either sends off-cell units moving to a rally point, or -- once all
 * selected units are idle and standing on their own cell -- tracks
 * batch-readiness via `O:B`.
 *
 * Per-entity loop (`v` over the 50-slot team roster): requires
 * `dense[1919+v]>0` (HP), `dense[1414+v]>=12` (level), and
 * `dense[7979+v]` bit6 SET (must already be `av()`-selected). For each
 * matching unit (`aU` counts them):
 *
 *  - NOT on its own grid cell (`gridC[y][x]!==v`): `local1 = false`,
 *    `dense[2828+v]=87` / `dense[6161+v]=3` -- the SAME "en route"
 *    type/mode pair `ae()` already established for worker dispatch.
 *  - On its own cell, idle (`dense[6161+v]===0`): computes a rally target
 *    `aT = packedOffsets[239] + (packedBytes[packedOffsets[240]+f.q]&255)
 *    + packedBytes[packedOffsets[237] + packedBytes[packedOffsets[238]+
 *    f.q] + N:B] + O:B*2`, writes `dense[6262/3131+v] = packedBytes[aT]`
 *    and `dense[6363/3232+v] = packedBytes[aT+1]`, sets mode=3/type=69 to
 *    start moving.
 *  - On its own cell, NOT idle: `local1 = false` (still busy/traveling).
 *  - Only while `local1` is still true (i.e. this unit is idle on its own
 *    cell): an extra occupancy check (`private int a(int,int,int)` #266,
 *    the SAME helper `as()`'s own combat-targeting tail uses) -- result
 *    `>69` also clears `local1`.
 *
 * Tail: `local1===true` (every processed unit already arrived AND is
 * idle) unconditionally increments `O:B`; `local1===false` increments it
 * only while `aR:I < (O:B+1)*150+game.missionFrame` (a time-budget check -- once
 * exceeded, stop incrementing). Then: `aU===0` (nobody was selected) OR
 * `O:B >= packedBytes[packedOffsets[236]+packedBytes[packedOffsets[238]+
 * f.q]+N:B]` (a readiness threshold) resets `O:B=-1`; otherwise `O:B` is
 * left as-is.
 */
export type LegacySubsystemAwInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly team: number;
  readonly nByte: number;
  readonly oByte: number;
  readonly aR: number;
  readonly sceneQ: number;
  readonly simulationCounter: number;
};

export type LegacySubsystemAwResult = {
  readonly oByte: number;
};

export type LegacySubsystemAwCallbacks = {
  /**
   * private int a(int,int,int) (#266), the same helper as()'s combat tail
   * uses. Its real guard reads dense[4444+v] as ambient instance state
   * (the entity currently being processed), not from the (x,y) arguments
   * -- id passed explicitly here for composability.
   */
  readonly onCheckOccupancy?: (id: number, x: number, y: number, arg: number) => number;
};

export function stepLegacySubsystemAw(
  input: LegacySubsystemAwInput,
  callbacks: LegacySubsystemAwCallbacks = {},
): LegacySubsystemAwResult {
  const { state, packedBytes, packedOffsets, gridC, team: u, nByte: N, sceneQ: q, simulationCounter: c } = input;
  const O = input.oByte;

  let local1 = true;
  let aU = 0;

  for (let v = u * 50 + 1; v <= (u + 1) * 50; v += 1) {
    if ((state[UNIT_HP + v] ?? 0) <= 0) continue;
    if ((state[UNIT_AGE + v] ?? 0) < 12) continue;
    if (((state[UNIT_FLAGS + v] ?? 0) & 64) === 0) continue;
    aU += 1;

    const x0 = state[v] ?? 0;
    const y0 = state[UNIT_Y + v] ?? 0;
    if ((gridC[y0]?.[x0] ?? 0) !== v) {
      local1 = false;
      state[UNIT_TYPE + v] = 87;
      state[UNIT_ORDER + v] = 3;
    } else if ((state[UNIT_ORDER + v] ?? 0) === 0) {
      const inner = packedBytes[(packedOffsets[238] ?? 0) + q] ?? 0;
      // Offsets 190..271: N indexes t237 (`t237[t238[q] + N]`). FIXED 2026-10-13 (oracle run 15,
      // play14 frame 61176): N was added to the sum, sending mission 3's raiders to the wrong spot.
      const aT =
        (packedOffsets[239] ?? 0) +
        ((packedBytes[(packedOffsets[240] ?? 0) + q] ?? 0) & 255) +
        (packedBytes[(packedOffsets[237] ?? 0) + inner + N] ?? 0) +
        O * 2;
      const targetX = packedBytes[aT] ?? 0;
      const targetY = packedBytes[aT + 1] ?? 0;
      state[UNIT_HOME_X + v] = toJavaByte(targetX);
      state[UNIT_TARGET_X + v] = toJavaByte(targetX);
      state[UNIT_HOME_Y + v] = toJavaByte(targetY);
      state[UNIT_TARGET_Y + v] = toJavaByte(targetY);
      state[UNIT_ORDER + v] = 3;
      state[UNIT_TYPE + v] = 69;
    } else {
      local1 = false;
    }

    if (local1) {
      const result = callbacks.onCheckOccupancy?.(v, x0, y0, 0) ?? 0;
      if (result > 69) local1 = false;
    }
  }

  let oByte = O;
  if (local1) {
    oByte = toJavaByte(oByte + 1);
  } else if (input.aR + (oByte + 1) * 150 < c) {
    // Offsets 439..460: `if (aR + (O+1)*150 >= f.c) skip`. FIXED 2026-10-08 (oracle run 3,
    // frame 4809): the 150-tick step was on the wrong side, so O advanced every call.
    oByte = toJavaByte(oByte + 1);
  }

  const inner2 = packedBytes[(packedOffsets[238] ?? 0) + q] ?? 0;
  const threshold = packedBytes[(packedOffsets[236] ?? 0) + inner2 + N] ?? 0;
  if (aU === 0 || oByte >= threshold) {
    oByte = -1;
  }

  return { oByte };
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
