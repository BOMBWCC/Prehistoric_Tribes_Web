import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/render/LegacyZKind3.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyZKind3 } = module.exports;

const bytes = Array.from({ length: 25 }, () => new Int8Array(1300)); const shorts = [new Int16Array(1300), new Int16Array(1300)];
shorts[1][1181] = 7; bytes[23][7] = 5; bytes[24][7] = 6;
const e = new Int8Array(9200); const kRows = [new Int8Array(4), new Int8Array(4), new Int8Array([5])]; e[6868 + 5] = 7; e[1515 + 5] = 1;
const regionState = { aI: 11, aJ: 20, aK: 30, o: 4, aF: 12, u0: 3, e, kRows, cBytes: new Int8Array([0, 2]), byteRows: bytes, shortRows: shorts };
let region; stepLegacyZKind3(regionState, 0, { onRegion: (...args) => { region = args; } });
assert.deepEqual(region, [2, 0, 0, 20, 24, 31, 38, 0]);

const imageState = { ...regionState, aI: 10, o: 9 }; let image; let palette;
stepLegacyZKind3(imageState, 0, { onImage: (...args) => { image = args; }, onPalette: (value) => { palette = value; } });
assert.deepEqual(image, [2, 0, 31, 38, 3]); assert.equal(palette, 9);

let k; stepLegacyZKind3({ ...regionState, aI: 2 }, 1128, { onK: (value) => { k = value; } }); assert.equal(k, 1128);

let seven; stepLegacyZKind3({ ...regionState, aI: 4 }, 1129, { onSevenIntText: (...args) => { seven = args; } });
assert.deepEqual(seven, [20, 30, 0, 115, 13, -1, -1]);
let five; stepLegacyZKind3({ ...regionState, aI: 4 }, 1000, { onFiveIntText: (...args) => { five = args; } });
assert.deepEqual(five, [20, 30, 0, 12, -1]);

console.log("f.d(3,command) proven image branches OK");
