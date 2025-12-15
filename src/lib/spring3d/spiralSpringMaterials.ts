export type SpiralSurfaceFinish = "polished" | "oil_tempered" | "as_rolled";

export type SpiralReliability = 0.9 | 0.95 | 0.99;

export type SpiralStrengthBasis = "nominal" | "thickness_heat_treatment";

export type SpiralHeatTreatment = "default" | "spring_tempered" | "hardened_tempered";

export interface SpiralSpringMaterial {
  id: "sae1074_1075" | "sae1095" | "51crv4_6150" | "17_7ph";
  name: string;
  standard: string;
  elasticModulus_MPa: number;
  ultimateStrength_MPa: number;
  yieldStrength_MPa: number;
  /** Unmodified endurance limit (baseline), MPa */
  SePrime_MPa: number;
  defaultSurface: SpiralSurfaceFinish;
  defaultReliability: SpiralReliability;
}

export const SPIRAL_SPRING_MATERIALS: SpiralSpringMaterial[] = [
  {
    id: "sae1074_1075",
    name: "SAE 1074/1075",
    standard: "ASTM A684",
    elasticModulus_MPa: 205000,
    ultimateStrength_MPa: 1650,
    yieldStrength_MPa: 1200,
    SePrime_MPa: 825,
    defaultSurface: "as_rolled",
    defaultReliability: 0.95,
  },
  {
    id: "sae1095",
    name: "SAE 1095",
    standard: "ASTM A684",
    elasticModulus_MPa: 205000,
    ultimateStrength_MPa: 1850,
    yieldStrength_MPa: 1350,
    SePrime_MPa: 925,
    defaultSurface: "as_rolled",
    defaultReliability: 0.95,
  },
  {
    id: "51crv4_6150",
    name: "51CrV4 / 6150",
    standard: "EN 10089",
    elasticModulus_MPa: 205000,
    ultimateStrength_MPa: 1550,
    yieldStrength_MPa: 1250,
    SePrime_MPa: 775,
    defaultSurface: "oil_tempered",
    defaultReliability: 0.95,
  },
  {
    id: "17_7ph",
    name: "17-7PH",
    standard: "ASTM A693",
    elasticModulus_MPa: 200000,
    ultimateStrength_MPa: 1450,
    yieldStrength_MPa: 1100,
    SePrime_MPa: 725,
    defaultSurface: "polished",
    defaultReliability: 0.95,
  },
];

export function getSpiralSpringMaterial(id: SpiralSpringMaterial["id"]): SpiralSpringMaterial | undefined {
  return SPIRAL_SPRING_MATERIALS.find((m) => m.id === id);
}

export const SURFACE_FINISH_FACTOR: Record<SpiralSurfaceFinish, number> = {
  polished: 1.0,
  oil_tempered: 0.9,
  as_rolled: 0.8,
};

export function surfaceFinishFactor(surface: SpiralSurfaceFinish): number {
  return SURFACE_FINISH_FACTOR[surface] ?? 1;
}

export const RELIABILITY_FACTOR: Record<SpiralReliability, number> = {
  0.9: 1.0,
  0.95: 0.9,
  0.99: 0.814,
};

export function reliabilityFactor(reliability: SpiralReliability): number {
  return RELIABILITY_FACTOR[reliability] ?? 1;
}

export function shotPeenFactor(shotPeened: boolean): number {
  return shotPeened ? 1.15 : 1.0;
}

export function adjustSpiralStrengthByThicknessAndHeatTreatment(args: {
  materialId: SpiralSpringMaterial["id"];
  thickness_mm: number;
  basis: SpiralStrengthBasis;
  heatTreatment: SpiralHeatTreatment;
}):
  | {
      SuBase_MPa: number;
      SyBase_MPa: number;
      SePrimeBase_MPa: number;
      SuUsed_MPa: number;
      SyUsed_MPa: number;
      SePrimeUsed_MPa: number;
      thicknessFactor: number;
      heatTreatmentFactor: number;
      assumptions: string[];
    }
  | null {
  const mat = getSpiralSpringMaterial(args.materialId);
  if (!mat) return null;

  const SuBase = mat.ultimateStrength_MPa;
  const SyBase = mat.yieldStrength_MPa;
  const SePrimeBase = mat.SePrime_MPa;

  if (args.basis === "nominal") {
    return {
      SuBase_MPa: SuBase,
      SyBase_MPa: SyBase,
      SePrimeBase_MPa: SePrimeBase,
      SuUsed_MPa: SuBase,
      SyUsed_MPa: SyBase,
      SePrimeUsed_MPa: SePrimeBase,
      thicknessFactor: 1.0,
      heatTreatmentFactor: 1.0,
      assumptions: ["Strength basis: nominal"],
    };
  }

  const t = args.thickness_mm;
  const thicknessFactor =
    t <= 0.5
      ? 1.0
      : t <= 1.0
        ? 0.97
        : t <= 2.0
          ? 0.93
          : t <= 3.0
            ? 0.88
            : 0.82;

  const heatTreatmentFactor =
    args.heatTreatment === "hardened_tempered"
      ? 1.05
      : args.heatTreatment === "spring_tempered"
        ? 1.0
        : 1.0;

  const SuUsed = SuBase * thicknessFactor * heatTreatmentFactor;
  const SyUsedRaw = SyBase * thicknessFactor * heatTreatmentFactor;
  const SyUsed = Math.min(SyUsedRaw, SuUsed);
  const SePrimeUsed = SePrimeBase * thicknessFactor;

  return {
    SuBase_MPa: SuBase,
    SyBase_MPa: SyBase,
    SePrimeBase_MPa: SePrimeBase,
    SuUsed_MPa: SuUsed,
    SyUsed_MPa: SyUsed,
    SePrimeUsed_MPa: SePrimeUsed,
    thicknessFactor,
    heatTreatmentFactor,
    assumptions: [
      "Strength basis: thickness + heat treatment (simplified)",
      `Thickness input: t=${Number(t.toFixed(3))} mm`,
      `k_thickness=${Number(thicknessFactor.toFixed(3))} (piecewise heuristic)`,
      `k_heat_treatment=${Number(heatTreatmentFactor.toFixed(3))} (state=${args.heatTreatment})`,
      "This adjustment is a simplified internal engineering heuristic; confirm with supplier/spec.",
    ],
  };
}
