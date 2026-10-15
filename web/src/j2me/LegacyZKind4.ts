export type LegacyZKind4State = {
  readonly aI: number;
  readonly aJ: number;
  readonly aK: number;
  readonly byteRows: readonly Int8Array[];
};

export type LegacyZKind4Callbacks = {
  /** bc/bd/be/bf, then `c(Graphics,IIII)` (#559) = Graphics[N].setClip. */
  readonly onSetClip?: (x: number, y: number, width: number, height: number) => void;
};

/** Direct mirror of f.d(4,command), javap offsets 681..849: the row's clip rect. */
export function stepLegacyZKind4(state: LegacyZKind4State, callbacks: LegacyZKind4Callbacks = {}): void {
  if (state.aI !== 1) {
    const type = state.aI;
    callbacks.onSetClip?.(
      11 + state.aJ + ((state.byteRows[21]?.[type] ?? 0) & 127),
      8 + state.aK + (state.byteRows[22]?.[type] ?? 0),
      state.byteRows[23]?.[type] ?? 0,
      state.byteRows[24]?.[type] ?? 0,
    );
    return;
  }
  callbacks.onSetClip?.(0, 0, 528, 704);
}
