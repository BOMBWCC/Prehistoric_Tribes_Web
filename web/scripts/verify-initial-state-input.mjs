import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyAk, stepLegacyAo } = module.exports;

const base = {
  Q: 14,
  iFlag: false,
  staticL: false,
  jFlag: false,
  aR: 0,
  aP: 0,
  vFlag: false,
  E: 4,
  eFlag: false,
  fFlag: false,
  staticM: false,
};

const fire = { ...base, iFlag: true };
const fireCallbacks = [];
stepLegacyAk(fire, {
  onAn: () => fireCallbacks.push("an"),
  onAo: () => fireCallbacks.push("ao"),
  onAd: () => fireCallbacks.push("ad"),
});
if (fire.Q !== 14 || fireCallbacks.includes("an") || !fireCallbacks.includes("ao") || fire.iFlag) {
  throw new Error("Q=14 FIRE must enter the proven Q<28 ao() branch and clear i");
}

const destroyState = {
  Q: 14, R: 0, H: true, vInt: 59, V: 8, r: 4, q: 0, T: 0, Z: 0,
  mByte: 0, aaInt: 0, s: 0, eByte: 0, lInt: 0, af: false, KFlag: false,
  y: 0, z: 0, A: 0, B: 0, I: 0, J: 0, K: 0, L: 0, P: false, c: -1,
  pByte: 0, oInt: 0, wByte: 0,
};
const languageLoads = [];
let destroyed = 0;
stepLegacyAo({
  state: destroyState,
  packedBytes: new Int8Array(400),
  packedOffsets: new Int16Array(400),
  onDestroy: () => { destroyed += 1; },
  onResourceLoad: (slot) => languageLoads.push(slot),
});
if (destroyed !== 0 || destroyState.Q !== 16 || languageLoads.join(",") !== "0,1") {
  throw new Error("Q=14 ao() must load both language resources and enter Q=16 without destruction");
}

const hash = { ...base, staticM: true };
const hashCallbacks = [];
stepLegacyAk(hash, { onAn: () => hashCallbacks.push("an") });
if (!hashCallbacks.includes("an")) throw new Error("Q=14 hash must enter the proven an() branch");

console.log("initial Q=14 input semantics OK");
