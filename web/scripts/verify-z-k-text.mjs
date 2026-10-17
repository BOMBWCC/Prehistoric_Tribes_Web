import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/text/LegacyZKText.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZKText } = module.exports;

// f.k(int), bytecode/f-javap.txt: tableswitch on command - 1.
const run = (command, aF, extra = {}) => {
  const calls = [];
  const state = { aF, aI: 4, aJ: 20, aK: 30, l: 2 };
  stepLegacyZKText(state, command, { commandStyle: () => 1, languageBase: () => 12, onText: (...a) => calls.push(a), ...extra });
  return { calls, aF: state.aF };
};

// 1015: "aF/limit".
assert.deepEqual(run(1016, 3).calls, [[20, 30, 1, "3/12", 3]]);

// 1043..1063 advance rows (offsets 116..198): aF is REPLACED by the unit's
// field + t127[aF]; a -1 category or a negative aF draws nothing.
assert.deepEqual(run(1044, 5, { readAdvance: (aF, l) => (aF === 5 && l === 2 ? 7 : 99) }).calls, [[20, 30, 1, "7", 3]]);
assert.deepEqual(run(1044, 5, { readAdvance: () => undefined }).calls, []);
assert.deepEqual(run(1064, -1, { readAdvance: () => 7 }).calls, []);

// 1055 (offsets 244..256): (9 - aF) * 2 + 1.
assert.deepEqual(run(1056, 4).calls, [[20, 30, 1, "11", 3]]);

// 1067 (offsets 202..243): draws aF unchanged only when aF != 0 and
// e[3535 + l] is neither 0 nor 15.
assert.deepEqual(run(1068, 0, { readMode: () => 3 }).calls, []);
assert.deepEqual(run(1068, 6, { readMode: () => 0 }).calls, []);
assert.deepEqual(run(1068, 6, { readMode: () => 15 }).calls, []);
assert.deepEqual(run(1068, 6, { readMode: () => 3 }).calls, [[20, 30, 1, "6", 3]]);

// Any other row draws aF as is.
assert.deepEqual(run(1020, 42).calls, [[20, 30, 1, "42", 3]]);
console.log("f.k(int) text dispatch OK");
