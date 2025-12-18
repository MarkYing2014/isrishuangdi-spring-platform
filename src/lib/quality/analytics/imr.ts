import type { ImrChart, ImrPoint } from "../types";

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function stdSample(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(Math.max(0, v));
}

export function buildImrChart(values: number[]): ImrChart {
  const xs = values.slice().filter((v) => isFinite(v));
  const m = mean(xs);

  const mrs: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    mrs.push(Math.abs(xs[i] - xs[i - 1]));
  }

  const mrBar = mrs.length ? mean(mrs) : 0;

  const d2 = 1.128;
  const sigma = d2 > 0 ? mrBar / d2 : 0;

  const ucl = m + 3 * sigma;
  const lcl = m - 3 * sigma;

  const points: ImrPoint[] = xs.map((v, i) => ({
    x: i + 1,
    value: v,
    cl: m,
    ucl,
    lcl,
    outOfControl: v > ucl || v < lcl,
  }));

  return {
    points,
    mean: m,
    sigma,
    mrBar,
    ucl,
    lcl,
  };
}

export function basicStats(values: number[]): { mean: number; std: number; min: number; max: number; count: number } {
  const xs = values.slice().filter((v) => isFinite(v));
  const c = xs.length;
  const m = c ? mean(xs) : 0;
  const s = stdSample(xs);
  const min = c ? Math.min(...xs) : 0;
  const max = c ? Math.max(...xs) : 0;
  return { mean: m, std: s, min, max, count: c };
}
