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

  /** The original game writes one replacement record after deleting the store. */
  replaceRecord(data: Uint8Array): number {
    this.delete();
    return this.addRecord(data);
  }

  close(): void {}

  delete(): void {
    localStorage.removeItem(this.name);
  }

  private readRecords(): Uint8Array[] {
    const encoded = localStorage.getItem(this.name);
    if (encoded === null) return [];

    // Compatibility with the earlier Web scaffold, which stored record 1 as
    // one bare base64 string rather than a record list.
    if (!encoded.startsWith("[")) return [decodeBase64(encoded)];

    const values: unknown = JSON.parse(encoded);
    if (!Array.isArray(values)) throw new Error(`Invalid RMS store ${this.name}`);
    return values.map((value) => {
      if (typeof value !== "string") throw new Error(`Invalid RMS record in ${this.name}`);
      return decodeBase64(value);
    });
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
