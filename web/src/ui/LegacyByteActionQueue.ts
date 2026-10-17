/** Raw mirror of f.a(byte,byte,byte,byte). */
export type LegacyByteActionQueueInput = {
  c: number;
  u: number;
  ay: number;
  readonly uBytes: Int8Array;
  readonly kMatrix: Int8Array[];
  readonly gCounters: Int32Array;
  readonly selectionFlags: boolean[];
  readonly onSelectionRefresh?: (a0: boolean, a1: boolean, a2: boolean, a3: boolean) => void;
  /** Not in the original: told of every message that gets past the gate (phase 3 notices,
   *  Alerts.ts). Only observes. */
  readonly onQueued?: (type: number, x: number, y: number, value: number) => void;
};

/** Exact queue/state transition; the selection callback remains an opaque hook. */
export function stepLegacyByteActionQueue(
  input: LegacyByteActionQueueInput,
  type: number,
  x: number,
  y: number,
  value: number,
): void {
  // Offsets 0..14: `c:I == 0` (ifeq -> return) or `u:B > 0` returns.
  if (input.c === 0 || input.u > 0) return;
  if (type !== 100) input.onQueued?.(type, x, y, value);

  let firstChanged = false;
  if (type !== 100) {
    firstChanged = true;
    for (let index = 0; index < 10; index += 1) {
      if (input.uBytes[index] !== 0) continue;
      input.uBytes[index] = type;
      input.kMatrix[0][index] = x;
      input.kMatrix[1][index] = y;
      input.kMatrix[2][index] = value;
      input.gCounters[index] = 0;
      break;
    }
  } else if (input.uBytes[0] !== 0) {
    let shouldShift = false;
    firstChanged = true;
    input.ay = 0;
    for (let counter = 0; counter < 9; counter += 1) input.gCounters[counter] += 1;
    if (input.uBytes[1] !== 0) shouldShift = input.gCounters[0] > 1;
    else shouldShift = input.gCounters[0] > 4;

    if (shouldShift) {
      for (let slot = 0; slot < 9; slot += 1) {
        input.uBytes[slot] = input.uBytes[slot + 1];
        input.kMatrix[0][slot] = input.kMatrix[0][slot + 1];
        input.kMatrix[1][slot] = input.kMatrix[1][slot + 1];
        input.kMatrix[2][slot] = input.kMatrix[2][slot + 1];
        input.gCounters[slot] = input.gCounters[slot + 1];
        input.uBytes[slot + 1] = 0;
      }
      // Offsets 315..341: `u[0] == 0` skips; only a lone remaining entry (u[0] != 0, u[1] == 0)
      // restarts its counter. FIXED 2026-10-09 (oracle run 6, frame 4584): the u[0] test was inverted.
      if (input.uBytes[0] !== 0 && input.uBytes[1] === 0) input.gCounters[0] = 0;
    }
  }

  if (!firstChanged) return;
  // Offsets 342..412: both the refresh and the ay write sit behind `a[1] || a[9]`. FIXED
  // 2026-10-09 (oracle run 5, frame 12630): ay was rewritten even with neither flag set.
  if (input.selectionFlags[1] || input.selectionFlags[9]) {
    input.onSelectionRefresh?.(input.selectionFlags[0], true, false, input.selectionFlags[4]);
    input.ay = input.kMatrix[0][0] !== 0 || input.kMatrix[1][0] !== 0 ? 1 : 0;
  }
}
