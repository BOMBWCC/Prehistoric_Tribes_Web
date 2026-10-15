import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const sourcePath = `${new URL("../src/j2me/Audio.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, {
  module, exports: module.exports, Uint8Array, Map, TextDecoder,
  require: () => ({ loadBinaryResource: () => { throw new Error("not used by parser test"); } }),
});
const { parseStandardMidi } = module.exports;

const bytes = fs.readFileSync(new URL("../../extracted/sa", import.meta.url));
const parsed = parseStandardMidi(new Uint8Array(bytes.buffer, bytes.byteOffset, 8014));
assert.equal(parsed.format, 1);
assert.equal(parsed.division, 480);
assert.ok(parsed.notes.length > 0);
assert.ok(parsed.durationSeconds > 0);
assert.ok(parsed.notes.every((note) => note.durationSeconds >= 0));
console.log(`original MIDI parsed: ${parsed.notes.length} notes, ${parsed.durationSeconds.toFixed(2)}s`);
