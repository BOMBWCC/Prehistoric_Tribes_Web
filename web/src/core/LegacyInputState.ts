import { OriginalKey, type OriginalKeyName } from "../platform/Input";
import { legacyKeyPressed, legacyKeyReleased, type LegacyKeyHandlerState } from "./LegacyKeyHandlers";

export const LegacyGameAction = {
  UP: 1,
  LEFT: 2,
  DOWN: 6,
  RIGHT: 5,
  FIRE: 8,
} as const;

export type LegacyInputHooks = {
  readonly onSelectionKey?: (rawKeyCode: number) => void;
  readonly onKeyPressed?: (rawKeyCode: number) => void;
  readonly onKeyReleased?: (rawKeyCode: number) => void;
  readonly onStar?: () => void;
  readonly onHash?: () => void;
  /**
   * keyReleased(int)'s own `p:Z`(#351)=true set point (offset 226..230,
   * taken when `o:Z`/repeat-guard is already held). CORRECTION (2026-08-22):
   * this used to be a same-tick `onDeferredReset` hook calling two
   * bytecode-unverified functions -- but `p:Z` is a shared field also read
   * by `private void h()` (`stepLegacyGameplayTick`'s already-correct
   * `pFlag` block), which clears it and calls the real `i()`(#610) on the
   * NEXT tick, not synchronously at release time. This hook now only
   * forwards the flag set (`game.pFlag = true`); the actual reset is
   * `stepLegacyGameplayTick`'s job.
   */
  readonly onPendingRelease?: () => void;
  /** keyPressed(int)'s digit tableswitch write to raw fields `i:B`/`w:Z`. */
  readonly onDigitLatch?: (value: number, holdW: boolean) => void;
  /** keyReleased(int)'s matching `w:Z` clear for digits 1/3/7/9. */
  readonly onDigitRelease?: () => void;
  /** f.j:B (#325) = 0 on an accepted press/release; the field itself is game.jByte. */
  readonly onIdleReset?: () => void;
  /** f.n:Z (#344), kept by h() (true for the 3 ticks after o:I resets); keyPressed/keyReleased return
   *  at once while it is set. The input layer's own nGuard was never written (oracle 2026-10-08). */
  readonly nFlag?: () => boolean;
};

/** Raw field mirror of f.keyPressed/keyReleased(). */
export class LegacyInputState {
  nGuard = false;
  repeatGuard = false;
  directionByte = -1;
  directionHeld = false;
  pendingRelease = false;
  fireHeld = false;
  commandHeld = false;
  actionUp = false;
  actionLeft = false;
  actionDown = false;
  actionRight = false;
  softLeft = false;
  softRight = false;
  specialMode = false;
  transientFire = false;
  animationCounter = 4;
  repeatCounter = 0;
  transitionByte = 0;
  readonly rawState: LegacyKeyHandlerState = {
    nGuard: false,
    oGuard: false,
    numericByte: -1,
    numericHeld: false,
    fireHeld: false,
    firePressed: false,
    repeatCount: 0,
    animationCounter: 4,
    fireReleased: false,
    pendingRelease: false,
    actionUp: false,
    actionDown: false,
    actionLeft: false,
    actionRight: false,
  };

  constructor(private readonly hooks: LegacyInputHooks = {}) {}

  press(key: OriginalKeyName): void {
    const raw = rawCode(key);
    this.nGuard = this.hooks.nFlag?.() ?? this.nGuard;
    syncIntoRaw(this);
    const accepted = !this.rawState.nGuard && !this.rawState.oGuard && raw !== -10;
    legacyKeyPressed(this.rawState, raw, {
      getGameAction: () => gameAction(key),
      numericSequence: this.hooks.onSelectionKey,
      onStar: () => { this.softLeft = true; this.hooks.onStar?.(); },
      onHash: () => { this.softRight = true; this.hooks.onHash?.(); },
      onDigitLatch: this.hooks.onDigitLatch,
      onIdleReset: this.hooks.onIdleReset,
    });
    syncFromRaw(this);
    if (accepted) this.hooks.onKeyPressed?.(raw);
  }

  release(key: OriginalKeyName): void {
    const raw = rawCode(key);
    this.nGuard = this.hooks.nFlag?.() ?? this.nGuard;
    syncIntoRaw(this);
    // f.keyReleased() performs FIRE's t/v writes before checking the
    // repeat-guard o. Direction releases return through pending p while o
    // is set and must not clear e/f/g/h yet.
    const wasGuarded = this.rawState.oGuard;
    const wasPending = this.rawState.pendingRelease;
    legacyKeyReleased(this.rawState, raw, { getGameAction: () => gameAction(key), onDigitRelease: this.hooks.onDigitRelease, onIdleReset: this.hooks.onIdleReset });
    if (!wasPending && this.rawState.pendingRelease) this.hooks.onPendingRelease?.();
    syncFromRaw(this);
    if (!this.rawState.nGuard && raw !== -10 && (raw === 53 || !wasGuarded)) {
      this.hooks.onKeyReleased?.(raw);
    }
  }

  /**
   * o:Z (#347) = false. Only h() clears it (LegacyGameplayTick's onClearO); until 2026-10-16 every
   * tick did, so after the '0' help key (whose h() branch leaves it set) the next key went through
   * where the original drops it, and a release could not set p:Z (oracle, frame 24035).
   */
  clearRepeatGuard(): void {
    this.repeatGuard = false;
    this.rawState.oGuard = false;
  }

  endTick(): void {
    const deferred = this.pendingRelease || this.rawState.pendingRelease;
    // The real reset-on-deferred-release effect now lives entirely in
    // `game.pFlag` (set via onPendingRelease, consumed by
    // stepLegacyGameplayTick on the next tick) -- this only keeps the
    // input-local mirror fields (unread outside this file) self-consistent.
    if (deferred) clearDeferredInputState(this);
    syncFromRaw(this);
  }
}

function clearDeferredInputState(state: LegacyInputState): void {
  state.softLeft = false;
  state.softRight = false;
  state.actionUp = false;
  state.actionDown = false;
  state.actionLeft = false;
  state.actionRight = false;
  state.specialMode = false;
  state.transientFire = false;
  state.fireHeld = false;
  state.commandHeld = false;
  state.directionByte = -1;
  state.directionHeld = false;
  state.pendingRelease = false;
  state.animationCounter = 4;
  state.repeatCounter = 0;
  state.rawState.numericByte = -1;
  state.rawState.numericHeld = false;
  state.rawState.fireHeld = false;
  state.rawState.firePressed = false;
  state.rawState.repeatCount = 0;
  state.rawState.animationCounter = 4;
  state.rawState.fireReleased = false;
  state.rawState.pendingRelease = false;
  state.rawState.actionUp = false;
  state.rawState.actionDown = false;
  state.rawState.actionLeft = false;
  state.rawState.actionRight = false;
}

function rawCode(key: OriginalKeyName): number {
  switch (key) {
    case OriginalKey.DIGIT_0: return 48;
    case OriginalKey.DIGIT_1: return 49;
    case OriginalKey.DIGIT_3: return 51;
    case OriginalKey.DIGIT_7: return 55;
    case OriginalKey.DIGIT_9: return 57;
    case OriginalKey.FIRE: return 53;
    case OriginalKey.SOFT_LEFT: return -6;
    case OriginalKey.SOFT_RIGHT: return -7;
    case OriginalKey.UP: return 50;
    case OriginalKey.LEFT: return 52;
    case OriginalKey.RIGHT: return 54;
    case OriginalKey.DOWN: return 56;
    default: return -10;
  }
}

function syncIntoRaw(state: LegacyInputState): void {
  state.rawState.nGuard = state.nGuard;
  state.rawState.oGuard = state.repeatGuard;
  state.rawState.numericByte = state.directionByte;
  state.rawState.numericHeld = state.directionHeld;
  state.rawState.fireHeld = state.fireHeld;
  state.rawState.firePressed = state.specialMode;
  state.rawState.repeatCount = state.repeatCounter;
  state.rawState.animationCounter = state.animationCounter;
  state.rawState.fireReleased = state.transientFire;
  state.rawState.pendingRelease = state.pendingRelease;
  state.rawState.actionUp = state.actionUp;
  state.rawState.actionDown = state.actionDown;
  state.rawState.actionLeft = state.actionLeft;
  state.rawState.actionRight = state.actionRight;
}

function syncFromRaw(state: LegacyInputState): void {
  state.repeatGuard = state.rawState.oGuard;
  state.directionByte = state.rawState.numericByte;
  state.directionHeld = state.rawState.numericHeld;
  state.fireHeld = state.rawState.fireHeld;
  state.specialMode = state.rawState.firePressed;
  state.repeatCounter = state.rawState.repeatCount;
  state.animationCounter = state.rawState.animationCounter;
  state.transientFire = state.rawState.fireReleased;
  state.pendingRelease = state.rawState.pendingRelease;
  state.actionUp = state.rawState.actionUp;
  state.actionDown = state.rawState.actionDown;
  state.actionLeft = state.rawState.actionLeft;
  state.actionRight = state.rawState.actionRight;
}

function gameAction(key: OriginalKeyName): number {
  switch (key) {
    case OriginalKey.UP: return LegacyGameAction.UP;
    case OriginalKey.LEFT: return LegacyGameAction.LEFT;
    case OriginalKey.DOWN: return LegacyGameAction.DOWN;
    case OriginalKey.RIGHT: return LegacyGameAction.RIGHT;
    case OriginalKey.FIRE: return LegacyGameAction.FIRE;
    default: return 666;
  }
}
