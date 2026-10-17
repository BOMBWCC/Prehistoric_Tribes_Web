export type LegacyZTransitionInput = {
  readonly flags: boolean[];
  /** f.b:[Z (#234) -- Z() offsets 280..288 write `b[ad] = true` here, not into `a:[Z`. */
  readonly bFlags: boolean[];
  readonly r: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly raw: {
    ar: number; at: number; as: number; aX: number;
    aW: number; aY: number; aZ: number; l: number;
  };
  readonly qByte: number;
  readonly aiByte: number;
  readonly pendingP: boolean;
  readonly adByte: number;
  readonly aU: number;
  readonly aV: number;
  readonly onAA?: () => void;
  readonly onAB?: () => void;
  readonly onAC?: () => void;
  readonly onAD?: () => void;
  readonly onAH?: () => void;
  readonly onAI?: () => void;
};

/** Direct mirror of f.Z(), javap offsets 0..348; child methods stay callbacks. */
export function stepLegacyZTransition(input: LegacyZTransitionInput): void {
  const { flags, r, packedBytes, packedOffsets, raw } = input;
  if (!flags[2] && !flags[5] && !flags[6]) return;

  raw.ar = 0;
  for (let index = 0; index < r.length; index += 1) r[index] = 0;
  raw.at = 99;

  if (flags[2]) {
    input.onAA?.();
    input.onAB?.();
    input.onAC?.();
  } else if (flags[5]) {
    input.onAD?.();
  } else if (flags[6]) {
    const count = input.qByte > 1 ? 11 : input.aiByte < 18 ? 3 : 6;
    const base = packedOffsets[137] ?? 0;
    for (let index = 0; index < count; index += 1) {
      r[index] = packedBytes[base + index] ?? 0;
      raw.ar += 1;
    }
  } else {
    input.onAH?.();
    return;
  }

  if (input.pendingP) {
    if (raw.aX + raw.aW > raw.ar && raw.as !== 0) {
      while (raw.aX + raw.aW > raw.ar && raw.as !== 0) {
        if (raw.aX > 0) raw.aX -= 1;
        raw.as -= 1;
      }
    }
  } else {
    raw.as = 0;
    raw.aX = 0;
  }

  raw.l = 0;
  if (input.adByte >= 0 && input.adByte < input.bFlags.length) input.bFlags[input.adByte] = true;
  raw.aW = input.aU;
  if (raw.ar < raw.aW) raw.aW = raw.ar;
  raw.aZ = input.aV * raw.aW;
  raw.aY = Math.trunc((240 - raw.aZ + 9) / 2);
  input.onAI?.();
}
