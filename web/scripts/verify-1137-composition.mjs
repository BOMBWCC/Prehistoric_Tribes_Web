import assert from "node:assert/strict";
import { drawLegacy1137Composition } from "../src/render/Legacy1137Composition.ts";

const packedBytes = new Int8Array(128);
const packedOffsets = new Int16Array(312);
packedOffsets[151] = 20;
packedOffsets[152] = 40;
packedOffsets[283] = 60;
packedBytes[62] = 4;
packedBytes[40 + 14] = 2;
packedBytes[40 + 15] = 5;
packedBytes[20 + 2] = 14;
packedBytes[20 + 3] = 15;
packedBytes[20 + 4] = 16;
const shortTables = Array.from({ length: 2 }, () => new Int16Array(1291));
shortTables[1][1137] = 12;
const byteTables = Array.from({ length: 24 }, () => new Int8Array(128));
byteTables[23][12] = 6;
const events = [];
drawLegacy1137Composition({
  x: 30, y: 50, commandRecord: 1137, languageState: 14,
  packedBytes, packedOffsets, shortTables, byteTables,
  onPacked: (...args) => events.push(["packed", ...args]),
  onGeometry: (...args) => events.push(["geometry", ...args]),
  onFlush: () => events.push(["flush"]),
});
assert.deepEqual(events, [
  ["packed", 12, 30, 40],
  ["geometry", 42, 40, 1, 71, 0],
  ["packed", 12, 30, 50],
  ["geometry", 42, 50, 1, 72, 0],
  ["packed", 12, 30, 60],
  ["geometry", 42, 60, 1, 73, 0],
  ["flush"],
]);
console.log("f.c(1137) composition bridge OK");
