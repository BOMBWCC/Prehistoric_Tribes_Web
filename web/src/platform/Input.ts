export class KeyState {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();

  press(code: string): void {
    this.held.add(code);
    this.pressed.add(code);
  }

  release(code: string): void {
    this.held.delete(code);
    this.released.add(code);
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  endTick(): void {
    this.pressed.clear();
    this.released.clear();
  }
}

/** The key codes and game-action values observed in f.keyPressed/keyReleased. */
export const OriginalKey = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  FIRE: "FIRE",
  SOFT_LEFT: "SOFT_LEFT",
  SOFT_RIGHT: "SOFT_RIGHT",
  DIGIT_0: "DIGIT_0",
  DIGIT_1: "DIGIT_1",
  DIGIT_3: "DIGIT_3",
  DIGIT_7: "DIGIT_7",
  DIGIT_9: "DIGIT_9",
} as const;

export type OriginalKeyName = (typeof OriginalKey)[keyof typeof OriginalKey];

// Browser keys (KeyboardEvent.code) -> the phone's keys. Directions: arrows, WASD and the 2/4/6/8
// keypad digits; confirm (FIRE, the keypad's 5): Enter or Space; left soft key: Q (and '*');
// right soft key -- back / cancel / pause: Esc or Backspace (and '#'); M is the minimap key '3'.
// The keyboard layout was chosen by the user on 2026-10-15.
const CODE_TO_ORIGINAL: Readonly<Record<string, OriginalKeyName | undefined>> = {
  ArrowUp: OriginalKey.UP,
  ArrowDown: OriginalKey.DOWN,
  ArrowLeft: OriginalKey.LEFT,
  ArrowRight: OriginalKey.RIGHT,
  KeyW: OriginalKey.UP,
  KeyS: OriginalKey.DOWN,
  KeyA: OriginalKey.LEFT,
  KeyD: OriginalKey.RIGHT,
  Numpad2: OriginalKey.UP,
  Digit2: OriginalKey.UP,
  Numpad8: OriginalKey.DOWN,
  Digit8: OriginalKey.DOWN,
  Numpad4: OriginalKey.LEFT,
  Digit4: OriginalKey.LEFT,
  Numpad6: OriginalKey.RIGHT,
  Digit6: OriginalKey.RIGHT,
  Enter: OriginalKey.FIRE,
  NumpadEnter: OriginalKey.FIRE,
  Space: OriginalKey.FIRE,
  Numpad5: OriginalKey.FIRE,
  Digit5: OriginalKey.FIRE,
  KeyQ: OriginalKey.SOFT_LEFT,
  Escape: OriginalKey.SOFT_RIGHT,
  Backspace: OriginalKey.SOFT_RIGHT,
  KeyM: OriginalKey.DIGIT_3,
  Numpad0: OriginalKey.DIGIT_0,
  Digit0: OriginalKey.DIGIT_0,
  Numpad1: OriginalKey.DIGIT_1,
  Digit1: OriginalKey.DIGIT_1,
  Numpad3: OriginalKey.DIGIT_3,
  Digit3: OriginalKey.DIGIT_3,
  Numpad7: OriginalKey.DIGIT_7,
  Digit7: OriginalKey.DIGIT_7,
  Numpad9: OriginalKey.DIGIT_9,
  Digit9: OriginalKey.DIGIT_9,
};

const originalKeyOf = (event: KeyboardEvent): OriginalKeyName | undefined =>
  CODE_TO_ORIGINAL[event.code] ?? (event.key === "*" ? OriginalKey.SOFT_LEFT : event.key === "#" ? OriginalKey.SOFT_RIGHT : undefined);

/** A key the game plays with, on its own: not a modifier (Ctrl, Shift, Cmd ...) or function key, not
 *  a browser shortcut (Ctrl+S, Cmd+R). Only these bring back the keyboard's hand cursor (BUG-042). */
export function isPlayKey(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey && originalKeyOf(event) !== undefined;
}

/**
 * Attaches browser keyboard events without changing the original key model.
 * Numeric keys are included only where f's bytecode consumes them.
 */
export function attachOriginalKeyboard(target: Window, state: KeyState): () => void {
  const down = (event: KeyboardEvent): void => {
    const key = originalKeyOf(event);
    if (!key) return;
    event.preventDefault();
    state.press(key);
  };
  const up = (event: KeyboardEvent): void => {
    const key = originalKeyOf(event);
    if (!key) return;
    event.preventDefault();
    state.release(key);
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  return () => {
    target.removeEventListener("keydown", down);
    target.removeEventListener("keyup", up);
  };
}
