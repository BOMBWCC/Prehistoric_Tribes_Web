import assert from "node:assert/strict";
import { stepLegacyGFrame } from "../src/j2me/LegacyGFrame.ts";

const state = {
  H: true, Q: 14, U: 5, V: 4, N: 0, c1: 1,
  k: new Int8Array(56), flags: Array.from({ length: 20 }, () => false),
};
const calls = [];
stepLegacyGFrame({
  state,
  onSurfaceClear: (target) => calls.push(["clear", target]),
  onSurfaceCopy: (target, source) => calls.push(["copy", target, source]),
  onSurfaceHeader: (target) => calls.push(["header", target]),
  onImageHelper: (...args) => calls.push(["image", ...args]),
  onDrawHelper: (...args) => calls.push(["draw", ...args]),
});
assert.equal(state.H, false);
assert.equal(state.N, 0);
assert.equal(state.k[52], -1);
assert.equal(state.k[53], -1);
assert.equal(state.k[54], 1);
assert.equal(state.flags[10], true);
assert.equal(state.flags[17], true);
assert.deepEqual(calls, [
  ["clear", 1],
  ["image", 1118, 2],
  ["copy", 0, 1],
  ["header", 0],
  ["draw", 1665, 120, 0],
  ["image", 1118, 1],
  ["draw", 10, 25, 64],
  ["draw", 17, 0, 320],
]);

const second = { ...state, H: false, k: new Int8Array(56), flags: Array.from({ length: 20 }, () => false) };
stepLegacyGFrame({ state: second });
assert.equal(second.k[52], -1);
assert.equal(second.flags[10], true);
assert.equal(second.flags[17], true);

const geometryCalls = [];
const geometry = [new Int32Array(4), new Int32Array(4), new Int32Array(4)];
geometry[0][3] = -1000;
stepLegacyGFrame({
  state: { H: true, Q: 14, U: 5, V: 4, N: 0, c1: 1, k: new Int8Array(56), flags: Array.from({ length: 20 }, () => false) },
  geometry,
  randomRemainder: () => 0,
  onDrawHelper: (...args) => geometryCalls.push(args),
});
assert.deepEqual(geometryCalls.slice(0, 4), [
  [1667, -87, -1],
  [1667, -87, -1],
  [1667, -87, -1],
  [1667, -87, -1],
]);
// Second pass (2026-10-08, oracle): with a[0][3] no longer -1000 and every
// cloud at x <= 240, nothing is re-rolled; the drift and the y jitter are
// stored back. Only the two jitter draws hit the RNG (4 calls, as in the
// original's frame 1 -> 2), and a cloud past x 240 re-rolls.
{
  let rolls = 0;
  const draws = [];
  geometry[0][2] = 241;
  stepLegacyGFrame({
    state: { H: false, Q: 14, U: 5, V: 4, N: 0, c1: 1, k: new Int8Array(56), flags: Array.from({ length: 20 }, () => false) },
    geometry,
    randomRemainder: () => { rolls += 1; return 1; },
    onDrawHelper: (...args) => draws.push(args),
  });
  assert.equal(rolls, 4 + 3);
  assert.deepEqual(Array.from(geometry[0]), [-86, -86, -88 - 1 + 1, -86]);
  assert.deepEqual(Array.from(geometry[1]), [-1, -1, 1, -1]);
  assert.deepEqual(draws.slice(0, 4), [[1667, -86, -1], [1667, -86, -1], [1668, -88, 1], [1667, -86, -1]]);
}
// Call ORDER around the target switch. G() offsets 276..527 run
//   k[52] = -1; N:B = M:B; drawImage(...); setColor + fillRect(header);
//   then the four-cloud loop.
// The clouds used to run before the switch and the copy in this port, i.e.
// into the surface the copy then overwrote from (fixed 2026-09-09). Nothing
// here pinned that, because the first block above passes no geometry and the
// third checks only the first four draws.
{
  const ordered = [];
  const orderGeometry = [new Int32Array(4), new Int32Array(4), new Int32Array(4)];
  orderGeometry[0][3] = -1000;
  stepLegacyGFrame({
    state: { H: true, Q: 14, U: 5, V: 4, N: 0, c1: 1, k: new Int8Array(56), flags: Array.from({ length: 20 }, () => false) },
    geometry: orderGeometry,
    randomRemainder: () => 0,
    onSurfaceClear: (target) => ordered.push(["clear", target]),
    onSurfaceCopy: (target, source) => ordered.push(["copy", target, source]),
    onSurfaceHeader: (target) => ordered.push(["header", target]),
    onImageHelper: (...args) => ordered.push(["image", ...args]),
    onDrawHelper: (...args) => ordered.push(["draw", ...args]),
  });
  assert.deepEqual(ordered, [
    ["clear", 1],
    ["image", 1118, 2],
    ["copy", 0, 1],
    ["header", 0],
    ["draw", 1667, -87, -1],
    ["draw", 1667, -87, -1],
    ["draw", 1667, -87, -1],
    ["draw", 1667, -87, -1],
    ["draw", 1665, 120, 0],
    ["image", 1118, 1],
    ["draw", 10, 25, 64],
    ["draw", 17, 0, 320],
  ]);
}

console.log("f.G raw state bridge OK");
