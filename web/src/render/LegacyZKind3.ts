import { UNIT_GENDER, UNIT_NAME } from "../core/DenseLayout";
export type LegacyZKind3State = {
  readonly aI: number;
  readonly aJ: number;
  readonly aK: number;
  readonly o: number;
  aF: number;
  readonly u0: number;
  readonly e: Int8Array;
  readonly kRows: Int8Array[];
  readonly cBytes: Int8Array;
  readonly byteRows: readonly Int8Array[];
  readonly shortRows: readonly Int16Array[];
};

export type LegacyZKind3Callbacks = {
  readonly onRegion?: (imageSlot: number, sourceX: number, sourceY: number, width: number, height: number, x: number, y: number, transform: number) => void;
  readonly onImage?: (group: number, index: number, x: number, y: number, anchor: number) => void;
  readonly onPalette?: (value: number) => void;
  readonly onK?: (command: number) => void;
  readonly onFiveIntText?: (x: number, y: number, style: number, value: number, mode: number) => void;
  readonly onSevenIntText?: (x: number, y: number, style: number, value: number, progress: number, anchor: number, mode: number) => void;
  readonly onUnportedBranch?: (aI: number, command: number) => void;
};

/** Direct mirror of f.d(3,command) branches at javap offsets 327..509. */
export function stepLegacyZKind3(state: LegacyZKind3State, command: number, callbacks: LegacyZKind3Callbacks = {}): void {
  if (state.aI === 11) {
    const sourceIndex = (state.shortRows[1]?.[1181] ?? 0) & 4095;
    const width = (state.byteRows[23]?.[sourceIndex] ?? 0) * 4;
    const height = (state.byteRows[24]?.[sourceIndex] ?? 0) * 4;
    callbacks.onRegion?.(state.cBytes[1] ?? 0, 0, 0, width, height, 11 + state.aJ, 8 + state.aK, 0);
    return;
  }
  if (state.aI === 10) {
    callbacks.onPalette?.(state.o);
    callbacks.onImage?.(2, 0, 11 + state.aJ, 8 + state.aK, 3);
    return;
  }
  if (state.aI <= 2) {
    callbacks.onK?.(command);
    return;
  }
  if (state.aI <= 6) {
    const style = ((state.byteRows[3]?.[command] ?? 0) & 0xff) >> 6;
    if (command - 1 === 1128 && (state.u0 === 3 || state.u0 === 1)) {
      const index = state.kRows[2]?.[0] ?? 0;
      const value = 108 + (state.e[UNIT_NAME + index] ?? 0);
      const progress = state.aF + ((state.e[UNIT_GENDER + index] ?? 0) !== 0 ? 1 : 0);
      callbacks.onSevenIntText?.(state.aJ, state.aK, style, value, progress, -1, state.aI - 5);
    } else {
      callbacks.onFiveIntText?.(state.aJ, state.aK, style, state.aF, state.aI - 5);
    }
    return;
  }
  callbacks.onUnportedBranch?.(state.aI, command);
}
