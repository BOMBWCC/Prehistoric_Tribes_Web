/**
 * Direct translation of `final void a(byte, int, int)` (constant pool
 * #274), javap offsets 0..190 (bytecode/b-javap.txt line 50698).
 * `dispatchLegacyEntityAction`'s own `onMove` target -- confirmed via
 * direct bytecode read of the real (only) call site inside `private
 * boolean a(int, byte)` (offset 68..78, `b-javap.txt:30158`): it pushes
 * `(action, v, v)`, i.e. the SAME ambient entity id (`this`'s own `v:I`
 * #225) for BOTH trailing int params, not two independent coordinates.
 *
 * **RETRACTED (2026-09-07)** -- this file previously threw at its first
 * real instruction (offset 52), on the finding that class b's own `d:[S]`
 * (#152) is "confirmed permanently null: zero `putfield` sites anywhere in
 * class b". That grep was real but, like every other instance of this
 * pattern found this session, scoped to the wrong class: `d:[S]` is
 * package-private and is allocated from OUTSIDE class b, by `f.g()`
 * (`f-javap.txt:1332`, `new short[6]`, `putfield #273 // Field b.d:[S`).
 * This port already has it modeled -- unread until now -- as
 * `LegacySubsystemArrays.dShort` (an `Int16Array(6)`, already initialized
 * to `-1` by `initializeOriginal`, matching `b.a()`'s own
 * `dShort.fill(-1)`). The whole method is real, reachable, ported below.
 *
 * Control flow (offsets against `bytecode/b-javap.txt:50698`):
 *  - 0..6: `if (id > 50) return;` (`id` is the method's real `arg2`).
 *  - 7..32: `if (f.q:B < packedBytes[packedOffsets[293]+action]) return;`
 *    (`f.q:B`/#211, this port's `game.mission`).
 *  - 33..53: `dsIndex = packedBytes[packedOffsets[292]+action]`; `if
 *    (dShort[dsIndex] >= 0) return;` (reads BEFORE clearing -- a
 *    once-per-`dsIndex` debounce, not a no-op check).
 *  - 56..76: `dShort[dsIndex] = 0`.
 *  - 77..175: gates the final call below on either `action` being `4` or
 *    `5` (in which case it further requires the entity's own `z:B`(#235)/
 *    `A:B`(#6) position -- both class b's own fields, genuinely
 *    undiscovered before this pass, see `LegacySubsystemArrays.bField6`/
 *    `bField235` -- to fall OUTSIDE the current viewport rectangle
 *    `[f.I:B, f.I:B+f.O:B) x [f.K:B, f.K:B+f.P:B)`, i.e. this only fires
 *    for an off-screen entity), OR `action` being anything else AND class
 *    b's own `K:B`(#28, this port's `bField28`, constructor default `50`)
 *    being `>= 50` (the common case, since nothing in this port's ported
 *    methods currently lowers it below `50`) -- in which case the
 *    viewport check is skipped entirely and the call is unconditional.
 *    Every other combination returns without calling anything.
 *  - 178..190: `f.a((byte)action, (byte)id, (byte)id2)` (#306,
 *    `f-javap.txt:18774..18947`) -- the `onNotify` callback. WIRED
 *    2026-09-23 (`LegacyRuntimeState.entityActionPrompt`: the 0..42 entry
 *    gate plus the already-ported body, `beginLegacyEntityAction`).
 */
export type LegacyEntityMoveTriggerInput = {
  readonly id: number;
  readonly id2: number;
  readonly action: number;
  /** f.q:B (#211), tracked as game.mission (CORRECTION 2026-08-24: was game.subsystemQ, a disconnected duplicate, merged into qByte). */
  readonly fQByte: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b's own d:[S] (#152) -- LegacySubsystemArrays.dShort, a live Int16Array(6). Mutated in place. */
  readonly dShort: Int16Array;
  /** b's own K:B (#28) -- LegacySubsystemArrays.bField28 (constructor default 50). */
  readonly bField28: number;
  /** b's own z:B (#235) -- LegacySubsystemArrays.bField235; see this file's own docblock. */
  readonly bField235: number;
  /** b's own A:B (#6) -- LegacySubsystemArrays.bField6; see this file's own docblock. */
  readonly bField6: number;
  readonly IByte: number;
  readonly viewportO: number;
  readonly KByte: number;
  readonly viewportP: number;
  /** f.a(byte,byte,byte) (#306) -- LegacyRuntimeState.entityActionPrompt. */
  readonly onNotify?: (action: number, id: number, id2: number) => void;
};

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function triggerLegacyEntityMove(input: LegacyEntityMoveTriggerInput): void {
  const { id, id2, action } = input;
  if (id > 50) return;

  const threshold = input.packedBytes[(input.packedOffsets[293] ?? 0) + action] ?? 0;
  if (input.fQByte < threshold) return;

  const dsIndex = input.packedBytes[(input.packedOffsets[292] ?? 0) + action] ?? 0;
  if ((input.dShort[dsIndex] ?? 0) >= 0) return;
  input.dShort[dsIndex] = 0;

  let callFinal: boolean;
  if (action === 4 || action === 5) {
    const outOfView =
      input.bField235 < input.IByte ||
      input.bField235 >= input.IByte + input.viewportO ||
      input.bField6 < input.KByte ||
      input.bField6 >= input.KByte + input.viewportP;
    if (!outOfView) return;
    callFinal = true;
  } else if (input.bField28 < 50) {
    return;
  } else {
    callFinal = true;
  }

  if (callFinal) {
    input.onNotify?.(toJavaByte(action), toJavaByte(id), toJavaByte(id2));
  }
}
