/** Raw port of f.a(byte team, byte x, byte y, byte type, byte flags). */
export type LegacyRecordAllocatorInput = {
  readonly state: Int8Array;
  readonly map: Int8Array[];
  /** f.a[1 + ...] and f.a[S] in the original allocator. */
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.a[team][12/13/11/19]. */
  readonly counters: Int16Array[];
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** Original f.F -> P side effect. */
  readonly framePending?: () => void;
  /** Original f.g(id) and f.b(id) lifecycle calls. */
  readonly onRecordInitialized?: (id: number) => void;
  readonly onRecordIndexed?: (id: number) => void;
  /** Original f.a(1, x, y, id) map-side callback for team 0. */
  readonly onTeamZeroPlacement?: (x: number, y: number, id: number) => void;
  /** Original b.a(x, y, field4949). */
  readonly onSubsystemPlacement?: (x: number, y: number, value: number) => void;
  /** Original f.F and f.q fields. */
  readonly frameFlag: boolean;
  readonly q: number;
  /** Original f.aw and f.s fields. */
  readonly aw: number;
  readonly suppressCounters: boolean;
};

export function allocateLegacyRecord(
  input: LegacyRecordAllocatorInput,
  team: number,
  x: number,
  y: number,
  type: number,
  flags: number,
): number {
  const base = 1 + team * 50;
  let slot = 0;
  while (slot < 50 && input.state[1919 + base + slot] !== 0) slot += 1;
  if (slot >= 50) return -1;

  const id = base + slot;
  if (input.frameFlag) input.framePending?.();
  const flagClass = flags & 7;
  const random = input.randomRemainder;

  put(input.state, 0 + id, x);
  put(input.state, 6262 + id, x);
  put(input.state, 3131 + id, x);
  put(input.state, 101 + id, y);
  put(input.state, 6363 + id, y);
  put(input.state, 3232 + id, y);
  put(input.state, 202 + id, 0);
  put(input.state, 303 + id, 0);
  put(input.state, 808 + id, 0);
  put(input.state, 909 + id, 0);
  put(input.state, 1111 + id, 0);
  put(input.state, 4949 + id, 4 + flagClass);
  put(input.state, 606 + id, 3);
  put(input.state, 1313 + id, 0);
  put(input.state, 1414 + id, type);
  put(input.state, 1616 + id, flagClass * 2 + random(255, 2));
  put(input.state, 1717 + id, flagClass * 2 + random(255, 2));
  put(input.state, 1818 + id, 3 + flagClass);

  const baseValue = 50 + 25 * (1 - team);
  put(input.state, 2020 + id, baseValue + random(255, 25));
  put(input.state, 2121 + id, baseValue + random(255, 25));
  put(input.state, 505 + id, baseValue + random(255, 25));

  // Offsets 421..667: flag 32 widens the roll, `2 + a(255, 2 + side)` (side is in the divisor).
  // FIXED 2026-10-14 (oracle run 15, play23 frame 73825, mission 5's units): the port added side
  // after the roll, giving 5..6 instead of 2..6.
  const side = (flags & 32) === 0 ? 0 : 3;
  const randomA = random(255, 3);
  const randomB = random(255, 3);
  put(input.state, 6969 + id, randomA !== 0 ? 1 : 2 + random(255, 2 + side));
  put(input.state, 7070 + id, randomA === 1 ? 2 + random(255, 2 + side) : 1);
  put(input.state, 7272 + id, randomA === 2 ? 2 + random(255, 2 + side) : 1);
  put(input.state, 7171 + id, randomB !== 0 ? 1 : 2 + random(255, 2 + side));
  put(input.state, 7373 + id, randomB === 1 ? 2 + team + random(255, 2 + side) : 1 + team);
  put(input.state, 7474 + id, randomB === 2 ? 2 + random(255, 2 + side) : 1);
  put(input.state, 7575 + id, 1 + ((flags >> 3) & 3) * 3 + random(255, 3));

  put(input.state, 6464 + id, 69);
  put(input.state, 3434 + id, -1);
  put(input.state, 3535 + id, 0);
  put(input.state, 3636 + id, 0);
  put(input.state, 3737 + id, 2 + random(255, 2));
  put(input.state, 3838 + id, id);
  put(input.state, 4444 + id, id);
  put(input.state, 4545 + id, 0);
  put(input.state, 4646 + id, -1);
  put(input.state, 4747 + id, id);
  put(input.state, 4848 + id, 0);
  const orientationLow = random(255, 3);
  const orientationHigh = random(15, 4);
  put(input.state, 5151 + id, (orientationHigh << 2) | orientationLow);

  // Offsets 877..966: `a12 > a13 && aw != 0` or `aw == 1` -> 1515 = 1 (a13++),
  // else 1515 = 0 (a12++). So aw 0 / 1 force a gender and aw 2 alternates.
  // CORRECTED 2026-09-15: the port had the test inverted (aw == 0 gave 1).
  const a12 = input.counters[team][12] ?? 0;
  const a13 = input.counters[team][13] ?? 0;
  if ((a12 > a13 && input.aw !== 0) || input.aw === 1) {
    put(input.state, 1515 + id, 1);
    input.counters[team][13] += 1;
  } else {
    put(input.state, 1515 + id, 0);
    input.counters[team][12] += 1;
  }

  if (type < 12) {
    put(input.state, 2828 + id, 17);
    put(input.state, 2929 + id, 14);
    const value = 5 + random(255, 10);
    put(input.state, 6767 + id, value);
    put(input.state, 1919 + id, value);
    put(input.state, 1010 + id, 8);
  } else {
    put(input.state, 2828 + id, 69);
    put(input.state, 2929 + id, 8);
    const longBase = (input.q === 0 && team === 1) ? 20 : 40;
    const value = longBase - (input.state[1515 + id] - 1) * 10 + random(255, 15);
    put(input.state, 6767 + id, value);
    put(input.state, 1919 + id, value);
    put(input.state, 1010 + id, flagClass === 0 ? 8 : 9 - flagClass);
  }

  put(input.state, 6565 + id, 9);
  // Offsets 1206..1237: flag 64 rolls the weapon as a(255, 4 + team * 2) -- team 1 can draw 0..5.
  // FIXED 2026-10-14 (oracle run 15, play25 frame 88578, enemy 75): the port added team * 2 after.
  if ((flags & 64) !== 0) put(input.state, 6565 + id, random(255, 4 + team * 2));
  if (input.q === 3) put(input.state, 6565 + id, 0);
  if ((input.q === 4 || input.q === 5) && input.state[6565 + id] === 1) put(input.state, 6565 + id, 3);
  put(input.state, 3333 + id, -1);
  put(input.state, 7979 + id, 0);
  put(input.state, 8282 + id, 0);
  put(input.state, 8080 + id, 0);
  for (const offset of [2222, 2323, 2424, 2525, 2626]) put(input.state, offset + id, 0);

  input.onRecordInitialized?.(id);
  input.onRecordIndexed?.(id);
  if (input.map[y][x] === 0) input.map[y][x] = toJavaByte(id);
  // Offsets 1443..1489: [11], the team-0 notice and [19] all sit inside `if (!f.s:Z)`.
  if (!input.suppressCounters) {
    input.counters[team][11] += 1;
    if (team === 0) input.onTeamZeroPlacement?.(x, y, id);
    input.counters[team][19] += 1;
  }
  if (team === 0) input.onSubsystemPlacement?.(input.state[id], input.state[101 + id], input.state[4949 + id]);
  return id;
}

function put(state: Int8Array, offset: number, value: number): void {
  state[offset] = toJavaByte(value);
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
