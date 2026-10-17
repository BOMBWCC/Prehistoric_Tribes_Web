import { stepLegacySubsystemEntityRegen } from "../tribe/LegacySubsystemEntityRegen";
import { UNIT_AGE, UNIT_FLAGS, UNIT_HP, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_RANGED_SKILL, UNIT_THOUGHT, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";

export type LegacyEntityStatusGuardInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly id: number;
  readonly team: number;
  readonly frame: number;
  readonly subsystemGFFlagByte: number;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** b.b:[S] (#132) -- class b's copy of f.b:[S] (#245), 570 shorts, `saveOffsets`. */
  readonly shortTableB: Int16Array;
  /** f.q:B (#211), tracked elsewhere in this port as `game.mission`; forwarded through to `q()`/`r()`. */
  readonly fQByte: number;
  /** b.b:[S] (#132); forwarded through to `q()`/`r()`, not read directly here. See LegacySubsystemEntityRRoll.ts. */
  readonly bShort: Int16Array | null;
  /** b.c:[S] (#142) / `LegacyRuntimeState.sectionOffsets`; forwarded through to `q()`/`r()`. */
  readonly shortTableBOffsets: Int16Array;
  /** f.L:Z (#73), tracked elsewhere in this port as `game.formUpActive`; forwarded through to `q()`/`r()`. */
  readonly outerLoopLFlag: boolean;
  /** b.B:I (#8), written at offsets 193/224. */
  readonly fields: { B: number };
  readonly animationLimit?: number;
  /** b.F:I (#16) += 1, offsets 156..163. */
  readonly onFBump?: () => void;
  readonly onLifecycle?: (id: number) => void;
  readonly onFinal?: (id: number) => void;
  /** private void a(int,int,int,byte) (#283) -- confirmed real call, not derived. */
  readonly onVacate?: (kind: number, x: number, y: number, id: number) => void;
  /** b.K:B (#28) reset to 0 -- offsets 652..654. */
  readonly onSchedulerReset?: () => void;
  readonly onChangeType?: (id: number, type: number) => void;
  /** private void f.b(byte) -- confirmed real call, not derived. */
  readonly onLevelMilestone?: (id: number) => void;
  /** private boolean a(int,int) (#294) -- confirmed real call, not derived. */
  readonly onRandomAction?: (id: number, mode: number) => void;
  /** private void W() -- confirmed real call, not derived. */
  readonly onW?: (id: number) => void;
  /** private void V() -- confirmed real call, not derived. */
  readonly onV?: (id: number) => void;
  /** private void Y() -- confirmed real call, not derived. */
  readonly onY?: (id: number) => void;
  /** private void X() -- confirmed real call, not derived. */
  readonly onX?: (id: number) => void;
  /** private void A() (`LegacyRuntimeState.subsystemEntityAAlert`); forwarded to `q()`, not called directly here. */
  readonly onA?: (id: number) => void;
  /** b's own `final void a(byte,int,int)` (#274) (`LegacyEntityMoveTrigger.ts`); forwarded through to `q()`/`r()`. */
  readonly onMove?: (action: number, id: number, idAgain: number) => void;
};

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

/**
 * Direct translation of `private boolean a()` (constant pool #282),
 * bytecode/b-javap.txt offsets 0..814 (line 8632). `b.e()`'s own
 * `onEntityStatusCheck` gate (offset 188: `if (a()) goto 721` -- skip the
 * rest of that entity's processing for this tick).
 *
 * Two branches:
 *  - `dense[1919+id] < 0` (dead/dying): the original, already-ported
 *    negative-record branch (offset 0..106) -- unchanged.
 *  - `dense[1919+id] >= 0` (alive): offset 107..814, newly derived
 *    (2026-08-29). Real, mostly-periodic maintenance:
 *     1. `subsystemGFFlagByte===2 && team===0 && (dense[1717+id]>4 ||
 *        dense[1616+id]>4)`: increments `F:I` (#16, `bField16`; read by
 *        `v()`, wired 2026-09-23).
 *     2. `entityBValue`-shaped: `B.I = table(38,type)`; if negative,
 *        CONFIRMED reaches the permanently-null `b:[S]`#132 (same field
 *        this whole session's crash cluster shares) via
 *        `dense[bShort[-B.I]+id]`.
 *     3. `dense[8282+id]&128` and self-occupying its own cell: calls the
 *        shared "vacate" helper (`onVacate`, #283, same one
 *        `LegacySubsystemEntityHpGate.ts`/`LegacySubsystemEntityRegen.ts`
 *        use) and returns `true` immediately.
 *     4. A periodic `dense[6666+id]` counter feeds `q()`
 *        (`LegacySubsystemEntityRegen.ts`) on a `(f.c&3)===(id&3)`
 *        cadence -- `if (!q()) return true`.
 *     5. Four more periodic, unresolved side-effect calls
 *        (`onW`/`onV`/`onY`/`onX`) on their own independent cadences.
 *     6. `dense[2828+id]` (type) reset of a scratch `K.B` field for most
 *        types, a `dense[5050+id]` counter bump, a conditional
 *        `dense[1111+id]&=240`, and a `dense[3333+id]` reset unless the
 *        entity's current action code (`dense[2929+id]`) is `39/104/105`.
 *     7. Returns `false` (this branch never returns `true` at its own
 *        end -- only the step-3 early exit does).
 */
export function stepLegacyEntityStatusGuard(input: LegacyEntityStatusGuardInput): boolean {
  const { state, packedBytes, packedOffsets, gridC, id, team, frame } = input;

  if ((state[UNIT_HP + id] ?? 0) < 0) {
    state[3030 + id] = toByte((state[3030 + id] ?? 0) + 1);
    if (input.animationLimit !== undefined && state[3030 + id] >= input.animationLimit) {
      input.onLifecycle?.(id);
    }
    if ((state[5959 + id] ?? 0) > 0) input.onFinal?.(id);
    return true;
  }

  // offset 107..166: F:I counts team-0 units with a skill above 4 while the
  // mission script is on step 2 (s() zeroes it each frame); b.v() reads it.
  if (input.subsystemGFFlagByte === 2 && team === 0) {
    if ((state[UNIT_MELEE_SKILL + id] ?? 0) > 4 || (state[UNIT_RANGED_SKILL + id] ?? 0) > 4) {
      input.onFBump?.();
    }
  }

  // Offsets 166..226 of b's `private boolean a()`:
  //   B:I = packedBytes[packedOffsets[38] + dense[2828 + v]];
  //   if (B:I < 0) B:I = dense[b:[S][-B:I] + v];
  // RETRACTED (2026-09-07): this used to be a deliberate null dereference,
  // on the finding that `b:[S]` (#132) is permanently null. It is class b's
  // copy of `f.b:[S]` (#245), which `e.f()` allocates as `new short[570]`
  // and `b.a(f)` copies in at b-javap.txt:550 -- this port has had it all
  // along as `saveOffsets`. The negative-index fallback is the exact same
  // idiom `deriveLegacyEntityB` (LegacyEntityTypeChange.ts) already ports;
  // it was reading the wrong twin table (`c:[S]` #142) until today.
  //
  // CORRECTED 2026-10-12 (oracle run 12, frame 22641): B:I is a live field
  // the route finder d(int) and a dozen other methods read later; it is now
  // stored instead of discarded.
  const type = state[UNIT_TYPE + id] ?? 0;
  let entityB = packedBytes[(packedOffsets[38] ?? 0) + type] ?? 0;
  if (entityB < 0) {
    entityB = state[(input.shortTableB[-entityB] ?? 0) + id] ?? 0;
  }
  input.fields.B = entityB;

  // offset 227..319: self-vacate on a set high bit.
  if (((state[8282 + id] ?? 0) & 128) !== 0) {
    const row = gridC[state[UNIT_Y + id] ?? 0];
    if (row && (row[state[id] ?? 0] ?? 0) === id) {
      input.onVacate?.(19, state[id] ?? 0, state[UNIT_Y + id] ?? 0, id);
      return true;
    }
  }

  // offset 319..383: periodic dense[6666+id] counter.
  const level = state[UNIT_AGE + id] ?? 0;
  // Offsets 320..361: `f.c & (1414 < 12 ? 1 : u == 0 ? 3 : 15)`. CORRECTED
  // 2026-09-15: the port had both tests inverted, so a team-0 adult aged every
  // 250 frames instead of every 500.
  const counterGate = level < 12 ? 1 : team === 0 ? 3 : 15;
  if ((frame & counterGate) === 0) {
    state[6666 + id] = (state[6666 + id] ?? 0) + 1;
  }

  // offset 383..410: q() gate.
  if ((frame & 3) === (id & 3)) {
    if (!stepLegacySubsystemEntityRegen({
      state, packedBytes, packedOffsets, gridC, entityId: id, team, frame,
      randomRemainder: input.randomRemainder,
      fQByte: input.fQByte,
      bShort: input.bShort,
      shortTableBOffsets: input.shortTableBOffsets,
      outerLoopLFlag: input.outerLoopLFlag,
      onChangeType: input.onChangeType,
      onLevelMilestone: input.onLevelMilestone,
      onVacate: input.onVacate,
      onRandomAction: input.onRandomAction,
      onA: input.onA,
      onMove: input.onMove,
    })) {
      return true;
    }
  }

  // offset 410..434: periodic W() call.
  if ((frame & 31) === (id & 15)) {
    input.onW?.(id);
  }

  // offset 434..486: periodic V() call.
  // Offset 451..463 re-reads 1414: q() above may just have had the unit's
  // 12th birthday. CORRECTED 2026-10-13 (oracle run 14, play11 frame 33837):
  // the stale pre-q() level kept a new adult homeless for 32 more frames.
  if ((state[3434 + id] ?? 0) < 1 && (state[UNIT_AGE + id] ?? 0) >= 12) {
    if ((frame & 31) === 0) {
      input.onV?.(id);
    }
  }

  // offset 486..564: periodic Y() call.
  if (((state[UNIT_FLAGS + id] ?? 0) & 4) !== 0) {
    if ((frame & 7) === (id & 7)) {
      const row = gridC[state[UNIT_Y + id] ?? 0];
      if (row && (row[state[id] ?? 0] ?? 0) === id) {
        input.onY?.(id);
      }
    }
  }

  // offset 564..599: periodic X() call.
  if ((frame & 1) === 1) {
    if (((state[UNIT_FLAGS + id] ?? 0) & 4) === 0) {
      input.onX?.(id);
    }
  }

  // Offsets 599..657. BUG FIX (2026-09-10): this was left unmodelled on the
  // note "class b's own single-entity scratch ... no confirmed reader
  // elsewhere yet", and the condition in that note was also inverted. The
  // bytecode skips the write on each of three tests and otherwise performs it:
  //   599..614  if (e[2828+v] >  9) goto 657
  //   617..631  if (e[2828+v] == 2) goto 657
  //   634..649  if (e[2828+v] == 7) goto 657
  //   652..654  K:B = 0
  // so it fires when `type <= 9 && type !== 2 && type !== 7`. K:B (#28) does
  // have readers -- b.h(int) offset 267 and b.t() offset 200 among them --
  // and it is the same field b.a() seeds with 50 and b.e()'s loop tail
  // increments. See LegacySubsystemArrays.bField28.
  {
    const guardType = state[UNIT_TYPE + id] ?? 0;
    if (guardType <= 9 && guardType !== 2 && guardType !== 7) input.onSchedulerReset?.();
  }

  // offset 657..727: dense[5050+id] bump, conditional dense[1111+id] mask.
  state[5050 + id] = (state[5050 + id] ?? 0) + 1;
  if ((state[UNIT_OFFSET_X + id] ?? 0) === 0 && (state[UNIT_OFFSET_Y + id] ?? 0) === 0) {
    state[1111 + id] = (state[1111 + id] ?? 0) & 240;
  }

  // offset 727..813: dense[3333+id] reset unless a matching action code.
  const action = state[UNIT_MODE + id] ?? 0;
  if ((state[UNIT_THOUGHT + id] ?? 0) >= 11 && action !== 39 && action !== 104 && action !== 105) {
    state[UNIT_THOUGHT + id] = -1;
  }

  return false;
}
