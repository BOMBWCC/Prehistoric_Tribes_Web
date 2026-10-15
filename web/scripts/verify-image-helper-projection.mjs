import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyImageHelperProjection.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { projectLegacyImageHelper } = module.exports;

const shorts = Array.from({ length: 2 }, () => new Int16Array(8));
const bytes = Array.from({ length: 4 }, () => new Int8Array(8));
shorts[1][2] = 0x4000 | 17;
bytes[3][2] = 0;
bytes[1][2] = -3;
bytes[2][2] = 4;
const calls = [];
const result = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 17,
  originX: 20, originY: 30, mode: 2,
  shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
});
assert.deepEqual(calls, [[17, 20 - 3 + 128, 34]]);
assert.equal(result.processed, 1);
assert.equal(result.directComposites, 1);
assert.equal(result.unhandled, 0);
assert.equal(result.finalU, 0);

bytes[3][2] = 1;
shorts[1][2] = 0x4000 | 17;
calls.length = 0;
const flagOne = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 118,
  originX: 20, originY: 30, mode: 2,
  shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
});
assert.deepEqual(calls, [[135, 145, 34]]);
assert.equal(flagOne.directComposites, 1);
assert.equal(flagOne.unhandled, 0);
assert.equal(flagOne.finalU, 0);

bytes[3][2] = 1;
shorts[1][2] = 17;
calls.length = 0;
const special = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 4,
  originX: 20, originY: 30, mode: 2, initialU: 0, widthSeed: 40,
  shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
});
assert.deepEqual(calls, [[21, 17, 34]]);
assert.equal(special.directComposites, 1);
assert.equal(special.finalU, 1);

calls.length = 0;
const unresolved = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 4,
  originX: 20, originY: 30, mode: 2, initialU: 0,
  shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
});
assert.deepEqual(calls, []);
assert.equal(unresolved.directComposites, 0);
assert.equal(unresolved.unhandled, 1);
assert.equal(unresolved.finalU, 1);

bytes[3][2] = 14; // flag 6, group 1, P 0
shorts[1][2] = 17;
calls.length = 0;
const projections = [];
const eBytes = new Int8Array(9000);
const flagSix = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100, fieldK: 3, ai: 4,
  eBytes, shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.deepEqual(projections, [[17, 17, 34, 111]]);
assert.equal(flagSix.projections, 1);
assert.equal(flagSix.directComposites, 0);

const zeroPWithNegativeArgument = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: -1, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100, fieldK: 3, ai: 4,
  eBytes, shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.equal(zeroPWithNegativeArgument.projections, 1);

bytes[3][2] = 2; // flag 2, group 0, P 0
shorts[1][2] = 17;
const selectors = new Int8Array(8);
selectors[0] = 3;
eBytes[1316] = 0;
const flagTwo = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: -1, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100,
  eBytes, shortTables: shorts, byteTables: bytes, groupSelectors: selectors,
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.equal(flagTwo.projections, 1);
assert.deepEqual(projections.at(-1), [17, 17, 34, 100]);

bytes[3][2] = 4; // flag 4, group 0, P 0
shorts[1][3] = 55;
eBytes[1316] = 2;
eBytes[3033] = 7;
eBytes[8749] = 2;
const groupFlags = new Int8Array(8);
const flagFour = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: -1, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100,
  eBytes, groupFlags, shortTables: shorts, byteTables: bytes, groupSelectors: selectors,
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.deepEqual(projections.slice(-2), [[90, 17, 34, 100], [55, 17, 34, 7]]);
assert.equal(flagFour.projections, 2);
assert.equal(groupFlags[0], 1);

bytes[3][2] = 22; // flag 6, group 2, P 0
eBytes[8627] = 0;
const blockedGroupTwo = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100, fieldK: 3, ai: 4,
  eBytes, shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.equal(blockedGroupTwo.projections, 0);
assert.equal(blockedGroupTwo.unhandled, 1);
eBytes[8627] = 2;
const allowedGroupTwo = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: 0,
  originX: 20, originY: 30, mode: 1, fieldF: 100, fieldK: 3, ai: 4,
  eBytes, shortTables: shorts, byteTables: bytes, groupSelectors: new Int8Array(8),
  onComposite: (...args) => calls.push(args),
  onProjection: (...args) => projections.push(args),
});
assert.equal(allowedGroupTwo.projections, 1);

bytes[3][2] = 7; // flag 7, group 0, P 0
selectors[0] = 1;
eBytes[1314] = 50;
const hFlags = new Int8Array(8);
const stateful = [];
const flagSeven = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: -1, argument3: 0,
  originX: 20, originY: 30, mode: 1, eBytes, hFlags,
  shortTables: shorts, byteTables: bytes, groupSelectors: selectors,
  onComposite: (...args) => calls.push(args),
  onStatefulProjection: (...args) => stateful.push(args),
});
assert.deepEqual(stateful, [[1, 17, 34, 0, 29]]);
assert.equal(flagSeven.projections, 1);
assert.equal(hFlags[0], 1);

bytes[3][2] = 3; // flag 3, same group, active X value
eBytes[1314] = 2;
const aBytes = new Int8Array(8);
const aShorts = new Int16Array(141);
aShorts[139] = 0;
aShorts[140] = 2;
aBytes[0] = 4;
aBytes[2] = 5;
const flagThree = projectLegacyImageHelper({
  recordBase: 2, recordCount: 1, argument1: 0, argument2: -1, argument3: 0,
  originX: 20, originY: 30, mode: 1, eBytes, hFlags: new Int8Array(8),
  aBytes, aShorts, shortTables: shorts, byteTables: bytes, groupSelectors: selectors,
  onComposite: (...args) => calls.push(args),
  onStatefulProjection: (...args) => stateful.push(args),
});
assert.deepEqual(stateful.at(-1), [1, 17, 34, 9, 29]);
assert.equal(flagThree.projections, 1);
// Flag 5 (x-group's e[1313] <= 0): x:Z is set when e[3535] != 0 or
// e[6565] == 1, unless arg3 is 10/11 (offsets 1447..1493; the first test
// was inverted until 2026-09-28).
{
  const run = (v3535, v6565, arg3) => {
    const sh = Array.from({ length: 2 }, () => new Int16Array(8));
    const by = Array.from({ length: 4 }, () => new Int8Array(8));
    by[3][2] = 5 | (1 << 3);          // flag 5, group 1, P 0
    sh[1][2] = 17;
    const sel = new Int8Array(8); sel[1] = 7;
    const e = new Int8Array(10000);
    e[1313 + 7] = 0; e[3535 + 7] = v3535; e[6565 + 7] = v6565;
    let x = 0;
    projectLegacyImageHelper({
      recordBase: 2, recordCount: 1, argument1: 0, argument2: 0, argument3: arg3,
      originX: 0, originY: 0, mode: 1, eBytes: e, hFlags: new Int8Array(8),
      shortTables: sh, byteTables: by, groupSelectors: sel, stateV: 1,
      onComposite: () => {}, onStatefulProjection: () => {}, onStateX: () => { x += 1; },
    });
    return x;
  };
  assert.equal(run(3, 0, 0), 1);
  assert.equal(run(0, 1, 0), 1);
  assert.equal(run(0, 0, 0), 0);
  assert.equal(run(3, 0, 10), 0);
}
console.log("image helper flag-0 projection OK");
