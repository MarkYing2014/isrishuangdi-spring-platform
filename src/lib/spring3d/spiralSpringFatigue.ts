export function computeGoodmanFatigueFoS(params: {
  sigmaMin_MPa: number;
  sigmaMax_MPa: number;
  Su_MPa?: number | null;
  Se_MPa?: number | null;
}): {
  sigmaA_MPa: number;
  sigmaM_MPa: number;
  goodmanDen: number | null;
  fatigueFoS: number | null;
} {
  const sigmaA_MPa = (params.sigmaMax_MPa - params.sigmaMin_MPa) / 2;
  const sigmaM_MPa = (params.sigmaMax_MPa + params.sigmaMin_MPa) / 2;

  const Su = params.Su_MPa ?? null;
  const Se = params.Se_MPa ?? null;
  const goodmanDen = Su && Se ? sigmaA_MPa / Se + sigmaM_MPa / Su : null;
  const fatigueFoS = goodmanDen && goodmanDen > 0 ? 1 / goodmanDen : null;

  return { sigmaA_MPa, sigmaM_MPa, goodmanDen, fatigueFoS };
}

export type FatigueCriterion = "goodman" | "gerber" | "soderberg";

export function computeFatigueCriteriaFoS(params: {
  sigmaMin_MPa: number;
  sigmaMax_MPa: number;
  Su_MPa?: number | null;
  Sy_MPa?: number | null;
  Se_MPa?: number | null;
}): {
  sigmaA_MPa: number;
  sigmaM_MPa: number;
  goodmanDen: number | null;
  goodmanFoS: number | null;
  gerberDen: number | null;
  gerberFoS: number | null;
  soderbergDen: number | null;
  soderbergFoS: number | null;
} {
  const sigmaA_MPa = (params.sigmaMax_MPa - params.sigmaMin_MPa) / 2;
  const sigmaM_MPa = (params.sigmaMax_MPa + params.sigmaMin_MPa) / 2;

  const Su = params.Su_MPa ?? null;
  const Sy = params.Sy_MPa ?? null;
  const Se = params.Se_MPa ?? null;

  const goodmanDen = Su && Se ? sigmaA_MPa / Se + sigmaM_MPa / Su : null;
  const goodmanFoS = goodmanDen && goodmanDen > 0 ? 1 / goodmanDen : null;

  const gerberDen = Su && Se ? sigmaA_MPa / Se + Math.pow(sigmaM_MPa / Su, 2) : null;
  const gerberFoS = gerberDen && gerberDen > 0 ? 1 / gerberDen : null;

  const soderbergDen = Sy && Se ? sigmaA_MPa / Se + sigmaM_MPa / Sy : null;
  const soderbergFoS = soderbergDen && soderbergDen > 0 ? 1 / soderbergDen : null;

  return {
    sigmaA_MPa,
    sigmaM_MPa,
    goodmanDen,
    goodmanFoS,
    gerberDen,
    gerberFoS,
    soderbergDen,
    soderbergFoS,
  };
}
