import type { SpringMaterialId } from "@/lib/materials/springMaterials";

import type { CompressionSpringEds } from "./engineeringDefinition";

export type LegacyCompressionFormValues = {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils: number;
  shearModulus: number;
  freeLength?: number;
  topGround?: boolean;
  bottomGround?: boolean;
  materialId?: SpringMaterialId;
};

export function toEdsFromLegacyForm(values: LegacyCompressionFormValues): CompressionSpringEds {
  return {
    type: "compression",
    geometry: {
      wireDiameter: { nominal: values.wireDiameter, unit: "mm" },
      meanDiameter: { nominal: values.meanDiameter, unit: "mm" },
      activeCoils: { nominal: values.activeCoils, unit: "turn" },
      totalCoils: { nominal: values.totalCoils, unit: "turn" },
      freeLength: values.freeLength !== undefined ? { nominal: values.freeLength, unit: "mm" } : undefined,
    },
    material: {
      materialId: values.materialId,
      shearModulus: { nominal: values.shearModulus, unit: "MPa" },
    },
    flags: {
      topGround: values.topGround,
      bottomGround: values.bottomGround,
    },
  };
}

export function toLegacyInputsFromEds(eds: CompressionSpringEds): LegacyCompressionFormValues {
  return {
    wireDiameter: eds.geometry.wireDiameter.nominal,
    meanDiameter: eds.geometry.meanDiameter.nominal,
    activeCoils: eds.geometry.activeCoils.nominal,
    totalCoils: eds.geometry.totalCoils.nominal,
    shearModulus: eds.material.shearModulus.nominal,
    freeLength: eds.geometry.freeLength?.nominal,
    topGround: eds.flags?.topGround,
    bottomGround: eds.flags?.bottomGround,
    materialId: eds.material.materialId,
  };
}
