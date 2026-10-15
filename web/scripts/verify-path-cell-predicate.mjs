import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = new URL('../src/j2me/LegacyPathCellPredicate.ts', import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Number, RangeError });
const { legacyPathCellPredicate } = module.exports;

const state = new Int8Array(5000);
const packedBytes = new Int8Array(5000);
const shortOffsets = new Int16Array(200);
const map = Array.from({ length: 4 }, () => new Int8Array(4));
shortOffsets[53] = 0;
shortOffsets[29] = 100;
shortOffsets[108] = 200;
const context = { map, packedBytes, shortOffsets, state, u: 0, v: 5 };

assert.equal(legacyPathCellPredicate(context, 0, 0, 1), 1);
map[0][1] = -128;
packedBytes[313] = 30;
assert.equal(legacyPathCellPredicate(context, 1, 0, 0), 0);
map[0][2] = 5;
assert.equal(legacyPathCellPredicate(context, 2, 0, 0), 0);

// The 459..778 comparison path continues to the common tail for ordinary
// values; it must not reject merely because the packed values are ordered.
map[0][3] = 1;
state[4848 + 5] = 1;
state[2828 + 3] = 1;
state[2929 + 3] = 10;
packedBytes[shortOffsets[43] + 1] = 2;
assert.equal(legacyPathCellPredicate(context, 3, 0, 0), 1);

console.log('path cell predicate checks passed');
