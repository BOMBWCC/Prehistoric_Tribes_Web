export type LegacyZSubrecordDrawState = {
  readonly shortRows: readonly Int16Array[];
  readonly byteRows: readonly Int8Array[];
};

export type LegacyZSubrecordDrawCallbacks = {
  readonly onSpriteRecord?: (record: number, x: number, y: number) => void;
};

/** Direct mirror of f.d(int,int,int,int), javap offsets 0..60. */
export function stepLegacyZSubrecordDraw(
  state: LegacyZSubrecordDrawState,
  index: number,
  x: number,
  y: number,
  phase: number,
  callbacks: LegacyZSubrecordDrawCallbacks = {},
): void {
  const base = state.shortRows[5]?.[index] ?? 0;
  const stride = state.byteRows[9]?.[index] ?? 0;
  const frame = base + (stride === 0 ? 0 : phase % stride);
  callbacks.onSpriteRecord?.(
    state.shortRows[6]?.[frame] ?? 0,
    x + (state.byteRows[10]?.[frame] ?? 0),
    y + (state.byteRows[11]?.[frame] ?? 0),
  );
}
