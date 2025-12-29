export interface NelsonViolation {
  rule: number;
  startIndex: number;
  endIndex: number;
  direction: string;
  points: number[];
}

export interface NelsonResult {
  violations: NelsonViolation[];
  counts: Record<string, number>;
}

function pushViolation(list: NelsonViolation[], v: NelsonViolation) {
  const last = list[list.length - 1];
  if (last && last.rule === v.rule && last.startIndex === v.startIndex && last.endIndex === v.endIndex) return;
  list.push(v);
}

function sign(x: number): -1 | 0 | 1 {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

export function detectNelsonRules(args: { values: number[]; mean: number; sigma: number }): NelsonResult {
  const xs = args.values.slice().filter((v) => isFinite(v));
  const mean = args.mean;
  const sigma = args.sigma;

  const violations: NelsonViolation[] = [];

  if (!(xs.length >= 2) || !(isFinite(mean) && isFinite(sigma)) || sigma <= 1e-12) {
    return { violations, counts: {} };
  }

  const z = (x: number) => (x - mean) / sigma;

  for (let i = 0; i < xs.length; i++) {
    const zi = z(xs[i]);
    if (Math.abs(zi) > 3) {
      pushViolation(violations, {
        rule: 1,
        startIndex: i + 1,
        endIndex: i + 1,
        direction: zi > 0 ? "above" : "below",
        points: [i + 1],
      });
    }
  }

  {
    let runStart = 0;
    let runSide: -1 | 0 | 1 = 0;
    for (let i = 0; i < xs.length; i++) {
      const s = sign(xs[i] - mean);
      if (s === 0) {
        runStart = i + 1;
        runSide = 0;
        continue;
      }
      if (runSide === 0) {
        runSide = s;
        runStart = i;
        continue;
      }
      if (s !== runSide) {
        runSide = s;
        runStart = i;
        continue;
      }
      const runLen = i - runStart + 1;
      if (runLen >= 9) {
        pushViolation(violations, {
          rule: 2,
          startIndex: i - 9 + 2,
          endIndex: i + 1,
          direction: runSide > 0 ? "above" : "below",
          points: Array.from({ length: 9 }, (_, k) => i - 9 + 2 + k),
        });
      }
    }
  }

  {
    let inc = 1;
    let dec = 1;
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] > xs[i - 1]) {
        inc += 1;
        dec = 1;
      } else if (xs[i] < xs[i - 1]) {
        dec += 1;
        inc = 1;
      } else {
        inc = 1;
        dec = 1;
      }

      if (inc >= 6) {
        pushViolation(violations, {
          rule: 3,
          startIndex: i - 6 + 2,
          endIndex: i + 1,
          direction: "increasing",
          points: Array.from({ length: 6 }, (_, k) => i - 6 + 2 + k),
        });
      }
      if (dec >= 6) {
        pushViolation(violations, {
          rule: 3,
          startIndex: i - 6 + 2,
          endIndex: i + 1,
          direction: "decreasing",
          points: Array.from({ length: 6 }, (_, k) => i - 6 + 2 + k),
        });
      }
    }
  }

  {
    let altLen = 1;
    for (let i = 2; i < xs.length; i++) {
      const d1 = xs[i - 1] - xs[i - 2];
      const d2 = xs[i] - xs[i - 1];
      if (d1 === 0 || d2 === 0) {
        altLen = 1;
        continue;
      }
      if (d1 * d2 < 0) {
        altLen += 1;
      } else {
        altLen = 2;
      }

      if (altLen >= 14) {
        pushViolation(violations, {
          rule: 4,
          startIndex: i - 14 + 2,
          endIndex: i + 1,
          direction: "alternating",
          points: Array.from({ length: 14 }, (_, k) => i - 14 + 2 + k),
        });
      }
    }
  }

  for (let i = 2; i < xs.length; i++) {
    const window = [i - 2, i - 1, i];
    const zs = window.map((j) => z(xs[j]));
    const above = zs.filter((v) => v > 2).length;
    const below = zs.filter((v) => v < -2).length;
    if (above >= 2) {
      pushViolation(violations, {
        rule: 5,
        startIndex: i - 2 + 1,
        endIndex: i + 1,
        direction: "above",
        points: window.map((j) => j + 1),
      });
    }
    if (below >= 2) {
      pushViolation(violations, {
        rule: 5,
        startIndex: i - 2 + 1,
        endIndex: i + 1,
        direction: "below",
        points: window.map((j) => j + 1),
      });
    }
  }

  for (let i = 4; i < xs.length; i++) {
    const window = [i - 4, i - 3, i - 2, i - 1, i];
    const zs = window.map((j) => z(xs[j]));
    const above = zs.filter((v) => v > 1).length;
    const below = zs.filter((v) => v < -1).length;
    if (above >= 4) {
      pushViolation(violations, {
        rule: 6,
        startIndex: i - 4 + 1,
        endIndex: i + 1,
        direction: "above",
        points: window.map((j) => j + 1),
      });
    }
    if (below >= 4) {
      pushViolation(violations, {
        rule: 6,
        startIndex: i - 4 + 1,
        endIndex: i + 1,
        direction: "below",
        points: window.map((j) => j + 1),
      });
    }
  }

  {
    let run = 0;
    for (let i = 0; i < xs.length; i++) {
      const zi = Math.abs(z(xs[i]));
      if (zi < 1) {
        run += 1;
      } else {
        run = 0;
      }
      if (run >= 15) {
        const start = i - 15 + 2;
        pushViolation(violations, {
          rule: 7,
          startIndex: start,
          endIndex: i + 1,
          direction: "within_1sigma",
          points: Array.from({ length: 15 }, (_, k) => start + k),
        });
      }
    }
  }

  {
    let run = 0;
    for (let i = 0; i < xs.length; i++) {
      const zi = Math.abs(z(xs[i]));
      if (zi > 1) {
        run += 1;
      } else {
        run = 0;
      }
      if (run >= 8) {
        const start = i - 8 + 2;
        pushViolation(violations, {
          rule: 8,
          startIndex: start,
          endIndex: i + 1,
          direction: "outside_1sigma",
          points: Array.from({ length: 8 }, (_, k) => start + k),
        });
      }
    }
  }

  const counts: Record<string, number> = {};
  for (const v of violations) {
    const k = String(v.rule);
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return { violations, counts };
}
