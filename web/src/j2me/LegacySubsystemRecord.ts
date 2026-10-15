/** Raw port of f.b(int,int,int,int), the 22-slot auxiliary record initializer. */
export type LegacySubsystemRecordInput = {
  readonly state: Int8Array;
  readonly map: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** f.t[0..2], incremented when f.q != 3 and a free slot is found. */
  readonly counters: Int8Array;
  /** Raw f.q byte controlling the free-slot scan side effect. */
  readonly q: number;
};

export function allocateLegacySubsystemRecord(
  input: LegacySubsystemRecordInput,
  first: number,
  x: number,
  y: number,
  counterIndex: number,
): number {
  let slot = 0;
  while (slot < 22) {
    if (input.state[9513 + slot] !== 0) {
      slot += 1;
      continue;
    }
    if (input.q !== 3) input.counters[counterIndex] += 1;
    break;
  }

  input.state[9513 + slot] = input.packedBytes[input.packedOffsets[180] + first];
  input.state[9535 + slot] = first;
  input.state[9359 + slot] = x;
  input.state[9645 + slot] = x;
  input.state[9381 + slot] = y;
  input.state[9667 + slot] = y;
  input.state[9403 + slot] = 0;
  input.state[9425 + slot] = 0;
  input.state[9711 + slot] = 0;
  input.state[9689 + slot] = 0;
  input.state[9601 + slot] = 0;
  input.state[9491 + slot] = input.randomRemainder(255, 8);
  input.state[9469 + slot] = counterIndex;
  input.state[9557 + slot] = input.packedBytes[input.packedOffsets[184] + first];
  input.state[9579 + slot] = 0;
  input.state[9447 + slot] = 0;
  // Bytecode offsets 291..304: gridC[y][x] = (byte)(101+slot) -- confirmed
  // 2026-08-18 by re-deriving the exact stack order (arrayref=gridC[y],
  // index=x, value=101+slot) while tracing T()'s ai===45 branch. This
  // previously stored `slot` at index `x+101+slot` -- the value and index
  // were swapped, a real bug found on re-verification against bytecode.
  input.map[y][x] = 101 + slot;
  return slot;
}
