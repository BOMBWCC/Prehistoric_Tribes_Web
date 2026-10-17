import type { LegacyGameState } from "../core/LegacyGameState";
import { classifyLegacyNegativeEntity, classifyLegacyPositiveEntity } from "../render/LegacyEntityClassifiers";
import { UNIT_Y } from "../core/DenseLayout";

export type LegacyGameplayInputCallbacks = {
  readonly onW?: () => void;
  readonly onAF?: () => void;
  readonly onAE?: () => void;
  readonly onAG?: () => void;
  readonly onAH?: () => void;
  readonly onAL?: () => void;
  readonly onClearSelection?: () => void;
  /** private void d(byte) -- `classify(cell)===0` / `classify(cWByte)===0` targets. */
  readonly onD?: (arg: number) => void;
  /** private void e(byte) -- `wByte===1` targets (both the 51..100-range and the classify!=0 cases). */
  readonly onE?: (arg: number) => void;
  /** private void f(byte) -- the `wByte===0` target. */
  readonly onF?: (arg: number) => void;
  /** private void X() -- the `wByte===3` target; stepLegacyX's own real caller. */
  readonly onXDispatch?: () => void;
  /** private void Y() (f.Y(), camera-follow) -- V()'s own unconditional tail call. */
  readonly onY?: () => void;
};

/**
 * Exact state writes and branch order from private f.V()'s prefix.
 *
 * Correction (2026-08-14): the trailing branch was originally modeled as
 * `else if (wByte===3) { FByte = -1; }`, which is wrong two ways, found
 * while tracing f.aE()'s only caller (bytecode/f-javap.txt offsets
 * 0..111): the raw bytecode's three branches (aF / aE / this one) are a
 * plain if/else-if/else -- this third branch is an UNCONDITIONAL else,
 * reached whenever the first two don't match (including `inputT===false`
 * with any wByte, a case the old `wByte===3` guard silently dropped
 * entirely). And the value it writes (`iconst_0`, confirmed via constant
 * pool index #52, `F:I`) is `0`, not `-1` -- and it's a DIFFERENT field
 * from `FByte` (`F:B`, #50; the two only share the source name "F"). See
 * gameplay-paint-cluster.md's "f.aE()'s F:I/F:B conflation" section.
 *
 * 2026-08-18: added the real `v:Z`/`inputV`-gated movement/target dispatch
 * (bytecode offsets 111..384) and the method's unconditional tail
 * (offsets 386..437, `aL()` then a conditional `Y()`/camera-follow call).
 * Found and fixed a real pre-existing bug in the process: the old code's
 * `if (!game.inputV) return;` early-return skipped `onAL`/`aL()` and the
 * `Y()`/`ad`/`ae` tail entirely whenever `inputV` was false -- but the
 * real bytecode calls `aL()` and evaluates the `Y()` gate UNCONDITIONALLY
 * at offset 386, regardless of `v:Z`. `game.E` (`E:B` #47) -- CONFIRMED
 * 2026-08-18 via direct bytecode read (offset 123..125: `iconst_4;
 * putfield #47 // Field E:B`, right after the `v:Z` gate this whole
 * block is under), matching `LegacyRuntimeState.ts`'s existing
 * `keyPressed`/`keyReleased` handling (`E=0` on FIRE press, `E<4`
 * checked on release to arm `inputV`) -- this write resets it to a
 * "consumed" state, and it is never read again within this method's own
 * remaining branches.
 */
export function stepLegacyGameplayInput(
  game: LegacyGameState,
  dense: Int8Array,
  map: readonly (Int8Array | undefined)[],
  callbacks: LegacyGameplayInputCallbacks = {},
): void {
  callbacks.onW?.();
  if (game.boxSelecting && game.iFlag) {
    game.iFlag = false;
    callbacks.onAF?.();
  } else if (game.inputT && game.barMode !== 3) {
    game.iFlag = false;
    callbacks.onAE?.();
  } else {
    game.aeTimerF = 0;
  }
  if (game.inputI >= 4 && game.barMode === 1) callbacks.onAG?.();
  else if (game.inputI > 0 && game.inputI < 4 && !game.wFlag) callbacks.onAH?.();

  if (game.inputV) {
    game.inputV = false;
    game.E = 4;
    game.iFlag = false;
    callbacks.onClearSelection?.();

    const cell = map[game.cameraRow + game.cursorRow]?.[game.cameraColumn + game.cursorColumn] ?? 0;
    const w = game.barMode;
    const target = game.hoverUnit;

    if (w === 1 && target >= 51 && target <= 100) {
      game.cursorColumn = (dense[0 + target] ?? 0) - game.cameraColumn;
      game.cursorRow = (dense[UNIT_Y + target] ?? 0) - game.cameraRow;
      callbacks.onE?.(target);
    } else if (w === 1 && classifyLegacyPositiveEntity(cell) !== 0) {
      callbacks.onE?.(cell);
    } else if (w === 3) {
      callbacks.onXDispatch?.();
    } else if (classifyLegacyPositiveEntity(cell) === 0) {
      callbacks.onD?.(cell);
    } else if (w === 0 && classifyLegacyNegativeEntity(cell) === 0) {
      callbacks.onF?.(-cell);
    } else if (classifyLegacyPositiveEntity(target) === 0) {
      callbacks.onD?.(target);
      game.cursorColumn = (dense[0 + target] ?? 0) - game.cameraColumn;
      game.cursorRow = (dense[UNIT_Y + target] ?? 0) - game.cameraRow;
    }

    game.cEFlag = true; // E:Z (#46)
    game.animStep = 0;
  }

  callbacks.onAL?.();
  if (game.columnScrollDelta === 0 && game.rowScrollDelta === 0 && !game.cameraCFlag) {
    callbacks.onY?.();
    game.ad = game.columnScrollDelta * 11;
    game.ae = game.rowScrollDelta * 8;
  }
}
