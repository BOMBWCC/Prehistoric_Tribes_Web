// Regression test for LegacyEntityActionScoreGate.ts (private void
// a(byte,byte,int,int), b.w()'s onAction callback target). See the file's
// own docblock for the full bytecode-derived chain.
//
// RESTORED (2026-09-07): this method used to stop at a deliberate null
// dereference of b:[S] (#132), on a retracted "always null" premise. It is
// a live 570-entry table (`saveOffsets`) and the method runs to completion;
// these cases replace the old "guaranteed throw" assertions with real
// hand-computed values, plus two cases that hit the method's OWN local
// try/catch for real reasons (a zero divisor, and an out-of-range table-53
// read using aE/aF UNCLAMPED) to prove partial writes before the throw
// survive it.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { stepLegacyEntityActionScoreGate } = loadModule("./sim/units/LegacyEntityActionScoreGate", srcDir);

function makeInput(overrides = {}) {
  const dense = new Int8Array(10000);
  const packedBytes = new Int8Array(overrides.packedBytesLength ?? 2000);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = new Int16Array(570);
  const sectionOffsets = new Int16Array(5);
  const hTable = Array.from({ length: 13 }, () => new Int8Array(101));
  const iTable = Array.from({ length: 13 }, () => new Int8Array(101));
  packedOffsets[53] = 500; // score / table-53 base
  return {
    dense, packedBytes, packedOffsets, saveOffsets, sectionOffsets,
    id: 4, x: 0, y: 0, entityB: 0, action: 0, mode: 0,
    hTable, iTable, bScalars: { bField126: 0, bField127: 0 },
    ...overrides,
  };
}

// Cooldown active (dense[5959+id] > 0) -> immediate safe no-op, dense
// untouched.
{
  const input = makeInput();
  input.dense[5959 + input.id] = 1;
  assert.doesNotThrow(() => stepLegacyEntityActionScoreGate(input));
  assert.equal(input.dense[5959 + input.id], 1);
}

// Cooldown clear, score computed but ABOVE the threshold -> safe no-op,
// dense[5959+id] stays whatever it was (0 here), bScalars untouched.
{
  const input = makeInput();
  input.dense[3131 + input.id] = 0;
  input.dense[3232 + input.id] = 0;
  input.x = 0;
  input.y = 0;
  // aE=0, aF=0 -> clamp(0)=12 each -> tableIndex = 12*25+12 = 312
  input.packedBytes[input.packedOffsets[53] + 312] = 100; // score = 10
  input.entityB = 5; // score(10) > threshold(5) -> return, no throw
  assert.doesNotThrow(() => stepLegacyEntityActionScoreGate(input));
  assert.equal(input.dense[5959 + input.id], 0);
  assert.equal(input.bScalars.bField126, 0, "never reached the ax write");
}

// Full completion: cooldown clear, score at/below threshold, aB-block
// condition false (kept simple), v != 0, table-53 tail read in range.
// All values hand-computed from the bytecode derivation in the source
// file's docblock.
{
  const input = makeInput();
  const id = input.id;
  input.dense[3131 + id] = 0;
  input.dense[3232 + id] = 0;
  input.x = 0;
  input.y = 0; // aE = 0, aF = 0
  input.packedOffsets[53] = 500;
  input.packedBytes[500 + 312] = 50; // score = 5
  input.entityB = 5; // score(5) <= threshold(5) -> proceeds

  input.dense[6565 + id] = 0; // "kind"
  input.packedOffsets[77] = 600;
  input.packedBytes[600] = 1; // aG = 1
  input.packedOffsets[159] = 700;
  input.packedBytes[700 + 1] = 4; // table159 = 4

  input.sectionOffsets[1] = 50;
  input.saveOffsets[50] = 20; // ax = saveOffsets[50 + 0*11 + 0] = 20
  // ax(20) > table159(4) -> dense[5959+id] = trunc(20/4) = 5
  const denseAim = 5;

  input.packedOffsets[27] = 800;
  input.dense[2828 + id] = 0;
  input.packedBytes[800] = 0; // bit 2 clear -> aB-block skipped entirely

  input.dense[606 + id] = 0;
  input.sectionOffsets[3] = 60;
  input.saveOffsets[60 + 1 * 8 + 0] = 3; // v = 3

  input.action = 2;
  input.mode = 3;

  stepLegacyEntityActionScoreGate(input);

  assert.equal(input.dense[5959 + id], 5, "denseAim written before the loop reads it back");
  assert.equal(input.bScalars.bField126, 20, "ax mirrored into the shared scalar");
  assert.equal(input.bScalars.bField127, 5, "ay left at its last loop value (5)");
  assert.equal(input.dense[7878 + id], 9, "aB-block skipped -> stays at the offset-315 default");
  // sign(aE=0)=-1, sign(aF=0)=-1 (offset 844/913 ifle branch): both take -1.
  // dense[5656+id] = trunc((0*22+0+trunc(-1*5/2)) / 5) = trunc(-2/5) = 0
  assert.equal(input.dense[5656 + id], 0);
  assert.equal(input.dense[5757 + id], 0);

  // h[ay][id] = trunc(4*ay*(20-4*ay)/3) + 2 - trunc(3*ay/5)
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((ay) => input.hTable[ay][id]),
    [2, 23, 33, 33, 21, -1],
    "hTable row across ay=0..denseAim",
  );
  // aG=1 (!=2): clampStatic(trunc(-4*((20-8ay)-0)/3)+8, 0, 16)
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((ay) => input.iTable[ay][id]),
    [0, 0, 3, 13, 16, 16],
    "iTable row across ay=0..denseAim",
  );

  // dense[7676+id] = packedBytes[500 + (0+12)*25 + (0+12)] % 10 = packedBytes[812] % 10 = 50 % 10 = 0
  assert.equal(input.dense[7676 + id], 0);
  assert.equal(input.dense[5858 + id], 0);
  assert.equal(input.dense[5454 + id], 0);
  assert.equal(input.dense[5555 + id], 0);
  assert.equal(input.dense[5252 + id], 0, "= x");
  assert.equal(input.dense[5353 + id], 0, "= y");
}

// aG === 2 selects the iTable "ay & 1" shortcut instead of the clampStatic
// expression -- isolate that branch (everything else mirrors the previous
// case, table159/v re-read for aG=2's own packed slots).
{
  const input = makeInput();
  const id = input.id;
  input.dense[3131 + id] = 0;
  input.dense[3232 + id] = 0;
  input.packedOffsets[53] = 500;
  input.packedBytes[500 + 312] = 50;
  input.entityB = 5;

  input.dense[6565 + id] = 0;
  input.packedOffsets[77] = 600;
  input.packedBytes[600] = 2; // aG = 2
  input.packedOffsets[159] = 700;
  input.packedBytes[700 + 2] = 4; // table159 = 4

  input.sectionOffsets[1] = 50;
  input.saveOffsets[50] = 20; // ax = 20 -> denseAim = trunc(20/4) = 5

  input.packedOffsets[27] = 800;
  input.packedBytes[800] = 0; // aB-block skipped

  input.dense[606 + id] = 0;
  input.sectionOffsets[3] = 60;
  input.saveOffsets[60 + 2 * 8 + 0] = 3; // v = 3

  input.action = 2;
  input.mode = 3;

  stepLegacyEntityActionScoreGate(input);

  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((ay) => input.iTable[ay][id]),
    [0, 1, 0, 1, 0, 1],
    "aG===2 -> iTable[ay][id] = ay & 1",
  );
}

// Real exception #1: v (the divisor shared by every h[]/i[] write) is 0 --
// throws on the FIRST loop iteration's very first division, before either
// table is ever written. Pre-loop writes (dense[7878]/[5656]/[5757]) and
// the early ax mirror still land; dense[5959+id] gets reset to 0 by the
// method's own catch, matching real ArithmeticException-on-idiv semantics
// (not silently guarded to 0).
{
  const input = makeInput();
  const id = input.id;
  input.dense[3131 + id] = 0;
  input.dense[3232 + id] = 0;
  input.packedOffsets[53] = 500;
  input.packedBytes[500 + 312] = 50;
  input.entityB = 5;

  input.dense[6565 + id] = 0;
  input.packedOffsets[77] = 600;
  input.packedBytes[600] = 1;
  input.packedOffsets[159] = 700;
  input.packedBytes[700 + 1] = 4;

  input.sectionOffsets[1] = 50;
  input.saveOffsets[50] = 20;

  input.packedOffsets[27] = 800;
  input.packedBytes[800] = 0;

  input.dense[606 + id] = 0;
  input.sectionOffsets[3] = 60;
  input.saveOffsets[60 + 1 * 8 + 0] = 0; // v = 0 -> divide by zero inside the loop

  input.dense[5959 + id] = -7; // distinguishable sentinel

  assert.doesNotThrow(() => stepLegacyEntityActionScoreGate(input));
  assert.equal(input.dense[5959 + id], 0, "caught locally and reset");
  assert.equal(input.bScalars.bField126, 20, "ax mirror happens before the loop, survives");
  assert.equal(input.bScalars.bField127, 0, "set at the top of ay=0's iteration, before the throw");
  assert.equal(input.dense[5656 + id], 0, "computed before the loop, survives");
  assert.equal(input.hTable[0][id], 0, "never written -- threw before the first bastore");
  assert.equal(input.iTable[0][id], 0, "never written either");
  assert.equal(input.dense[7676 + id], 0, "post-loop tail never reached");
}

// Real exception #2: the tail table-53 read reuses aE/aF UNCLAMPED (unlike
// the score lookup). Two entities far enough apart push the computed index
// past the end of packedBytes -- a genuine ArrayIndexOutOfBoundsException
// in the original, caught the same way. Everything through the end of the
// loop must have already landed; only the tail (dense[7676+id] and the 5
// unconditional writes after it) must be skipped.
{
  const input = makeInput({ packedBytesLength: 820 });
  const id = input.id;
  input.dense[3131 + id] = 0;
  input.x = -15; // aE = 0 - (-15) = 15 (outside +-12, so clamp(aE) = 0 for the score lookup)
  input.dense[3232 + id] = 0;
  input.y = 0; // aF = 0

  input.packedOffsets[53] = 500;
  // tableIndex = clamp(aF=0)*25 + clamp(aE=15) = 12*25 + 0 = 300
  input.packedBytes[500 + 300] = 50; // score = 5
  input.entityB = 5;

  input.dense[6565 + id] = 0;
  input.packedOffsets[77] = 600;
  input.packedBytes[600] = 1; // aG = 1
  input.packedOffsets[159] = 700;
  input.packedBytes[700 + 1] = 4; // table159 = 4

  input.sectionOffsets[1] = 50;
  input.saveOffsets[50 + 15] = 10; // ax = saveOffsets[50 + abs(0)*11 + abs(15)] = 10

  input.packedOffsets[27] = 750;
  input.packedBytes[750] = 0; // aB-block skipped

  input.dense[606 + id] = 0;
  input.sectionOffsets[3] = 60;
  input.saveOffsets[60 + 1 * 8 + 0] = 3; // v = 3

  input.action = 2;
  input.mode = 3;
  input.dense[5959 + id] = -7;

  assert.doesNotThrow(() => stepLegacyEntityActionScoreGate(input));
  // ax(10) > table159(4) -> denseAim = trunc(10/4) = 2, written before the throw.
  assert.equal(input.bScalars.bField126, 10);
  assert.equal(input.bScalars.bField127, 2, "loop ran to completion (ay=0..2) before the tail threw");
  // Loop writes: h[ay][id] = trunc(4*ay*(10-4*ay)/3) + 2 - trunc(3*ay/2)
  assert.deepEqual([0, 1, 2].map((ay) => input.hTable[ay][id]), [2, 9, 4]);
  assert.deepEqual([0, 1, 2].map((ay) => input.iTable[ay][id]), [0, 6, 16]);
  // Tail index = 500 + (0+12)*25 + (15+12) = 500 + 300 + 27 = 827, past
  // packedBytes.length(820) -> strictByte throws -> caught.
  assert.equal(input.dense[5959 + id], 0, "reset by the catch");
  assert.equal(input.dense[7676 + id], 0, "never written -- tail read threw first");
  assert.equal(input.dense[5252 + id], 0, "unconditional tail writes after it never ran either");
}

console.log("b.w()'s onAction target (private void a(byte,byte,int,int)) OK");
