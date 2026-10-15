import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
assert.match(source, /const splashPaths = \["assets\/l0\.png", "assets\/l1\.png", "assets\/l2\.png"\]/);
assert.match(source, /\{ image: images\[0\], delay: 1000 \}/);
assert.match(source, /\{ image: images\[0\], delay: 2000 \}/);
assert.match(source, /\{ image: images\[1\], delay: 2000 \}/);
assert.match(source, /\{ image: images\[2\], delay: 0 \}/);
assert.doesNotMatch(source, /images\[3\]/);
console.log("tribes.run() startup splash sequence OK");
