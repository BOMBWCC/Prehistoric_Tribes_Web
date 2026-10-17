/**
 * Bytecode-facing mirror of f.c(int,int,int), the special 1137 command row.
 *
 * The method is intentionally expressed as callbacks: f.c() owns the layout
 * arithmetic, while f.b()/c.a()/c.a(Graphics) remain separate original
 * rendering boundaries.
 */
export type Legacy1137CompositionInput = {
  readonly x: number;
  readonly y: number;
  readonly commandRecord: number;
  readonly languageState: number;
  readonly selectionIndex?: number;
  /**
   * f.e:I (#284)/`game.animStep` -- confirmed via direct bytecode
   * read of `c(int,int,int)` itself (offset 250/271), added 2026-08-18
   * while independently re-verifying every "phase" field binding in
   * LegacyRuntimeState.ts. Distinct from the unrelated f:I (#294)/
   * `game.animPhase` several OTHER methods in this codebase's "phase"
   * cluster actually need -- see LegacyGameState.ts's `fCounter` docblock.
   */
  readonly phase?: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  readonly onPacked: (record: number, x: number, y: number) => void;
  readonly onGeometry: (x: number, mode: number, width: number, record: number, value: number) => void;
  /** f.c() writes the selector bound used later by f.aB()/f.aC(). */
  readonly onLayout?: (rowCount: number, step: number) => void;
  readonly onSelectionMarker?: (kind: 1 | 2, x: number, y: number, phase: number) => void;
  readonly onFlush?: () => void;
  /** Not in the original: one more row after the table's (Q14's added "中文"), laid out like the rest. */
  readonly onExtraRow?: (x: number, y: number) => void;
};

/** Direct mirror of f.c(int,int,int), javap offsets 14471..14701. */
export function drawLegacy1137Composition(input: Legacy1137CompositionInput): void {
  const { packedBytes, packedOffsets, shortTables, byteTables } = input;
  const readPacked = (offsetIndex: number, delta = 0): number => {
    const base = packedOffsets[offsetIndex] ?? 0;
    return packedBytes[base + delta] ?? 0;
  };

  // f.a[283]+2 + 6 is the vertical step used by c's 26px atlas rows.
  const step = readPacked(283, 2) + 6;
  const sectionBase = packedOffsets[152] ?? 0;
  const sectionStart = packedBytes[sectionBase + input.languageState] ?? 0;
  const sectionEnd = packedBytes[sectionBase + input.languageState + 1] ?? 0;
  const tableRows = sectionEnd - sectionStart;
  const rowCount = tableRows + (input.onExtraRow ? 1 : 0);
  input.onLayout?.(rowCount, step);
  const rowRecord = (shortTables[1]?.[input.commandRecord] ?? 0) & 0x0fff;
  const glyphWidth = Math.trunc((byteTables[23]?.[rowRecord] ?? 0) / 2) * 4;
  let cursorY = input.y - Math.trunc((rowCount * step) / 2) + Math.trunc(step / 2);
  let selectedY = 0;
  // /a[152]+Q stores an offset into the language-entry list.  The actual
  // geometry byte is read from /a[151] + that decoded sectionStart.
  const geometryBase = (packedOffsets[151] ?? 0) + sectionStart;

  for (let index = 0; index < rowCount; index += 1) {
    if (index === (input.selectionIndex ?? 0)) selectedY = cursorY;
    input.onPacked(rowRecord, input.x, cursorY);
    if (index < tableRows) {
      const geometryRecord = 57 + (packedBytes[geometryBase + index] ?? 0);
      input.onGeometry(input.x + glyphWidth, cursorY, 1, geometryRecord, 0);
    } else {
      input.onExtraRow?.(input.x + glyphWidth, cursorY);
    }
    cursorY += step;
  }
  input.onFlush?.();
  input.onSelectionMarker?.(2, input.x + glyphWidth - 70, selectedY + 4, input.phase ?? 0);
  input.onSelectionMarker?.(1, input.x + glyphWidth + 69, selectedY + 4, input.phase ?? 0);
}
