import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZKind2.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Math });
const { stepLegacyZKind2 } = module.exports;

const base = { Q: false, R: false, T: true, U: true, aI: 7, aJ: 10, aK: 20, y: 2, I: 3, W: 1, K: 4, X: 1, aL: 2, A: 5, O: 6, P: 3, f: 20, k: 4, S: false };

// row-1===1201 branch: both the drawRect (#536) and the subrecord draw
// (#572) fire, with the offset math re-derived by hand from
// bytecode/f-javap.txt offsets 141..292 (see the file's own docblock for
// the regression this corrects -- the old rectY/spriteY formulas left `A`
// or `aL` outside the `*4` group the bytecode actually multiplies whole).
{
  const state = { ...base };
  const rects = [];
  const subs = [];
  stepLegacyZKind2(state, 1202, {
    onDrawRect: (...args) => rects.push(args),
    onSubrecord: (...args) => subs.push(args),
  });
  // rectX = 11+aJ+(I-W)*5 = 11+10+(3-1)*5 = 31
  // rectY = 8+aK+(K-X+aL)*4 = 8+20+(4-1+2)*4 = 48
  assert.deepEqual(rects, [[31, 48, 6 * 5 - 1, 3 * 4 - 1]]);
  // spriteX = aJ+(y+I-W)*5-11 = 10+(2+3-1)*5-11 = 19
  // spriteY = aK+(A+K-X+aL)*4-8 = 20+(5+4-1+2)*4-8 = 52
  assert.deepEqual(subs, [[7, 19, 52, 5]]);
  assert.equal(state.S, true);
}

// row-1!==1201: only the subrecord draw fires, with raw aJ/aK (no offset
// math) -- confirmed by the bytecode's offset-296 fallthrough target.
{
  const state = { ...base };
  const rects = [];
  const subs = [];
  stepLegacyZKind2(state, 1000, {
    onDrawRect: (...args) => rects.push(args),
    onSubrecord: (...args) => subs.push(args),
  });
  assert.deepEqual(rects, []);
  assert.deepEqual(subs, [[7, 10, 20, 5]]);
  assert.equal(state.S, true);
}

// Q guard: only blocks when Q is true AND aI is 4 or 94 -- Q=true with an
// unrelated aI must NOT block (this is the exact polarity bug the
// 2026-08-31 regression note describes: the previous port returned here).
{
  const state = { ...base, Q: true, aI: 7 };
  const subs = [];
  stepLegacyZKind2(state, 1000, { onSubrecord: (...args) => subs.push(args) });
  assert.equal(subs.length, 1, "Q=true with aI=7 must still draw");
}
{
  const state = { ...base, Q: true, aI: 4, S: false };
  stepLegacyZKind2(state, 1000, { onSubrecord: () => { throw new Error("Q-guarded row rendered"); } });
  assert.equal(state.S, false);
}
{
  const state = { ...base, Q: true, aI: 94, S: false };
  stepLegacyZKind2(state, 1000, { onSubrecord: () => { throw new Error("Q-guarded row rendered"); } });
  assert.equal(state.S, false);
}

// R guard: symmetric to Q, over aI 5/95.
{
  const state = { ...base, R: true, aI: 5, S: false };
  stepLegacyZKind2(state, 1000, { onSubrecord: () => { throw new Error("R-guarded row rendered"); } });
  assert.equal(state.S, false);
}
{
  const state = { ...base, R: true, aI: 8, S: false };
  const subs = [];
  stepLegacyZKind2(state, 1000, { onSubrecord: (...args) => subs.push(args) });
  assert.equal(subs.length, 1, "R=true with unrelated aI must still draw");
}

// T guard: !T && aI===1 blocks; T===true never blocks on aI===1.
{
  const state = { ...base, T: false, aI: 1, S: false };
  stepLegacyZKind2(state, 1000, { onSubrecord: () => { throw new Error("T-guarded row rendered"); } });
  assert.equal(state.S, false);
}
{
  const state = { ...base, T: true, aI: 1, S: false };
  const subs = [];
  stepLegacyZKind2(state, 1000, { onSubrecord: (...args) => subs.push(args) });
  assert.equal(subs.length, 1, "T=true must never block aI===1");
}

// U guard: !U && aI===2 blocks; U===true never blocks on aI===2.
{
  const state = { ...base, U: false, aI: 2, S: false };
  stepLegacyZKind2(state, 1000, { onSubrecord: () => { throw new Error("U-guarded row rendered"); } });
  assert.equal(state.S, false);
}
{
  const state = { ...base, U: true, aI: 2, S: false };
  const subs = [];
  stepLegacyZKind2(state, 1000, { onSubrecord: (...args) => subs.push(args) });
  assert.equal(subs.length, 1, "U=true must never block aI===2");
}

console.log("f.d(2,row) gate and raw geometry OK");
