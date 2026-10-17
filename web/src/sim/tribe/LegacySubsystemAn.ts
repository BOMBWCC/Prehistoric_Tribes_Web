import { UNIT_CARRY_AMOUNT, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct port of private void an() (bytecode/b-javap.txt offsets 0..396),
 * `subsystemB`'s own `onAn` target (fired from `stepLegacySubsystemBPreActionGate`/
 * `stepLegacySubsystemBActionSelector`'s own `onAn`, both already wired).
 *
 * Two mutually-exclusive top-level branches on this entity's own type
 * (`state[2828+id]`):
 *
 *  - type IN `{10,12,13,15,16}` (offsets 72..308): syncs `dense[3131/3232]`
 *    from `dense[6262/6363]` (last-known <-> current position), reads the
 *    entity currently occupying `gridC[dense[6363+id]][dense[6262+id]]`,
 *    and checks it via `c(byte)` (already ported as `checkLegacyEntityOccupant`).
 *    If accepted, calls `b.g(1)` (`subsystemG(id, 1)`) and returns. If
 *    rejected, calls `b(false)` (`subsystemBBoolean(id, false)`) --
 *    CONFIRMED elsewhere this session to conditionally throw when its own
 *    50-slot scratch table has an active record, caught by `f.j()`'s
 *    already-live try/catch, so this call itself may never return here.
 *    If it returns normally (`false`), one of two further branches fires:
 *    `dense[3636+id]>0` -> `changeEntityType(id, packedBytes[packedOffsets[160]+type])`
 *    then `N()`; else, only for `type` in `{12,16}`, `changeEntityType(id,60)`
 *    and two dense-state resets (`6464+id=12`, `4444+id=0`).
 *
 *  - type NOT in that set (offsets 309..396): computes two clamped
 *    coordinates using the already-ported seeded-RNG helper
 *    (`f.a(int,int)`, `randomRemainder`) and calls a large, separate,
 *    already-deferred gate method (`final boolean a(int,int,int,int)`,
 *    #270, ~1100 raw instructions -- the SAME method already flagged
 *    as out of scope in `LegacyFPairCommand.ts`'s `onFootprintProbe`),
 *    discarding its boolean result. Left as an explicit `onLargeGate`
 *    callback boundary rather than freshly derived -- same scope as the
 *    already-deferred instance, not a quick extension.
 */
export type LegacySubsystemAnInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly grid: Int8Array[];
  readonly id: number;
  readonly onOccupantCheck: (occupant: number) => boolean;
  readonly onBBoolean: () => boolean;
  readonly onRawAction: (id: number, action: number) => void;
  readonly onN: () => void;
  readonly onGroupMode: (mode: number) => void;
  /**
   * type NOT in {10,12,13,15,16}: computes two clamped coordinates via
   * the seeded-RNG helper and calls the large deferred gate (#270),
   * discarding its result. Args are the two already-computed clamped
   * coordinates, exposed for completeness even though the real bytecode
   * never uses the boolean it returns.
   */
  readonly onLargeGate?: (x: number, y: number) => void;
  /** `f.a(int,int)`, already ported as `randomRemainder`. */
  readonly randomRemainder: (mask: number, divisor: number) => number;
  readonly mapWidth: number;
  readonly mapHeight: number;
};

function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function stepLegacySubsystemAn(input: LegacySubsystemAnInput): void {
  const { dense, packedBytes, packedOffsets, id } = input;
  const type = dense[UNIT_TYPE + id] ?? 0;
  const typeIncluded = type === 10 || type === 12 || type === 13 || type === 15 || type === 16;

  if (typeIncluded) {
    dense[UNIT_TARGET_X + id] = dense[UNIT_HOME_X + id] ?? 0;
    dense[UNIT_TARGET_Y + id] = dense[UNIT_HOME_Y + id] ?? 0;
    const row = input.grid[dense[UNIT_HOME_Y + id] ?? 0];
    const occupant = row?.[dense[UNIT_HOME_X + id] ?? 0] ?? 0;

    if (input.onOccupantCheck(occupant)) {
      input.onGroupMode(1);
      return;
    }

    if (input.onBBoolean()) return;

    if ((dense[UNIT_CARRY_AMOUNT + id] ?? 0) > 0) {
      const action = packedBytes[(packedOffsets[160] ?? 0) + type] ?? 0;
      input.onRawAction(id, action);
      input.onN();
      return;
    }

    if (type !== 12 && type !== 16) return;
    input.onRawAction(id, 60);
    dense[UNIT_JOB_TYPE + id] = 12;
    dense[UNIT_RECORD + id] = 0;
    return;
  }

  const x = clampToRange(
    (dense[id] ?? 0) - 3 + input.randomRemainder(255, 6),
    0,
    input.mapWidth - 1,
  );
  const y = clampToRange(
    (dense[UNIT_Y + id] ?? 0) - 3 + input.randomRemainder(255, 6),
    0,
    input.mapHeight - 1,
  );
  input.onLargeGate?.(x, y);
}
