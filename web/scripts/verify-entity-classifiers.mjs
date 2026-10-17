import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/render/LegacyEntityClassifiers.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const {
  classifyLegacyPositiveEntity,
  isLegacyEntityIdInRange101to122,
  isLegacyMarkerIdInRangeMinus110to61,
  classifyLegacyMarkerId,
} = module.exports;

assert.equal(classifyLegacyPositiveEntity(1), 0);
assert.equal(classifyLegacyPositiveEntity(50), 0);
assert.equal(classifyLegacyPositiveEntity(51), 1);
assert.equal(classifyLegacyPositiveEntity(100), 1);
assert.equal(classifyLegacyPositiveEntity(0), 2);
assert.equal(classifyLegacyPositiveEntity(101), 2);

assert.equal(isLegacyEntityIdInRange101to122(101), true);
assert.equal(isLegacyEntityIdInRange101to122(122), true);
assert.equal(isLegacyEntityIdInRange101to122(100), false);
assert.equal(isLegacyEntityIdInRange101to122(123), false);

assert.equal(isLegacyMarkerIdInRangeMinus110to61(-61), true);
assert.equal(isLegacyMarkerIdInRangeMinus110to61(-110), true);
assert.equal(isLegacyMarkerIdInRangeMinus110to61(-60), false);
assert.equal(isLegacyMarkerIdInRangeMinus110to61(-111), false);

assert.equal(classifyLegacyMarkerId(-111), 0);
assert.equal(classifyLegacyMarkerId(-116), 0);
assert.equal(classifyLegacyMarkerId(-117), 1);
assert.equal(classifyLegacyMarkerId(-122), 1);
assert.equal(classifyLegacyMarkerId(-123), 3);
assert.equal(classifyLegacyMarkerId(-124), 2);
assert.equal(classifyLegacyMarkerId(-110), 2);

console.log("f.u() entity-branch static classifiers (a/b/c overloads) OK");
