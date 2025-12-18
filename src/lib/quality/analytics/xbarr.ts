import type { XbarRChart } from "../types";

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function range(xs: number[]): number {
  if (xs.length === 0) return 0;
  let mn = xs[0];
  let mx = xs[0];
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return mx - mn;
}

const CONSTANTS: Record<number, { A2: number; D3: number; D4: number }> = {
  2: { A2: 1.88, D3: 0, D4: 3.267 },
  3: { A2: 1.023, D3: 0, D4: 2.574 },
  4: { A2: 0.729, D3: 0, D4: 2.282 },
  5: { A2: 0.577, D3: 0, D4: 2.114 },
  6: { A2: 0.483, D3: 0, D4: 2.004 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
};

type LabeledValue = { value: number; subgroupId?: string };

function buildSubgroups(args: { samples: LabeledValue[]; subgroupSize: number }): Array<{ id: string; values: number[] }> {
  const { samples, subgroupSize } = args;

  const hasAnySubgroup = samples.some((s) => typeof s.subgroupId === "string" && s.subgroupId.trim() !== "");
  if (hasAnySubgroup) {
    const order: string[] = [];
    const map = new Map<string, number[]>();
    for (const s of samples) {
      const id = (s.subgroupId ?? "").trim();
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, []);
        order.push(id);
      }
      map.get(id)!.push(s.value);
    }

    return order.map((id) => ({ id, values: map.get(id) ?? [] })).filter((g) => g.values.length > 0);
  }

  const groups: Array<{ id: string; values: number[] }> = [];
  let k = 0;
  for (let i = 0; i < samples.length; i += subgroupSize) {
    const slice = samples.slice(i, i + subgroupSize);
    if (slice.length < subgroupSize) break;
    k += 1;
    groups.push({ id: String(k), values: slice.map((s) => s.value) });
  }
  return groups;
}

export function computeXbarRChart(args: { values: Array<{ value: number; subgroupId?: string }>; subgroupSize?: number }): XbarRChart | null {
  const subgroupSize = args.subgroupSize ?? 5;
  const samples = args.values.filter((v) => typeof v.value === "number" && isFinite(v.value));
  const groups = buildSubgroups({ samples, subgroupSize });

  if (groups.length < 2) return null;

  const n = groups[0]?.values.length ?? 0;
  if (!(n >= 2 && n <= 10)) return null;
  if (!groups.every((g) => g.values.length === n)) return null;

  const constants = CONSTANTS[n];
  if (!constants) return null;

  const xbars = groups.map((g) => mean(g.values));
  const rs = groups.map((g) => range(g.values));

  const xbarbar = mean(xbars);
  const rbar = mean(rs);

  const xcl = xbarbar;
  const xucl = xbarbar + constants.A2 * rbar;
  const xlcl = xbarbar - constants.A2 * rbar;

  const rcl = rbar;
  const rucl = constants.D4 * rbar;
  const rlcl = constants.D3 * rbar;

  const points = groups.map((g, i) => {
    const x = xbars[i] ?? 0;
    const r = rs[i] ?? 0;
    const xOutOfControl = x > xucl || x < xlcl;
    const rOutOfControl = r > rucl || r < rlcl;

    return {
      index: i + 1,
      subgroupId: g.id,
      n,
      mean: x,
      range: r,
      xcl,
      xucl,
      xlcl,
      rcl,
      rucl,
      rlcl,
      xOutOfControl,
      rOutOfControl,
    };
  });

  return {
    subgroupSize: n,
    xbarbar,
    rbar,
    xcl,
    xucl,
    xlcl,
    rcl,
    rucl,
    rlcl,
    constants,
    points,
  };
}
