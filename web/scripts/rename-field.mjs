// Renames properties of a class, interface or object type across web/src with the TypeScript language service (the same
// engine as an editor's "Rename Symbol"), so references through aliases and typed string keys are
// found too. One-off refactoring helper for phase 2:
//
//   node scripts/rename-field.mjs src/core/LegacyGameState.ts LegacyGameState old=new [old=new ...]
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [fileArg, className, ...pairs] = process.argv.slice(2);
const declFile = path.resolve(webDir, fileArg);

const config = ts.getParsedCommandLineOfConfigFile(path.join(webDir, "tsconfig.json"), {}, {
  ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(String(d.messageText)); },
});
const files = new Map(config.fileNames.map((f) => [path.resolve(f), { text: fs.readFileSync(f, "utf8"), version: 0 }]));
const service = ts.createLanguageService({
  getScriptFileNames: () => [...files.keys()],
  getScriptVersion: (f) => String(files.get(path.resolve(f))?.version ?? 0),
  getScriptSnapshot: (f) => {
    const entry = files.get(path.resolve(f));
    const text = entry ? entry.text : (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  },
  getCurrentDirectory: () => webDir,
  getCompilationSettings: () => config.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories,
}, ts.createDocumentRegistry());

function declarationPos(name) {
  const source = ts.createSourceFile(declFile, files.get(declFile).text, ts.ScriptTarget.Latest, true);
  let pos = -1;
  source.forEachChild(function visit(node) {
    const members = ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) ? node.members
      : ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type) ? node.type.members : null;
    if (members && node.name?.text === className) {
      for (const m of members) {
        if (m.name && ts.isIdentifier(m.name) && m.name.text === name) pos = m.name.getStart(source);
      }
    } else node.forEachChild(visit);
  });
  if (pos < 0) throw new Error(`${className}.${name} not found in ${fileArg}`);
  return pos;
}

for (const pair of pairs) {
  const [from, to] = pair.split("=");
  const locations = service.findRenameLocations(declFile, declarationPos(from), false, false, { providePrefixAndSuffixTextForRename: true }) ?? [];
  const byFile = new Map();
  for (const loc of locations) {
    const f = path.resolve(loc.fileName);
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(loc);
  }
  for (const [f, locs] of byFile) {
    const entry = files.get(f);
    let text = entry.text;
    for (const loc of locs.sort((a, b) => b.textSpan.start - a.textSpan.start)) {
      const replacement = (loc.prefixText ?? "") + to + (loc.suffixText ?? "");
      text = text.slice(0, loc.textSpan.start) + replacement + text.slice(loc.textSpan.start + loc.textSpan.length);
    }
    entry.text = text;
    entry.version += 1;
    fs.writeFileSync(f, text);
  }
  console.log(`${from} -> ${to}: ${locations.length} references in ${byFile.size} files`);
}
