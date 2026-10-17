/**
 * private void a(int,byte,int), bytecode/f-javap.txt line 14198, offsets
 * 0..481 -- the slot strip a command row 1010 draws (the in-game command
 * bar: BUILD and its siblings, a unit's item slots...). Rewritten
 * 2026-10-01 against the bytecode: the earlier mirror only traced the
 * icon (d) and unit (a(IIIIB)) draws, so the command bar showed empty
 * slots, and it used the wrong primitive, text position and q field.
 */
export type Legacy1010Input = {
  /** arg1: the command row; its b[1] record is each slot's background. */
  readonly start: number;
  /** arg2: 2 skips every slot but the selected one. */
  readonly selection: number;
  /** arg3: y. */
  readonly originY: number;
  /** aW:I (#172), aV:I (#171, static), aX:I (#173), aY:I (#174), aZ:I (#175). */
  readonly count: number;
  readonly stride: number;
  readonly aX: number;
  readonly originX: number;
  readonly aZ: number;
  /** as:B (#219), the selected slot; av:B (#226). */
  readonly selectedRow: number;
  readonly av: number;
  /** f.r:[B (#358) slot contents, f.s:[B (#363) slot counts. */
  readonly r: Int8Array;
  readonly s: Int8Array;
  /** e[8749 + q:I] -- the kind of record q:I (#356). */
  readonly recordKind: number;
  /** V:Z (#109), F:Z (#49), T:Z (#102), U:Z (#106). */
  readonly V: boolean;
  readonly F: boolean;
  readonly t: boolean;
  readonly u: boolean;
  /** f:I (#294) and e:I (#284). */
  readonly f: number;
  readonly e: number;
  readonly shortTables: readonly Int16Array[];
  /** b(III) (#535). */
  readonly onSprite: (record: number, x: number, y: number) => void;
  /** a(III) (#439). */
  readonly onPacked: (record: number, x: number, y: number) => void;
  /** a(IIIIB) (#443): the unit in a slot. */
  readonly onEntity: (id: number, x: number, y: number, arg4: number, arg5: number) => void;
  /** c.a(int,int,int,String,int) (#451). */
  readonly onText: (x: number, y: number, width: number, text: string, value: number) => void;
  /** d(IIII) (#572). */
  readonly onSubrecord: (record: number, x: number, y: number, phase: number) => void;
  /** S:Z (#97) = true, offsets 369..371. */
  readonly onS: () => void;
};

export function drawLegacy1010(input: Legacy1010Input): void {
  const y = input.originY;
  for (let index = 0; index < input.count; index += 1) {
    // Offsets 15..17 also store arg1 into N:I (#80); nothing downstream of
    // this method reads it before it is rewritten.
    const offset = input.stride * index;
    const x = input.originX + offset;
    const slot = input.aX + index;
    const selected = slot === input.selectedRow;
    if (!selected && input.selection === 2) continue;

    input.onSprite((input.shortTables[1]?.[input.start] ?? 0) & 4095, x, y - 1);
    input.onPacked(548 + (selected ? 0 : 1), x, y);

    const flag = input.r[slot] ?? 0;
    if (flag < 0) {
      // Offsets 121..192: x is `aY + offset - (-1)` (iconst_m1; isub), i.e. x + 1.
      // CORRECTED 2026-10-10 (oracle run 8, frame 10579): was x - 1.
      input.onEntity(-flag, x + 1, y + 8 + 2 + 3, -8, 29);
      if (input.V && !input.F && selected) input.onSubrecord(18, x, y, input.f);
    } else if (flag <= 8) {
      // Offsets 202..374.
      input.onPacked(659 + flag, x, y);
      const dx = input.recordKind === 6 ? -1 : 0;
      const dy = input.recordKind === 6 ? 6 : 0;
      input.onText(x + 19 + dx + 6, y + 5 + dy + 2, 1, String(input.s[slot] ?? 0), 0);
      if (input.recordKind !== 6 && slot < input.av && selected) {
        input.onSubrecord(3, x + 6, y + 2 + 2, input.f);
        input.onS();
      }
    } else {
      // Offsets 377..410.
      input.onSubrecord(flag, x, y, selected ? input.f : 0);
    }
  }
  // Offsets 419..478: the scroll arrows.
  if (input.t) input.onSubrecord(1, input.originX - 9, y + 8, input.e);
  if (input.u) input.onSubrecord(2, input.originX + input.aZ - 9 + 9, y + 8, input.e);
}
