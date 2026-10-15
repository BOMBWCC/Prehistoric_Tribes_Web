/**
 * Allocation-level mirror of e.c().
 *
 * These dimensions and tables are copied from the original bytecode. They are
 * deliberately kept as raw layout data: the bytecode establishes the render
 * targets, but not the semantic names of the screens that use them.
 */
export class LegacyRenderTargets {
  readonly canvasWidth = 240;
  readonly canvasHeight = 320;
  readonly worldWidth = 288;
  readonly tileColumns = 18;
  readonly tileHalfWidth = 5;
  readonly tileHalfHeight = 9;
  readonly imageSizes = [
    { width: 0, height: 0 },
    { width: 264, height: 304 },
    { width: 79, height: 63 },
    { width: 264, height: 304 },
  ] as const;

  // f.a/f.b/f.c/f.d and f.c/f.d byte arrays in e.c().
  readonly x = [264, 264, 240, 240, 240, 240, 68, 240, 68, 63, 240, 240, 240] as const;
  readonly y = [352, 304, 22, 48, 22, 48, 55, 86, 49, 55, 38, 0, 0] as const;
  // CORRECTION (2026-09-09): index 11 read 320, which is d:[I's value at that
  // index, not c:[I's. e.c() offsets 356..360 store 0 there (`bipush 11;
  // iconst_0; iastore`). These two tables are the real f.c:[I (#264) and
  // f.d:[I (#275) -- now live as game.frameRecordInts / oElementRecordInts,
  // see their docblocks; this class remains transcription-only reference data.
  readonly sourceX = [0, 0, 304, 304, 326, 326, 0, 326, 0, 0, 326, 0, 0] as const;
  readonly sourceY = [0, 16, 0, 0, 298, 272, 0, 234, 0, 0, 282, 320, 0] as const;
  readonly imageGroup = [0, 1, 0, 0, 0, 0, 2, 0, 2, 2, 0, 0, 0] as const;
  readonly drawMode = [0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;

  // e.c() assigns f.bb = f.b[2], which is 22 in the original initialization.
  readonly borderBottom = 22;
}
