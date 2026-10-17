// Behavior test for class b's entity-transform cluster: `private void
// e(int,int,int)` (#379, bytecode/b-javap.txt:50348..50468), `private void
// c(int,int,int,int)` (#355, :50186..50348), and the entry point `private
// void a(int,int,boolean)` (#273, :5742..5985). All expected values below
// are hand-computed from the raw bytecode, not derived by running the
// implementation.
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

// stepLegacySubsystemEntityTransformE is not exported (single internal
// caller, c(IIII)) -- exercised indirectly below via C's own arg3/arg4
// combinations that route straight to a bare e(p1,p2,p3) call.
const {
  stepLegacySubsystemEntityTransformC,
  stepLegacySubsystemEntityTransformA,
  stepLegacySubsystemEntityTransform,
} = loadModule("./sim/tribe/LegacySubsystemEntityTransform", srcDir);

function makeArrays() {
  return {
    dense: new Int8Array(20000),
    gridC: Array.from({ length: 40 }, () => new Int8Array(40)),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(1000),
    saveOffsets: new Int16Array(2000),
    visibilityBits: [
      Array.from({ length: 3 }, () => new Int32Array(96)),
      Array.from({ length: 3 }, () => new Int32Array(96)),
    ],
    k: new Int8Array(4),
  };
}

// ---------------------------------------------------------------------
// e(int,int,int) (#379), exercised through c(IIII)'s top-level vision-fail
// branch, which calls e(0,0,arg3) with no other side effects -- isolates
// e()'s own arithmetic.
// ---------------------------------------------------------------------

// k[0]=(byte)p2; k[2]=(byte)(p1*packedBytes[po90+p2]+packedBytes[po90+7+p2]);
// k[1]=dense[saveOffsets[packedBytes[po91+p2]]+k[2]]; divisor>=127 -> k[3]=0.
{
  const a = makeArrays();
  a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  // p1=0,p2=0,p3=0 (the vision-fail call's fixed args).
  a.packedBytes[100 + 0] = 9; // factor (unused, p1=0)
  a.packedBytes[107 + 0] = 9; // addend -> k2 = 0*9+9 = 9
  a.packedBytes[150 + 0] = 3; // rowSelector
  a.saveOffsets[3] = 500;
  a.dense[500 + 9] = 4; // k1 = dense[500+9]
  a.packedBytes[200 + 0] = 127; // divisor >= 127 -> k3=0
  stepLegacySubsystemEntityTransformC(a, 1, 0, 0, 0, 1); // arg3=0, visibilityBits all-zero -> bit0=0
  assert.deepEqual(Array.from(a.k), [0, 4, 9, 0]);
}

// divisor<127, k0 in {1,2} -> adjust=1.
{
  const a = makeArrays();
  a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  // Route to p2=1 (k0=1) via the af===1/bit1===0 special case, arg3=0.
  // Top-level bit0 must be SET so we enter the loop instead of the
  // vision-fail shortcut.
  a.visibilityBits[0][0][0] = 1; // x>>5=0, y=0, bit(x&31=0) set
  a.packedOffsets[89] = 50;
  a.packedBytes[50 + 0] = 99; // af=0 low: cell(10) < 99 -> skip
  a.packedBytes[50 + 1] = 0; a.packedBytes[50 + 8] = 100; // af=1 range [0,100]
  a.dense[4747 + 2] = 10; // cell (arg4=0)
  // visibilityBits[1] bit unset -> e(0,0,arg3=0), i.e. p1=0,p2=0,p3=0 again,
  // reuse the SAME table entries as the previous test's p2=0 case but with
  // a divisor<127 this time.
  a.packedBytes[100 + 0] = 4; a.packedBytes[107 + 0] = 5; // k2 = 0*4+5 = 5
  a.packedBytes[150 + 0] = 0; a.saveOffsets[0] = 600; a.dense[600 + 5] = 8; // k1=8
  a.packedBytes[200 + 0] = 3; // divisor=3 < 127
  // adjust = (k0===1||k0===2)?1:0; k0=toByte(0)=0 -> adjust=0
  // k3 = (byte)(((5-0)/3 + p3(0)) & 1) = (1 + 0) & 1 = 1
  stepLegacySubsystemEntityTransformC(a, 2, 0, 0, 0, 0);
  assert.deepEqual(Array.from(a.k), [0, 8, 5, 1]);
}

// divisor<127, k0 not in {1,2} -> adjust=0; also confirms idiv truncates
// toward zero (5/3 = 1, not 2).
{
  const a = makeArrays();
  a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[100 + 0] = 4; a.packedBytes[107 + 0] = 5; // k2 = 5
  a.packedBytes[150 + 0] = 0; a.saveOffsets[0] = 600; a.dense[600 + 5] = 8;
  a.packedBytes[200 + 0] = 3;
  stepLegacySubsystemEntityTransformC(a, 3, 0, 0, 0, 1);
  assert.equal(a.k[3], 1, "idiv(5,3)=1 (trunc toward zero), +0, &1 = 1");
}

// e()'s idiv genuinely throws on a zero divisor -- neither e(), c(), nor
// a(int,int,boolean) has a local exception table (confirmed by grepping
// for "Exception table:" in each method's own javap range).
{
  const a = makeArrays();
  a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  // packedOffsets[92]+0 = 200, left at the Int8Array default of 0 -> divisor=0.
  assert.throws(() => stepLegacySubsystemEntityTransformC(a, 4, 0, 0, 0, 1), /idiv/);
}

// ---------------------------------------------------------------------
// c(int,int,int,int) (#355) branch coverage.
// ---------------------------------------------------------------------

// arg4===0 sources cell from dense[4747+id]; arg4!==0 sources it from
// gridC[y][x]. Both routed through the arg3!==0 "skip vision check"
// shortcut straight into the af-matching loop, af=3 (not 1, so no bit1
// special-case), confirming the cell-source switch.
{
  const a = makeArrays();
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[50 + 0] = 99; a.packedBytes[50 + 1] = 99; a.packedBytes[50 + 2] = 99; // af 0..2 skipped
  a.packedBytes[50 + 3] = 0; a.packedBytes[50 + 10] = 100; // af=3 range [0,100]
  a.dense[4747 + 5] = 20; // used when arg4===0
  a.packedBytes[100 + 3] = 1; a.packedBytes[110] = 0; // k2 = cell*1+0 = cell
  a.packedBytes[150 + 3] = 0; a.saveOffsets[0] = 700; a.dense[720] = 6; // k1 for cell=20 -> dense[700+20]
  a.packedBytes[200 + 3] = 127; // k3=0, no idiv
  stepLegacySubsystemEntityTransformC(a, 5, 0, 0, 1, 0); // arg4=0 -> cell=dense[4747+5]=20
  assert.deepEqual(Array.from(a.k), [3, 6, 20, 0], "arg4===0 sources cell from dense[4747+id]");
}
{
  const a = makeArrays();
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[50 + 0] = 99; a.packedBytes[50 + 1] = 99; a.packedBytes[50 + 2] = 99;
  a.packedBytes[50 + 3] = 0; a.packedBytes[50 + 10] = 100;
  a.gridC[7][9] = 30; // used when arg4!==0
  a.dense[4747 + 5] = -100; // must NOT be read this time
  a.packedBytes[100 + 3] = 1; a.packedBytes[110] = 0; // k2 = cell
  a.packedBytes[150 + 3] = 0; a.saveOffsets[0] = 700; a.dense[730] = 6; // dense[700+30]
  a.packedBytes[200 + 3] = 127;
  stepLegacySubsystemEntityTransformC(a, 5, 9, 7, 1, 1); // arg4=1 -> cell=gridC[y=7][x=9]=30
  assert.deepEqual(Array.from(a.k), [3, 6, 30, 0], "arg4!==0 sources cell from gridC[y][x]");
}

// arg3===0, af===1, layer-1 vision bit UNSET -> e(0,0,arg3) instead of
// e(cell,1,arg3) (offsets 134..163).
{
  const a = makeArrays();
  a.visibilityBits[0][0][0] = 1; // enter the loop (layer-0 bit set)
  // visibilityBits[1] left all-zero -> layer-1 bit unset.
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[50 + 0] = 99; // af=0 skipped
  a.packedBytes[50 + 1] = 0; a.packedBytes[50 + 8] = 100; // af=1 matches
  a.dense[4747 + 6] = 10;
  // Contrasting table entries at p2=0 (the real "e(0,0,0)" call) vs p2=1
  // (what a buggy e(cell,1,0) call would read instead) so the two paths
  // are unmistakably distinguishable.
  a.packedBytes[100 + 0] = 0; a.packedBytes[107 + 0] = 9; // p2=0: k2 = 0*0+9 = 9
  a.packedBytes[100 + 1] = 5; a.packedBytes[108] = 77; // p2=1: k2 = 10*5+77 = 127
  a.packedBytes[150 + 0] = 0; a.saveOffsets[0] = 500; a.dense[509] = 4; // p2=0 k1
  a.packedBytes[150 + 1] = 1; a.saveOffsets[1] = 700; a.dense[827] = 99; // p2=1 k1
  a.packedBytes[200 + 0] = 127; a.packedBytes[200 + 1] = 127; // both k3=0
  stepLegacySubsystemEntityTransformC(a, 6, 0, 0, 0, 0);
  assert.deepEqual(Array.from(a.k), [0, 4, 9, 0], "vision-bit-unset takes e(0,0,arg3), not e(cell,af,arg3)");
}

// arg3===0, af===1, layer-1 vision bit SET -> falls through to the general
// e(cell,af,arg3) call (the same p2=1 table entries this time).
{
  const a = makeArrays();
  a.visibilityBits[0][0][0] = 1;
  a.visibilityBits[1][0][0] = 1; // layer-1 bit set this time
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[50 + 0] = 99;
  a.packedBytes[50 + 1] = 0; a.packedBytes[50 + 8] = 100;
  a.dense[4747 + 6] = 10;
  a.packedBytes[100 + 1] = 5; a.packedBytes[108] = 77; // k2 = 10*5+77 = 127
  a.packedBytes[150 + 1] = 1; a.saveOffsets[1] = 700; a.dense[827] = 99;
  a.packedBytes[200 + 1] = 127; // k3=0
  // Tail: k0 will be 1 here, so it also runs -- keep it inert (threshold>0).
  a.packedOffsets[78] = 250;
  a.packedBytes[250 + 1] = 0; a.saveOffsets[0] = 500; a.dense[500 + 127] = 5; // threshold=5>0
  stepLegacySubsystemEntityTransformC(a, 6, 0, 0, 0, 0);
  assert.deepEqual(Array.from(a.k), [1, 99, 127, 0], "vision-bit-set falls through to e(cell,af,arg3)");
}

// Shared tail (offset 191..261): k[0] in {1,2} and threshold<=0 -> an EXTRA
// e(-126,6,arg3) call that overwrites k entirely.
{
  const a = makeArrays();
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedOffsets[78] = 250;
  a.packedBytes[50 + 0] = 99; a.packedBytes[50 + 1] = 99;
  a.packedBytes[50 + 2] = 0; a.packedBytes[50 + 9] = 100; // af=2 matches
  a.dense[4747 + 7] = 20;
  // Main branch: e(cell=20, af=2, arg3=1) -> k0=2.
  a.packedBytes[100 + 2] = 1; a.packedBytes[109] = 0; // k2 = 20*1+0 = 20
  a.packedBytes[150 + 2] = 0; a.saveOffsets[0] = 500; a.dense[520] = 7; // k1=7
  a.packedBytes[200 + 2] = 127; // k3=0
  // Tail: k0=2 -> rowSelector=packedBytes[po78+2]; threshold=dense[saveOffsets[rowSelector]+k2(20)]<=0.
  a.packedBytes[250 + 2] = 3; a.saveOffsets[3] = 800; a.dense[820] = -5; // threshold=-5 <= 0 -> fires
  // Extra call: e(-126, 6, arg3=1) -> k0=toByte(6)=6.
  a.packedBytes[100 + 6] = 0; a.packedBytes[113] = 50; // k2 = -126*0+50 = 50
  a.packedBytes[150 + 6] = 1; a.saveOffsets[1] = 900; a.dense[950] = 42; // k1=42
  a.packedBytes[200 + 6] = 127; // k3=0
  stepLegacySubsystemEntityTransformC(a, 7, 0, 0, 1, 0);
  assert.deepEqual(Array.from(a.k), [6, 42, 50, 0], "tail's extra e(-126,6,arg3) call overwrites k");
}

// Shared tail: k[0] not in {1,2} -> no extra call, main branch's k stands.
{
  const a = makeArrays();
  a.packedOffsets[89] = 50; a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedOffsets[78] = 250;
  a.packedBytes[50 + 0] = 99; a.packedBytes[50 + 1] = 99; a.packedBytes[50 + 2] = 99;
  a.packedBytes[50 + 3] = 0; a.packedBytes[50 + 10] = 100; // af=3 matches -> k0=3
  a.dense[4747 + 9] = 15;
  a.packedBytes[100 + 3] = 1; a.packedBytes[110] = 0; // k2=15
  a.packedBytes[150 + 3] = 0; a.saveOffsets[0] = 500; a.dense[515] = 9; // k1=9
  a.packedBytes[200 + 3] = 127; // k3=0
  // If the tail wrongly fired it would read packedOffsets[78]+3, left
  // unset (0) on purpose -- and dense[saveOffsets[0]+15]=dense[515]=9>0
  // anyway, so even a mis-gated tail read would not fire here either way;
  // the real assertion is that k stays exactly the main branch's result.
  stepLegacySubsystemEntityTransformC(a, 9, 0, 0, 1, 0);
  assert.deepEqual(Array.from(a.k), [3, 9, 15, 0], "k0 not in {1,2} -> tail is a pure no-op");
}

// No category matches any of the 7 ranges -> no e() call at all, k stays
// at its (Int8Array) default of all zero.
{
  const a = makeArrays();
  a.packedOffsets[89] = 50; // all 7 low/high pairs default to 0; cell must
  // fail EVERY range. Leave packedBytes[50..63] at 0 (low=0,high=0 for all
  // af) and pick a cell value outside [0,0] for every af.
  a.dense[4747 + 10] = 5; // 5 > high(0) for every af -> continue every time
  stepLegacySubsystemEntityTransformC(a, 10, 0, 0, 1, 0);
  assert.deepEqual(Array.from(a.k), [0, 0, 0, 0], "no category match -> e() never called");
}

// ---------------------------------------------------------------------
// a(int,int,boolean) (#273), the entry point.
// ---------------------------------------------------------------------

function minimalTransformInput(overrides = {}) {
  const a = makeArrays();
  // A minimal setup that reaches the tail without throwing: arg3=team=0,
  // vision bit unset -> the vision-fail e(0,0,0) shortcut, k0=0 so c()'s
  // own tail never fires either.
  a.packedOffsets[90] = 100; a.packedOffsets[91] = 150; a.packedOffsets[92] = 200;
  a.packedBytes[107] = 1; // k2 = 0*factor+1 = 1
  a.saveOffsets[0] = 300; a.dense[301] = 2; // k1 = dense[300+1]
  a.packedBytes[200] = 127; // k3=0 -> calculateLegacyEntityM takes the k3===0 branch
  // calculateLegacyEntityM's own base lookup (currentK=k0=0, so
  // currentK!==4 -> selects k1; inner=packedBytes[po17+0]).
  a.packedOffsets[16] = 400; a.packedOffsets[17] = 450; a.packedOffsets[18] = 480; a.packedOffsets[41] = 490;
  a.packedBytes[450 + 0] = 0; // inner = packedBytes[po17+0] = 0
  a.packedBytes[400 + 0 + 2 /* k1 */] = 33; // m = packedBytes[po16 + inner + k1(2)]
  return {
    dense: a.dense, gridC: a.gridC, packedBytes: a.packedBytes, packedOffsets: a.packedOffsets,
    saveOffsets: a.saveOffsets, visibilityBits: a.visibilityBits, k: a.k,
    id: 3, x: 0, y: 0, flag: false, team: 0, fQ: 0, shortRows: [new Int16Array(30)],
    scratch: { bField197: -1, bField199: -1, mByte: -1 },
    ...overrides,
  };
}

// flag===true writes dense[4747+id]=gridC[y][x] BEFORE c(IIII) reads it
// back (offsets 0..24).
{
  const input = minimalTransformInput({ x: 3, y: 2, flag: true });
  input.gridC[2][3] = 77;
  stepLegacySubsystemEntityTransform(input);
  assert.equal(input.dense[4747 + 3], 77, "flag=true writes gridC[y][x] into dense[4747+id]");
}

// flag===false leaves dense[4747+id] as whatever it already was.
{
  const input = minimalTransformInput({ x: 3, y: 2, flag: false });
  input.dense[4747 + 3] = 55;
  input.gridC[2][3] = 77; // must NOT be read
  stepLegacySubsystemEntityTransform(input);
  assert.equal(input.dense[4747 + 3], 55, "flag=false does not touch dense[4747+id]");
}

// k:B/l/m are persisted into scratch. With k = [0, 2, 1, 0] a() returns -1
// (k[0] is neither 2 nor 3), so l:B = -1 and k:B stays k[0] = 0.
{
  const input = minimalTransformInput({});
  const l = stepLegacySubsystemEntityTransform(input);
  assert.equal(l, -1);
  assert.equal(input.scratch.bField199, -1);
  assert.equal(input.scratch.bField197, 0);
  assert.equal(input.scratch.mByte, 33, "m persisted from calculateLegacyEntityM (hand-derived above)");
}

// private byte a() (#276), b-javap.txt 50468, each return path.
{
  const run = (k, setup = () => {}) => {
    const input = { dense: new Int8Array(20000), packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(300),
      k: Int8Array.from(k), id: 5, shortRows: [new Int16Array(30)], scratch: { bField197: k[0], bField199: 0, mByte: 0 } };
    input.packedOffsets[77] = 100;
    setup(input);
    return [stepLegacySubsystemEntityTransformA(input), input.scratch.bField197];
  };
  assert.deepEqual(run([2, 5, 3, 1]), [-1, 2], "k[3] != 0");
  assert.deepEqual(run([2, 5, 3, 0], (i) => { i.dense[1414 + 5] = 5; }), [11, 2]);
  assert.deepEqual(run([2, 2, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[9237 + 3] = 2; i.dense[2828 + 5] = 69; }), [13, 2]);
  assert.deepEqual(run([2, 2, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[9237 + 3] = 2; i.dense[2828 + 5] = 111; }), [-1, 2], "type 111 falls through");
  assert.deepEqual(run([2, 4, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[8627 + 3] = 2; }), [-1, 8], "built record: k:B = 8");
  assert.deepEqual(run([2, 1, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[6565 + 5] = 4; i.packedBytes[104] = 0; }), [6, 2]);
  assert.deepEqual(run([2, 1, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[6565 + 5] = 4; i.packedBytes[104] = -1; i.dense[8810 + 3] = 9; }), [-1, 7], "t77 == -1, foreign owner: k:B = 7");
  assert.deepEqual(run([2, 5, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.dense[6565 + 5] = 4; i.packedBytes[104] = -2; }), [7, 2]);
  assert.deepEqual(run([2, 10, 3, 0], (i) => { i.dense[1414 + 5] = 11; }), [9, 2]);
  assert.deepEqual(run([2, 3, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.shortRows[0][17] = 4; }), [10, 2]);
  assert.deepEqual(run([2, 3, 3, 0], (i) => { i.dense[1414 + 5] = 20; i.shortRows[0][17] = 5; i.dense[8810 + 3] = 5; }), [-1, 2], "v == a[0][17], own owner");
  assert.deepEqual(run([3, 5, 3, 0], (i) => { i.dense[6565 + 5] = 1; }), [8, 3]);
  assert.deepEqual(run([3, 5, 3, 0], (i) => { i.dense[6565 + 5] = 2; }), [-1, 3]);
  assert.deepEqual(run([4, 0, 0, 0]), [-1, 4], "tree/stone class");
}

// `team` is forwarded into c(IIII) as its own arg3 -- team!==0 skips the
// vision-bit-0 check entirely (would otherwise take the e(0,0,0)
// shortcut), routing into the 7-category loop instead.
{
  const input = minimalTransformInput({ team: 1 });
  // All 7 ranges default to [0,0]; dense[4747+id] left at 0 by
  // minimalTransformInput's own setup (never written since flag=false and
  // nothing else touches it) -- cell=0 matches EVERY af's [0,0] range, so
  // af=0 fires: e(cell=0, af=0, arg3=team=1).
  input.packedBytes[100 + 0] = 0; input.packedBytes[107 + 0] = 5; // k2 = 0*0+5 = 5
  input.packedBytes[150 + 0] = 1; input.saveOffsets[1] = 900; input.dense[905] = 6; // k1
  input.packedBytes[200 + 0] = 127;
  stepLegacySubsystemEntityTransform(input);
  assert.deepEqual(Array.from(input.k), [0, 6, 5, 0], "team!==0 skips the vision-bit-0 shortcut");
}

// `fQ` is forwarded into calculateLegacyEntityM: fQ===3 with a nonzero
// table-41 lookup overrides the computed m to 69 (offsets 392..429).
{
  const input = minimalTransformInput({ fQ: 3 });
  input.packedBytes[490 + 33] = 1; // table41(m=33) !== 0 -> m := 69
  stepLegacySubsystemEntityTransform(input);
  assert.equal(input.scratch.mByte, 69, "fQ===3 override forces m=69");
}

console.log("class b entity-transform cluster (a(int,int,boolean)/c(IIII)/e(III), #273/#355/#379) OK");
