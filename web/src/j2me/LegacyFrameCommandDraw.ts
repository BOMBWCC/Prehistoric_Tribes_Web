/**
 * Bytecode-facing mirror of f.a(byte,int,int), the command-backed frame
 * renderer used by G() for resources 10 and 17.
 *
 * This deliberately exposes raw table indices and events.  It is not a new
 * menu renderer: the original method walks the packed row table and delegates
 * text/composition to c, so the Web bridge can preserve that boundary.
 */
export type LegacyFrameCommandDrawInput = {
  readonly command: number;
  readonly x: number;
  readonly y: number;
  readonly changed?: boolean;
  readonly compositionChanged?: boolean;
  readonly flags: boolean[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  readonly imageSelectors?: Int8Array;
  readonly dShort?: Int16Array;
  readonly kBytes?: Int8Array;
  readonly v?: number;
  readonly w?: number;
  /** f.e:[B (#286) and f.l:B (#337): row 1030's bar limit is e[6767 + l]. */
  readonly dense?: Int8Array;
  readonly l?: number;
  readonly onTarget?: (target: number) => void;
  readonly onProgress?: (x: number, y: number, width: number, height: number, anchor: number) => void;
  /** c.b(...)/c.a(Graphics,...) composition boundary for group 3 rows. */
  /**
   * f.a(BII) offsets 844..1013, the text record: c.b(...) lays the text out only when `compose`
   * (b[cmd] set or a new text, v != w); z = y and the c.a(Graphics, y) draw happen every time.
   */
  readonly onCompose?: (record: number, x: number, y: number, width: number, height: number, align: number, font: number, row: number, compose: boolean) => void;
  readonly onText?: (textRecord: number, x: number, y: number, style: number, row: number) => void;
  /** f.a(1010, aE, aK) -> private a(int,byte,int), not c text. */
  readonly onRecord1010?: (record: number, mode: number, x: number, y: number, row: number) => void;
  /** f.c(1137, aJ, aK), the compact multi-row geometry path. */
  readonly onRecord1137?: (record: number, x: number, y: number, row: number) => void;
  /** f.d(3,row) -> k(row) -> c.a(..., String.valueOf(aF), aI-1). */
  readonly onKText?: (x: number, y: number, command: number, mode: number, row: number, value: number) => void;
  /** f.d(2,row) -- LegacyZKind2.ts's stepLegacyZKind2 boundary. */
  readonly onKind2?: (row: number, aI: number, aJ: number, aK: number) => void;
  /**
   * f.d(3,row)'s aI<=6 branch (javap offsets 509..680, aI∈{5,6} in practice --
   * aI∈[3,4] is already intercepted earlier by this loop's own onCompose
   * carve-out) -- LegacyZKind3.ts's stepLegacyZKind3 boundary. `aF` is the
   * loop-local aF (the current row's f.aF:I #154 snapshot), matching what
   * onKText already threads through for the same field.
   */
  readonly onKind3?: (row: number, aI: number, aJ: number, aK: number, aF: number) => void;
  /** `aF` is the row's f.aF:I (#154) -- j(row)'s default draw is composite aI + aF. */
  /** f.d(4,row) -- LegacyZKind4.ts's clip rect (only command 6 has these rows). */
  readonly onKind4?: (row: number, aI: number, aJ: number, aK: number) => void;
  readonly onRowCommand?: (kind: number, row: number, record?: number, x?: number, y?: number, stateAI?: number, aF?: number) => void;
  readonly onFlush?: () => void;
  readonly onUnhandled?: (kind: number, row: number, record?: number, x?: number, y?: number, group?: number) => void;
};

const u8 = (value: number): number => value & 0xff;

export type LegacyFrameCommandDrawResult = {
  readonly ae: number;
  readonly aE: number;
  readonly aF: number;
  readonly target: number;
};

export function drawLegacyFrameCommand(input: LegacyFrameCommandDrawInput): LegacyFrameCommandDrawResult | undefined {
  const {
    command, x, y, flags, packedBytes, packedOffsets, shortTables, byteTables,
  } = input;
  try {
    // a[195] is the command-section offset in the original packed buffer.
    const commandBase = packedOffsets[195] ?? 0;
    const cBytes = input.imageSelectors ?? new Int8Array(0);
    const packedAt = (offset: number): number => packedBytes[commandBase + offset + command] ?? 0;
    const rowTable = shortTables[0] ?? new Int16Array(0);
    const rowMeta = shortTables[1] ?? new Int16Array(0);
    const rowFlags = byteTables[3] ?? new Int8Array(0);
    const rowType = byteTables[1] ?? new Int8Array(0);
    const rowValue = byteTables[2] ?? new Int8Array(0);
    const k = input.kBytes ?? new Int8Array(0);
    const selection = Boolean(flags[command]);
    const changed = input.changed ?? false;

    // Exact prefix writes: aD=command, c(), b[command], ae, N, aE.
    let ae = 0;
    if (selection) flags[17] = true;
    else if (changed) ae = 1;
    else if (packedAt(80) === 1) ae = 2;
    else return undefined;
    const nIndex = packedAt(0);
    const n = cBytes[nIndex] ?? 0;
    input.onTarget?.(n);
    let aE = packedAt(60);
    // The bytecode keeps two distinct selectors: aE is the mutable k/d
    // selection state, while local `first` comes from the +40 command table
    // and is the table index used by the row loop.
    const first = packedAt(40);
    const end = (rowTable[first] ?? 0) + (byteTables[0]?.[first] ?? 0);
    let pending = 0;
    let aF = 0;
    let compositionX = 0;
    let compositionY = 0;

    for (let row = rowTable[first] ?? 0; row < end; row += 1) {
      const flag = u8(rowFlags[row] ?? 0);
      const kind = flag >> 6;
      const group = flag & 7;
      const packed = rowMeta[row] ?? 0;
      // f.a() keeps the row-table index and aI as distinct values:
      //   row = b[0][first] ...
      //   aI  = b[1][row] & 4095
      const stateAI = packed & 0x0fff;
      if (kind < ae && pending === 0) {
        if (kind === 1) pending = 1;
        continue;
      }
      aF = 0;
      if (pending !== 0) {
        pending = 0;
        const allocation = k[aE] ?? 0;
        if ((allocation === 0 && ae > 0) || allocation < 0) {
          aE += 1;
          continue;
        }
        aF = input.dShort?.[aE] ?? 0;
        k[aE] = 0;
        aE += 1;
      } else if (kind === 1) {
        pending = 1;
        const allocation = k[aE] ?? 0;
        if ((allocation === 0 && ae > 0) || stateAI === 0 || kind < ae || allocation < 0) continue;
      } else if (kind === 2 && (k[aE] ?? 0) < 0) {
        continue;
      }

      let drawX = rowType[row] ?? 0;
      let drawY = rowValue[row] ?? 0;
      const dx = ((packed >> 14) & 3) << 7;
      const dy = ((packed >> 12) & 3) << 7;
      if (command >= 13 && command <= 16) {
        drawX += 120;
        drawY += 110;
      } else {
        drawX += x;
        drawY += y;
      }
      drawX += dx;
      drawY += dy;

      if (row === 1011) {
        aF = input.dShort?.[3] ?? 0;
        input.onRowCommand?.(group, 1007, (rowMeta[1007] ?? 0) & 0x0fff, drawX, drawY, (rowMeta[1007] ?? 0) & 0x0fff, aF);
        continue;
      }
      if (row === 1010) {
        input.onRecord1010?.(row, ae, drawX, drawY, row);
        continue;
      }
      if (row === 1137) {
        input.onRecord1137?.(row, drawX, drawY, row);
        continue;
      }
      if (group === 0 && kind === 3) {
        if (aF >= 0) {
          const limit = row === 1030 ? (input.dense?.[6767 + (input.l ?? 0)] ?? 0) : 99;
          const width = byteTables[23]?.[stateAI] ?? 0;
          const progress = Math.trunc(width * aF / limit);
          input.onProgress?.((rowType[row] ?? 0) + progress + 1, drawY, width - progress + dy, 4, 0);
        }
        continue;
      }
      if (group === 3 && stateAI >= 3 && stateAI <= 4 && (input.v ?? -1) !== -1) {
        const sourceRecord = rowMeta[Math.max(0, row - 1)] ?? 0;
        const width = (byteTables[23]?.[sourceRecord & 0x0fff] ?? 0) * 4;
        const height = (byteTables[24]?.[sourceRecord & 0x0fff] ?? 0) * 4;
        // Offsets 852..868 only decide whether to re-lay the text out (c.b, 872..959); 963..1013 run
        // either way. FIXED 2026-10-09 (oracle run 6, frame 18284): the whole call was skipped, so
        // scrolling a dialog never redrew it (z:I and the Q:Z/R:Z edges stayed stale).
        input.onCompose?.(input.v ?? 0, compositionX, compositionY, width, height, kind, stateAI - 3, row,
          selection || (input.v ?? -1) !== (input.w ?? 0));
        continue;
      }

      // d(group,row) receives the row-table index; aI remains the decoded
      // b[1][row] value in the surrounding object state.
      if (stateAI !== 0) {
        if (group === 0 || group === 1) input.onRowCommand?.(group, row, stateAI, drawX, drawY, stateAI, aF);
        else if (group === 2) {
          input.onKind2?.(row, stateAI, drawX, drawY);
        } else if (group === 3 && stateAI <= 2) {
          input.onKText?.(drawX, drawY, row, stateAI - 1, row, aF);
        } else if (group === 3 && ((stateAI >= 5 && stateAI <= 6) || stateAI === 10 || stateAI === 11)) {
          // f.d(3,row) also handles aI 11 (offsets 327..427, the map overview
          // blit) and aI 10 (428..489); any other aI > 6 is a no-op there.
          input.onKind3?.(row, stateAI, drawX, drawY, aF);
        } else if (group === 4) {
          input.onKind4?.(row, stateAI, drawX, drawY);
        } else input.onUnhandled?.(kind, row, stateAI, drawX, drawY, group);
        if (group === 0) {
          compositionX = drawX;
          compositionY = drawY;
        }
      }
    }
    input.onFlush?.();
    flags[command] = false;
    return { ae, aE, aF, target: n };
  } catch {
    // The original method has an Exception catch around the whole body.
    return undefined;
  }
}
