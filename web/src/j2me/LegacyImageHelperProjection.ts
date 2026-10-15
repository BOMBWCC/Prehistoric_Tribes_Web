/**
 * Confirmed direct branches of private f.a(int,byte,byte,int,int,byte).
 *
 * This is the projection loop used by f.a(1118, mode).  The remaining flag
 * families deliberately stay observable through onUnhandled; they must not
 * be collapsed into an ordinary packed composite draw.
 */
export type LegacyImageHelperProjectionInput = {
  readonly recordBase: number;
  readonly recordCount: number;
  readonly argument1: number;
  readonly argument2: number;
  readonly argument3: number;
  readonly originX: number;
  readonly originY: number;
  readonly mode: number;
  /** f.U and f.a[0][0] at entry to the projection loop. */
  readonly initialU?: number;
  readonly widthSeed?: number;
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  readonly groupSelectors: Int8Array;
  readonly onComposite: (record: number, x: number, y: number) => void;
  /** Raw d(IIII) projection owner used by the confirmed flag-6 branch. */
  readonly onProjection?: (record: number, x: number, y: number, extra: number) => void;
  readonly eBytes?: Int8Array;
  readonly groupFlags?: Int8Array;
  readonly fieldF?: number;
  readonly fieldK?: number;
  readonly ai?: number;
  readonly hFlags?: Int8Array;
  readonly aBytes?: Int8Array;
  readonly aShorts?: Int16Array;
  readonly stateV?: number;
  /** f.x:Z (#383) = true (offset 1492). */
  readonly onStateX?: () => void;
  /** Raw a(IIIIB) projection: record, x, y, extra, anchor/kind. */
  readonly onStatefulProjection?: (record: number, x: number, y: number, extra: number, kind: number) => void;
  readonly onUnhandled?: (flag: number, record: number, position: number) => void;
};

export type LegacyImageHelperProjectionResult = {
  readonly processed: number;
  readonly directComposites: number;
  readonly unhandled: number;
  readonly finalU: number;
  readonly projections: number;
};

/** Exact direct branches at offsets 20..195 and 195..459/647 of the loop. */
export function projectLegacyImageHelper(
  input: LegacyImageHelperProjectionInput,
): LegacyImageHelperProjectionResult {
  const records = input.shortTables[1];
  const flags = input.byteTables[3];
  const xOffsets = input.byteTables[1];
  const yOffsets = input.byteTables[2];
  if (!records || !flags || !xOffsets || !yOffsets) {
    throw new RangeError("packed projection tables are incomplete");
  }

  let directComposites = 0;
  let unhandled = 0;
  let u = input.initialU ?? 0;
  let projections = 0;
  const count = Math.max(0, input.recordCount);
  for (let position = 0; position < count; position += 1) {
    const tableIndex = input.recordBase + position;
    const packedFlag = unsigned(flags[tableIndex] ?? 0);
    const flag = packedFlag & 7;
    const group = (packedFlag & 63) >> 3;
    const p = packedFlag >> 6;
    const recordValue = records[tableIndex] ?? 0;
    const record = recordValue & 0x0fff;
    const familyOffset = ((recordValue & 0xc000) >> 14) << 7;
    const x = input.originX + signed(xOffsets[tableIndex] ?? 0) + familyOffset;
    const y = input.originY + signed(yOffsets[tableIndex] ?? 0);

    // Bytecode: flags==0 && arg6==2 && P==arg2 -> a(III).
    if (flag === 0 && input.mode === 2 && p === input.argument2) {
      input.onComposite(record, x, y);
      directComposites += 1;
      continue;
    }

    // Bytecode: flags==1 && P<=arg2; arg3==4 has a one-shot U/width branch.
    if (flag === 1 && p <= input.argument2 && input.argument3 === 4 && u < 1) {
      let selected = -1;
      if (input.argument1 >= 31) {
        selected = 2;
      } else {
        const seed = input.widthSeed;
        if (seed === undefined) {
          input.onUnhandled?.(flag, record, position);
          unhandled += 1;
          u += 1;
          continue;
        }
        if (seed >= 5) selected = seed > 35 ? 2 : Math.trunc((seed - 5) / 15);
        if (selected < 5 || input.argument1 >= 31) selected = 4;
      }
      if (selected >= 0) {
        input.onComposite(record + selected, x, y);
        directComposites += 1;
      }
      u += 1;
      continue;
    }

    // After the one-shot branch, arg3==4 joins the shared direct path. All
    // other arg3 values (including 6) also reach this offset-647 draw.
    if (flag === 1 && p <= input.argument2) {
      // Bytecode offset 647 masks b[1][N] with 4095 before adding local4;
      // familyOffset is used only by the x coordinate expression.
      input.onComposite(record + input.argument3, x, y);
      directComposites += 1;
      continue;
    }

    // Bytecode offsets 912..984: flag 2 projects through d(IIII) when
    // e[1313 + X] is outside the active 1..49 range.
    if (flag === 2 && input.mode !== 2 && (p === 0 || p <= input.argument2)) {
      const selector = input.groupSelectors[group] ?? 0;
      const value = input.eBytes?.[1313 + selector];
      if (value !== undefined && (value <= 0 || value >= 50) && input.fieldF !== undefined) {
        input.onProjection?.(record, x, y, input.fieldF);
        projections += 1;
        continue;
      }
      input.onUnhandled?.(flag, record, position);
      unhandled += 1;
      continue;
    }

    // Bytecode offsets 984..1162: flag 4 consumes the X-selected record
    // when its group flag is clear and e[1313+X] is in 1..49.
    if (flag === 4 && input.mode !== 2 && (p === 0 || p <= input.argument2)) {
      const selector = input.groupSelectors[group] ?? 0;
      const value = input.eBytes?.[1313 + selector];
      const groupFlag = input.groupFlags?.[group] ?? 0;
      if (value !== undefined && value >= 1 && value < 50 && groupFlag === 0 && input.fieldF !== undefined) {
        const shiftedRecord = (input.shortTables[1]?.[tableIndex + value - 1] ?? 0) & 0x0fff;
        const extra = input.eBytes?.[3030 + selector];
        if (extra === undefined) {
          input.onUnhandled?.(flag, record, position);
          unhandled += 1;
          continue;
        }
        if (input.groupFlags) input.groupFlags[group] = 1;
        if (input.eBytes?.[8749 + input.argument1] === 2 && value === 2) {
          input.onProjection?.(90, x, y, input.fieldF);
          projections += 1;
        }
        input.onProjection?.(shiftedRecord, x, y, extra);
        projections += 1;
        continue;
      }
      input.onUnhandled?.(flag, record, position);
      unhandled += 1;
      continue;
    }

    // Bytecode offsets 700..859/1162: flag 6, mode != 2, P gate passed.
    // Group 1 and groups other than 2 project directly; group 2 requires the
    // /a[8627 + argument1] value to be 1 or 2.
    if (flag === 6 && input.mode !== 2 && (p === 0 || p <= input.argument2)) {
      const gate = input.eBytes?.[8627 + input.argument1];
      const allowed = group !== 2 || gate === 1 || gate === 2;
      if (allowed && input.fieldF !== undefined && input.fieldK !== undefined && input.ai !== undefined) {
        let extra = input.fieldF + input.fieldK + input.ai + tableIndex * 2;
        while (extra >= 120) extra -= 120;
        const projectedRecord = record + (input.argument1 >= 31 ? 1 : 0);
        input.onProjection?.(projectedRecord, x, y, extra);
        projections += 1;
        continue;
      }
      input.onUnhandled?.(flag, record, position);
      unhandled += 1;
      continue;
    }

    // Bytecode offsets 1205..1573: flags 3/5/7 use the stateful
    // a(IIIIB) projection and mark h[group] after drawing. This mirrors the
    // already isolated map-marker 357 helper, but keeps the 1118 call-site
    // fields explicit instead of aliasing them to map state.
    if ((flag === 3 || flag === 5 || flag === 7) && input.mode !== 2) {
      const xGroup = input.groupSelectors[group] ?? 0;
      const xValue = input.eBytes?.[1313 + xGroup];
      const hValue = input.hFlags?.[group] ?? 0;
      if (input.hFlags && xValue !== undefined && hValue === 0 && xGroup > 0 &&
          (input.argument1 < 31 || ((input.eBytes?.[9176 + input.argument1] ?? 0) & 3) >= 2)) {
        let draw = false;
        let extra = 0;
        if (flag === 7) {
          draw = xValue === 50;
        } else if (flag === 3) {
          if (xValue >= 1 && xValue !== 50 && input.aBytes && input.aShorts) {
            const selector = (input.aBytes[input.aShorts[139] ?? 0] ?? 0) +
              (input.aBytes[(input.aShorts[140] ?? 0) + input.argument3] ?? 0) + group;
            extra = selector === -1 ? (input.eBytes?.[606 + xGroup] ?? 0) : selector;
            draw = true;
          }
        } else if (xValue <= 0) {
          draw = true;
          const first = input.eBytes?.[3535 + xGroup] ?? 0;
          const second = input.eBytes?.[6565 + xGroup] ?? 0;
          // Offsets 1447..1493: `e[3535] != 0 || e[6565] == 1` (and arg3 not
          // 10/11) sets x:Z. CORRECTED 2026-09-28: the first test was `== 0`.
          if ((first !== 0 || second === 1) && input.argument3 !== 10 && input.argument3 !== 11) input.onStateX?.();
          if (input.stateV === 0) extra = input.eBytes?.[606 + xGroup] ?? 0;
        }
        if (draw) {
          input.onStatefulProjection?.(xGroup, x, y, extra, 29);
          input.hFlags[group] = 1;
          projections += 1;
          continue;
        }
      }
      input.onUnhandled?.(flag, record, position);
      unhandled += 1;
      continue;
    }

    // Remaining flags/state combinations stay observable until their bytecode
    // owners are mapped.
    if (flag !== 0 || input.mode !== 2 || p !== input.argument2) {
      input.onUnhandled?.(flag, record, position);
      unhandled += 1;
    }
    void input.argument1;
    void input.argument3;
    void group;
  }
  return { processed: count, directComposites, unhandled, finalU: u, projections };
}

function unsigned(value: number): number {
  return value & 0xff;
}

function signed(value: number): number {
  const normalized = value & 0xff;
  return normalized >= 128 ? normalized - 256 : normalized;
}
