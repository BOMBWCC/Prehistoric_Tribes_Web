import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_X, BLD_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Exact `final boolean a(int)` (bytecode/b-javap.txt offsets 0..858),
 * `o(int)`'s own gate (`this.a(6)`, `LegacySubsystemLowerO.ts`'s
 * `onCheckGate`).
 *
 * CORRECTED 2026-09-07: NOT the only real call site in the class -- that
 * claim held only while `at()`'s "ready to act" tail was unreachable dead
 * code behind a (since-retracted) guaranteed NPE. `at()`'s own Block E
 * (offset 1185, `LegacySubsystemAt.ts`) is a second live `invokevirtual
 * #288`, wired to this same function via its own `onCheckGate`.
 *
 * Unlike every other undereived helper this cluster called, this one
 * does NOT touch any confirmed-permanently-null field (independently
 * re-verified: no `#132`/`#168`/`#176`/`#151`/`#143` references anywhere
 * in its ~483 lines) -- it's real, working "find the nearest eligible
 * building of kind `arg1`, and clamp the entity's own target position
 * (`dense[3131/3232+v]`) onto that building's footprint" logic.
 *
 * Scans the CALLER's team's 30-slot building roster (`Z` from `u*30+1`
 * to `(u+1)*30`). A building is a candidate when its kind
 * (`dense[8749+Z]`) matches `arg1` directly, OR (only when `arg1===6`)
 * its kind is `16` AND `dense[9237+Z]===6` AND the CALLING ENTITY's own
 * type (`dense[2828+v]`) is `<=25`. Then: skip if busy
 * (`dense[8627+Z]!==0`) unless `arg1===6`; skip if
 * `packedBytes[packedOffsets[138]+156+arg1]>=0` and `dense[8810+Z]<1`;
 * skip if `dense[8932+Z]>0` and it's `>=` a
 * `packedBytes[packedOffsets[138]+(dense[9115+Z]-1)*26+arg1]` threshold,
 * UNLESS `arg1===6`.
 *
 * Among survivors, tracks the one with the smallest squared distance
 * from the entity to the building's center (`(dense[8383/8444+Z] +
 * width/height/2) - dense[v]/dense[101+v]`, squared and summed) --
 * ties (or a same-`arg1`-kind match while still in "type-16 fallback"
 * mode) also accepted. If none found: sets the target to the entity's
 * own current position and returns `false`. Otherwise clamps the target
 * onto the winning building's footprint (`clamp(dense[v],
 * dense[8383+ac], dense[8383+ac]+width-1)`, same for y) and returns
 * `true`.
 */
export type LegacySubsystemNearestBuildingInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly team: number;
  readonly entityId: number;
  readonly kind: number;
};

export type LegacySubsystemNearestBuildingCallbacks = {
  readonly onClamp?: (value: number, min: number, max: number) => number;
};

/**
 * `out.h` receives b.h:Z (#184): cleared on entry, set once any record passes
 * the kind match (offset 147), whether or not it wins.
 */
export function stepLegacySubsystemNearestBuilding(
  input: LegacySubsystemNearestBuildingInput,
  callbacks: LegacySubsystemNearestBuildingCallbacks = {},
  out?: { h: boolean },
): boolean {
  const { state, packedBytes, packedOffsets, team: u, entityId: v, kind: arg1 } = input;
  const clamp = (value: number, min: number, max: number) => callbacks.onClamp?.(value, min, max) ?? Math.max(min, Math.min(max, value));
  const tableBase = packedOffsets[T_BUILDING] ?? 0;

  let bestDistance = 1000000;
  let bestId = 0;
  let fallback = arg1 === 6;
  if (out) out.h = false;

  for (let z = u * 30 + 1; z <= (u + 1) * 30; z += 1) {
    if ((state[BLD_HP + z] ?? 0) <= 0) continue;

    const buildingKind = state[BLD_KIND + z] ?? 0;
    if (buildingKind !== arg1) {
      if (!fallback) continue;
      if (buildingKind !== 16) continue;
      if ((state[BLD_PLANNED_KIND + z] ?? 0) !== 6) continue;
      if ((state[UNIT_TYPE + v] ?? 0) > 25) continue;
    }
    if (out) out.h = true;

    if ((state[BLD_WORK + z] ?? 0) !== 0 && arg1 !== 6) continue;

    if ((packedBytes[tableBase + 156 + arg1] ?? 0) >= 0 && (state[BLD_OWNER + z] ?? 0) < 1) continue;

    if ((state[BLD_WORKERS + z] ?? 0) > 0) {
      const threshold = packedBytes[tableBase + ((state[BLD_LEVEL + z] ?? 0) - 1) * 26 + arg1] ?? 0;
      if ((state[BLD_WORKERS + z] ?? 0) >= threshold && arg1 !== 6) continue;
    }

    const width = packedBytes[tableBase + 104 + buildingKind] ?? 0;
    const height = packedBytes[tableBase + 130 + buildingKind] ?? 0;
    const dx = (state[BLD_X + z] ?? 0) + Math.trunc(width / 2) - (state[v] ?? 0);
    const dy = (state[BLD_Y + z] ?? 0) + Math.trunc(height / 2) - (state[UNIT_Y + v] ?? 0);
    const distance = dx * dx + dy * dy;

    if (bestDistance > distance || (fallback && buildingKind === arg1)) {
      fallback = buildingKind !== arg1;
      bestDistance = distance;
      bestId = z;
    }
  }

  if (bestDistance >= 1000000) {
    state[UNIT_TARGET_X + v] = state[v] ?? 0;
    state[UNIT_TARGET_Y + v] = state[UNIT_Y + v] ?? 0;
    return false;
  }

  const winningKind = state[BLD_KIND + bestId] ?? 0;
  const width = packedBytes[tableBase + 104 + winningKind] ?? 0;
  const height = packedBytes[tableBase + 130 + winningKind] ?? 0;
  const bx = state[BLD_X + bestId] ?? 0;
  const by = state[BLD_Y + bestId] ?? 0;
  state[UNIT_TARGET_X + v] = toJavaByte(clamp(state[v] ?? 0, bx, bx + width - 1));
  state[UNIT_TARGET_Y + v] = toJavaByte(clamp(state[UNIT_Y + v] ?? 0, by, by + height - 1));
  return true;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
