// The PNG pictures under web/public/hd as lossless WebP, the PNGs gone (BUG-073: about 3/4 of the
// size, the same pixels), and the story's JPEGs as WebP q80 (about 2/3, user saw the comparison,
// 2026-11-06); design/ keeps the sources. Run by import-hd.mjs and make-catalog.mjs; on its own
// (again after something put a PNG there):
//
//   node web/scripts/hd-webp.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const hd = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public/hd");
const run = promisify(execFile);

/** `file` (a PNG) replaced by the same pixels in .webp beside it. */
export async function pngToWebp(file) {
  await run("cwebp", ["-quiet", "-lossless", "-z", "9", "-metadata", "none", file, "-o", file.replace(/\.png$/, ".webp")]);
  fs.rmSync(file);
}

/** `file` (a story's JPEG) replaced by .webp beside it. */
async function storyToWebp(file) {
  await run("cwebp", ["-quiet", "-q", "80", "-metadata", "none", file, "-o", file.replace(/\.jpg$/, ".webp")]);
  fs.rmSync(file);
}

/** Every PNG under hd/ and JPEG under hd/story/; how many. */
export async function convertAll() {
  const files = fs.readdirSync(hd, { recursive: true }).filter((f) => f.endsWith(".png") || (f.startsWith("story/") && f.endsWith(".jpg"))).map((f) => path.join(hd, f));
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, os.availableParallelism() - 1) }, async () => {
    while (next < files.length) {
      const file = files[next++];
      await (file.endsWith(".png") ? pngToWebp(file) : storyToWebp(file));
    }
  }));
  return files.length;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`${await convertAll()} pictures -> WebP`);
