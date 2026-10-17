import { allocateLegacyRecord, type LegacyRecordAllocatorInput } from "../world/LegacyRecordAllocator";
import { UNIT_FLAGS, UNIT_HELD_ITEM } from "../../core/DenseLayout";

/**
 * Raw port of class b's `final void a(int, int, int, byte, byte)`
 * (bytecode/b-javap.txt offsets 0..196). For each of `count` iterations,
 * allocates a new record at (x,y) -- relocating to a nearby free cell
 * first via `b.a(IIII)` (`checkLegacySpiralPlacementGate`, wired in as
 * `onNearbySearch`) if the target is already occupied -- then, only when the
 * allocation succeeded AND `aU:I>=0` AND `type===1`, writes
 * `dense[saveOffsets[16 + (id & 1)] + id] = subsystemY`.
 *
 * RETRACTED (2026-09-07): that write used to be modelled as a guaranteed
 * throw, on the premise that `b:[S]`(#132) is permanently null, which also
 * made `L()` (private, ~143 lines) and the trailing `e[7979+id] |= 64` look
 * unreachable. `b:[S]` is `saveOffsets`; both are reachable. As of
 * 2026-09-23 both are actually emitted -- `L()` is `onEquipIssue`
 * (LegacyEntityEquipIssue.ts, ported 2026-09-22).
 */
export type LegacyEntityBatchAllocateInput = {
  readonly state: Int8Array;
  readonly map: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly counters: Int16Array[];
  readonly randomRemainder: (mask: number, divisor: number) => number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly aU: number;
  /** b.y:I (#233). */
  readonly subsystemY: number;
  framePending?: LegacyRecordAllocatorInput["framePending"];
  onRecordInitialized?: LegacyRecordAllocatorInput["onRecordInitialized"];
  onRecordIndexed?: LegacyRecordAllocatorInput["onRecordIndexed"];
  onTeamZeroPlacement?: LegacyRecordAllocatorInput["onTeamZeroPlacement"];
  onSubsystemPlacement?: LegacyRecordAllocatorInput["onSubsystemPlacement"];
  readonly frameFlag: boolean;
  readonly q: number;
  readonly aw: number;
  readonly suppressCounters: boolean;
  /** b.v:I (#225) -- set to the accepted record id inside the throwing branch. */
  setV: (value: number) => void;
  /**
   * class b's `final boolean a(int,int,int,int)` (#270), called here as
   * `a(1, 127, x, y)` after `v:I = 0` (bytecode/b-javap.txt offsets 32..45 of
   * `a(int,int,int,byte,byte)`). Ported in full as
   * `checkLegacySpiralPlacementGate` (LegacySpiralPlacementGate.ts); wired at
   * the runtime rather than imported so this module keeps its narrow input.
   *
   * RETRACTED (2026-09-07): this used to go through
   * `LegacyEntityNearbySearch.ts`, a second, narrowed port of the SAME method
   * that (a) still assumed `b:[S]`(#132) is permanently null and (b) modelled
   * the accept path as `shortScratch[31 + v]`, treating a `saveOffsets` index
   * as a dense offset. The real write is `dense[saveOffsets[31] + id]`, which
   * with id=0 is `dense[3131]` -- exactly what this function reads back below.
   * That duplicate is deleted.
   */
  readonly onNearbySearch?: (x: number, y: number) => void;
  /** b.b:[S] (#132) -- LegacyRuntimeState.saveOffsets, the 570-short stride table. */
  readonly saveOffsets: Int16Array;
  /** b.b:I (#135) -- last allocateRecord() result. */
  setLastRecordId: (value: number) => void;
  /**
   * private void L() (#248, LegacyEntityEquipIssue.ts) -- offset 160, run on
   * the unit just created (the ambient v:I was set to it at offset 128).
   */
  readonly onEquipIssue?: (id: number) => void;
};

export function stepLegacyEntityBatchAllocate(
  input: LegacyEntityBatchAllocateInput,
  count: number,
  x: number,
  y: number,
  type: number,
  value: number,
): void {
  for (let i = 0; i < count; i += 1) {
    let localX = x;
    let localY = y;

    if ((input.map[localY]?.[localX] ?? 0) !== 0) {
      input.setV(0);
      try {
        input.onNearbySearch?.(localX, localY);
      } catch {
        // f.ak()'s already-modeled try/catch, kept: the gate itself has no
        // local handler (see LegacySpiralPlacementGate.ts).
      }
      localX = input.state[3131] ?? 0;
      localY = input.state[3232] ?? 0;
    }

    const recordId = allocateLegacyRecord(
      {
        state: input.state,
        map: input.map,
        packedBytes: input.packedBytes,
        packedOffsets: input.packedOffsets,
        counters: input.counters,
        randomRemainder: input.randomRemainder,
        frameFlag: input.frameFlag,
        framePending: input.framePending,
        q: input.q,
        aw: input.aw,
        suppressCounters: input.suppressCounters,
        onRecordInitialized: input.onRecordInitialized,
        onRecordIndexed: input.onRecordIndexed,
        onTeamZeroPlacement: input.onTeamZeroPlacement,
        onSubsystemPlacement: input.onSubsystemPlacement,
      },
      type,
      localX,
      localY,
      20,
      0,
    );
    input.setLastRecordId(recordId);

    if (recordId > 0) {
      input.state[UNIT_HELD_ITEM + recordId] = value;

      if (input.aU >= 0 && type === 1) {
        input.setV(recordId);
        // dense[ saveOffsets[16 + (id & 1)] + id ] = subsystemY.
        // RETRACTED (2026-09-07): this was `const shortScratch = undefined`
        // plus a non-null assertion, on the premise that b:[S] (#132) is
        // permanently null. It is not -- e.f() allocates it as new short[570]
        // and b.a(f) copies it in (b-javap.txt:550); it is this port's
        // saveOffsets. With the read real, L() and the trailing
        // dense[7979+id] |= 64 below are no longer unreachable either.
        const target = (input.saveOffsets[16 + (recordId & 1)] ?? 0) + recordId;
        input.state[target] = input.subsystemY;

        // Offsets 160..182. BUG FIX (2026-09-23): the note above has said since
        // 2026-09-07 that L() and this 7979 write are "no longer unreachable",
        // but neither was ever actually emitted, so every scripted type-1
        // spawn arrived unarmed. L() hands the new unit a weapon from the
        // team's pool; 7979 bit 6 then marks it.
        input.onEquipIssue?.(recordId);
        input.state[UNIT_FLAGS + recordId] = ((input.state[UNIT_FLAGS + recordId] ?? 0) | 64) << 24 >> 24;
      }
    }
  }
}
