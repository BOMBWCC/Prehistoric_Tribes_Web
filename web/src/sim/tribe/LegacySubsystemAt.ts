import { UNIT_HELD_ITEM, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_MELEE_SKILL, UNIT_ORDER, UNIT_RANGED_SKILL, UNIT_SAVED_TYPE, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_RALLY_X, T_RALLY_Y, T_TYPE_JOB } from "../../core/DataTables";
/**
 * Exact `private void at()` (bytecode/b-javap.txt offsets 0..1242),
 * `as()`'s per-entity target-tracking method (triggered when
 * `dense[7979+v]` bit6 is clear -- see `LegacySubsystemAs.ts`).
 *
 * CORRECTED 2026-08-27 (re-traced from scratch while porting, after an
 * earlier partial read got the index formula wrong): the packedBytes
 * lookup base is `packedOffsets[221+f.q]` -- `f.q` is part of the
 * `packedOffsets` INDEX, not added to the looked-up value.
 *
 * CORRECTED 2026-09-07 (this session, restoring the retracted-premise
 * tail below): two more errors found while re-verifying the ALREADY-PORTED
 * part of this method against the raw bytecode instruction by instruction:
 *
 *  - Block A's "downgrade" formula (offsets 130..142, only reached when
 *    `q>=4 && f.b!==0` and the guard passes) was inverted: bytecode is
 *    `x = (x!==0) ? 5 : 4`, this file had `x = x!==0 ? 4 : 5`.
 *  - `x:I` (#230) is a cross-method scratch field, not a per-call local --
 *    the SAME finding `2d38a12` made for `o()`'s `x:I` writes (`o()`, `G()`
 *    and `x()` write it; `g()`/`ab()`/`G()`/`a(boolean)`/`at()`/`x()`/
 *    `i(int)`/`av()`/`b(int)` read it, 8 of those reads are inside `at()`
 *    itself). This method writes it 3 times (offsets 62, 142, 1125) and
 *    every one of those writes was previously landing on a bare TS local,
 *    silently discarding it for every other reader. Now threaded through
 *    `scratch.x`, same convention as `LegacySubsystemNPrivateO.ts`.
 *
 * Four blocks, in order:
 *
 *  A (only when `Q:B < 0`): produces `dense[6565+v]` (the entity's
 *    "task/role classification" byte, read since the very start of this
 *    project's investigation by `calculateLegacyEntityM`/
 *    `LegacyEntityIUpdate.ts`). `j[aT] < M` looks up a candidate value
 *    from a `packedOffsets[221+f.q]`-based 3-row table, keyed by `j[aT]`,
 *    with an extra "downgrade to 5 or 4" adjustment gated on
 *    `f.q>=4 && f.bByte!==0`. `j[aT] >= M` instead checks whether the
 *    CURRENT `dense[6565+v]` is `9`, and if so calls the confirmed
 *    guaranteed-real `o(int)` helper (`LegacySubsystemLowerO.ts`) with
 *    `-1`.
 *
 *  Throttle: every entity only reaches the rest of this method once every
 *    16 ticks, staggered by its own id (`(game.missionFrame&15) !== (v&15)` returns).
 *
 *  B (always, once past the throttle): computes whether the entity's own
 *    (x,y) falls inside a `packedBytes[G..G+3]`-defined rectangle (`G:I`
 *    #19). If OUTSIDE, and `packedBytes[packedOffsets[41]+type]===0` and
 *    mode is idle (`dense[6161+v]===0`) and not in the `f.q===5 &&
 *    game.missionFrame<=120` startup-cooldown window: resets the cached target
 *    (`dense[3131/3232+v]`) to a packedBytes-table point and sets mode to
 *    `2` ("returning to territory").
 *
 *  C/D (only when `Q<0` AND the entity IS inside the box): keeps three
 *    cached fields (`dense[6262/6363/6464+v]`) in sync with a 3-row
 *    packedBytes table (rows: type/x/y, indexed by `j[aT]`), but only for
 *    entities with `type===69` or `(type===84 && dense[3939+v]===69)`;
 *    always returns afterward (offset 880) -- this branch never reaches
 *    Block E.
 *
 *  E ("ready to act" tail, offsets 1033..1242 -- RESTORED 2026-09-07,
 *    RETRACTED-PREMISE site): reached only via the `j[aT] >= M` arm, and
 *    only for entities that are either the "ready" type (`type===69`, or
 *    `type===84 && dense[3939+v]===69`) or, failing that, whose
 *    `packedBytes[packedOffsets[41]+type]` falls in `[13,15]` AND whose
 *    own cell is self-occupied (`gridC[y][x]===v`).
 *
 *    1. `scratch.w = packedBytes[packedOffsets[212+f.b]+f.q]` -- `w:I`
 *       (#228) is ALSO a genuine cross-method scratch field (b.h() reads
 *       and writes it too, already threaded as `game.subsystemW` at
 *       `LegacyRuntimeState.ts`'s `subsystemH`/`hRaw.w` round-trip).
 *    2. `scratch.x = ((v&3)===0 && f.q>=4) ? 2 : (dense[1717+v] <
 *       dense[1616+v] ? 1 : 0)` -- overwrites `x:I` again, unconditionally.
 *    3. Dereferences class b's own `b:[S]` (#132, `saveOffsets`,
 *       `LegacyRuntimeState.saveOffsets` -- RETRACTED 2026-09-07, this
 *       field is NOT null; allocated by `e.f()`, copied in `b.a(f)`,
 *       `b-javap.txt:550`): `dense[saveOffsets[packedBytes[packedOffsets[107]
 *       +x]]+v]`. If that value is `>= w`: calls `au()` and returns.
 *    4. Otherwise calls the boolean gate `final boolean a(int)` (#288,
 *       `stepLegacySubsystemNearestBuilding` / `onCheckGate`) with
 *       `packedBytes[packedOffsets[114]+x]`. **This is a SECOND real call
 *       site for #288** -- `LegacySubsystemNearestBuilding.ts`'s own
 *       docblock claims "its only real call site in the class (confirmed
 *       via grep, exactly one invokevirtual #288)"; that was true only
 *       while this method's tail was unreachable dead code behind the
 *       (now-retracted) guaranteed NPE. `LegacySubsystemLowerO.ts`'s
 *       docblock already correctly flagged this second site ("the SAME
 *       helper at()'s own Block D self-occupancy tail calls").
 *    5. If the gate returns false: calls `au()` and returns.
 *    6. If true: calls `private void a(int,byte)` (#275,
 *       `onChangeEntityType`, the SAME helper used elsewhere in this
 *       method and in `LegacySubsystemLowerO.ts`) with
 *       `packedBytes[packedOffsets[114]+3+x]`, sets `dense[6161+v]=3`
 *       (mode = moving), and returns.
 *
 *    `au()` (`private void au()`, offset 0..253, #328,
 *    `bytecode/b-javap.txt:48719`) is called from two of this block's
 *    exits. **CORRECTION**: an earlier pass on this file called it
 *    "`LegacyGameState.ts`'s confirmed dead, zero reachable callers"
 *    method -- that was wrong on both counts: no `au()` port exists
 *    anywhere in `LegacyGameState.ts` (that file's only `au` hits are the
 *    unrelated `f.au:B` field), and it plainly IS reachable, from here,
 *    twice, unconditionally on two of Block E's exits. It is real,
 *    non-trivial (253 bytes: recomputes `dense[6262/6363+v]` from a
 *    packed table when the entity has drifted more than 5 cells from its
 *    cached target, then sets `dense[6464+v]=69` and calls
 *    `a(v,69)`/`onChangeEntityType`), but it is a distinct ~250-byte
 *    method with its own field reads (`C:I`#10, `D:I`#12) not otherwise
 *    touched by `at()`. Ported 2026-09-28 as `stepLegacySubsystemAu` below.
 */
export type LegacySubsystemAtInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.j:[B] (#191), the "job table" already read by ae(). */
  readonly jobTable: Int8Array;
  readonly entityId: number;
  /** b.Q:B (#46). */
  readonly qByte: number;
  /** b.M:B (#36), shared scratch also used by aq(). */
  readonly mByte: number;
  /** b.aT:I (#95). */
  readonly aT: number;
  /** b.G:I (#19), the bounding-box packedBytes table base. */
  readonly gBase: number;
  /** b:[[B] (#129) -- this project's gridC hypothesis (see docblock). */
  readonly gridC: readonly Int8Array[];
  /** f.q:B, the scene/level id. */
  readonly sceneQ: number;
  /** f.b:B (#138). */
  readonly fBByte: number;
  /** game.missionFrame / simulationCounter. */
  readonly simulationCounter: number;
  /** b.b:[S] (#132) -- saveOffsets, the 570-entry dense stride table (NOT null, RETRACTED 2026-09-07). */
  readonly saveOffsets: Int16Array;
  /**
   * Cross-method scalar fields `x:I` (#230) and `w:I` (#228) -- see the
   * docblock above. Read AND written here; caller must back this with the
   * live `game.subsystemX`/`game.subsystemW` (e.g. a getter/setter pair)
   * so the writes persist for the other methods that read them.
   */
  readonly scratch: { x: number; w: number };
};

export type LegacySubsystemAtCallbacks = {
  /** o(int) / stepLegacySubsystemLowerO, already ported. Called with -1. */
  readonly onLowerO?: () => void;
  /** private void a(int,byte) (#275) / changeLegacyEntityType, already ported. */
  readonly onChangeEntityType?: (id: number, type: number) => void;
  /** final boolean a(int) (#288) / stepLegacySubsystemNearestBuilding, already ported. */
  readonly onCheckGate?: (arg: number) => boolean;
  /** private void au() (#328) -- stepLegacySubsystemAu. */
  readonly onAu?: () => void;
};

export function stepLegacySubsystemAt(input: LegacySubsystemAtInput, callbacks: LegacySubsystemAtCallbacks = {}): void {
  const { state, packedBytes, packedOffsets, jobTable, entityId: v, aT, mByte: M, sceneQ: q, simulationCounter: c, saveOffsets, scratch } = input;

  // Block A.
  if (input.qByte < 0) {
    if ((jobTable[aT] ?? 0) < M) {
      scratch.x = packedBytes[(packedOffsets[221 + q] ?? 0) + M * 3 + (jobTable[aT] ?? 0)] ?? 0;
      const guardOk = !(aT < (packedBytes[(packedOffsets[242] ?? 0) + q] ?? 0) && scratch.x === 2);
      if (q >= 4 && input.fBByte !== 0 && guardOk) {
        // Offsets 130..142: x = (x !== 0) ? 5 : 4 (FIXED 2026-09-07 -- was
        // swapped to `x!==0 ? 4 : 5` in an earlier pass).
        scratch.x = scratch.x !== 0 ? 5 : 4;
      }
      if ((state[UNIT_HELD_ITEM + v] ?? 0) !== scratch.x) state[UNIT_HELD_ITEM + v] = toJavaByte(scratch.x);
    } else if ((state[UNIT_HELD_ITEM + v] ?? 0) === 9) {
      callbacks.onLowerO?.();
    }
  }

  // Throttle.
  if ((c & 15) !== (v & 15)) return;

  // Block B.
  const x0 = state[v] ?? 0;
  const y0 = state[UNIT_Y + v] ?? 0;
  const G = input.gBase;
  const outsideBox = !(
    x0 >= (packedBytes[G] ?? 0) &&
    y0 >= (packedBytes[G + 1] ?? 0) &&
    x0 <= (packedBytes[G + 2] ?? 0) &&
    y0 <= (packedBytes[G + 3] ?? 0)
  );
  const type = state[UNIT_TYPE + v] ?? 0;
  if (outsideBox) {
    const startupCooldown = q === 5 && c <= 120;
    if (
      (packedBytes[(packedOffsets[T_TYPE_JOB] ?? 0) + type] ?? 0) === 0 &&
      (state[UNIT_ORDER + v] ?? 0) === 0 &&
      !startupCooldown
    ) {
      state[UNIT_TARGET_X + v] = packedBytes[(packedOffsets[T_RALLY_X] ?? 0) + q] ?? 0;
      state[UNIT_TARGET_Y + v] = packedBytes[(packedOffsets[T_RALLY_Y] ?? 0) + q] ?? 0;
      state[UNIT_ORDER + v] = 2;
    }
  }

  if (input.qByte >= 0 || outsideBox) return;

  // Block C/D.
  if ((jobTable[aT] ?? 0) < M) {
    const readyType = type === 69 || (type === 84 && (state[UNIT_SAVED_TYPE + v] ?? 0) === 69);
    if (!readyType) return;
    const doubleIndex = packedBytes[(packedOffsets[42] ?? 0) + (packedBytes[(packedOffsets[T_TYPE_JOB] ?? 0) + (state[UNIT_JOB_TYPE + v] ?? 0)] ?? 0)] ?? 0;
    if (doubleIndex === 2) return;
    if ((state[UNIT_ORDER + v] ?? 0) !== 0) return;

    const base = (packedOffsets[221 + q] ?? 0) + (jobTable[aT] ?? 0);
    const targetX = packedBytes[base + M] ?? 0;
    const targetY = packedBytes[base + M * 2] ?? 0;
    if ((state[UNIT_HOME_X + v] ?? 0) === targetX && (state[UNIT_HOME_Y + v] ?? 0) === targetY) return;

    state[UNIT_HOME_X + v] = toJavaByte(targetX);
    state[UNIT_HOME_Y + v] = toJavaByte(targetY);
    state[UNIT_JOB_TYPE + v] = packedBytes[base] ?? 0;
    return;
  }

  // j[aT] >= M.
  const readyType = type === 69 || (type === 84 && (state[UNIT_SAVED_TYPE + v] ?? 0) === 69);
  if (!readyType) {
    const rangeVal = packedBytes[(packedOffsets[T_TYPE_JOB] ?? 0) + type] ?? 0;
    if (rangeVal < 13 || rangeVal > 15) return;
    if ((input.gridC[y0]?.[x0] ?? 0) !== v) return;
  }

  // Block E ("ready to act" tail, offsets 1033..1242). RESTORED 2026-09-07
  // -- the field this used to believe was permanently null (`b:[S]`#132 /
  // `saveOffsets`) is real (RETRACTED 2026-09-07). See docblock above for
  // the full derivation.
  scratch.w = packedBytes[(packedOffsets[212 + input.fBByte] ?? 0) + q] ?? 0;
  scratch.x = (v & 3) === 0 && q >= 4 ? 2 : (state[UNIT_MELEE_SKILL + v] ?? 0) < (state[UNIT_RANGED_SKILL + v] ?? 0) ? 1 : 0;

  const saveOffsetIndex = packedBytes[(packedOffsets[107] ?? 0) + scratch.x] ?? 0;
  const readyValue = state[(saveOffsets[saveOffsetIndex] ?? 0) + v] ?? 0;
  if (readyValue >= scratch.w) {
    callbacks.onAu?.();
    return;
  }

  const scanArg = packedBytes[(packedOffsets[114] ?? 0) + scratch.x] ?? 0;
  if (!(callbacks.onCheckGate?.(scanArg) ?? false)) {
    callbacks.onAu?.();
    return;
  }

  const newType = packedBytes[(packedOffsets[114] ?? 0) + 3 + scratch.x] ?? 0;
  callbacks.onChangeEntityType?.(v, newType);
  state[UNIT_ORDER + v] = 3;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export type LegacySubsystemAuInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[[B (#129). */
  readonly gridC: readonly Int8Array[];
  /** b.v:I (#225). */
  readonly v: number;
  /** f.q:B (#211). */
  readonly sceneQ: number;
  /** b.C:I (#10) / b.D:I (#12) -- shared scratch. */
  readonly scratch: { C: number; D: number };
  /** private void a(int,byte) (#275). */
  readonly onChangeEntityType: (id: number, type: number) => void;
};

/**
 * Exact `private void au()` (#328, bytecode/b-javap.txt 48719, offsets
 * 0..253): an enemy unit that is not on its own cell gets its order
 * re-issued (`6161 = 2`); one more than 5 cells from the mission's rally
 * point `(t233[q], t234[q])` is sent back there (`6262/6363`), switched to
 * type 69 and marked `6464 = 69`.
 */
export function stepLegacySubsystemAu(input: LegacySubsystemAuInput): void {
  const { state, v, scratch } = input;
  const table = (row: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + input.sceneQ] ?? 0;
  if ((input.gridC[state[UNIT_Y + v] ?? 0]?.[state[v] ?? 0] ?? 0) !== v) {
    state[UNIT_ORDER + v] = 2;
    return;
  }
  scratch.C = (state[v] ?? 0) - table(T_RALLY_X);
  scratch.D = (state[UNIT_Y + v] ?? 0) - table(T_RALLY_Y);
  if (scratch.C < -5 || scratch.C > 5 || scratch.D < -5 || scratch.D > 5) {
    state[UNIT_HOME_X + v] = table(T_RALLY_X);
    state[UNIT_HOME_Y + v] = table(T_RALLY_Y);
    input.onChangeEntityType(v, 69);
    state[UNIT_JOB_TYPE + v] = 69;
  }
}
