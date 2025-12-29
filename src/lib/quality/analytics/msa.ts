export interface MsaGageRrResult {
  design: "crossed" | "nested";
  parts: number;
  appraisers: number;
  trials: number;
  ev: number;
  av: number;
  iv: number;
  pv: number;
  grr: number;
  tv: number;
  pctGrr: number | null;
  ndc: number | null;
  assessment: "ACCEPTABLE" | "MARGINAL" | "UNACCEPTABLE" | "INSUFFICIENT_DATA";
}

type Obs = {
  partId: string;
  appraiser: string;
  trial: number;
  value: number;
};

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function varianceSample(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / (xs.length - 1);
}

function stdSample(xs: number[]): number {
  return Math.sqrt(Math.max(0, varianceSample(xs)));
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function pickAssessment(pctGrr: number | null): MsaGageRrResult["assessment"] {
  if (pctGrr === null || !isFinite(pctGrr)) return "INSUFFICIENT_DATA";
  if (pctGrr <= 10) return "ACCEPTABLE";
  if (pctGrr <= 30) return "MARGINAL";
  return "UNACCEPTABLE";
}

export function computeGageRrCrossed(args: { observations: Obs[] }): MsaGageRrResult {
  const obs = args.observations.filter((o) => isFinite(o.value) && o.partId && o.appraiser && Number.isInteger(o.trial));

  const parts = unique(obs.map((o) => o.partId));
  const appraisers = unique(obs.map((o) => o.appraiser));
  const trials = unique(obs.map((o) => o.trial)).sort((a, b) => a - b);

  const np = parts.length;
  const na = appraisers.length;
  const nt = trials.length;

  const cell = new Map<string, number[]>();
  for (const o of obs) {
    const k = `${o.partId}||${o.appraiser}`;
    const arr = cell.get(k) ?? [];
    arr.push(o.value);
    cell.set(k, arr);
  }

  const allValues = obs.map((o) => o.value);
  const grandMean = mean(allValues);

  const hasFull = np >= 2 && na >= 2 && nt >= 2 && parts.every((p) => appraisers.every((a) => (cell.get(`${p}||${a}`)?.length ?? 0) >= 2));

  if (!hasFull) {
    const pv = stdSample(allValues);
    const grr = 0;
    const tv = pv;
    return {
      design: "crossed",
      parts: np,
      appraisers: na,
      trials: nt,
      ev: 0,
      av: 0,
      iv: 0,
      pv,
      grr,
      tv,
      pctGrr: tv > 0 ? (grr / tv) * 100 : null,
      ndc: null,
      assessment: "INSUFFICIENT_DATA",
    };
  }

  const partMeans = new Map<string, number>();
  for (const p of parts) {
    partMeans.set(
      p,
      mean(
        obs
          .filter((o) => o.partId === p)
          .map((o) => o.value)
      )
    );
  }

  const appMeans = new Map<string, number>();
  for (const a of appraisers) {
    appMeans.set(
      a,
      mean(
        obs
          .filter((o) => o.appraiser === a)
          .map((o) => o.value)
      )
    );
  }

  const cellMeans = new Map<string, number>();
  for (const p of parts) {
    for (const a of appraisers) {
      const k = `${p}||${a}`;
      const vals = cell.get(k) ?? [];
      cellMeans.set(k, mean(vals));
    }
  }

  let ssE = 0;
  for (const o of obs) {
    const mu = cellMeans.get(`${o.partId}||${o.appraiser}`) ?? grandMean;
    ssE += (o.value - mu) * (o.value - mu);
  }

  let ssP = 0;
  for (const p of parts) {
    const muP = partMeans.get(p) ?? grandMean;
    ssP += na * nt * (muP - grandMean) * (muP - grandMean);
  }

  let ssA = 0;
  for (const a of appraisers) {
    const muA = appMeans.get(a) ?? grandMean;
    ssA += np * nt * (muA - grandMean) * (muA - grandMean);
  }

  let ssPA = 0;
  for (const p of parts) {
    for (const a of appraisers) {
      const muPA = cellMeans.get(`${p}||${a}`) ?? grandMean;
      const muP = partMeans.get(p) ?? grandMean;
      const muA = appMeans.get(a) ?? grandMean;
      ssPA += nt * (muPA - muP - muA + grandMean) * (muPA - muP - muA + grandMean);
    }
  }

  const dfP = np - 1;
  const dfA = na - 1;
  const dfPA = (np - 1) * (na - 1);
  const dfE = np * na * (nt - 1);

  const msP = dfP > 0 ? ssP / dfP : 0;
  const msA = dfA > 0 ? ssA / dfA : 0;
  const msPA = dfPA > 0 ? ssPA / dfPA : 0;
  const msE = dfE > 0 ? ssE / dfE : 0;

  const varE = msE;
  const varPA = Math.max(0, (msPA - msE) / Math.max(1, nt));
  const varA = Math.max(0, (msA - msPA) / Math.max(1, np * nt));
  const varP = Math.max(0, (msP - msPA) / Math.max(1, na * nt));

  const ev = Math.sqrt(varE);
  const iv = Math.sqrt(varPA);
  const av = Math.sqrt(varA);
  const pv = Math.sqrt(varP);

  const grr = Math.sqrt(ev * ev + av * av + iv * iv);
  const tv = Math.sqrt(grr * grr + pv * pv);

  const pctGrr = tv > 0 ? (grr / tv) * 100 : null;
  const ndc = grr > 0 ? Math.floor(1.41 * (pv / grr)) : null;

  return {
    design: "crossed",
    parts: np,
    appraisers: na,
    trials: nt,
    ev,
    av,
    iv,
    pv,
    grr,
    tv,
    pctGrr,
    ndc,
    assessment: pickAssessment(pctGrr),
  };
}
