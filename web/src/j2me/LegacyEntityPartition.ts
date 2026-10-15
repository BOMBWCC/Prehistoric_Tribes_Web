/**
 * Raw f.a(int) partition lookup used by the entity tables.
 *
 * The bytecode contains only these numeric boundaries; the returned values
 * are deliberately kept as raw classes until their callers are proven.
 */
export function legacyEntityPartition(id: number): number {
  if (id >= 1 && id <= 50) return 0;
  if (id >= 51 && id <= 100) return 1;
  return 2;
}
