export function buildCloseoutCurves(params: {
  preloadTorque_Nmm: number;
  springRate_NmmPerDeg: number;
  thetaCo_deg: number;
  thetaMaxUsed_deg: number;
  enableNonlinearCloseout: boolean;
  thetaContactStart_deg: number;
  hardeningA: number;
  hardeningP: number;
  hardeningFactorLegacy?: number;
  samples?: number;
}): {
  thetaContactStartUsed_deg: number;
  curveCloseoutLinear: Array<{ thetaDeg: number; torque: number }>;
  curveCloseoutNonlinear: Array<{ thetaDeg: number; torque: number }>;
  nonlinearTorqueAtMax?: number | null;
} {
  const {
    preloadTorque_Nmm,
    springRate_NmmPerDeg,
    thetaCo_deg,
    thetaMaxUsed_deg,
    enableNonlinearCloseout,
    thetaContactStart_deg,
    hardeningA,
    hardeningP,
  } = params;

  const hardeningFactorLegacy = params.hardeningFactorLegacy ?? 8;

  const clampTheta = (x: number) => Math.max(0, x);
  const thetaContactStartUsed_deg = clampTheta(Math.min(thetaContactStart_deg, thetaCo_deg));

  const curveSamples = params.samples ?? 100;
  const closeoutThetaPlot = Math.max(thetaMaxUsed_deg, thetaCo_deg);

  const curveCloseoutLinear = Array.from({ length: curveSamples }, (_, i) => {
    const alpha = curveSamples <= 1 ? 0 : i / (curveSamples - 1);
    const thetaDeg = closeoutThetaPlot * alpha;
    return {
      thetaDeg,
      torque: preloadTorque_Nmm + springRate_NmmPerDeg * Math.min(thetaDeg, thetaCo_deg),
    };
  });

  const denom = Math.max(1e-9, thetaCo_deg - thetaContactStartUsed_deg);
  const kAt = (thetaDeg: number) => {
    const th = clampTheta(thetaDeg);
    if (th <= thetaContactStartUsed_deg) return springRate_NmmPerDeg;
    const xi = Math.min(1, Math.max(0, (th - thetaContactStartUsed_deg) / denom));
    return springRate_NmmPerDeg * (1 + hardeningA * Math.pow(xi, hardeningP));
  };

  const curveCloseoutNonlinear: Array<{ thetaDeg: number; torque: number }> = [];
  let acc = preloadTorque_Nmm;
  let prevTheta = 0;
  let prevK = kAt(0);
  curveCloseoutNonlinear.push({ thetaDeg: 0, torque: acc });

  for (let i = 1; i < curveSamples; i++) {
    const alpha = i / (curveSamples - 1);
    const thetaDeg = closeoutThetaPlot * alpha;
    const thUse = Math.min(thetaDeg, thetaCo_deg);

    if (enableNonlinearCloseout) {
      const kNow = kAt(thUse);
      const dTheta = thUse - prevTheta;
      acc += 0.5 * (prevK + kNow) * dTheta;
      prevTheta = thUse;
      prevK = kNow;
      curveCloseoutNonlinear.push({ thetaDeg, torque: acc });
    } else {
      curveCloseoutNonlinear.push({
        thetaDeg,
        torque:
          thetaDeg <= thetaCo_deg
            ? preloadTorque_Nmm + springRate_NmmPerDeg * thetaDeg
            : preloadTorque_Nmm +
              springRate_NmmPerDeg * thetaCo_deg +
              springRate_NmmPerDeg * hardeningFactorLegacy * (thetaDeg - thetaCo_deg),
      });
    }
  }

  const nonlinearTorqueAtMax = enableNonlinearCloseout
    ? curveCloseoutNonlinear.find((p) => Math.abs(p.thetaDeg - thetaMaxUsed_deg) < 1e-6)?.torque ?? null
    : null;

  return { thetaContactStartUsed_deg, curveCloseoutLinear, curveCloseoutNonlinear, nonlinearTorqueAtMax };
}
