import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (specifier) => loadModule(`${path.slice(0, path.lastIndexOf("/"))}/${specifier.replace("./", "")}.ts`);
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire });
  return module.exports;
}
const root = new URL("../src/j2me/", import.meta.url).pathname;
const { LegacyInputState } = loadModule(`${root}LegacyInputState.ts`);
const { OriginalKey, KeyState, attachOriginalKeyboard } = loadModule(`${root}Input.ts`);
const selected = [];
const released = [];
const input = new LegacyInputState({ onSelectionKey: (key) => selected.push(key), onKeyReleased: (key) => released.push(key) });
input.press(OriginalKey.FIRE);
if (!input.fireHeld || !input.specialMode || input.repeatCounter !== 1) throw new Error("Fire press mismatch");
input.release(OriginalKey.FIRE);
if (input.specialMode || !input.pendingRelease || !input.fireHeld) throw new Error("Fire release mismatch");
input.clearRepeatGuard(); // h() clears o:Z (it no longer clears itself at endTick)
input.endTick();
if (input.fireHeld || input.pendingRelease) throw new Error("Deferred FIRE reset mismatch");
input.press(OriginalKey.UP);
if (!input.actionUp || selected.at(-1) !== 50) throw new Error("Up mapping mismatch");
input.release(OriginalKey.UP);
if (!input.actionUp || released.includes(50)) throw new Error("Guarded direction release must remain pending");
input.clearRepeatGuard();
input.endTick();
if (input.actionUp || input.pendingRelease) throw new Error("Deferred direction reset mismatch");
// Without h() clearing o:Z (e.g. the frame the '0' help key opens its page), the next press is dropped.
input.press(OriginalKey.LEFT);
input.release(OriginalKey.LEFT);
input.endTick();
if (input.repeatGuard !== true) throw new Error("o:Z must stay set until h() clears it");
input.press(OriginalKey.RIGHT);
if (input.actionRight) throw new Error("a press while o:Z is set must be dropped");

// Browser keyboard (2026-10-15, the user's layout): WASD and arrows move, Enter/Space confirm,
// Q is the left soft key, Esc/Backspace the right one (back/cancel), M the minimap key '3'.
{
  const listeners = {};
  const target = { addEventListener: (type, fn) => { listeners[type] = fn; }, removeEventListener: () => {} };
  const keys = new KeyState();
  attachOriginalKeyboard(target, keys);
  const expect = { KeyW: "UP", KeyA: "LEFT", KeyS: "DOWN", KeyD: "RIGHT", ArrowUp: "UP", Enter: "FIRE", Space: "FIRE",
    KeyQ: "SOFT_LEFT", Escape: "SOFT_RIGHT", Backspace: "SOFT_RIGHT", KeyM: "DIGIT_3", Digit7: "DIGIT_7" };
  for (const [code, key] of Object.entries(expect)) {
    listeners.keydown({ code, key: "", preventDefault() {} });
    if (!keys.isHeld(key)) throw new Error(`${code} should press ${key}`);
    listeners.keyup({ code, key: "", preventDefault() {} });
    if (keys.isHeld(key)) throw new Error(`${code} should release ${key}`);
  }
}
console.log("raw input mirror OK");
