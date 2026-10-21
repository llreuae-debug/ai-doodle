export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3;

export const easeInOutCubic = (p: number): number => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

export function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}
