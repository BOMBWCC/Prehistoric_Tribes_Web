// `require` for tests that transpile one source file into a bare vm context: the only imports
// those files have are the constant modules core/DenseLayout.ts and core/DataTables.ts, so those
// are the only modules this resolves.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const constants = {};
for (const name of ["DenseLayout", "DataTables"]) {
  const file = new URL(`../src/core/${name}.ts`, import.meta.url).pathname;
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { module, exports: module.exports },
  );
  constants[name] = module.exports;
}

export function denseRequire(specifier) {
  const name = specifier.split("/").pop();
  if (constants[name]) return constants[name];
  throw new Error(`denseRequire: unexpected import ${specifier}`);
}
