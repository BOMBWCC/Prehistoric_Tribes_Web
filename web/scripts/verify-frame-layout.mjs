import assert from "node:assert/strict";
import { deriveLegacyFrameLayout } from "../src/render/LegacyFrameLayout.ts";

const shorts = Array.from({ length: 11 }, () => new Int16Array(1));
shorts[9] = new Int16Array(549);
shorts[10] = new Int16Array(3);
shorts[9][548] = 2;
shorts[10][2] = 1;
const bytes = Array.from({ length: 25 }, () => new Int8Array(1));
bytes[1] = new Int8Array(1011);
bytes[23] = new Int8Array(2);
bytes[23][1] = 7;
bytes[1][1010] = 10;

assert.deepEqual(deriveLegacyFrameLayout(shorts, bytes), { aV: 16, aU: 13 });
bytes[1][1010] = 11;
assert.equal(deriveLegacyFrameLayout(shorts, bytes).aU, 13);
bytes[1][1010] = 12;
assert.equal(deriveLegacyFrameLayout(shorts, bytes).aU, 13);
console.log("frame layout formula: ok");
