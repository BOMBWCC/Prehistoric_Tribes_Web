import assert from "node:assert/strict";
import fs from "node:fs";

// The original's tribes.run() painted l0 twice, then l1, then l2. Since 2026-10-17 (user, phase 3)
// the start-up shows only the game's own splash while the resources load and the language and
// music questions are answered behind it; since round 4 (2026-10-22) that is the HD splash page
// (StartMenu.ts), so none of the original's l0 / l1 / l2 pictures is drawn.
const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
assert.doesNotMatch(source, /assets\/l[012]\.png/);
assert.match(source, /attachStartMenu\(/);
assert.match(source, /touch\.answerStartQuestions\(savedLanguage\(\), savedMusic\(\)\)/);
console.log("start-up: HD splash only, start questions answered OK");
