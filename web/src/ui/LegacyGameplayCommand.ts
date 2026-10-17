import type { LegacyGameState } from "../core/LegacyGameState";

export type LegacyGameplayCommandCallbacks = {
  readonly onSelectionPreset?: () => void;
  readonly onZ?: () => void;
  readonly onL?: (value: number) => void;
  readonly onViewportReset?: () => void;
  readonly onEntityActionStart?: (ap: number, am: number, an: number) => void;
  readonly onExitPreparation?: () => void;
  /**
   * private void i() (#610), offset 391 -- the method's own LAST
   * instruction, called unconditionally right after `onExitPreparation`
   * (`E():V`, offset 386) in the `iByte===3`, non-`qByte===3` branch.
   * Found missing entirely (2026-08-22) while auditing this session's
   * other `i()` call sites, not just miswired like those.
   */
  readonly onI?: () => void;
};

/** Exact proven prefix of private f.W(), retaining opaque callees as hooks. */
export function stepLegacyGameplayCommand(
  game: LegacyGameState,
  callbacks: LegacyGameplayCommandCallbacks = {},
): void {
  if (game.staticL) {
    game.staticL = false;
    if (game.barMode !== 3) {
      callbacks.onSelectionPreset?.();
      game.barMode = 2;
      callbacks.onZ?.();
    }
    return;
  }
  if (game.staticM) {
    game.staticM = false;
    if (game.barMode === 3) {
      // BUG FIX (2026-08-18): this write is `s:I` (#364, `game.cSInt` --
      // the SAME field `stepLegacyC2`/`stepLegacyX`/`stepLegacyL` already
      // share, confirmed via direct bytecode read: `putfield #364` right
      // before the `l(-1)` call below), not `game.sByte` (a genuinely
      // different, separately-tracked `s:B` field used elsewhere in this
      // codebase for persisted-record decoding) -- a real field mix-up
      // between two fields that only share the letter "s".
      game.cSInt = 0;
      callbacks.onL?.(-1);
    } else if (game.barMode === 1 || game.selectionGroup !== -1) {
      game.kResetFlag = true; // f.k:Z (#332)
      return;
    } else {
      game.loopMode = 0;
      game.screen = game.mission < 7 ? (game.tByte > -1 ? 10 : 11) : (game.wFlag ? 10 : 11);
      game.R = 28;
      game.Z = 0;
      game.H = true;
      game.XFlag = false;
      game.zByte = game.cursorColumn;
      game.BByte = game.cursorRow;
      game.JByte = game.cameraColumn;
      game.cameraSavedKByte = game.cameraRow; // L:B (#72)
    }
    return;
  }

  if (game.digitKey === 1) {
    game.digitKey = -1;
    if (game.ayByte === 1) {
      game.ayByte = 0;
      callbacks.onViewportReset?.();
      game.AFlag = true;
    }
    return;
  }
  if (game.digitKey === 3) {
    game.digitKey = -1;
    if (game.mission === 3) callbacks.onEntityActionStart?.(20, 1, 0);
    else {
      game.loopMode = 0;
      game.screen = 19;
      game.H = true;
      game.vInt = -1;
      game.zAd14QFlag = true;
      game.zAd14RFlag = true;
      game.cFlag = true;
      game.zByte = game.cursorColumn;
      game.BByte = game.cursorRow;
      game.JByte = game.cameraColumn;
      game.cameraSavedKByte = game.cameraRow; // L:B (#72)
      callbacks.onExitPreparation?.();
      callbacks.onI?.();
    }
  }
}
