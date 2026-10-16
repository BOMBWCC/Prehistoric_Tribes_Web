/** Raw draw operations emitted by the original f.M() handler. */
export type LegacyMFrameCommand =
  | { kind: "drawImage"; graphicsIndex: 1; imageIndex: 0; x: 0; y: 0; anchor: 0 }
  | { kind: "drawRegion"; graphicsIndex: 0; imageIndex: 1; sx: 0; sy: 0; width: 264; height: 301; transform: 0; x: 0; y: 0; anchor: 0 }
  | { kind: "primitive"; index: number; x: number; y: number };

export type LegacyMFrameState = {
  H: boolean;
  I: boolean;
  m: number;
  flags: boolean[];
  /** f.d:[I (#275), game.oElementRecordInts. */
  d: ArrayLike<number>;
  /** f.a:[S (#138), packedOffsets. */
  a: Int16Array;
  /** f.a:[B (#137), packedBytes. */
  bytes: Int8Array;
};

export type LegacyMFrameInput = {
  readonly state: LegacyMFrameState;
  readonly emit?: (command: LegacyMFrameCommand) => void;
  readonly onO?: () => void;
};

/** Direct control-flow mirror of private f.M(); raw indexes are preserved. */
export function stepLegacyMFrame(input: LegacyMFrameInput): void {
  const { state } = input;
  state.H = false;
  if (!state.I) {
    input.onO?.();
    input.emit?.({ kind: "drawImage", graphicsIndex: 1, imageIndex: 0, x: 0, y: 0, anchor: 0 });
  }
  state.flags[2] = true;
  input.emit?.({ kind: "drawRegion", graphicsIndex: 0, imageIndex: 1, sx: 0, sy: 0, width: 264, height: 301, transform: 0, x: 0, y: 0, anchor: 0 });
  input.emit?.({ kind: "primitive", index: 18 + state.m, x: 0, y: 0 });
  // Offsets 78..103: y = d[a:[B[a:[S[195] + 2]]] -- a byte lookup, then f.d:[I. CORRECTED
  // 2026-10-16 (screenshot, the '0' help page): the byte lookup was missing and d was a private
  // all-zero array, so the help bar was drawn at the top over the unit panel.
  input.emit?.({ kind: "primitive", index: 2, x: 0, y: state.d[state.bytes[state.a[195] + 2] ?? 0] ?? 0 });
  input.emit?.({ kind: "primitive", index: 17, x: 0, y: 320 });
  state.I = true;
}
