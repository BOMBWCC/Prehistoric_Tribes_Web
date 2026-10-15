// f.a(int,byte)'s argument preparation. There are two branches and this file
// used to test the wrong one for resource 1118.
//
// Offset 36 dispatches on `b(resourceId)` (static #531):
//   v <= -1 && v >= -30  -> 0     |  v <= -31 && v >= -60 -> 1  |  else -> 2
// Only 0 and 1 fall into the selector/column/row/group prologue at 44..331,
// and both require a NEGATIVE resourceId (the marker path, where
// `marker = -resourceId` indexes e[8749 + marker] and friends). 1118 returns 2
// and jumps to 332, then through c(1118) (boolean, false) and c(1118) (byte,
// 2) to 602, whose `resourceId >= 1000` arm reads a completely different set
// of inputs.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyImageHelperInvocation.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { prepareLegacyImageHelperInvocation } = module.exports;

// --- resourceId >= 1000: offsets 602..933 ---
{
  const dense = new Int8Array(10000);
  const shorts = [new Int16Array(200)];
  const bytes = [new Int8Array(200)];
  const groups = new Int8Array(11);
  shorts[0][118] = 456;   // b[0][resourceId - 1000]
  bytes[0][118] = 12;     // j[0][resourceId - 1000]
  // Values the prologue branch would have used, left non-zero so that reading
  // them would be visible in the result.
  dense[8749 - 1118] = 4;
  dense[9115 - 1118] = 2;

  const result = prepareLegacyImageHelperInvocation({
    resourceId: 1118, dense, shortOffsets: new Int16Array(312), shortTables: shorts, byteTables: bytes,
    groupSelectors: groups, ah: 1, ai: 2, I: 4, K: 6,
    S: 0, T: 248, vByte: 0, fCounter: 19,
  });
  assert.equal(result.originX, 0, "origin is S:I, not derived from ah/I");
  assert.equal(result.originY, 248, "origin is T:I -- 248 is G()'s first call site");
  assert.equal(result.recordBase, 456, "b[0][resourceId - 1000], not b[0][selector + 1]");
  assert.equal(result.recordCount, 12);
  assert.equal(result.marker, 0, "offset 933 clears the marker");
  assert.equal(result.argument2, 0, "offset 931 clears the gate");

  // Offsets 661..928, the v:B == 0 seeding block.
  assert.deepEqual([groups[0], groups[1], groups[2]], [1, 2, 3]);
  assert.deepEqual([dense[2930], dense[2931], dense[2932]], [39, 42, 42]);
  assert.deepEqual([dense[607], dense[608], dense[609]], [1, 0, 6]);
  assert.deepEqual([dense[1415], dense[1416], dense[1417]], [25, 45, 70]);
  assert.deepEqual([dense[3031], dense[3032], dense[3033]], [19 % 8, 19 % 8, 19 % 10]);
  assert.deepEqual([dense[5152], dense[5153], dense[5154]], [8, 5, 10]);
  assert.deepEqual([dense[6566], dense[6567], dense[6568]], [9, 2, 0]);
}

// The same call with v:B != 0 must skip the seeding block entirely.
{
  const dense = new Int8Array(10000);
  const groups = new Int8Array(11);
  prepareLegacyImageHelperInvocation({
    resourceId: 1118, dense, shortOffsets: new Int16Array(312),
    shortTables: [new Int16Array(200)], byteTables: [new Int8Array(200)],
    groupSelectors: groups, ah: 0, ai: 0, I: 0, K: 0,
    S: 0, T: 272, vByte: 1, fCounter: 19,
  });
  assert.deepEqual([groups[0], groups[1], groups[2]], [0, 0, 0]);
  assert.equal(dense[2930], 0);
}

// --- the marker prologue, offsets 44..331, which needs a NEGATIVE resourceId ---
{
  const dense = new Int8Array(10000);
  const shorts = [new Int16Array(20)];
  const bytes = [new Int8Array(20)];
  const groups = new Int8Array(11);
  const marker = 20; // resourceId -20 -> b(-20) == 0, so the prologue runs
  dense[8749 + marker] = 4;
  dense[9115 + marker] = 2;
  dense[8383 + marker] = 3;
  dense[8444 + marker] = 5;
  dense[8993 + marker] = 7;
  dense[4646 + 7] = 2;
  dense[4545 + 7] = 0;
  shorts[0][5] = 123;
  bytes[0][5] = 9;

  const result = prepareLegacyImageHelperInvocation({
    resourceId: -20, dense, shortOffsets: new Int16Array(312), shortTables: shorts, byteTables: bytes,
    groupSelectors: groups, ah: 1, ai: 2, I: 4, K: 6,
    S: 0, T: 248, vByte: 0, fCounter: 0,
  });
  assert.equal(result.marker, 20);
  assert.equal(result.argument2, 2);
  assert.equal(result.argument3, 4);
  assert.equal(result.originX, 22 - (1 + 4 - 3) * 22);
  assert.equal(result.originY, 32 - (2 + 6 - 5) * 16);
  assert.equal(result.recordBase, 123);
  assert.equal(result.recordCount, 9);
  assert.equal(groups[2], 7);
}

console.log("image helper invocation prelude OK");
