import type { CompressionSpringDesign } from "@/lib/springTypes";

import type { CompressionSpringEds } from "./engineeringDefinition";

export type ResolveCompressionNominalResult = {
  design: CompressionSpringDesign;
  issues: string[];
};

export function resolveCompressionNominal(eds: CompressionSpringEds): ResolveCompressionNominalResult {
  const issues: string[] = [];

  const wireDiameter = eds.geometry.wireDiameter.nominal;
  const meanDiameter = eds.geometry.meanDiameter.nominal;
  const activeCoils = eds.geometry.activeCoils.nominal;
  const totalCoils = eds.geometry.totalCoils.nominal;
  const shearModulus = eds.material.shearModulus.nominal;
  const freeLength = eds.geometry.freeLength?.nominal;

  if (!(isFinite(wireDiameter) && wireDiameter > 0)) issues.push("Invalid wireDiameter");
  if (!(isFinite(meanDiameter) && meanDiameter > 0)) issues.push("Invalid meanDiameter");
  if (!(isFinite(activeCoils) && activeCoils > 0)) issues.push("Invalid activeCoils");
  if (!(isFinite(totalCoils) && totalCoils > 0)) issues.push("Invalid totalCoils");
  if (!(isFinite(shearModulus) && shearModulus > 0)) issues.push("Invalid shearModulus");
  if (freeLength !== undefined && !(isFinite(freeLength) && freeLength > 0)) issues.push("Invalid freeLength");

  return {
    design: {
      type: "compression",
      wireDiameter,
      meanDiameter,
      activeCoils,
      totalCoils,
      shearModulus,
      freeLength,
      topGround: eds.flags?.topGround,
      bottomGround: eds.flags?.bottomGround,
      materialId: eds.material.materialId,
    },
    issues,
  };
}
