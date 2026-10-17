import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemBActivityPrefix.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacySubsystemBActivityPrefix } = module.exports;

const make = () => ({ state: new Int8Array(10000), id: 4 });

const skipped = make();
skipped.state[202 + 4] = 1;
let result = stepLegacySubsystemBActivityPrefix(skipped);
assert.equal(result.eligible, false);
assert.equal(result.handled, false);

const type109 = make();
type109.state[2828 + 4] = 109;
const events = [];
result = stepLegacySubsystemBActivityPrefix({
  ...type109,
  onOther: () => events.push("o"),
});
assert.equal(result.eligible, true);
assert.equal(result.handled, false);
assert.deepEqual(events, ["o"]);

const threshold = make();
threshold.state[5050 + 4] = 2;
threshold.state[1010 + 4] = 3;
threshold.state[7777 + 4] = 2;
result = stepLegacySubsystemBActivityPrefix(threshold);
assert.equal(result.eligible, true);
assert.equal(result.handled, false);

assert.equal(result.toTail, false);

// Offset 171: `5050 < 1010 - 7777` -> goto 1185.
const tailA = make();
tailA.state[1010 + 4] = 3;
result = stepLegacySubsystemBActivityPrefix(tailA);
assert.deepEqual([result.eligible, result.handled, result.toTail], [true, false, true]);

// Offsets 175..209: `(2929 & 255) > 7 && 3030 != 0` -> goto 1185.
const tailB = make();
tailB.state[2929 + 4] = 8;
tailB.state[3030 + 4] = 1;
result = stepLegacySubsystemBActivityPrefix(tailB);
assert.deepEqual([result.eligible, result.handled, result.toTail], [true, false, true]);
// ...but mode <= 7 falls through (`if_icmple 212`) regardless of 3030.
tailB.state[2929 + 4] = 7;
result = stepLegacySubsystemBActivityPrefix(tailB);
assert.equal(result.toTail, false);

const handled = make();
handled.state[1414 + 4] = 12;
let mCalls = 0;
result = stepLegacySubsystemBActivityPrefix({
  ...handled,
  onM: () => { mCalls += 1; return true; },
});
assert.equal(result.eligible, true);
assert.equal(result.handled, true);
assert.equal(mCalls, 1);
assert.equal(handled.state[3636 + 4], 0);

console.log("b() activity prefix OK");
