import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/world/LegacyCellCompatibilityCheck.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { checkLegacyCellCompatibility } = module.exports;

const grid = () => Array.from({ length: 30 }, () => new Int8Array(30));
const base = (overrides = {}) => {
  const state = new Int8Array(20000);
  const id = 5;
  state[id] = 15; state[101 + id] = 15; // my position, far from test cells near (0,0)
  state[1414 + id] = 20;
  return {
    state, id, team: 1, gridC: grid(),
    packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(200),
    saveOffsets: new Int16Array(570),
    // Permissive by default (every bit set) so tests that aren't targeting
    // the visibility gate itself don't accidentally trip it.
    visibilityBits: [Array.from({ length: 4 }, () => new Array(30).fill(-1))],
    ...overrides,
  };
};

// mode!==0: the mode-0-only range/table53/visibility/boundary checks are all
// skipped -- only the team/type gate (which itself is mode===0-only) and the
// final check (also mode===0-only) apply, so mode!==0 should always accept
// with no side conditions.
{
  const input = base();
  input.gridC[2][3] = 50; // would be in-range for mode 0, irrelevant here
  const result = checkLegacyCellCompatibility(input, 3, 2, 1);
  assert.equal(result, true);
}

// mode===0, grid value out of the (0,122]/-128 range -> table53 lookup
// skipped entirely, no throw, falls through the rest of the gates.
{
  const input = base({ team: 1 }); // team!==0 skips visibility check
  input.gridC[2][3] = 0; // not >0, not -128 -> "inRange" is false
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// mode===0, grid in range, table53 lookup <=29 -> no throw, proceeds normally.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = 50;
  input.packedOffsets[53] = 0;
  // dy = clamp(2 - 15) = clamp(-13) = 0 (out of -12..12); dx = clamp(3-15)=0
  // scanIndex = 0 + 0*25 + 0 = 0
  input.packedBytes[0] = 29; // <=29, safe
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// mode===0, grid in range, table53 lookup >29, grid===-128 -> returns false (no throw).
{
  const input = base({ team: 1 });
  input.gridC[2][3] = -128;
  input.packedOffsets[53] = 0;
  input.packedBytes[0] = 30; // >29
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// mode===0, grid in range, table53 lookup >29, grid<=100 (not -128) -> real
// occupant-state lookup via saveOffsets[29] (NOT a throw, RETRACTED 2026-09-07).
// occupantByte&0xff<=7 -> reject.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = 50; // in (0,122], not -128, <=100
  input.packedOffsets[53] = 0;
  input.packedBytes[0] = 30; // >29
  input.saveOffsets[29] = 1000;
  input.state[1000 + 50] = 5; // &0xff = 5, <=7
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 0), false);
}

// Same lookup, occupantByte&0xff>7 -> falls through the rest of the method
// normally (no other gate trips here) -> accept.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = 50;
  input.packedOffsets[53] = 0;
  input.packedBytes[0] = 30;
  input.saveOffsets[29] = 1000;
  input.state[1000 + 50] = 20; // &0xff = 20, >7
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 0), true);
}

// Same lookup but grid>100 -> uses saveOffsets[108] and (grid-101) as the
// occupant index instead of saveOffsets[29]/grid.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = 110; // >100, still in (0,122]
  input.packedOffsets[53] = 0;
  input.packedBytes[0] = 30;
  input.saveOffsets[108] = 2000;
  input.state[2000 + (110 - 101)] = 3; // &0xff = 3, <=7
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 0), false);
}

// team===0, mode===0, visibility bit unset -> returns false.
{
  const input = base({ team: 0 });
  input.gridC[2][3] = 0; // skip the table53 section entirely (out of range)
  input.visibilityBits = [[[0]]]; // visibilityBits[0][0][0] = 0 -> x>>5=0, y=0 needs x=3>>5=0
  // x=3 -> x>>5 = 0; y=2 -> visibilityBits[0][0][2] needed
  input.visibilityBits = [[]];
  input.visibilityBits[0][0] = [0, 0, 0]; // index 2 = 0 -> bit (x&31=3) of value 0 is 0
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// team===0, mode===0, visibility bit set -> passes that gate, continues (accept overall here).
{
  const input = base({ team: 0 });
  input.gridC[2][3] = 0;
  input.visibilityBits = [[]];
  input.visibilityBits[0][0] = [0, 0, 1 << 3]; // bit 3 set -> (x&31)=3 matches
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// mode===0, grid in the boundary-sentinel range but dense[1414+id]<12 -> not rejected (offset 377 if_icmplt 382).
{
  const input = base({ team: 1 });
  input.state[1414 + input.id] = 5; // <12
  // otherTeam = team^1 = 0, threshold = -111 - 0*6 = -111
  // boundary range is (threshold-3, threshold] = (-114, -111]
  input.gridC[2][3] = -112;
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// Same boundary range and dense[1414+id]>=12 -> rejected.
{
  const input = base({ team: 1 });
  input.state[1414 + input.id] = 12;
  input.gridC[2][3] = -112;
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// mode===0, grid === id+mode -> false.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = input.id; // id + mode(0) = id
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// Offsets 382..400 apply in every mode: an animal route (mode 101) treats
// its own cell (101 + slot) as free (oracle run 12, frame 7267).
{
  const input = base({ team: 2 });
  input.gridC[2][3] = input.id + 101;
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 101), false);
}

// Team/type gate: dense[4848+id]>0, grid in team's id range,
// myTable43<=occupantTable43 && occupantTable43!==0 -> CORRECTED (2026-09-04):
// this SKIPS the occupant-mode/type checks (not an immediate reject) and
// falls through to the step-5 tail, which accepts here.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10; // in (0*50, 1*50]
  input.state[2828 + input.id] = 3; // my type
  input.state[2828 + 10] = 4; // occupant's type (grid value used as an id offset)
  input.packedOffsets[43] = 0;
  input.packedBytes[3] = 5; // table43[myType=3] = 5
  input.packedBytes[4] = 9; // table43[occupantType=4] = 9, >=5 and !=0 -> skip type checks
  input.state[1414 + input.id] = 20; // avoid the boundary reject
  // If the (skipped) type checks ran, this would reject -- proving they didn't.
  input.state[2929 + 10] = 15; // occupant mode in [8,21), would reject if checked
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// Same shape but myTable43>occupantTable43 -> type checks DO run and can reject.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10;
  input.state[2828 + input.id] = 3;
  input.state[2828 + 10] = 4;
  input.packedOffsets[43] = 0;
  input.packedBytes[3] = 9; // table43[myType=3] = 9
  input.packedBytes[4] = 5; // table43[occupantType=4] = 5, myTable43(9)>occupantTable43(5) -> checks run
  input.state[1414 + input.id] = 20;
  input.state[2929 + 10] = 15; // occupant mode in [8,21) -> reject
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// Team/type gate: occupant's mode in the busy [8,21) range -> reject.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10;
  input.packedOffsets[43] = 0;
  input.packedBytes[0] = 0; // table43[myType=0]=0
  input.packedBytes[0 + 0] = 0; // table43[occupantType=0]=0 too, so myTable43<=occTable43 but occTable43===0 -> not rejected there
  input.state[2929 + 10] = 15; // occupant mode in [8,21)
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// Team/type gate: occupant mode&0xff<=7 -> skips all type checks, accepts.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10;
  input.state[2929 + 10] = 3; // &0xff = 3, <=7
  input.state[2828 + 10] = 69; // would reject if type check ran -- must NOT run
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, true);
}

// Team/type gate: occupant type in {69,79,80} -> reject.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10;
  input.state[2929 + 10] = 50; // &0xff>7, not a busy-mode reject
  input.state[2828 + 10] = 79;
  const result = checkLegacyCellCompatibility(input, 3, 2, 0);
  assert.equal(result, false);
}

// Team/type gate: occupant type in (82,85] -> reject; >85 -> accept.
{
  const input = base({ team: 0 });
  input.state[4848 + input.id] = 1;
  input.gridC[2][3] = 10;
  input.state[2929 + 10] = 50;
  input.state[2828 + 10] = 84;
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 0), false);

  const input2 = base({ team: 0 });
  input2.state[4848 + input2.id] = 1;
  input2.gridC[2][3] = 10;
  input2.state[2929 + 10] = 50;
  input2.state[2828 + 10] = 86;
  assert.equal(checkLegacyCellCompatibility(input2, 3, 2, 0), true);
}

// Final check: mode===0, grid===-127, my type===13 -> false; otherwise true.
{
  const input = base({ team: 1 });
  input.gridC[2][3] = -127;
  input.state[2828 + input.id] = 13;
  assert.equal(checkLegacyCellCompatibility(input, 3, 2, 0), false);

  const input2 = base({ team: 1 });
  input2.gridC[2][3] = -127;
  input2.state[2828 + input2.id] = 14; // not 13
  assert.equal(checkLegacyCellCompatibility(input2, 3, 2, 0), true);
}

console.log("checkLegacyCellCompatibility (a(int,int,int):byte, #272) OK");
