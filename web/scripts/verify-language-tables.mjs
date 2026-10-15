import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/DelimitedResource.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
const fixture = new Response(new TextEncoder().encode("one|two\x1f|three"));
vm.runInNewContext(output, {
  module,
  exports: module.exports,
  TextEncoder,
  fetch: async () => fixture,
});
const { loadDelimitedResource } = module.exports;
const records = await loadDelimitedResource("/fixture", "0.1.28");
assert.equal(records.length, 3);
assert.equal(new TextDecoder().decode(records[1]), "two0.1.28");
console.log("language table delimiter/version expansion OK");
