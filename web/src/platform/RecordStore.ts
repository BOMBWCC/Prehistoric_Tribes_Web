export class RecordStore {
  private constructor(private readonly name: string) {}

  static open(name: string): RecordStore {
    return new RecordStore(name);
  }

  getNumRecords(): number {
    return this.readRecords().length;
  }

  getRecord(id: number): Uint8Array {
    const records = this.readRecords();
    if (!Number.isInteger(id) || id < 1 || id > records.length) {
      throw new Error(`RMS record ${this.name} ${id} is missing`);
    }
    return records[id - 1].slice();
  }

  addRecord(data: Uint8Array): number {
    const records = this.readRecords();
    records.push(data.slice());
    this.writeRecords(records);
    return records.length;
  }

  /** The store is these records now, in one write: when it fails (storage full) the old ones stay
   *  (BUG-077; the original deleted the store first). */
  replaceRecords(...data: Uint8Array[]): void {
    this.writeRecords(data);
  }

  close(): void {}

  // The browser's storage may be full or blocked, when even touching `localStorage` throws (BUG-077).
  // This is the one place that handles it: reading finds nothing, deleting does nothing. Writing
  // throws, for saveOriginalResourceAction (f.e(int)'s boundary) to report the save failed.
  delete(): void {
    try {
      localStorage.removeItem(this.name);
    } catch { /* nothing to delete, as far as anyone can tell */ }
  }

  private readRecords(): Uint8Array[] {
    try {
      const encoded = localStorage.getItem(this.name);
      if (encoded === null) return [];

      // Compatibility with the earlier Web scaffold, which stored record 1 as
      // one bare base64 string rather than a record list.
      if (!encoded.startsWith("[")) return [decodeBase64(encoded)];

      const values: unknown = JSON.parse(encoded);
      if (!Array.isArray(values)) return [];
      return values.map((value) => decodeBase64(value as string));
    } catch {
      return []; // blocked, or not ours to read: as if there were no save
    }
  }

  private writeRecords(records: readonly Uint8Array[]): void {
    localStorage.setItem(this.name, JSON.stringify(records.map(encodeBase64)));
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (value) => value.charCodeAt(0));
}
