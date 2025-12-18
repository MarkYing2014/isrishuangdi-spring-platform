import type { CapabilityResult } from "../types";

function safeDiv(n: number, d: number): number | null {
  if (!(isFinite(n) && isFinite(d) && Math.abs(d) > 1e-12)) return null;
  return n / d;
}

export function computeCapability(args: {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
  lsl: number | null;
  usl: number | null;
  target: number | null;
}): CapabilityResult {
  const { lsl, usl, target, mean, std, min, max, count } = args;

  const cp = lsl !== null && usl !== null ? safeDiv(usl - lsl, 6 * std) : null;

  const cpk =
    lsl !== null && usl !== null
      ? (() => {
          const cpu = safeDiv(usl - mean, 3 * std);
          const cpl = safeDiv(mean - lsl, 3 * std);
          if (cpu === null || cpl === null) return null;
          return Math.min(cpu, cpl);
        })()
      : null;

  return {
    mean,
    std,
    min,
    max,
    count,
    lsl,
    usl,
    target,
    cp,
    cpk,
  };
}
