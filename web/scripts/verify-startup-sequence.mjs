import assert from "node:assert/strict";
import fs from "node:fs";

// The original's tribes.run() painted l0 twice, then l1, then l2. Since 2026-10-17 (user, phase 3)
// the start-up shows only the game's own splash, l2, while the resources load and the language and
// music questions are answered behind it.
const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
assert.match(source, /ImageResource\.create\("assets\/l2\.png"\)/);
assert.doesNotMatch(source, /assets\/l0\.png|assets\/l1\.png/);
assert.match(source, /touch\.answerStartQuestions\(savedLanguage\(\), savedMusic\(\)\)/);
console.log("start-up: game splash only, start questions answered OK");
