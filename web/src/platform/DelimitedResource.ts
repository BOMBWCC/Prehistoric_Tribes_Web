export type DelimitedTable = readonly Uint8Array[];

/** `/N/s`, `/N/t`, and `/N/dN` byte-table reader used by c.b(int). */
export async function loadDelimitedResource(
  url: string,
  version: string,
): Promise<DelimitedTable> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load delimited resource ${url}: ${response.status}`);
  const input = new Uint8Array(await response.arrayBuffer());
  const versionBytes = new TextEncoder().encode(version);
  const records: Uint8Array[] = [];
  let record: number[] = [];

  const flush = (): void => {
    records.push(Uint8Array.from(record));
    record = [];
  };

  for (const value of input) {
    if (value === 124) {
      flush();
    } else if (value === 31) {
      record.push(...versionBytes);
    } else {
      record.push(value);
    }
  }
  flush();
  return records;
}

