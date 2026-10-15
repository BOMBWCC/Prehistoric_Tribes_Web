import type { LegacyGameState } from "./LegacyGameState";

export type LegacyGameplayTickCallbacks = {
  /** f.l(int), whose resource-backed argument is not yet semantically named. */
  readonly loadMode?: (mode: number) => void;
  /** f.a(100,0,0,0), called by the v==1 maintenance counter. */
  readonly allocateMaintenanceRecord?: () => void;
  /** f.a(boolean,boolean,boolean,boolean) in the k-reset branch. */
  readonly resetSelection?: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
  /**
   * private void i() (#610, `resetLegacyZI`/`LegacyZI.ts`) -- called from
   * THREE real sites in this method's own body (bytecode offsets
   * 552..556, 655..656, 671..672): the `oInt===3` branch, the tail of
   * the `kFlag`-reset block, and the `pFlag`-gated block right after it.
   * CORRECTION (2026-08-22): all three used to call a generic `resetInput`
   * callback instead -- a plausible-sounding but bytecode-unfaithful
   * placeholder (it cleared `inputT`/`inputP`, which `i()` never touches,
   * and never cleared `iFlag`/`E`/`wFlag`/`iByte`/`tFlag`/`nInt`/
   * `staticL`/`staticM`, which it does) -- replaced with this one, wired
   * to the real method everywhere.
   */
  readonly onI?: () => void;
  readonly onAe?: () => void;
  readonly onV?: () => void;
  readonly onK?: () => void;
  readonly onStateMachine?: () => void;
  readonly onFrameUpdate?: () => void;
  readonly onFlushPending?: () => void;
};

/**
 * Evidence-backed port of the body of f.h().
 *
 * The callbacks deliberately keep unresolved callees as seams.  This mirrors
 * the bytecode without assigning gameplay meanings to their opaque tables.
 */
export function stepLegacyGameplayTick(
  game: LegacyGameState,
  callbacks: LegacyGameplayTickCallbacks = {},
): void {
  game.tickDelay = game.timingFast ? 50 : game.baseTickDelay;
  game.tickDivisor = Math.trunc(game.baseTickDelay / game.tickDelay);
  game.timingCounterE += 1;
  // Offsets 43..59: E:Z (#46) and q:Z (#355). FIXED 2026-10-08: this wrote
  // E:B (#47, game.E) and a never-read copy of q:Z.
  if (game.timingCounterE >= 6) {
    game.cEFlag = false;
    game.cQFlag = false;
  }
  if (game.timingCounterE >= 8) game.timingCounterE = 0;

  if (game.vByte === 0) {
    callbacks.onStateMachine?.();
    game.oFlag = false;
  } else if (game.vByte === 1) {
    if (game.iByte === 0) {
      game.iByte = -1;
      if (
        game.wByte !== 3 &&
        !game.frameFlags[6] &&
        !game.frameFlags[8] &&
        !game.frameFlags[7]
      ) {
        if (game.frameFlags[0]) {
          game.mByte = 0;
        } else if (game.frameFlags[4]) {
          game.mByte = 1;
          if (game.resourceByte?.(296, game.subsystemGByte) === 3) {
            game.entityJ = (120 - (game.resourceByte?.(298, game.subsystemGByte) ?? 0)) | 0;
          }
        }
      }
      game.vByte = 0;
      const modeIndex = game.resourceByte?.(306, game.mByte) ?? 0;
      callbacks.loadMode?.(game.resourceByte?.(305, modeIndex) ?? 0);
      game.Q = 25;
      game.R = 28;
      game.Z = 0;
      game.H = true;
      game.zByte = game.yByte;
      game.BByte = game.AByte;
      game.JByte = game.IByte;
      game.cameraSavedKByte = game.KByte; // L:B (#72)
    } else {
      if (game.wByte === 2 || game.wByte === 4) callbacks.onAe?.();
      else {
        callbacks.onV?.();
        callbacks.onK?.();
      }
      game.oFlag = false;
    }

    if (game.vByte === 1) {
      game.dByte += 1;
      if (game.dByte > 5) {
        game.dByte = 0;
        callbacks.allocateMaintenanceRecord?.();
      }
      if (game.E <= 4) game.E += 1;
      else if (game.E >= 0) game.nInt = 0; // n:I (#343)
      game.jByte += 1;
      callbacks.onFrameUpdate?.();
    }
  }

  game.gCounter += 1;
  game.fCounter += 1;
  if (game.fCounter >= 120) game.fCounter = 0;

  if (game.oInt < 3) {
    game.oInt += 1;
    game.nFlag = true;
  } else if (game.oInt === 3) {
    game.oInt += 1;
    callbacks.onI?.();
    game.nFlag = false;
  }

  if (game.kResetFlag) { // f.k:Z (#332), not K:Z
    game.kResetFlag = false;
    game.sCounter = 0;
    callbacks.loadMode?.(-1);
    game.pendingP = false;
    callbacks.resetSelection?.(true, true, false, false);
    game.entityFocusFlag = false;
    game.wByte = 0;
    game.kByte = 0;
    game.qCounter = 0;
    game.BCounter = 0;
    game.CCounter = 0;
    game.DCounter = 0;
    game.ECounter = 0;
    game.FByte = -1;
    callbacks.onFlushPending?.();
    game.uFlag = false;
    game.inputT = false; // t:Z (#367)
    callbacks.onI?.();
  }

  if (game.pFlag) {
    game.pFlag = false;
    callbacks.onI?.();
  }
  game.pCounter += 1;
}
