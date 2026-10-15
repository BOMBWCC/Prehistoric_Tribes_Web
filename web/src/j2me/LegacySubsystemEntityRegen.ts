import { stepLegacySubsystemEntityHpGate } from "./LegacySubsystemEntityHpGate";
import { stepLegacySubsystemEntityRRoll } from "./LegacySubsystemEntityRRoll";

/**
 * Direct translation of `private boolean q()` (constant pool #410),
 * bytecode/b-javap.txt offsets 0..776 (line 35902). Its only caller is
 * `private boolean a()`'s own continuation (`LegacyEntityStatusGuard.ts`,
 * offset 401: `if (!q()) return true;`).
 *
 * **RETRACTED (2026-09-07)** -- the level-12 milestone branch (offset
 * 414..534) previously called `changeEntityType(id,69)` and then stopped,
 * standing in a fake guaranteed-null-deref for the rest on the claim that
 * `A()` (`LegacyRuntimeState.subsystemEntityAAlert`) throws 100% of the
 * time via class `b`'s `b:[S]` (#132). That field is not null (see
 * `LegacySubsystemEntityRRoll.ts`'s docblock for the full derivation --
 * `b.b:[S]` is `f.b:[S]` copied in `b.a(f)`, allocated and filled by
 * `e.f()`, live as `LegacyRuntimeState.saveOffsets`), so the four real
 * writes bytecode makes right after that call (offsets 428..534) were
 * being skipped for every entity that ever reaches level 12. Restored
 * below; `A()` itself is a separate method with its own still-open
 * retraction (its "throw" is `subsystemEntityAAlert`'s own premise, not
 * this file's) -- left as the `onA` callback, wired the same way the
 * OTHER confirmed call site of `A()` already is (`LegacyRuntimeState.ts`'s
 * `stepEntityDecisionCheck`, `onA: () => this.subsystemEntityAAlert(id)`),
 * rather than re-inlining a duplicate of its stub here.
 *
 * Structure:
 *  1. `dense[6666+id] < (team===0?125:50)`: too early, returns `true`
 *     immediately (no regen tick yet).
 *  2. Otherwise: resets `dense[6666+id]=0`, `dense[1414+id]+=1` (LEVEL UP),
 *     computes `aJ = table(97,dense[1414+id]) + randomRemainder(255,5) -
 *     2` (adjusted by `+1` when `aJ<=0`, else `-1`, when
 *     `dense[1515+id]===1`), then `dense[6767+id] = clamp(dense[6767+id]+
 *     aJ, 0, table(98,dense[1414+id]))` -- this is the real producer of
 *     `dense[6767+id]` this session's earlier AI-cluster investigation
 *     flagged as "not a fixed maxHP": it's a level-scaled regen ceiling
 *     that grows with `aJ`, and when `aJ>0`, `dense[1919+id]` (HP) is
 *     bumped by the same `aJ` (with a narrow extra decrement on
 *     `dense[1010+id]` under further conditions).
 *  3. `if (!s()) return false` (`LegacySubsystemEntityHpGate.ts`).
 *  4. `dense[1414+id]===12` (reaches the level-12 milestone): calls
 *     `changeEntityType(id,69)`, then `A()` (`onA`, not derived here --
 *     see the retraction note above), then (offsets 428..534, newly
 *     restored) `dense[6464+id]=69`, `dense[3030+id]=20`,
 *     `dense[3131+id]=dense[6262+id]=dense[id]` (captured once, before
 *     either write), `dense[3232+id]=dense[6363+id]=dense[101+id]`
 *     (same capture-once shape).
 *  5. `dense[1414+id]===12 || ===35`: calls the unresolved class-`f`
 *     method `f.b(byte)` (`onLevelMilestone`, not derived).
 *  6. `dense[1414+id]===11` and self-occupying its own cell and
 *     `dense[1313+id]>=0`: sets `dense[6161+id]=3`,
 *     `changeEntityType(id,59)`.
 *  7. `if (!r()) return false` (`LegacySubsystemEntityRRoll.ts`).
 *  8. `dense[7979+id]&8`: a small `dense[8181+id]` counter that clears
 *     bit3 of `dense[7979+id]` once it reaches `120`.
 *  9. Returns `true`.
 */
export type LegacySubsystemEntityRegenInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly entityId: number;
  readonly team: number;
  readonly frame: number;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** f.q:B (#211), tracked elsewhere in this port as `game.qByte`; forwarded to `r()`. */
  readonly fQByte: number;
  /** b.b:[S] (#132) -- see `LegacySubsystemEntityRRoll.ts`'s docblock; forwarded to `r()`, not read directly here. */
  readonly bShort: Int16Array | null;
  /** b.c:[S] (#142) -- `LegacyRuntimeState.sectionOffsets`; forwarded to `r()`, not read directly here. */
  readonly shortTableBOffsets: Int16Array;
  /** f.L:Z (#73), tracked elsewhere in this port as `game.outerLoopLFlag`; forwarded to `r()`. */
  readonly outerLoopLFlag: boolean;
  readonly onChangeType?: (id: number, type: number) => void;
  /** private void f.b(byte) -- confirmed real call, not derived. */
  readonly onLevelMilestone?: (id: number) => void;
  /** private void a(int,int,int,byte) (#283) -- same unresolved vacate helper LegacySubsystemEntityHpGate.ts uses. */
  readonly onVacate?: (kind: number, x: number, y: number, id: number) => void;
  /** private boolean a(int,int) (#294) -- same unresolved helper LegacySubsystemEntityRRoll.ts uses. */
  readonly onRandomAction?: (id: number, mode: number) => void;
  /**
   * private void A() (`LegacyRuntimeState.subsystemEntityAAlert`) -- a real,
   * separate method with its own open retraction (its guaranteed-throw
   * finding rests on the SAME now-disproven `b:[S]`#132 premise, but fixing
   * its body is out of scope here). Wired the same way the other confirmed
   * `A()` call site is (`stepEntityDecisionCheck`'s `onA`).
   */
  readonly onA?: (id: number) => void;
  /** b's own `final void a(byte,int,int)` (#274) -- `LegacyEntityMoveTrigger.ts`'s target, forwarded to `r()`. */
  readonly onMove?: (action: number, id: number, idAgain: number) => void;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function stepLegacySubsystemEntityRegen(input: LegacySubsystemEntityRegenInput): boolean {
  const { state, packedBytes, packedOffsets, gridC, entityId: id, team, frame } = input;

  // Offset 27: `if_icmplt 583` -- below the threshold only the birthday block
  // (31..582) is skipped; the age-11 check, r() and the 7979&8 tail still run.
  // CORRECTED 2026-09-15: the port returned true here, so r() (hunger and
  // tiredness) only ran on birthdays.
  if ((state[6666 + id] ?? 0) >= (team === 0 ? 125 : 50)) {
    if (!stepBirthday(input)) return false;
  }

  // Offsets 584..676: `gridC[y][x] != v` (if_icmpeq 677 skips when it IS the
  // unit) -- CORRECTED 2026-09-15, was inverted.
  if ((state[1414 + id] ?? 0) === 11) {
    const row = gridC[state[101 + id] ?? 0];
    if ((row?.[state[id] ?? 0] ?? 0) !== id && (state[1313 + id] ?? 0) >= 0) {
      state[6161 + id] = 3;
      input.onChangeType?.(id, 59);
    }
  }

  if (!stepLegacySubsystemEntityRRoll({
    state, packedBytes, packedOffsets, entityId: id, frame, team,
    fQByte: input.fQByte,
    bShort: input.bShort,
    shortTableBOffsets: input.shortTableBOffsets,
    outerLoopLFlag: input.outerLoopLFlag,
    onRandomAction: input.onRandomAction,
    onMove: input.onMove,
    onS: () => stepLegacySubsystemEntityHpGate({ state, gridC, entityId: id, onVacate: input.onVacate }),
  })) {
    return false;
  }

  if (((state[7979 + id] ?? 0) & 8) !== 0) {
    state[8181 + id] = (state[8181 + id] ?? 0) + 1;
    if ((state[8181 + id] ?? 0) >= 120) {
      state[8181 + id] = 0;
      state[7979 + id] = (state[7979 + id] ?? 0) & 247;
    }
  }

  return true;
}

/** Offsets 31..582: one year older, max-HP change, s(), the 12/35 milestones. */
function stepBirthday(input: LegacySubsystemEntityRegenInput): boolean {
  const { state, packedBytes, packedOffsets, gridC, entityId: id } = input;
  state[6666 + id] = 0;
  state[1414 + id] = (state[1414 + id] ?? 0) + 1;
  const level = state[1414 + id] ?? 0;

  let aJ = table(packedBytes, packedOffsets, 97, level) + input.randomRemainder(255, 5) - 2;
  if ((state[1515 + id] ?? 0) === 1) {
    aJ += aJ <= 0 ? 1 : -1;
  }

  state[6767 + id] = clamp((state[6767 + id] ?? 0) + aJ, 0, table(packedBytes, packedOffsets, 98, level));

  if (aJ > 0) {
    state[1919 + id] = (state[1919 + id] ?? 0) + aJ;
    if (
      (state[6767 + id] ?? 0) >= 55 &&
      (state[6767 + id] ?? 0) - aJ < 55 &&
      (state[1010 + id] ?? 0) > 6 &&
      (state[202 + id] ?? 0) === 0 &&
      (state[303 + id] ?? 0) === 0
    ) {
      state[1010 + id] = (state[1010 + id] ?? 0) - 1;
    }
  }

  state[1919 + id] = clamp(state[1919 + id] ?? 0, 0, state[6767 + id] ?? 0);

  if (!stepLegacySubsystemEntityHpGate({ state, gridC, entityId: id, onVacate: input.onVacate })) {
    return false;
  }

  if (level === 12) {
    input.onChangeType?.(id, 69);
    input.onA?.(id);
    state[6464 + id] = 69;
    state[3030 + id] = 20;
    const idValue = state[id] ?? 0;
    state[3131 + id] = idValue;
    state[6262 + id] = idValue;
    const cellValue = state[101 + id] ?? 0;
    state[3232 + id] = cellValue;
    state[6363 + id] = cellValue;
  }

  if (level === 12 || level === 35) {
    input.onLevelMilestone?.(id);
  }

  return true;
}
