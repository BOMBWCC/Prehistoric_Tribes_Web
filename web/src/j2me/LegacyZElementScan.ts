import { prepareLegacyZElementCoordinates } from "./LegacyZElementCoordinates";

export type LegacyZElementScanState = {
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly byteRows: readonly Int8Array[];
  readonly shortRows: readonly Int16Array[];
  readonly d: Int16Array;
  readonly k: Int8Array;
  readonly cBytes: Int8Array;
  readonly bFlags: boolean[];
  ae: number;
  aE: number;
  N: number;
  aI: number;
  aJ: number;
  aK: number;
  aF: number;
  aG: number;
  aH: number;
  v: number;
  w: number;
  y: number;
  z: number;
  l: number;
};

export type LegacyZElementScanCallbacks = {
  readonly onC?: () => boolean;
  readonly onReady?: (entry: number, state: LegacyZElementScanState, subtype: number) => void;
  readonly on1011?: (entry: number, state: LegacyZElementScanState, subtype: number) => void;
  readonly on1010?: (entry: number, state: LegacyZElementScanState) => void;
  readonly on1137?: (entry: number, state: LegacyZElementScanState) => void;
  readonly onProgressRect?: (x: number, y: number, width: number, height: number) => void;
  readonly onSelectionSegments?: (x: number, y: number, width: number, height: number, value: number, style: number, mode: number) => void;
  /** Exact c.b(IIIIIII) argument boundary at f.a(byte,int,int) offset 959. */
  readonly onSelectionCompose?: (x: number, y: number, width: number, height: number, value: number, style: number, mode: number) => void;
  /** Exact c.a(Graphics,int) boundary at offset 1010, before the selection commit. */
  readonly onSelectionRender?: (rowStart: number) => void;
  readonly onSelectionCommit?: (y: number) => void;
  readonly onDispatch?: (subtype: number, entry: number) => void;
};

/** Raw f.a(byte,int,int) scan prefix through the coordinate/special-entry boundary (javap offsets 0..677, loop 162..1037). */
export function scanLegacyZElementPrefix(state: LegacyZElementScanState, aD: number, xOffset: number, yOffset: number, callbacks: LegacyZElementScanCallbacks = {}): boolean {
  state.ae = 0;
  if (state.bFlags[aD]) {
    state.bFlags[17] = true;
  } else if (callbacks.onC?.()) {
    state.ae = 1;
  } else if ((state.packedBytes[(state.packedOffsets[195] ?? 0) + 80 + aD] ?? 0) === 1) {
    state.ae = 2;
  } else {
    return false;
  }

  const base = state.packedOffsets[195] ?? 0;
  state.N = state.cBytes[base + aD] ?? 0;
  state.aE = state.packedBytes[base + 60 + aD] ?? 0;
  let entry = state.packedBytes[base + 40 + aD] ?? 0;
  const end = (state.shortRows[0]?.[entry] ?? 0) + (state.byteRows[0]?.[entry] ?? 0);
  let special = false;
  while (entry < end) {
    const encoded = state.byteRows[3]?.[entry] ?? 0;
    const type = (encoded & 0xff) >> 6;
    const subtype = encoded & 7;
    state.aI = (state.shortRows[1]?.[entry] ?? 0) & 4095;

    if (type < state.ae && !special) {
      if (type === 1) special = true;
      entry += 1;
      continue;
    }

    state.aF = 0;
    if (special) {
      special = false;
      const allocation = state.k[state.aE] ?? 0;
      if ((allocation === 0 && state.ae > 0) || allocation < 0) {
        state.aE += 1;
        entry += 1;
        continue;
      }
      state.aF = state.d[state.aE] ?? 0;
      state.k[state.aE] = 0;
      state.aE += 1;
    } else {
      if (type === 1) {
        special = true;
        const allocation = state.k[state.aE] ?? 0;
        if (allocation === 0 && state.ae > 0 || state.aI === 0 || type < state.ae || allocation < 0) {
          entry += 1;
          continue;
        }
      } else if (type === 2 && (state.k[state.aE] ?? 0) < 0) {
        entry += 1;
        continue;
      }
    }

    prepareLegacyZElementCoordinates(state, entry, aD, xOffset, yOffset);
    if (entry === 1011) {
      state.aI = (state.shortRows[1]?.[1007] ?? 0) & 4095;
      state.aF = state.d[3] ?? 0;
      callbacks.on1011?.(entry, state, subtype);
    } else if (entry === 1010) {
      callbacks.on1010?.(entry, state);
    } else if (entry === 1137) {
      callbacks.on1137?.(entry, state);
    } else if (subtype === 0 && type === 3) {
      let limit = 99;
      if (entry === 1030) limit = state.packedBytes[6767 + state.l] ?? 0;
      if (state.aF >= 0) {
        const width = state.byteRows[23]?.[state.aI] ?? 0;
        const progress = Math.trunc(width * state.aF / limit);
        const yBits = ((state.shortRows[1]?.[entry] ?? 0) >> 12 & 3) << 7;
        callbacks.onProgressRect?.((state.byteRows[1]?.[entry] ?? 0) + progress + 1, state.aK, width - progress + yBits, 4);
      }
    } else if (subtype === 3 && state.aI >= 3 && state.aI <= 4) {
      if (state.v !== -1 && (state.bFlags[aD] || state.v !== state.w)) {
        const previous = ((state.shortRows[1]?.[entry - 1] ?? 0) & 4095);
        const segmentWidth = (state.byteRows[23]?.[previous] ?? 0) * 4;
        const segmentHeight = (state.byteRows[24]?.[previous] ?? 0) * 4;
        const segmentStyle = (encoded & 0xff) >> 6;
        const segmentMode = state.aI - 3;
        callbacks.onSelectionSegments?.(state.aG, state.aH, segmentWidth, segmentHeight, state.v, segmentStyle, segmentMode);
        callbacks.onSelectionCompose?.(state.aG, state.aH, segmentWidth, segmentHeight, state.v, segmentStyle, segmentMode);
      }
      if (state.w !== state.v) {
        state.w = state.v;
        state.y = 0;
      }
      state.z = state.y;
      callbacks.onSelectionRender?.(state.y);
      callbacks.onSelectionCommit?.(state.y);
    } else {
      if (state.aI !== 0) callbacks.onDispatch?.(subtype, entry);
      callbacks.onReady?.(entry, state, subtype);
    }
    entry += 1;
  }
  state.bFlags[aD] = false;
  return true;
}
