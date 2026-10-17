import { loadBinaryResource } from "./BinaryResource";

// e.a() allocates these arrays from the first 36 entries of its length table.
export const PD0_SHORT_LENGTHS = [119, 1291, 162, 162, 2782, 144, 1069, 6903, 823, 1721, 5492] as const;
export const PD0_BYTE_LENGTHS = [119, 1291, 1291, 1291, 162, 162, 162, 2782, 2782, 144, 1069, 1069, 6903, 6903, 6903, 823, 1721, 42, 5492, 5492, 1810, 1810, 1810, 1810, 1810] as const;

export type PackedData = {
  readonly versionByte: number;
  readonly shortTables: readonly Int16Array[];
  /** Java byte[][] equivalent; values are -128..127, not unsigned bytes. */
  readonly byteTables: readonly Int8Array[];
};

/** Exact e.b() decoder for the confirmed /pd0 stream layout. */
export async function loadPackedData(): Promise<PackedData> {
  const resource = await loadBinaryResource("assets/pd0", 96990);
  const view = new DataView(resource.bytes.buffer, resource.bytes.byteOffset, resource.bytes.byteLength);
  let cursor = 0;
  const versionByte = view.getUint8(cursor);
  cursor += 1;

  const shortTables = PD0_SHORT_LENGTHS.map((length) => {
    const table = new Int16Array(length);
    for (let index = 0; index < length; index += 1) {
      table[index] = view.getInt16(cursor, false);
      cursor += 2;
    }
    return table;
  });

  const byteTables = PD0_BYTE_LENGTHS.map((length) => {
    const table = new Int8Array(resource.bytes.buffer, resource.bytes.byteOffset + cursor, length).slice();
    cursor += length;
    return table;
  });

  if (cursor !== resource.bytes.length) {
    throw new Error(`/pd0 decoder consumed ${cursor} of ${resource.bytes.length} bytes`);
  }
  return { versionByte, shortTables, byteTables };
}
