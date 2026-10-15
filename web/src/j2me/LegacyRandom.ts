/** java.util.Random-compatible generator used by f's constructor. */
export class LegacyRandom {
  private static readonly multiplier = 0x5deece66dn;
  private static readonly addend = 0xbn;
  private static readonly mask = (1n << 48n) - 1n;
  private seed: bigint;

  constructor(seed: bigint | number = 1) {
    this.seed = (BigInt(seed) ^ LegacyRandom.multiplier) & LegacyRandom.mask;
  }

  next(bits: number): number {
    this.seed = (this.seed * LegacyRandom.multiplier + LegacyRandom.addend) & LegacyRandom.mask;
    return Number(this.seed >> BigInt(48 - bits));
  }

  /** Exact java.util.Random.nextInt() with no bound. */
  nextInt(): number {
    const value = this.next(32) >>> 0;
    return value >= 0x80000000 ? value - 0x100000000 : value;
  }
}

/** Direct port of f.a(int,int): (random.nextInt() & mask) % divisor. */
export function legacyRandomRemainder(random: LegacyRandom, mask: number, divisor: number): number {
  return (random.nextInt() & mask) % divisor;
}
