import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZAb.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyZAb } = module.exports;

const e = new Int8Array(9200); const j = new Int8Array(8); const r = new Int8Array(8);
e[8810 + 5] = 10; e[8749 + 5] = 1; e[8627 + 5] = 0;
e[8993 + 5] = 3; e[1313 + 3] = 1; e[4646 + 3] = 2;
const state = { e, j, r, q: 5, ar: 0 };
stepLegacyZAb(state);
// Offsets 182..198: worker 3 goes to j[1 + slot 2] and is listed as itself.
assert.deepEqual(Array.from(r.slice(0, state.ar)), [-10, -3]);

const skipped = new Int8Array(9200); skipped[8810 + 5] = 10; skipped[8749 + 5] = 2; skipped[8627 + 5] = 0;
skipped[8993 + 5] = 10; skipped[1313 + 10] = 1; skipped[4545 + 10] = 0; const r2 = new Int8Array(4);
const state2 = { e: skipped, j: new Int8Array(8), r: r2, q: 5, ar: 0 };
stepLegacyZAb(state2);
// An unbuilt type-2 record's owner is skipped at offsets 40..99 but listed by the worker walk.
assert.deepEqual(Array.from(r2.slice(0, state2.ar)), [-10]);

// A built record's owner is listed once (oracle run 10, frame 24327: the armourer appeared twice).
{
  const e3 = new Int8Array(9200); e3[8810 + 4] = 4; e3[8749 + 4] = 0; e3[8627 + 4] = 0;
  e3[8993 + 4] = 4; e3[1313 + 4] = 1; e3[4646 + 4] = 0;
  const st = { e: e3, j: new Int8Array(8), r: new Int8Array(8), q: 4, ar: 0 };
  stepLegacyZAb(st);
  assert.deepEqual(Array.from(st.r.slice(0, st.ar)), [-4]);
}
console.log("f.ab() raw candidate normalization OK");
