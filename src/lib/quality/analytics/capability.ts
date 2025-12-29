export interface CapabilityResult {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
  n: number;
  lsl: number | null;
  usl: number | null;
  target: number | null;
  cp: number | null;
  cpk: number | null;
  assessment: { en: string; zh: string };
  note?: { en: string; zh: string };
}

function safeDiv(n: number, d: number): number | null {
  if (!(isFinite(n) && isFinite(d) && Math.abs(d) > 1e-12)) return null;
  return n / d;
}

function getAssessment(cpk: number | null): { en: string; zh: string } {
  if (cpk === null) return { en: "N/A - Insufficient data", zh: "N/A - 数据不足" };
  if (cpk >= 1.33) return { en: "Capable", zh: "过程能力充足" };
  if (cpk >= 1.0) return { en: "Marginally Capable", zh: "过程能力边缘" };
  return { en: "Not Capable", zh: "过程能力不足" };
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
    n: count,
    lsl,
    usl,
    target,
    cp,
    cpk,
    assessment: getAssessment(cpk),
  };
}
