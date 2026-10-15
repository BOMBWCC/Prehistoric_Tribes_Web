/** MIDP Graphics anchor bit values. */
export const Anchor = {
  HCENTER: 1,
  VCENTER: 2,
  LEFT: 4,
  RIGHT: 8,
  TOP: 16,
  BOTTOM: 32,
  BASELINE: 64,
} as const;

export type AnchorValue = number;
