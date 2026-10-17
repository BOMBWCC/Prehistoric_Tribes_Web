import assert from "node:assert/strict";
import { drawLegacy1010 } from "../src/render/Legacy1010Renderer.ts";

// f.a(int,byte,int), bytecode/f-javap.txt line 14198. Slots: a count
// (r = 4, s = 7), a unit (r = -2), an icon (r = 12). Slot 1 is selected.
const base = {
  start: 3, selection: 0, originY: 30, count: 3, stride: 10, aX: 0, originX: 20, aZ: 19,
  selectedRow: 1, av: 3, r: new Int8Array([4, -2, 12]), s: new Int8Array([7, 0, 0]),
  recordKind: 0, V: true, F: false, t: true, u: true, f: 5, e: 2,
  shortTables: [new Int16Array(8), new Int16Array([0, 0, 0, 0x1000 | 44])],
};
function run(overrides) {
  const events = [];
  drawLegacy1010({
    ...base, ...overrides,
    onSprite: (...a) => events.push(["sprite", ...a]),
    onPacked: (...a) => events.push(["packed", ...a]),
    onEntity: (...a) => events.push(["entity", ...a]),
    onText: (...a) => events.push(["text", ...a]),
    onSubrecord: (...a) => events.push(["d", ...a]),
    onS: () => events.push(["S"]),
  });
  return events;
}

assert.deepEqual(run({}), [
  // slot 0: background b(III), frame 549 (not selected), count icon 659+4, count text
  ["sprite", 44, 20, 29], ["packed", 549, 20, 30], ["packed", 663, 20, 30], ["text", 45, 37, 1, "7", 0],
  // slot 1 (selected): frame 548, unit a(IIIIB), then d(18) since V && !F
  ["sprite", 44, 30, 29], ["packed", 548, 30, 30], ["entity", 2, 31, 43, -8, 29], ["d", 18, 30, 30, 5],
  // slot 2: icon d(12) with phase 0 (not selected)
  ["sprite", 44, 40, 29], ["packed", 549, 40, 30], ["d", 12, 40, 30, 0],
  // arrows: T -> d(1, aY-9, y+8, e), U -> d(2, aY+aZ, y+8, e)
  ["d", 1, 11, 38, 2], ["d", 2, 39, 38, 2],
]);

// selection 2 keeps only the selected slot; a selected count slot (below av)
// also draws d(3) and sets S:Z; kind-6 records shift the count text.
const events = run({ selection: 2, selectedRow: 0, recordKind: 0, t: false, u: false });
assert.deepEqual(events, [
  ["sprite", 44, 20, 29], ["packed", 548, 20, 30], ["packed", 663, 20, 30], ["text", 45, 37, 1, "7", 0],
  ["d", 3, 26, 34, 5], ["S"],
]);
const kind6 = run({ selection: 2, selectedRow: 0, recordKind: 6, t: false, u: false });
assert.deepEqual(kind6.find((e) => e[0] === "text"), ["text", 44, 43, 1, "7", 0]);
assert.equal(kind6.some((e) => e[0] === "S"), false);
console.log("f.a(int,byte,int) command-bar renderer OK");
