import { BLD_KIND, BLD_LEVEL, BLD_WORKER_HEAD, BLD_X, BLD_Y, UNIT_NEXT_WORKER, UNIT_SLOT } from "../core/DenseLayout";
/** Exact f.a(int,byte) argument preparation for the >=1000 image path. */
export type LegacyImageHelperInvocationInput = {
  readonly resourceId: number;
  readonly dense: Int8Array;
  readonly shortOffsets: Int16Array;
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  readonly groupSelectors: Int8Array;
  readonly ah: number;
  readonly ai: number;
  readonly I: number;
  readonly K: number;
  /** f.S:I (#98) -- the projection origin G() sets right before each call. */
  readonly S: number;
  /** f.T:I (#101) -- the other half of it. */
  readonly T: number;
  /** f.v:B (#376). The >=1000 branch's seeding block only runs when this is 0. */
  readonly vByte: number;
  /** f.f:I (#294), the phase counter three of the seeded slots take a remainder of. */
  readonly fCounter: number;
};

export type LegacyImageHelperInvocation = {
  readonly marker: number;
  readonly argument2: number;
  readonly argument3: number;
  readonly originX: number;
  readonly originY: number;
  readonly recordBase: number;
  readonly recordCount: number;
};

/**
 * Mirrors f.a(int,byte)'s resource >=1000 setup before a(IBBIIB):
 * marker=-resourceId, selector=e[8749+marker], gate=e[9115+marker],
 * origin from ah/ai/I/K and e[8383]/e[8444], then b[0]/j[0] N/O lookup.
 */
export function prepareLegacyImageHelperInvocation(
  input: LegacyImageHelperInvocationInput,
): LegacyImageHelperInvocation {
  // BUG FIX (2026-09-09): everything below the `resourceId >= 1000` block was
  // the ONLY thing this function did, and resource 1118 never reaches it.
  //
  // f.a(int,byte) offset 36 branches on `b(resourceId)` (static #531):
  //   v <= -1 && v >= -30  -> 0
  //   v <= -31 && v >= -60 -> 1
  //   otherwise            -> 2
  // so 1118 returns 2 and jumps straight to offset 332, skipping the whole
  // selector/column/row/group prologue this function was modelling. From 332
  // it falls through `c(1118)` (boolean #553, false) to 405, then `c(1118)`
  // (byte #554, which returns 2 for anything outside -111..-123) to 602, and
  // 602's `resourceId >= 1000` arm is the real path:
  //
  //   609..619  originX = S:I (#98), originY = T:I (#101)
  //   621..626  local4 = resourceId - 1000
  //   628..651  N:I = b[0][local4], O:I = j[0][local4]
  //   654..929  if (v:B == 0) seed the title-screen scene records
  //   929..933  argument2 = 0, marker = 0
  //
  // The port used `shortTables[0][selector + 1]` for the record base and
  // derived the origin from ah/ai/I/K -- both belong to the branch 1118 never
  // takes. With the origin coming out near 0 instead of S:I/T:I, every sprite
  // of the language screen's bottom scene landed in the top-left corner.
  if (input.resourceId >= 1000) {
    const tableIndex = input.resourceId - 1000;
    if (input.vByte === 0) {
      seedTitleSceneRecords(input);
    }
    return {
      marker: 0,
      argument2: 0,
      argument3: 0,
      originX: input.S,
      originY: input.T,
      recordBase: input.shortTables[0]?.[tableIndex] ?? 0,
      recordCount: (input.byteTables[0]?.[tableIndex] ?? 0) & 0xff,
    };
  }

  const marker = -input.resourceId;
  const selector = input.dense[BLD_KIND + marker] ?? 0;
  const argument2 = input.dense[BLD_LEVEL + marker] ?? 0;
  const row = input.ai + input.K - (input.dense[BLD_Y + marker] ?? 0);
  const column = input.ah + input.I - (input.dense[BLD_X + marker] ?? 0);
  const groupSeed = input.dense[BLD_WORKER_HEAD + marker] ?? 0;
  let groupValue = groupSeed;
  while (groupValue > 0) {
    const groupIndex = input.dense[UNIT_SLOT + groupValue] ?? 0;
    input.groupSelectors[groupIndex] = groupValue;
    groupValue = input.dense[UNIT_NEXT_WORKER + groupValue] ?? 0;
  }
  const tableIndex = selector + 1;
  return {
    marker,
    argument2,
    argument3: selector,
    originX: input.ah * 22 - column * 22,
    originY: input.ai * 16 - row * 16,
    recordBase: input.shortTables[0]?.[tableIndex] ?? 0,
    recordCount: (input.byteTables[0]?.[tableIndex] ?? 0) & 0xff,
  };
}

/**
 * f.a(int,byte) offsets 661..928 -- the `v:B == 0` block inside the
 * `resourceId >= 1000` arm. It seeds `g:[B]` and a scatter of `e:[B]` slots
 * that the projection loop then reads back as the title screen's little camp
 * scene. `f:I` (#294) supplies three animation phases via Java `irem`, which
 * truncates toward zero exactly like the `%` used here for the non-negative
 * counter.
 */
function seedTitleSceneRecords(input: LegacyImageHelperInvocationInput): void {
  const g = input.groupSelectors;
  const e = input.dense;
  g[0] = 1;
  g[1] = 2;
  g[2] = 3;
  e[2930] = 39;
  e[2931] = 42;
  e[2932] = 42;
  e[607] = 1;
  e[608] = 0;
  e[609] = 6;
  e[1415] = 25;
  e[1416] = 45;
  e[1417] = 70;
  e[3031] = toByte(input.fCounter % 8);
  e[3032] = toByte(input.fCounter % 8);
  e[3033] = toByte(input.fCounter % 10);
  e[5152] = 8;
  e[6566] = 9;
  e[5153] = 5;
  e[6567] = 2;
  e[5154] = 10;
  e[6568] = 0;
  // Offsets 875..901 and 902..928: `e[1314] = e[1315] = e[1316] = 0` and
  // `e[6465] = e[6466] = e[6467] = 0`, each written as one dup_x2 chain.
  e[1314] = 0;
  e[1315] = 0;
  e[1316] = 0;
  e[6465] = 0;
  e[6466] = 0;
  e[6467] = 0;
}

/** JVM `i2b`. */
function toByte(value: number): number {
  return (value << 24) >> 24;
}
