import * as THREE from "three";

export interface ArcSpringGeometryParams {
  d: number;
  D: number;
  n: number;
  r: number;
  alpha0Deg: number;
  theta0Deg?: number;
}

export function validateArcSpringGeometry(params: ArcSpringGeometryParams): { valid: boolean; message?: string } {
  if (!(params.d > 0)) return { valid: false, message: "d must be > 0" };
  if (!(params.D > 0)) return { valid: false, message: "D must be > 0" };
  if (!(params.n > 0)) return { valid: false, message: "n must be > 0" };
  if (!(params.r > 0)) return { valid: false, message: "r must be > 0" };
  if (!(params.alpha0Deg > 0)) return { valid: false, message: "alpha0Deg must be > 0" };
  if (!(params.D > params.d)) return { valid: false, message: "D must be > d" };
  return { valid: true };
}

const deg2rad = (a: number) => (a * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function sampleArcSpringCenterline(
  params: ArcSpringGeometryParams,
  options?: {
    samples?: number;
    centerArc?: boolean;
    deadCoilsStart?: number;
    deadCoilsEnd?: number;
    deadDensityFactor?: number;
    tightnessK?: number;
    tightnessSigma?: number;
  }
): THREE.Vector3[] {
  const { D, n, r, alpha0Deg } = params;
  const theta0Deg = params.theta0Deg ?? 0;

  const centerArc = options?.centerArc ?? true;

  const deadCoilsStart = Math.max(0, Math.round(options?.deadCoilsStart ?? 0));
  const deadCoilsEnd = Math.max(0, Math.round(options?.deadCoilsEnd ?? 0));
  const deadDensityFactor = Math.max(1, options?.deadDensityFactor ?? 4);
  const totalTurns = n + deadCoilsStart + deadCoilsEnd;

  const tightnessK = Math.max(0, options?.tightnessK ?? 0);
  const tightnessSigma = Math.max(1e-4, options?.tightnessSigma ?? 0);
  const useLambda = totalTurns > 0 && (deadCoilsStart + deadCoilsEnd) > 0 && tightnessK > 0 && tightnessSigma > 0;

  const baseSamples = Math.round(Math.max(1, totalTurns) * 220);
  const samples = options?.samples ?? clamp(baseSamples, 400, 4500);

  const thetaStart = centerArc ? theta0Deg - alpha0Deg / 2 : theta0Deg;
  const thetaEnd = thetaStart + alpha0Deg;

  const points: THREE.Vector3[] = [];
  const coilRadius = D / 2;

  const lenStart = deadCoilsStart > 0 ? deadCoilsStart / deadDensityFactor : 0;
  const lenActive = n > 0 ? n / 1 : 0;
  const lenEnd = deadCoilsEnd > 0 ? deadCoilsEnd / deadDensityFactor : 0;
  const lenSum = Math.max(1e-12, lenStart + lenActive + lenEnd);
  const fracStart = lenStart / lenSum;
  const fracActive = lenActive / lenSum;
  const fracEnd = lenEnd / lenSum;

  const expNegInvSigma = useLambda ? Math.exp(-1 / tightnessSigma) : 0;
  const denomLambda = useLambda
    ? 1 + tightnessK * 2 * tightnessSigma * (1 - expNegInvSigma)
    : 1;

  const lambdaAt = (s: number) => {
    if (!useLambda) return s;
    const e1 = Math.exp(-s / tightnessSigma);
    const e2 = Math.exp((s - 1) / tightnessSigma);
    const I =
      s +
      tightnessK *
      tightnessSigma *
      (1 - e1 + (e2 - expNegInvSigma));
    return I / denomLambda;
  };

  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const theta = deg2rad(thetaStart + (thetaEnd - thetaStart) * s);
    const cx = r * Math.cos(theta);
    const cy = r * Math.sin(theta);
    const cz = 0;
    const nx = Math.cos(theta);
    const ny = Math.sin(theta);
    const nz = 0;

    const bx = 0;
    const by = 0;
    const bz = 1;

    let turnsAtS = 0;
    if (useLambda) {
      turnsAtS = totalTurns * lambdaAt(s);
    } else if (fracStart > 0 && s < fracStart) {
      const u = s / fracStart;
      turnsAtS = deadCoilsStart * u;
    } else if (fracActive > 0 && s < fracStart + fracActive) {
      const u = (s - fracStart) / fracActive;
      turnsAtS = deadCoilsStart + n * u;
    } else if (fracEnd > 0) {
      const start = fracStart + fracActive;
      const denom = Math.max(1e-12, fracEnd);
      const u = (s - start) / denom;
      turnsAtS = deadCoilsStart + n + deadCoilsEnd * clamp(u, 0, 1);
    } else {
      turnsAtS = totalTurns * s;
    }

    const phi = 2 * Math.PI * turnsAtS;
    const cphi = Math.cos(phi);
    const sphi = Math.sin(phi);

    const ox = coilRadius * (cphi * nx + sphi * bx);
    const oy = coilRadius * (cphi * ny + sphi * by);
    const oz = coilRadius * (cphi * nz + sphi * bz);

    points.push(new THREE.Vector3(cx + ox, cy + oy, cz + oz));
  }

  if (points.length >= 2) {
    const p0 = points[0];
    const p1 = points[points.length - 1];
    if (p0.distanceToSquared(p1) < 1e-12) {
      points[points.length - 1] = p0.clone();
    }
  }

  return points;
}

export function createArcSpringTubeGeometry(
  params: ArcSpringGeometryParams,
  options?: {
    centerlineSamples?: number;
    tubularSegments?: number;
    radialSegments?: number;
    centerArc?: boolean;
    deadCoilsStart?: number;
    deadCoilsEnd?: number;
    deadDensityFactor?: number;
    tightnessK?: number;
    tightnessSigma?: number;
  }
): { geometry: THREE.TubeGeometry; centerline: THREE.Vector3[] } {
  const centerline = sampleArcSpringCenterline(params, {
    samples: options?.centerlineSamples,
    centerArc: options?.centerArc,
    deadCoilsStart: options?.deadCoilsStart,
    deadCoilsEnd: options?.deadCoilsEnd,
    deadDensityFactor: options?.deadDensityFactor,
    tightnessK: options?.tightnessK,
    tightnessSigma: options?.tightnessSigma,
  });

  const curve = new THREE.CatmullRomCurve3(centerline, false, "centripetal");

  const tubularSegments =
    options?.tubularSegments ??
    clamp(Math.round((centerline.length - 1) * 0.6), 240, 1400);

  const radialSegments = options?.radialSegments ?? 16;
  const wireRadius = params.d / 2;

  const geometry = new THREE.TubeGeometry(curve, tubularSegments, wireRadius, radialSegments, false);

  return { geometry, centerline };
}
