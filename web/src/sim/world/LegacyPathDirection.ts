/** Raw port of private b.a(int,int), bytecode offsets 0..102. */
export type LegacyPathDirectionState = {
  a: number;
  c: Int8Array;
};

function javaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function setLegacyPathDirection(state: LegacyPathDirectionState, dx: number, dy: number): void {
  state.a = 0;
  let absX = dx;
  if (absX > 0) state.a = javaByte(state.a + 4);
  else absX *= -1;
  let absY = dy;
  if (absY > 0) state.a = javaByte(state.a + 2);
  else absY *= -1;
  if (absX > absY) {
    state.a = javaByte(state.a + 1);
    state.c[0] = javaByte(absX - absY);
    state.c[1] = javaByte(absY);
  } else {
    state.c[0] = javaByte(absY - absX);
    state.c[1] = javaByte(absX);
  }
}
