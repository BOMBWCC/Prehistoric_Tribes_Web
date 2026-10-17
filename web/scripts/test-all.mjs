// Runs every scripts/verify-*.mjs in parallel and lists the failures: `npm test`.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const files = fs.readdirSync(dir).filter((f) => /^verify-.*\.mjs$/.test(f)).sort();
const queue = [...files];
const failed = [];

await Promise.all(Array.from({ length: os.cpus().length }, async () => {
  for (let f = queue.shift(); f; f = queue.shift()) {
    await new Promise((resolve) => {
      execFile(process.execPath, ["--experimental-strip-types", path.join(dir, f)], { cwd: path.join(dir, "..") }, (err, stdout, stderr) => {
        if (err) failed.push([f, (stderr || stdout).trim().split("\n").slice(-3).join("\n")]);
        resolve();
      });
    });
  }
}));

for (const [f, tail] of failed) console.log(`FAIL ${f}\n${tail}\n`);
console.log(`${files.length - failed.length}/${files.length} passed`);
process.exit(failed.length ? 1 : 0);
