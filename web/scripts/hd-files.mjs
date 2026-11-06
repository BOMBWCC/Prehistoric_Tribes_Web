// Writes web/public/hd/files.json: every picture under web/public/hd with its size in bytes, the list
// the game loads before the map opens (render/HdArt.ts preloadAll, BUG-057; its bar goes by the bytes). Run by make-catalog.mjs after it has written the
// last pictures; on its own:
//
//   node web/scripts/hd-files.mjs
import fs from "node:fs";
import path from "node:path";

const hd = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public/hd");

export function writeHdFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(hd, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(png|jpe?g|webp)$/.test(entry.name)) files.push([rel, fs.statSync(path.join(hd, rel)).size]);
    }
  };
  walk("");
  files.sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync(path.join(hd, "files.json"), JSON.stringify(files));
  return files.length;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`files.json: ${writeHdFiles()} pictures`);
