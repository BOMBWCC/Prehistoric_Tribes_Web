import { RecordStore } from "../platform/RecordStore";
import {
  decodeSlot0Record,
  encodeSlot0Record,
  type DecodedSlot0Record,
  type Slot0Record,
} from "./RmsRecords";
import {
  decodeGameplayRecord,
  encodeGameplayRecord,
  type RmsGameplayRecord,
} from "./RmsGameplayRecord";

/**
 * Browser boundary for the confirmed f.d(0)/f.e(0) RMS record.
 *
 * The fields intentionally retain the raw codec names.  Their gameplay
 * meaning (including progression/unlock semantics) is not inferred here.
 */
export class LegacyProgressStore {
  constructor(private readonly baseName = "t") {}

  load(): DecodedSlot0Record | undefined {
    const store = RecordStore.open(this.storeName());
    if (store.getNumRecords() < 1) return undefined;
    try {
      return decodeSlot0Record(store.getRecord(1));
    } catch {
      // f's load path removes a malformed store and recovers through save.
      store.delete();
      return undefined;
    } finally {
      store.close();
    }
  }

  save(record: Slot0Record): void {
    const store = RecordStore.open(this.storeName());
    try {
      store.replaceRecord(encodeSlot0Record(record));
    } finally {
      store.close();
    }
  }

  /** Load the original f.e(int) slot-1/2 gameplay record. */
  loadGameplay(slot: 1 | 2, mapWidth: number, mapHeight: number): RmsGameplayRecord | undefined {
    const store = RecordStore.open(this.storeName(slot));
    if (store.getNumRecords() < 1) return undefined;
    try {
      return decodeGameplayRecord(store.getRecord(1), mapWidth, mapHeight);
    } catch {
      // Match the original recovery path: remove a malformed store and let the
      // caller rebuild the state from the level/bootstrap path.
      store.delete();
      return undefined;
    } finally {
      store.close();
    }
  }

  /** Replace record 1 using the exact f.d(int) slot-1/2 wire format. */
  saveGameplay(slot: 1 | 2, record: RmsGameplayRecord): void {
    const store = RecordStore.open(this.storeName(slot));
    try {
      store.replaceRecord(encodeGameplayRecord(record));
    } finally {
      store.close();
    }
  }

  private storeName(): string;
  private storeName(slot: 1 | 2): string;
  private storeName(slot?: 1 | 2): string {
    return `${this.baseName}${slot ?? 0}`;
  }
}
