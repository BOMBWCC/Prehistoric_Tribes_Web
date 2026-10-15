import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => loadModule(`${path.slice(0, path.lastIndexOf("/"))}/${specifier.replace("./", "")}.ts`);
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire });
  return module.exports;
}

const { stepLegacySimpleFrameHandler } = loadModule(new URL("../src/j2me/LegacySimpleFrameHandlers.ts", import.meta.url).pathname);
const fresh = () => ({ H: true, I: false, J: false, ab: false, x: 0, vInt: 10, m: 0, aP: 0, cFlag: false, AFlag: false, flags: Array.from({ length: 20 }, () => false), k: new Int8Array(56) });

// f.H() (line 16103): first entry clears H, runs O(), sets k[52..54] by Q
// and b[10]; every frame draws aD 10 at (25,64) and aD 17 at (0,320).
{
  const h = { ...fresh(), Q: 11 };
  const calls = [];
  stepLegacySimpleFrameHandler("H", h, { onO: () => calls.push("O"), onPrimitive: (...args) => calls.push(args) });
  assert.equal(h.H, false);
  assert.deepEqual([h.k[52], h.k[53], h.k[54]], [-1, -1, 1]);
  assert.equal(h.flags[10], true);
  assert.deepEqual(calls, ["O", [10, 25, 64], [17, 0, 320]]);
  calls.length = 0;
  stepLegacySimpleFrameHandler("H", h, { onO: () => calls.push("O"), onPrimitive: (...args) => calls.push(args) });
  assert.deepEqual(calls, [[10, 25, 64], [17, 0, 320]]);

  const h16 = { ...fresh(), Q: 16 };
  stepLegacySimpleFrameHandler("H", h16, {});
  assert.deepEqual([h16.k[52], h16.k[53], h16.k[54]], [-1, 1, -1]);
}

const i = fresh();
const iCalls = [];
stepLegacySimpleFrameHandler("I", i, { onPrimitive: (...args) => iCalls.push(args) });
assert.equal(i.H, false);
assert.equal(i.vInt, 69);
assert.equal(i.flags[11], true);
assert.equal(i.k[55], -1);
assert.deepEqual(iCalls, [[11, 0, 0]]);

const j = fresh();
const jCalls = [];
stepLegacySimpleFrameHandler("J", j, { onPrimitive: (...args) => jCalls.push(args) });
assert.deepEqual(jCalls, [[11, 0, 0], [17, 0, 320], [15, 0, 0]]);
assert.equal(j.flags[15], true);

const k = fresh();
const kCalls = [];
const lifecycle = [];
stepLegacySimpleFrameHandler("K", k, { onPrimitive: (...args) => kCalls.push(args), onN: () => lifecycle.push("n"), onU: () => lifecycle.push("u"), onO: () => lifecycle.push("o") });
assert.deepEqual(lifecycle, ["n", "u", "o"]);
assert.deepEqual(kCalls, [[12, 0, 0], [17, 0, 320]]);
assert.equal(k.AFlag, true);

const l = fresh();
const lCalls = [];
stepLegacySimpleFrameHandler("L", l, { onPrimitive: (...args) => lCalls.push(args) });
assert.deepEqual(lCalls, [[11, 0, 0], [14, 120, 160], [17, 0, 320]]);
assert.equal(l.flags[14], true);

const n = fresh();
n.ab = true;
n.vInt = 59;
const nCalls = [];
stepLegacySimpleFrameHandler("N", n, { onPrimitive: (...args) => nCalls.push(args) });
assert.equal(n.x, 59);
assert.equal(n.vInt, 61);
assert.equal(n.ab, false);
assert.deepEqual(nCalls, [[11, 0, 0], [17, 0, 320]]);

const p = fresh();
p.aP = 4;
stepLegacySimpleFrameHandler("P", p);
assert.equal(p.aP, 8);
assert.equal(p.cFlag, true);
assert.equal(p.flags[12], true);
const finished = fresh();
finished.aP = 164;
let resetCalls = 0;
stepLegacySimpleFrameHandler("P", finished, { onInputReset: () => { resetCalls += 1; } });
assert.equal(finished.aP, -168);
assert.equal(finished.cFlag, false);
assert.equal(resetCalls, 1);
console.log("simple frame handlers verified");
