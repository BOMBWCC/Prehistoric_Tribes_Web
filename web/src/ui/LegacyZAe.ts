/**
 * Direct translation of `private void ae()` (bytecode/f-javap.txt offsets
 * 0..461, line 22143), NOT the unrelated UPPERCASE `f.aE()` already ported
 * as `stepLegacyAe` (a tiny 5-tick timer with completely different
 * content -- confirmed via direct bytecode read, case-sensitive
 * collision). This is the sole caller of `af()` (own offset 442) and one
 * of ten+ callers of `i()` (`resetLegacyZI`, `LegacyZI.ts`).
 *
 * Structure: a cooldown gate (`nInt`, offset 0..13, semantics not fully
 * traced -- nothing in this method increments it, so its real driver is
 * elsewhere), then four mutually-exclusive cursor/counter branches
 * (`inputLeft`/`inputRight`/`inputUp`/`inputDown`, each additionally
 * gated on `j:B!==1` for left/right or `gameplaySFlag` for up/down), and
 * finally the `af()`/`ah()` trigger check (`iFlag` or the static
 * `staticL`).
 *
 * CORRECTION (2026-08-22): the state fields below used to be a cluster of
 * brand-new `zCursor*`/`zAfTrigger*`/`zScratch*`/`zStatic*` names invented
 * without checking for existing bindings first -- every one of them
 * turned out to already be a canonical, actively-wired `game.*` field
 * from unrelated earlier work (`e:Z`/`f:Z`/`g:Z`/`h:Z` = `inputUp`/
 * `inputDown`/`inputLeft`/`inputRight`, `i:Z` = `iFlag`, `v:Z` = `inputV`,
 * `E:B` = `game.E`, `n:I` = `nInt`, `Y:I` = `zlYInt`, `S:Z` =
 * `gameplaySFlag`, static `l:Z`/`m:Z` = `staticL`/`staticM`). See
 * `LegacyZI.ts`'s own docblock and `docs/unknowns.md`'s 2026-08-22 entry
 * for the full site-by-site proof. Only `V:Z`(#109, UPPERCASE, distinct
 * from lowercase `v:Z`/`inputV`) and `au:B`(#224) were genuinely new.
 */
export type LegacyZAeState = {
  nInt: number;
  inputLeft: boolean;
  inputRight: boolean;
  inputUp: boolean;
  inputDown: boolean;
  /** j:B (#325), already tracked elsewhere as... not yet -- raw here. */
  jByte: number;
  as: number;
  aX: number;
  aW: number;
  ar: number;
  V: boolean;
  gameplaySFlag: boolean;
  selectionFlags: readonly boolean[];
  /** f.Q:Z (#92) / f.R:Z (#95): the dialogue list is at its top / end. */
  QFlag: boolean;
  RFlag: boolean;
  /** f.y:I (#388), lowercase: the dialogue scroll row (offsets 208..213, 311..316). */
  y: number;
  zlYInt: number;
  s: Int8Array;
  at: number;
  tiles: readonly (readonly Int8Array[])[];
  zScratchAuByte: number;
  r: Int8Array;
  iFlag: boolean;
  staticL: boolean;
  inputV: boolean;
  E: number;
  wByte: number;
  staticM: boolean;
};

export type LegacyZAeCallbacks = {
  readonly onAi?: () => void;
  readonly onL?: (value: number) => void;
  readonly onAf?: () => void;
  readonly onAh?: () => void;
};

export function stepLegacyZAe(state: LegacyZAeState, callbacks: LegacyZAeCallbacks = {}): void {
  if (state.nInt > 1) {
    state.nInt = 0;
    return;
  }

  if (state.inputLeft && state.jByte !== 1) {
    if (state.as < 0) return;
    if (state.as > 0) state.as -= 1;
    if (state.as < state.aX) state.aX -= 1;
    state.V = false;
    callbacks.onAi?.();
    return;
  }

  if (state.inputRight && state.jByte !== 1) {
    if (state.as >= state.ar - 1) return;
    if (!(state.as < state.aW - 1) && state.as - state.aX === state.aW - 1) {
      state.aX += 1;
    }
    state.as += 1;
    state.V = false;
    callbacks.onAi?.();
    return;
  }

  if (state.inputUp && state.gameplaySFlag) {
    if (state.selectionFlags[6]) {
      if (state.QFlag) return;
      state.y -= 1;
      return;
    }
    if ((state.s[state.as] ?? 0) >= state.at) return;
    state.s[state.as] = (state.s[state.as] ?? 0) + 1;
    const row = state.tiles[0]?.[state.zScratchAuByte];
    if (row) row[state.r[state.as] ?? 0] = state.s[state.as] ?? 0;
    return;
  }

  if (state.inputDown && state.gameplaySFlag) {
    if (state.selectionFlags[6]) {
      if (state.RFlag) return;
      state.y += 1;
      return;
    }
    if ((state.s[state.as] ?? 0) <= 0) return;
    state.s[state.as] = (state.s[state.as] ?? 0) - 1;
    const row = state.tiles[0]?.[state.zScratchAuByte];
    if (row) row[state.r[state.as] ?? 0] = state.s[state.as] ?? 0;
    return;
  }

  if (state.iFlag || state.staticL) {
    state.iFlag = false;
    state.staticL = false;
    state.inputV = false;
    state.E = 4;
    if (state.wByte === 4 && state.zlYInt === 3) {
      callbacks.onL?.(-2);
      return;
    }
    if (state.zlYInt === 4) return;
    callbacks.onAf?.();
    return;
  }

  if (state.staticM) {
    state.staticM = false;
    callbacks.onAh?.();
  }
}
