import assert from "node:assert/strict";
import { LegacyResourceTables } from "../src/platform/LegacyResourceTables.ts";

const tables = new LegacyResourceTables();
const translation = new Int8Array(512);
const base = 100;
translation[base + 65] = 7;
translation[base + 66] = 9;
translation[base + 67] = 11;

const endRecord = tables.loadTranslatedRecords(
  0,
  [Uint8Array.of(65, 66), Uint8Array.of(67)],
  translation,
  base,
  0,
);

assert.equal(endRecord, 2);
assert.deepEqual(Array.from(tables.smallOffsets.slice(0, 3)), [0, 2, 3]);
assert.deepEqual(Array.from(tables.smallBytes.slice(0, 3)), [7, 9, 11]);

console.log("c.b(int) translated language resource load OK");
