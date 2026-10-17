import { legacySubsystemBEntryGate } from "./LegacySubsystemBEntryGate";
import { stepLegacySubsystemBActivityPrefix } from "./LegacySubsystemBActivityPrefix";
import { stepLegacySubsystemBPreActionGate } from "./LegacySubsystemBPreActionGate";
import { stepLegacySubsystemBDecision } from "./LegacySubsystemBDecision";
import { stepLegacySubsystemBFinalPrefix } from "./LegacySubsystemBFinalPrefix";

export type LegacySubsystemBInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly frame: number;
  readonly id: number;
  readonly team: number;
  /** b.B:I (#8), read when the tail's gate runs -- see LegacySubsystemBFinalPrefix. */
  readonly B: () => number;
  readonly fN: boolean;
  readonly fL: boolean;
  readonly fQ: number;
  /** b.m:B (#202), read AFTER a(int,int,boolean) (#273) refreshes it. */
  readonly m: () => number;
  readonly onA?: () => void;
  readonly onOther?: () => void;
  /** private boolean m() (#401), offset 231 -- LegacySubsystemBM.ts. */
  readonly onM?: () => boolean;
  /** N() (#250), the tail's dispatch at offset 1343. */
  readonly onN?: () => void;
  /** n() (#402), offset 610. */
  readonly onNeeds?: () => void;
  readonly onAn?: () => void;
  readonly onEntityTransform?: (x: number, y: number, flag: boolean) => void;
  readonly onQueue?: () => void;
  readonly onRawAction?: (id: number, action: number) => void;
  readonly onBBoolean?: (value: boolean) => boolean;
  readonly onGroupMode?: (mode: number) => void;
  readonly onCellValue?: (x: number, y: number, layer: number) => number;
  readonly entityAt?: (row: number, column: number) => number;
  /** private void q() (#411), b()'s offset-1291 callee -- LegacyEntityRecordDoorRetarget.ts (wired 2026-09-21). */
  readonly onQ?: () => void;
  readonly onP?: () => void;
};

/**
 * Bytecode-order composition of the currently ported b() segments.
 * It intentionally returns b()'s final false result; only the early m()
 * branch is a proven true return.
 */
export function stepLegacySubsystemB(input: LegacySubsystemBInput): boolean {
  if (legacySubsystemBEntryGate(input)) input.onA?.();

  const activity = stepLegacySubsystemBActivityPrefix(input);
  // Offsets 72/88/105: `goto 1477` -- b()'s own `iconst_0; ireturn`, AFTER
  // the tail. BUG FIX (2026-09-14): this branch used to write
  // `dense[5050+v] = 0` and run the tail (including p()). A unit mid-step
  // (dense[202/303+v] != 0) therefore replanned before stepping onto its
  // last waypoint, saw its OWN -128 claim on that cell as an obstacle, got a
  // zero-length route from #332, and p()'s type-69 tail reset its target to
  // the tile it was leaving -- the one-tile step-back on arrival. KEmulator
  // ground truth (user, 2026-09-14): the villager stops on the ordered tile.
  // The `5050 = 0` belongs to offset 1171, which only 614..1154 jump to, and
  // stepLegacySubsystemBDecision already writes it itself.
  if (!activity.eligible) return false;
  if (activity.handled) return true;
  // Offsets 171/209: `goto 1185`, skipping 253..1184 entirely.
  if (activity.toTail) {
    stepLegacySubsystemBFinalPrefix(input);
    return false;
  }

  stepLegacySubsystemBPreActionGate({
    state: input.state,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    id: input.id,
    entityAt: input.entityAt,
    onNeeds: input.onNeeds,
    onAn: input.onAn,
  });

  stepLegacySubsystemBDecision({ ...input, v: input.id, u: input.team });
  stepLegacySubsystemBFinalPrefix(input);
  return false;
}
