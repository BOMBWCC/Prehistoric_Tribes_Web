export type LegacySpecialTile = {
  readonly type: number;
  readonly x: number;
  readonly y: number;
  readonly parameter: number;
};

/**
 * Exact f.a(int,int,int,byte) (#299, bytecode/f-javap.txt 30596, offsets
 * 0..184): claim one of the 50 ground slots (e[9833] kind, 9733 x, 9783 y,
 * 9883 amount) and mark its cell c[y][x] = -61 - slot. With every slot in
 * use it reuses the first kind-6/7 slot and clears that slot's old cell.
 * Callers: f.aN() (map load) and b's a(), a(8 ints), d(), k(), s() and
 * a(int,int,int,byte) (the vacate helper -- an animal's remains).
 *
 * CORRECTED 2026-09-27: the reuse scan stopped only at kind 6 (the test is
 * "6 or 7") and did not clear the reused slot's old cell (offsets 90..117).
 * The original scan has no bound: it walks on past slot 49 with a byte
 * index, so with no 6/7 byte anywhere it never ends. It is capped here at
 * 256 steps (every byte index) and places nothing -- a documented guard.
 * `setCell` writes the grid (c:[[B, or the map-load overlay).
 */
export function allocateLegacySpecialTile(
  state: Int8Array,
  setCell: (x: number, y: number, value: number) => void,
  tile: LegacySpecialTile,
): number {
  let slot = 0;
  while (slot < 50 && read(state, 9833 + slot) !== 0) slot += 1;
  if (slot === 50) {
    slot = 0;
    let steps = 0;
    for (; steps < 256; steps += 1) {
      const kind = read(state, 9833 + slot);
      if (kind === 6 || kind === 7) break;
      slot = toJavaByte(slot + 1);
    }
    if (steps === 256) return -1;
    setCell(read(state, 9733 + slot), read(state, 9783 + slot), 0);
  }

  write(state, 9833 + slot, tile.type);
  write(state, 9733 + slot, tile.x);
  write(state, 9783 + slot, tile.y);
  write(state, 9883 + slot, tile.parameter);
  setCell(tile.x, tile.y, toJavaByte(-61 - slot));
  return slot;
}

function read(state: Int8Array, index: number): number {
  if (index < 0 || index >= state.length) throw new RangeError(`special state index ${index} outside ${state.length}`);
  return state[index];
}

function write(state: Int8Array, index: number, value: number): void {
  if (index < 0 || index >= state.length) throw new RangeError(`special state index ${index} outside ${state.length}`);
  state[index] = toJavaByte(value);
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
