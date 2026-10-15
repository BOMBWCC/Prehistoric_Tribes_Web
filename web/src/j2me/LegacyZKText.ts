export type LegacyZKTextState = {
  aF: number;
  aI: number;
  aJ: number;
  aK: number;
  l: number;
};

export type LegacyZKTextCallbacks = {
  /**
   * Offsets 116..198 for rows 1043/1047/1051/1059/1063: `t126[aF]` is a
   * save-field category (-1 = nothing to show); the shown value is
   * `e[b_s[category] + l] + t127[aF]`. Returns undefined for -1.
   */
  readonly readAdvance?: (aF: number, language: number) => number | undefined;
  /** Reads f.e[3535+l], used only by command 1067's early return. */
  readonly readMode?: (language: number) => number;
  readonly languageBase?: () => number;
  readonly commandStyle?: (command: number) => number;
  readonly onText?: (x: number, y: number, style: number, text: string, mode: number) => void;
};

/**
 * Direct raw port of f.k(int), offsets 0..398. CORRECTED 2026-10-02: the
 * advance rows REPLACE aF with the unit's field (they added to it), row
 * 1055 is the `(9 - aF) * 2 + 1` transform (it had been put on 1067), and
 * row 1067 draws only when aF != 0 and e[3535+l] is neither 0 nor 15 (the
 * test was inverted) -- the unit panel showed 13/14/8 and a "-8".
 */
export function stepLegacyZKText(state: LegacyZKTextState, command: number, callbacks: LegacyZKTextCallbacks = {}): void {
  const family = command - 1;
  if (family === 1043 || family === 1047 || family === 1051 || family === 1059 || family === 1063) {
    if (state.aF < 0) return;
    const value = callbacks.readAdvance?.(state.aF, state.l);
    if (value === undefined) return;
    state.aF = value;
  } else if (family === 1055) {
    state.aF = (9 - state.aF) * 2 + 1;
  } else if (family === 1067) {
    const mode = callbacks.readMode?.(state.l) ?? 0;
    if (state.aF === 0 || mode === 0 || mode === 15) return;
  }

  const style = callbacks.commandStyle?.(command) ?? 0;
  if (family === 1015) {
    callbacks.onText?.(state.aJ, state.aK, style, `${state.aF}/${callbacks.languageBase?.() ?? 0}`, state.aI - 1);
  } else {
    callbacks.onText?.(state.aJ, state.aK, style, String(state.aF), state.aI - 1);
  }
}
