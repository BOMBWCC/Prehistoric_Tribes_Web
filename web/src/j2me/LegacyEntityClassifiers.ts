/**
 * Four small static classifiers used throughout f.u()'s entity-ID branch
 * (bytecode/f-javap.txt offsets 225..1791). Each is a pure range check,
 * fully read and confirmed independently -- none of these turned out to be
 * dead code despite some call sites looking suspicious on a first partial
 * read (see reverse-engineering/gameplay-paint-cluster.md): the earlier
 * worry that `classifyLegacyCameraCell` (constant pool #531, in
 * LegacyCameraFrame.ts) was always non-zero when called on a positive id
 * was correct, but that call site belongs to the *negative*-id branch,
 * where it is meaningful.
 */

/** private static byte a(int) (constant pool #440). Positive-id classifier. */
export function classifyLegacyPositiveEntity(value: number): number {
  if (value >= 1 && value <= 50) return 0;
  if (value >= 51 && value <= 100) return 1;
  return 2;
}

/** private static boolean b(int) (constant pool #532). */
export function isLegacyEntityIdInRange101to122(value: number): boolean {
  return value >= 101 && value <= 122;
}

/** private static boolean c(int) (constant pool #553). */
export function isLegacyMarkerIdInRangeMinus110to61(value: number): boolean {
  return value <= -61 && value >= -110;
}

/** private static byte c(int) (constant pool #554). */
export function classifyLegacyMarkerId(value: number): number {
  if (value <= -111 && value >= -116) return 0;
  if (value <= -117 && value >= -122) return 1;
  if (value === -123) return 3;
  return 2;
}

/**
 * private static byte b(int) (constant pool #531). Negative-id classifier,
 * the mirror-image counterpart to `classifyLegacyPositiveEntity` -- a
 * DIFFERENT method from the boolean-returning `b(int)` (#532,
 * `isLegacyEntityIdInRange101to122`) despite sharing the source name "b"
 * (case-sensitive-name-collision pattern this project has hit before).
 */
export function classifyLegacyNegativeEntity(value: number): number {
  if (value >= -30 && value <= -1) return 0;
  if (value >= -60 && value <= -31) return 1;
  return 2;
}
