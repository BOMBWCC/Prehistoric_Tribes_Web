import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/render/LegacyFrameCommandDraw.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const context = module.exports;
const activeFlags = () => {
  const flags = Array.from({ length: 20 }, () => false);
  flags[1] = true;
  return flags;
};

const bytes = new Int8Array(300);
const offsets = new Int16Array(312);
offsets[195] = 10;
bytes[10 + 60 + 1] = 2;
bytes[10 + 40 + 1] = 2;
bytes[10 + 80 + 1] = 1;
const shorts = [new Int16Array(8), new Int16Array(8)];
shorts[0][2] = 0;
shorts[0][0] = 0;
shorts[1][0] = 0;
const rows = new Int8Array(8);
rows[0] = 0;
const kinds = new Int8Array(8);
kinds[0] = 0;
const events = [];
context.drawLegacyFrameCommand({
  command: 1, x: 25, y: 64, flags: Array.from({ length: 20 }, () => false),
  packedBytes: bytes, packedOffsets: offsets, shortTables: shorts,
  byteTables: [new Int8Array([1, 0, 0]), new Int8Array(8), kinds, rows],
  onUnhandled: (...args) => events.push(args),
});
assert.equal(events.length, 0);

// The command table's +40 selector chooses the row table.  The +60 selector
// is only the mutable selection state and must not silently replace it.
const rowEvents = [];
const rowShorts = [new Int16Array(8), new Int16Array(8)];
rowShorts[0][2] = 0;
rowShorts[0][3] = 1;
rowShorts[1][0] = 0x0234;
const rowFlags = new Int8Array(8);
rowFlags[0] = 0x41;
const rowCounts = new Int8Array(8);
rowCounts[2] = 1;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: rowShorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), rowFlags],
  onRowCommand: (...args) => rowEvents.push(args),
});
assert.deepEqual(rowEvents, [[1, 0, 0x0234, 7, 9, 0x0234, 0]]);

// f.a(BII) offsets 261..351: a kind-1 row with aI == 0 leaves a pending
// value; the next row takes aF = d[aE] and passes it to j(row), whose
// default draw is composite aI + aF (the unit portrait: 720 + d[13]).
const portraitEvents = [];
const portraitShorts = [new Int16Array(8), new Int16Array(8)];
portraitShorts[0][2] = 0;
portraitShorts[1][0] = 0;
portraitShorts[1][1] = 720;
const portraitFlags = new Int8Array(8);
portraitFlags[0] = 0x40; // kind 1, group 0, aI 0
portraitFlags[1] = 0x41; // kind 1, group 1, aI 720
const portraitCounts = new Int8Array(8);
portraitCounts[2] = 2;
const portraitD = new Int16Array(8);
portraitD[2] = 12;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: portraitShorts,
  byteTables: [portraitCounts, new Int8Array(8), new Int8Array(8), portraitFlags],
  dShort: portraitD, kBytes: new Int8Array(8),
  onRowCommand: (...args) => portraitEvents.push(args),
});
assert.deepEqual(portraitEvents, [[1, 1, 720, 7, 9, 720, 12]]);

const groupZeroEvents = [];
const groupZeroFlags = new Int8Array(8);
groupZeroFlags[0] = 0x40;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: rowShorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), groupZeroFlags],
  onRowCommand: (...args) => groupZeroEvents.push(args),
});
assert.deepEqual(groupZeroEvents, [[0, 0, 0x0234, 7, 9, 0x0234, 0]]);

// group===4 rows are f.d(4,row), the clip rect (LegacyZKind4.ts): onKind4, not onUnhandled.
{
  const kind4Flags = new Int8Array(8);
  kind4Flags[0] = 0x44; // kind=1, group=4
  const kind4Events = [];
  context.drawLegacyFrameCommand({
    command: 1, x: 7, y: 9, flags: activeFlags(),
    packedBytes: bytes, packedOffsets: offsets, shortTables: rowShorts,
    byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind4Flags],
    onKind4: (...args) => kind4Events.push(args),
    onUnhandled: (...args) => kind4Events.push(["unhandled", ...args]),
  });
  assert.deepEqual(kind4Events, [[0, 0x0234, 7, 9]]);
}

// group===2 rows route to onKind2 (LegacyZKind2.ts's boundary), not
// onRowCommand/onUnhandled -- this is the group f.d(int,int) itself never
// branches on separately (a single d(group,row) call handles every group);
// LegacyFrameCommandDraw is just the port-side decomposition of that call.
const kind2Flags = new Int8Array(8);
kind2Flags[0] = 0x42; // kind=1, group=2
const kind2Events = [];
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: rowShorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind2Flags],
  onKind2: (...args) => kind2Events.push(args),
  onUnhandled: (...args) => kind2Events.push(["unhandled", ...args]),
});
assert.deepEqual(kind2Events, [[0, 0x0234, 7, 9]]);

// group===3 && aI<=6 (javap f.d(int,int) offsets 509..680) routes to
// onKind3 (LegacyZKind3.ts's stepLegacyZKind3 boundary) for aI in {5,6} --
// aI<=2 is the separate onKText branch (tested below) and aI in [3,4] is
// intercepted earlier in this same loop by the onCompose carve-out, so this
// branch only ever sees 5/6 in practice. aI===7 and aI===4 must NOT reach
// onKind3 (the bytecode's own aI<=6 guard, and the real Q=17 row=1149
// regression this closes -- docs/unknowns.md 2026-08-31).
const kind3Shorts = [new Int16Array(8), new Int16Array(8)];
kind3Shorts[0][2] = 0;
const kind3Flags = new Int8Array(8);
kind3Flags[0] = 0x43; // kind=1, group=3
const kind3Events = [];
kind3Shorts[1][0] = 5;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: kind3Shorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind3Flags],
  onKind3: (...args) => kind3Events.push(args),
  onUnhandled: (...args) => kind3Events.push(["unhandled", ...args]),
});
assert.deepEqual(kind3Events, [[0, 5, 7, 9, 0]]);

const kind3SixEvents = [];
kind3Shorts[1][0] = 6;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: kind3Shorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind3Flags],
  onKind3: (...args) => kind3SixEvents.push(args),
  onUnhandled: (...args) => kind3SixEvents.push(["unhandled", ...args]),
});
assert.deepEqual(kind3SixEvents, [[0, 6, 7, 9, 0]]);

const kind3OutOfRangeEvents = [];
kind3Shorts[1][0] = 7;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: kind3Shorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind3Flags],
  onKind3: (...args) => kind3OutOfRangeEvents.push(["kind3", ...args]),
  onUnhandled: (...args) => kind3OutOfRangeEvents.push(["unhandled", ...args]),
});
assert.deepEqual(kind3OutOfRangeEvents, [["unhandled", 1, 0, 7, 7, 9, 3]]);

const kind3ComposeRangeEvents = [];
kind3Shorts[1][0] = 4;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: kind3Shorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), kind3Flags],
  onKind3: (...args) => kind3ComposeRangeEvents.push(["kind3", ...args]),
  onCompose: (...args) => kind3ComposeRangeEvents.push(["compose", ...args]),
  onUnhandled: (...args) => kind3ComposeRangeEvents.push(["unhandled", ...args]),
});
assert.deepEqual(kind3ComposeRangeEvents, [["unhandled", 1, 0, 4, 7, 9, 3]]);

// Text record with a live text (v != -1): the draw part (z = y, c.a(Graphics, y)) runs every time;
// only the layout c.b(...) is gated on b[cmd] || v != w (oracle run 6, frame 18284).
{
  const seen = [];
  for (const [w, flag] of [[5, false], [6, false], [5, true]]) {
    const flags = Array.from({ length: 20 }, () => false);
    flags[1] = flag;
    context.drawLegacyFrameCommand({
      command: 1, x: 7, y: 9, flags, v: 5, w, changed: true,
      packedBytes: bytes, packedOffsets: offsets, shortTables: kind3Shorts,
      byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), Int8Array.from(kind3Flags, (f, i) => i === 0 ? (2 << 6) | 3 : f)],
      onCompose: (...args) => seen.push(args.at(-1)),
    });
  }
  assert.deepEqual(seen, [false, true, true]);
}

const numericFlags = new Int8Array(8);
numericFlags[0] = 0xc3;
rowShorts[1][0] = 1;

const kEvents = [];
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: rowShorts,
  byteTables: [rowCounts, new Int8Array(8), new Int8Array(8), numericFlags],
  onKText: (...args) => kEvents.push(args),
});
assert.deepEqual(kEvents, [[7, 9, 0, 0, 0, 0]]);

// Exact aE/k/d pending-row semantics: a negative allocation suppresses the
// following row and advances aE; an active allocation consumes d[aE].
const pendingShorts = [new Int16Array(8), new Int16Array(8)];
pendingShorts[0][2] = 0;
pendingShorts[1][0] = 1;
pendingShorts[1][1] = 1;
const pendingCounts = new Int8Array(8); pendingCounts[2] = 2;
const pendingFlags = new Int8Array(8); pendingFlags[0] = 0x43; pendingFlags[1] = 0xc3;
const suppressed = [];
const negativeK = new Int8Array(8); negativeK[2] = -1;
const suppressedResult = context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(), packedBytes: bytes, packedOffsets: offsets,
  shortTables: pendingShorts, byteTables: [pendingCounts, new Int8Array(8), new Int8Array(8), pendingFlags],
  kBytes: negativeK, dShort: new Int16Array(8), onKText: (...args) => suppressed.push(args),
});
assert.deepEqual(suppressed, []);
assert.equal(suppressedResult.aE, 3);

const consumed = [];
const activeK = new Int8Array(8); activeK[2] = 1;
const dShort = new Int16Array(8); dShort[2] = 27;
const consumedResult = context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(), packedBytes: bytes, packedOffsets: offsets,
  shortTables: pendingShorts, byteTables: [pendingCounts, new Int8Array(8), new Int8Array(8), pendingFlags],
  kBytes: activeK, dShort, onKText: (...args) => consumed.push(args),
});
assert.deepEqual(consumed, [[7, 9, 0, 0, 0, 0], [7, 9, 1, 0, 1, 27]]);
assert.equal(consumedResult.aE, 3);
assert.equal(activeK[2], 0);

const specialEvents = [];
const specialShorts = [new Int16Array(1200), new Int16Array(1200)];
const specialFlags = new Int8Array(1200);
const specialCounts = new Int8Array(8);
specialCounts[2] = 1;
specialShorts[0][2] = 1010;
specialShorts[1][1010] = 77;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: specialShorts,
  byteTables: [specialCounts, new Int8Array(1200), new Int8Array(1200), specialFlags],
  onRecord1010: (...args) => specialEvents.push(["1010", ...args]),
});
assert.deepEqual(specialEvents, [["1010", 1010, 0, 7, 9, 1010]]);

specialShorts[0][2] = 1137;
specialShorts[1][1137] = 88;
context.drawLegacyFrameCommand({
  command: 1, x: 7, y: 9, flags: activeFlags(),
  packedBytes: bytes, packedOffsets: offsets, shortTables: specialShorts,
  byteTables: [specialCounts, new Int8Array(1200), new Int8Array(1200), specialFlags],
  onRecord1137: (...args) => specialEvents.push(["1137", ...args]),
});
assert.deepEqual(specialEvents, [["1010", 1010, 0, 7, 9, 1010], ["1137", 1137, 7, 9, 1137]]);
console.log("f.a(byte,int,int) raw command bridge OK");
