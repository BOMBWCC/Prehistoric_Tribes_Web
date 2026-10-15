import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.resolve("src/j2me/RmsGameplayRecord.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", compiled)(module, module.exports);
const { encodeGameplayRecord, decodeGameplayRecord } = module.exports;

const rows = (count, width) => Array.from({ length: count }, () => new Int8Array(width));
const rows3 = (layers, count, width) => Array.from({ length: layers }, () => rows(count, width));
const record = {
  qByte: 1, pByte: 2, dByte: 3, denseState: new Int8Array(9983), q2: new Int8Array(2),
  a50: rows(4, 50), aShort2x26: [new Int16Array(26), new Int16Array(26)], e30: rows(3, 30),
  a2x10x12: rows3(2, 10, 12), f30: rows(4, 30), b2x5x30: rows3(2, 5, 30),
  c2x5x5: rows3(2, 5, 5), aq: 4, y: 5, A: 6, I: 7, K: 8, h: 9, ai: 10,
  cInt: 0x10203040, L: true, N: false, intLayers0x3x96: [new Int32Array(96), new Int32Array(96), new Int32Array(96)],
  bC6x10: rows(6, 10), bFByte: 16, bKByte: 17, bRByte: 18, bLByte: 19, bAQ: 0x50607080,
  bF2x10: rows(2, 10), bG3x20: rows(3, 20), bJ50: new Int8Array(50), bN: 20, bO: 21,
  bg: 22, bJ: 23, bI: 24, t3: new Int8Array(3),
  sparseLocations: [{ value: -111, locations: [{ x: 1, y: 2 }] }],
};

const bytes = encodeGameplayRecord(record);
if (bytes.length !== 12477) throw new Error(`unexpected encoded length ${bytes.length}`);
const decoded = decodeGameplayRecord(bytes, 96, 96);
if (decoded.cInt !== 0x10203040 || decoded.bAQ !== 0x50607080) throw new Error("scalar round-trip mismatch");
if (decoded.sparseLocations[0].locations[0].x !== 1 || decoded.sparseLocations[0].locations[0].y !== 2) {
  throw new Error("sparse location round-trip mismatch");
}
console.log(`RMS gameplay codec round trip OK (${bytes.length} bytes)`);
