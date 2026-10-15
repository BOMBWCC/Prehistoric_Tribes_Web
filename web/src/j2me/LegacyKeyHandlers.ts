export type LegacyKeyHandlerState = {
  nGuard: boolean;
  oGuard: boolean;
  numericByte: number;
  numericHeld: boolean;
  fireHeld: boolean;
  firePressed: boolean;
  repeatCount: number;
  animationCounter: number;
  fireReleased: boolean;
  pendingRelease: boolean;
  actionUp: boolean;
  actionDown: boolean;
  actionLeft: boolean;
  actionRight: boolean;
};

export type LegacyKeyHandlerHooks = {
  /** keyPressed offset 31 / keyReleased offset 18: f.j:B (#325) = 0, the idle counter h() increments. */
  readonly onIdleReset?: () => void;
  readonly getGameAction?: (keyCode: number) => number;
  readonly numericSequence?: (keyCode: number) => void;
  readonly onStar?: () => void;
  readonly onHash?: () => void;
  /**
   * keyPressed(int)'s digit tableswitch (bytecode offsets 86..257) writes the
   * raw `i:B` field directly from the matched case (48/49/51/55/57 -> 0/1/3/7/9)
   * and additionally sets `w:Z` for every case except 48. This is the literal
   * mechanism f.W() reads via i==1 (viewport reset) and i==3 (entity action
   * confirm, f.a(20,1,0)); it is distinct from the separate always-called
   * f.m(int) numeric-sequence hook below.
   */
  readonly onDigitLatch?: (value: number, holdW: boolean) => void;
  /** keyReleased(int)'s matching tableswitch clears `w:Z` for 49/51/55/57 only. */
  readonly onDigitRelease?: () => void;
};

/** Exact protected keyPressed(int) port, with raw field names translated only for clarity. */
export function legacyKeyPressed(
  state: LegacyKeyHandlerState,
  keyCode: number,
  hooks: LegacyKeyHandlerHooks = {},
): void {
  if (state.nGuard || state.oGuard) return;
  state.oGuard = true;
  if (keyCode === -10) return;
  hooks.onIdleReset?.();

  if (keyCode === -6 || keyCode === 6 || keyCode === 42) {
    hooks.onStar?.();
    return;
  }
  if (keyCode === -7 || keyCode === 7 || keyCode === 35) {
    hooks.onHash?.();
    return;
  }

  switch (keyCode) {
    case 48: state.numericByte = 0; hooks.onDigitLatch?.(0, false); break;
    case 49: state.numericByte = 1; state.numericHeld = true; hooks.onDigitLatch?.(1, true); break;
    case 51: state.numericByte = 3; state.numericHeld = true; hooks.onDigitLatch?.(3, true); break;
    case 55: state.numericByte = 7; state.numericHeld = true; hooks.onDigitLatch?.(7, true); break;
    case 57: state.numericByte = 9; state.numericHeld = true; hooks.onDigitLatch?.(9, true); break;
    default: break;
  }
  // f.m(int) is invoked for every keyCode once f's constructor/run() flags (a,y)
  // are both true, which is permanently the case after boot; it is a separate
  // effect from the digit latch above, not gated to these five keyCodes.
  hooks.numericSequence?.(keyCode);

  let action = 666;
  try {
    action = hooks.getGameAction?.(keyCode) ?? 666;
  } catch {
    action = 666;
  }
  if (action === 8 || keyCode === 53) {
    state.firePressed = true;
    state.fireHeld = true;
    state.repeatCount += 1;
    if (!state.fireReleased) state.animationCounter = 0;
    return;
  }
  if (action === 1 || keyCode === 50) state.actionUp = true;
  else if (action === 6 || keyCode === 56) state.actionDown = true;
  else if (action === 2 || keyCode === 52) state.actionLeft = true;
  else if (action === 5 || keyCode === 54) state.actionRight = true;
}

/** Exact protected keyReleased(int) port. */
export function legacyKeyReleased(
  state: LegacyKeyHandlerState,
  keyCode: number,
  hooks: Pick<LegacyKeyHandlerHooks, "getGameAction" | "onDigitRelease" | "onIdleReset"> = {},
): void {
  if (state.nGuard || keyCode === -10) return;
  hooks.onIdleReset?.();
  if (keyCode === 49 || keyCode === 51 || keyCode === 55 || keyCode === 57) {
    state.numericHeld = false;
    hooks.onDigitRelease?.();
  }

  let action = 666;
  try {
    action = hooks.getGameAction?.(keyCode) ?? 666;
  } catch {
    action = 666;
  }
  if (keyCode === 53 || action === 8) {
    state.firePressed = false;
    if (state.animationCounter < 4) state.fireReleased = true;
  }
  if (state.oGuard) {
    state.pendingRelease = true;
    return;
  }
  if (keyCode === 50 || action === 1) state.actionUp = false;
  else if (keyCode === 56 || action === 6) state.actionDown = false;
  else if (keyCode === 52 || action === 2) state.actionLeft = false;
  else if (keyCode === 54 || action === 5) state.actionRight = false;
}
