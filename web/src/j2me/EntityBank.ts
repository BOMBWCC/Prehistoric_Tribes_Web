/**
 * Raw b -> f.e state bank. The record meanings are deliberately not renamed:
 * the original bytecode has not proven whether a record is a unit, building,
 * resource node, or another entity.
 */
export const F_E_LENGTH = 9983;

export class EntityBank {
  readonly state: Int8Array;

  constructor(state = new Int8Array(F_E_LENGTH)) {
    if (state.length !== F_E_LENGTH) {
      throw new RangeError(`f.e length ${state.length} does not match ${F_E_LENGTH}`);
    }
    this.state = state;
  }

  // b.a(byte)(#475)/b.c(int)(#563)/b.a(int)(#476) used to be forwarded from
  // here as `allocateTen`/`releaseTen`/`releaseTenEntity`. They need class
  // b's f:[[B]/c:[[B] tables (LegacySubsystemArrays.fRows/cRows), which this
  // bank does not hold, so LegacyRuntimeState now calls
  // LegacySubsystemBTenSlot.ts directly and these pass-throughs are gone.
  // See that file's docblock for the 2026-09-04 retraction that made them
  // real code again rather than three `throw`s.

  read(offset: number): number {
    this.assertOffset(offset);
    return this.state[offset];
  }

  write(offset: number, value: number): void {
    this.assertOffset(offset);
    this.state[offset] = toJavaByte(value);
  }

  private assertOffset(offset: number): void {
    if (!Number.isInteger(offset) || offset < 0 || offset >= this.state.length) {
      throw new RangeError(`f.e offset ${offset} is outside ${this.state.length} bytes`);
    }
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
